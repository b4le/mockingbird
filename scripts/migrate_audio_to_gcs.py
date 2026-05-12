#!/usr/bin/env python3
"""Migrate audio files from Google Drive to a GCS bucket.

Walks the project's JSON fixtures, finds every `audioReference` whose
`previewUrl` points at a `https://drive.google.com/file/d/{id}/preview`,
downloads each file via the Google Drive v3 API (using
`google-api-python-client` + an OAuth installed-app flow that reuses
gws's `client_secret.json`), uploads it to
`gs://${MOCKINGBIRD_AUDIO_BUCKET}/audio/{hash}.{ext}` via `gcloud
storage cp`, and rewrites the JSON in place so each `audioReference`
gains a `streamUrl` pointing at the GCS object.

History: this script originally shelled out to `gws drive files
download`, but Drive's frontend returns an unstructured 500
`backendError` for `alt=media` on personal-Drive binary files via that
path. The Python `MediaIoBaseDownload` pattern works fine — see
`local-state/audio-hosting-research/poc-drive-download.py` for the
proof. We retain the gcloud shell-out for the GCS upload because that
path is stable and well-trodden.

Idempotent: a manifest at `local-state/audio-migration-manifest.json`
maps `driveId -> {hash, ext, gcsUrl, sizeBytes, contentType}`. Re-runs
skip downloads/uploads for IDs already present and only ensure the
JSON has the matching `streamUrl`. The manifest lives under
`local-state/` (gitignored) rather than `data/` because it's local
build state — only the resulting `streamUrl` URLs on the fixtures
themselves are committed.

Run with `--dry-run` to preview changes without touching the network,
the filesystem, or the OAuth flow. The user runs the live migration
themselves; the first live invocation opens a browser tab for consent
and caches a refresh token locally for subsequent runs.
"""

from __future__ import annotations

import argparse
import contextlib
import hashlib
import json
import logging
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import tempfile
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Any

# Project root is the directory above scripts/.
REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"
# Manifest lives under local-state/ (gitignored) — the manifest itself is
# a build artefact; only the streamUrl values it produces on the fixtures
# are committed.
MANIFEST_PATH = REPO_ROOT / "local-state" / "audio-migration-manifest.json"

# Matches https://drive.google.com/file/d/{id}/preview (with optional query).
PREVIEW_URL_RE = re.compile(
    r"^https://drive\.google\.com/file/d/([A-Za-z0-9_-]{10,})/preview(?:\?.*)?$",
)

CACHE_CONTROL = "public, max-age=31536000, immutable"

# OAuth: reuse gws's installed-app client_secret. Google has whitelisted gws's
# project_id for Drive scope on consumer (@gmail.com) accounts, so we
# piggyback on it rather than running our own OAuth client.
DEFAULT_CLIENT_SECRET = Path.home() / ".config" / "gws" / "client_secret.json"
TOKEN_CACHE_PATH = REPO_ROOT / "local-state" / ".cache" / "migrate-audio-token.json"
DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly"
DOWNLOAD_CHUNK_SIZE = 1 << 20  # 1 MiB

# Module-level cache for the authenticated Drive service. Built lazily on the
# first call to `drive_download`; never built at all in dry-run.
_drive_service: Any | None = None

logger = logging.getLogger("migrate_audio_to_gcs")


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------


class MigrationError(Exception):
    """Recoverable per-file failure. Logged; processing continues."""


class FatalError(Exception):
    """Unrecoverable error. Aborts the run."""


# ---------------------------------------------------------------------------
# Manifest
# ---------------------------------------------------------------------------


@dataclass
class ManifestEntry:
    """One migrated Drive file."""

    hash: str
    ext: str
    gcs_url: str
    size_bytes: int
    content_type: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "hash": self.hash,
            "ext": self.ext,
            "gcsUrl": self.gcs_url,
            "sizeBytes": self.size_bytes,
            "contentType": self.content_type,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ManifestEntry:
        return cls(
            hash=data["hash"],
            ext=data["ext"],
            gcs_url=data["gcsUrl"],
            size_bytes=int(data["sizeBytes"]),
            content_type=data["contentType"],
        )


def load_manifest(path: Path) -> dict[str, ManifestEntry]:
    """Load the manifest if it exists; return an empty mapping otherwise."""
    if not path.exists():
        return {}
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise FatalError(f"manifest at {path} is not valid JSON: {exc}") from exc
    if not isinstance(raw, dict):
        raise FatalError(f"manifest at {path} must be a JSON object, got {type(raw).__name__}")
    return {k: ManifestEntry.from_dict(v) for k, v in raw.items()}


def save_manifest(path: Path, manifest: dict[str, ManifestEntry]) -> None:
    """Atomically write the manifest as pretty-printed JSON."""
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {k: v.to_dict() for k, v in sorted(manifest.items())}
    write_json_atomic(path, payload)


# ---------------------------------------------------------------------------
# JSON discovery & rewrite
# ---------------------------------------------------------------------------


def iter_data_json_files(data_dir: Path) -> Iterator[Path]:
    """Yield every `*.json` under data/ that may contain `audioReference`."""
    if not data_dir.exists():
        return
    for path in sorted(data_dir.rglob("*.json")):
        # Skip the manifest itself and any provenance sidecar.
        if path.name == MANIFEST_PATH.name:
            continue
        yield path


def extract_drive_id(preview_url: str) -> str | None:
    """Return the Drive file ID from a `/preview` URL, or None if not matched."""
    match = PREVIEW_URL_RE.match(preview_url)
    return match.group(1) if match else None


def collect_audio_refs(doc: Any) -> list[dict[str, Any]]:
    """Walk a parsed JSON document and return every `audioReference` mapping."""
    refs: list[dict[str, Any]] = []
    stack: list[Any] = [doc]
    while stack:
        node = stack.pop()
        if isinstance(node, dict):
            if isinstance(node.get("audioReference"), dict):
                refs.append(node["audioReference"])
            stack.extend(node.values())
        elif isinstance(node, list):
            stack.extend(node)
    return refs


def write_json_atomic(path: Path, payload: Any) -> None:
    """Write JSON via tempfile + os.replace to avoid partial writes."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_fd, tmp_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent)
    )
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
            f.write("\n")
        os.replace(tmp_name, path)
    except BaseException:
        with contextlib.suppress(FileNotFoundError):
            os.unlink(tmp_name)
        raise


# ---------------------------------------------------------------------------
# Drive + GCS
# ---------------------------------------------------------------------------


def infer_extension(filename: str, mime_type: str) -> str:
    """Pick a file extension from filename suffix or MIME type."""
    suffix = Path(filename).suffix.lstrip(".").lower()
    if suffix:
        return suffix
    if mime_type:
        guess = mimetypes.guess_extension(mime_type)
        if guess:
            return guess.lstrip(".").lower()
    logger.warning(
        "could not infer extension for %s; falling back to .bin", filename
    )
    return "bin"


def infer_content_type(ext: str, mime_type: str) -> str:
    """Pick a Content-Type, preferring the fixture's mimeType."""
    if mime_type:
        return mime_type
    guess, _ = mimetypes.guess_type(f"file.{ext}")
    return guess or "application/octet-stream"


def sha256_prefix(path: Path, length: int = 16) -> str:
    """Return the first `length` hex chars of the file's SHA-256."""
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()[:length]


def _load_cached_credentials(token_path: Path) -> Any | None:
    """Return cached Credentials, refreshing if needed; None if unusable.

    Imports `google.auth` lazily so `--dry-run` and `--help` work without the
    google-api-python-client packages installed.
    """
    # Lazy imports: callers in dry-run never reach this function.
    from google.auth.exceptions import RefreshError
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials

    if not token_path.exists():
        return None
    try:
        creds = Credentials.from_authorized_user_file(
            str(token_path), [DRIVE_READONLY_SCOPE]
        )
    except (OSError, ValueError) as exc:
        logger.warning(
            "ignoring unreadable token cache at %s: %s; will re-run OAuth flow",
            token_path,
            exc,
        )
        return None

    if creds.valid:
        logger.info("auth: using cached token at %s", token_path)
        return creds
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
        except RefreshError as exc:
            logger.warning(
                "cached token refresh failed (%s); will re-run OAuth flow", exc
            )
            return None
        logger.info("auth: refreshed cached token at %s", token_path)
        _save_credentials(token_path, creds)
        return creds
    return None


def _save_credentials(token_path: Path, creds: Any) -> None:
    """Atomically persist credentials to `token_path`.

    Uses tempfile + `os.replace` and `0o600` perms so a crash mid-write never
    leaves a half-written token, and the refresh token isn't world-readable.
    """
    token_path.parent.mkdir(parents=True, exist_ok=True)
    payload = creds.to_json()
    tmp_fd, tmp_name = tempfile.mkstemp(
        prefix=f".{token_path.name}.", suffix=".tmp", dir=str(token_path.parent)
    )
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
            f.write(payload)
        os.chmod(tmp_name, 0o600)
        os.replace(tmp_name, token_path)
    except BaseException:
        with contextlib.suppress(FileNotFoundError):
            os.unlink(tmp_name)
        raise


def _build_drive_service(client_secret_path: Path, token_path: Path) -> Any:
    """Resolve credentials (cache or interactive flow) and build the Drive service."""
    # Lazy imports: keep googleapiclient out of module-level so dry-run works
    # without the packages installed.
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build

    creds = _load_cached_credentials(token_path)
    if creds is None:
        if not client_secret_path.exists():
            raise FatalError(
                f"client_secret not found at {client_secret_path}. "
                "Pass --client-secret PATH or set GWS_CLIENT_SECRET. "
                "Default location is gws's installed-app client at "
                "~/.config/gws/client_secret.json."
            )
        logger.info(
            "auth: running OAuth installed-app flow using %s "
            "(a browser tab will open for consent)",
            client_secret_path,
        )
        flow = InstalledAppFlow.from_client_secrets_file(
            str(client_secret_path), [DRIVE_READONLY_SCOPE]
        )
        creds = flow.run_local_server(port=0)
        _save_credentials(token_path, creds)
        logger.info("auth: cached fresh token at %s", token_path)

    return build("drive", "v3", credentials=creds, cache_discovery=False)


def _get_drive_service(
    client_secret_path: Path, token_path: Path
) -> Any:
    """Return the module-level Drive service, building it on first call."""
    global _drive_service
    if _drive_service is None:
        _drive_service = _build_drive_service(client_secret_path, token_path)
    return _drive_service


def drive_download(
    drive_id: str,
    dest: Path,
    *,
    client_secret_path: Path = DEFAULT_CLIENT_SECRET,
    token_path: Path = TOKEN_CACHE_PATH,
) -> None:
    """Download a Drive file to `dest` via the Drive v3 API.

    Replaces the previous `gws drive files download` shell-out, which returned
    an unstructured 500 backendError for `alt=media` on personal-Drive binary
    files. The Python `MediaIoBaseDownload` path is stable.

    Credentials are resolved lazily on the first call per process and cached
    at module level — subsequent calls reuse the same `service` object.
    """
    # Lazy imports: only loaded when a live download happens.
    from googleapiclient.errors import HttpError
    from googleapiclient.http import MediaIoBaseDownload

    service = _get_drive_service(client_secret_path, token_path)

    request = service.files().get_media(fileId=drive_id)
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp_fd, tmp_name = tempfile.mkstemp(
        prefix=f".{dest.name}.", suffix=".tmp", dir=str(dest.parent)
    )
    try:
        with os.fdopen(tmp_fd, "wb") as fh:
            downloader = MediaIoBaseDownload(
                fh, request, chunksize=DOWNLOAD_CHUNK_SIZE
            )
            done = False
            while not done:
                status, done = downloader.next_chunk()
                if status is not None:
                    logger.debug(
                        "drive download %s: %d%%",
                        drive_id,
                        int(status.progress() * 100),
                    )
        os.replace(tmp_name, dest)
    except HttpError as exc:
        with contextlib.suppress(FileNotFoundError):
            os.unlink(tmp_name)
        # Surface the structured Drive error — far more useful than the opaque
        # exit codes the old gws shell-out produced.
        status = getattr(exc.resp, "status", "?")
        reason = getattr(exc, "reason", "")
        body = exc.content.decode("utf-8", errors="replace") if exc.content else ""
        body_excerpt = body[:500] + ("..." if len(body) > 500 else "")
        raise MigrationError(
            f"Drive API download failed for {drive_id}: "
            f"status={status} reason={reason!r} body={body_excerpt!r}"
        ) from exc
    except BaseException:
        with contextlib.suppress(FileNotFoundError):
            os.unlink(tmp_name)
        raise

    if not dest.exists() or dest.stat().st_size == 0:
        raise MigrationError(f"Drive API produced no bytes for {drive_id} at {dest}")


def gcloud_upload(
    src: Path,
    bucket: str,
    object_name: str,
    content_type: str,
    cache_control: str,
) -> str:
    """Upload `src` to `gs://{bucket}/{object_name}` and return the public URL."""
    gcs_uri = f"gs://{bucket}/{object_name}"
    cmd = [
        "gcloud",
        "storage",
        "cp",
        f"--content-type={content_type}",
        f"--cache-control={cache_control}",
        str(src),
        gcs_uri,
    ]
    logger.debug("running: %s", " ".join(cmd))
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        raise MigrationError(
            f"gcloud storage cp failed for {object_name}: "
            f"exit={proc.returncode} stderr={proc.stderr.strip()}"
        )
    return f"https://storage.googleapis.com/{bucket}/{object_name}"


# ---------------------------------------------------------------------------
# Per-file orchestration
# ---------------------------------------------------------------------------


@dataclass
class Plan:
    """One Drive file to migrate, discovered during the scan phase."""

    drive_id: str
    filename: str
    mime_type: str
    sources: list[Path]  # JSON files that reference this driveId


def scan(data_dir: Path) -> dict[str, Plan]:
    """Return a `driveId -> Plan` map covering every audioReference under data/."""
    plans: dict[str, Plan] = {}
    for json_path in iter_data_json_files(data_dir):
        try:
            doc = json.loads(json_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            logger.warning("skipping unreadable JSON at %s: %s", json_path, exc)
            continue
        for ref in collect_audio_refs(doc):
            preview_url = ref.get("previewUrl")
            if not isinstance(preview_url, str):
                continue
            drive_id = extract_drive_id(preview_url)
            if drive_id is None:
                continue
            existing = plans.get(drive_id)
            if existing is None:
                plans[drive_id] = Plan(
                    drive_id=drive_id,
                    filename=str(ref.get("filename", "")),
                    mime_type=str(ref.get("mimeType", "")),
                    sources=[json_path],
                )
            elif json_path not in existing.sources:
                existing.sources.append(json_path)
    return plans


def migrate_one(
    plan: Plan,
    bucket: str,
    *,
    dry_run: bool,
    client_secret_path: Path = DEFAULT_CLIENT_SECRET,
    token_path: Path = TOKEN_CACHE_PATH,
) -> ManifestEntry:
    """Download from Drive, upload to GCS, return a manifest entry."""
    ext = infer_extension(plan.filename, plan.mime_type)
    content_type = infer_content_type(ext, plan.mime_type)

    if dry_run:
        logger.info(
            "[dry-run] would download driveId=%s (%s) and upload as audio/<sha256:16>.%s "
            "to gs://%s with Content-Type=%s",
            plan.drive_id,
            plan.filename,
            ext,
            bucket,
            content_type,
        )
        # The manifest-keyed apply_stream_urls() phase below excludes
        # placeholder entries, so it would never log the JSON-rewrite
        # intent for newly-discovered driveIds. Surface that summary
        # inline here so a fresh dry-run conveys the full picture.
        logger.info(
            "[dry-run] would set streamUrl on %d JSON file(s) for driveId=%s",
            len(plan.sources),
            plan.drive_id,
        )
        # Synthetic placeholder so callers that store the entry still work.
        return ManifestEntry(
            hash="<unknown-without-download>",
            ext=ext,
            gcs_url=f"https://storage.googleapis.com/{bucket}/audio/<hash>.{ext}",
            size_bytes=0,
            content_type=content_type,
        )

    tmpdir = Path(tempfile.mkdtemp(prefix="mb-audio-migrate-"))
    try:
        local = tmpdir / f"{plan.drive_id}.{ext}"
        drive_download(
            plan.drive_id,
            local,
            client_secret_path=client_secret_path,
            token_path=token_path,
        )
        size_bytes = local.stat().st_size
        digest = sha256_prefix(local, 16)
        object_name = f"audio/{digest}.{ext}"
        gcs_url = gcloud_upload(
            local,
            bucket,
            object_name,
            content_type=content_type,
            cache_control=CACHE_CONTROL,
        )
        logger.info(
            "migrated driveId=%s -> %s (%d bytes, %s)",
            plan.drive_id,
            gcs_url,
            size_bytes,
            content_type,
        )
        return ManifestEntry(
            hash=digest,
            ext=ext,
            gcs_url=gcs_url,
            size_bytes=size_bytes,
            content_type=content_type,
        )
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


# ---------------------------------------------------------------------------
# JSON rewrite phase
# ---------------------------------------------------------------------------


def apply_stream_urls(
    json_paths: list[Path],
    manifest: dict[str, ManifestEntry],
    *,
    dry_run: bool,
) -> tuple[int, int]:
    """Rewrite each JSON file so every audioReference gains the right streamUrl.

    Returns `(changed_files, failures)`. In dry-run, `changed_files` is 0 and
    intended changes are logged. Existing fields are preserved. By the time
    this runs, `scan()` has already successfully parsed every file in
    `json_paths`, so an unreadable file or JSONDecodeError here is a real
    I/O / mutation failure that must surface as a non-zero exit — we count
    it and let `main()` reflect it in the process status.
    """
    changed_files = 0
    failures = 0
    for json_path in json_paths:
        try:
            doc = json.loads(json_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            failures += 1
            logger.error(
                "rewrite-phase failure: cannot parse %s (was readable during scan): %s",
                json_path,
                exc,
            )
            continue

        refs = collect_audio_refs(doc)
        modified = False
        for ref in refs:
            preview_url = ref.get("previewUrl")
            if not isinstance(preview_url, str):
                continue
            drive_id = extract_drive_id(preview_url)
            if drive_id is None:
                continue
            entry = manifest.get(drive_id)
            if entry is None:
                continue
            current = ref.get("streamUrl")
            if current == entry.gcs_url:
                continue
            if dry_run:
                logger.info(
                    "[dry-run] would set streamUrl on %s for driveId=%s -> %s",
                    json_path.relative_to(REPO_ROOT),
                    drive_id,
                    entry.gcs_url,
                )
            else:
                ref["streamUrl"] = entry.gcs_url
                modified = True

        if modified and not dry_run:
            try:
                write_json_atomic(json_path, doc)
            except OSError as exc:
                failures += 1
                logger.error(
                    "rewrite-phase failure: cannot write %s: %s", json_path, exc
                )
                continue
            changed_files += 1
            logger.info("updated %s", json_path.relative_to(REPO_ROOT))
    return changed_files, failures


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Migrate Drive-hosted audio referenced from data/**/*.json into "
            "a GCS bucket, then rewrite each audioReference with a streamUrl."
        ),
    )
    parser.add_argument(
        "--bucket",
        default=os.environ.get("MOCKINGBIRD_AUDIO_BUCKET"),
        help="GCS bucket name (default: $MOCKINGBIRD_AUDIO_BUCKET)",
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=DATA_DIR,
        help=f"Project data directory (default: {DATA_DIR.relative_to(REPO_ROOT)})",
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=MANIFEST_PATH,
        help=(
            f"Manifest path (default: {MANIFEST_PATH.relative_to(REPO_ROOT)})"
        ),
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print planned actions; do not download, upload, or write files.",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable DEBUG-level logging.",
    )
    parser.add_argument(
        "--client-secret",
        type=Path,
        default=Path(
            os.environ.get("GWS_CLIENT_SECRET", str(DEFAULT_CLIENT_SECRET))
        ),
        help=(
            "Path to the OAuth installed-app client_secret.json used for the "
            f"Drive API. Default: $GWS_CLIENT_SECRET or {DEFAULT_CLIENT_SECRET}."
        ),
    )
    parser.add_argument(
        "--reauth",
        action="store_true",
        help=(
            "Delete the cached OAuth token and force a fresh consent flow. "
            "Useful if the refresh token has expired or scopes have changed."
        ),
    )
    return parser.parse_args(argv)


def configure_logging(verbose: bool) -> None:
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s %(levelname)-5s %(message)s",
        datefmt="%H:%M:%S",
    )


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    configure_logging(args.verbose)

    if not args.bucket:
        logger.error(
            "bucket not set: pass --bucket or export MOCKINGBIRD_AUDIO_BUCKET"
        )
        return 2

    data_dir: Path = args.data_dir
    if not data_dir.exists():
        logger.error("data directory does not exist: %s", data_dir)
        return 2

    manifest_path: Path = args.manifest
    try:
        manifest = load_manifest(manifest_path)
    except FatalError as exc:
        logger.error("%s", exc)
        return 2

    client_secret_path: Path = args.client_secret
    token_path: Path = TOKEN_CACHE_PATH

    # `--reauth` deletes the cached token before any download attempt so the
    # next `drive_download` call falls through to the interactive flow. Safe
    # in dry-run too — we just delete a local file; no network is touched.
    if args.reauth:
        try:
            token_path.unlink()
            logger.info("auth: deleted cached token at %s (--reauth)", token_path)
        except FileNotFoundError:
            logger.info(
                "auth: no cached token at %s to delete (--reauth no-op)", token_path
            )
        except OSError as exc:
            logger.error("could not delete cached token at %s: %s", token_path, exc)
            return 2

    logger.info("scanning %s", data_dir.relative_to(REPO_ROOT))
    plans = scan(data_dir)
    if not plans:
        logger.info("no Drive-hosted audio references found; nothing to migrate")
        return 0

    new_ids = sorted(d for d in plans if d not in manifest)
    cached_ids = sorted(d for d in plans if d in manifest)
    logger.info(
        "discovered %d unique driveIds (%d new, %d already in manifest)",
        len(plans),
        len(new_ids),
        len(cached_ids),
    )

    failures = 0
    for drive_id in new_ids:
        plan = plans[drive_id]
        logger.info(
            "processing driveId=%s sources=%s",
            drive_id,
            [str(p.relative_to(REPO_ROOT)) for p in plan.sources],
        )
        try:
            entry = migrate_one(
                plan,
                args.bucket,
                dry_run=args.dry_run,
                client_secret_path=client_secret_path,
                token_path=token_path,
            )
        except MigrationError as exc:
            failures += 1
            logger.error("%s", exc)
            continue

        if args.dry_run:
            # Don't pollute the on-disk manifest with placeholder hashes.
            continue

        manifest[drive_id] = entry
        # Persist after each success so a crash doesn't lose progress.
        save_manifest(manifest_path, manifest)

    if not args.dry_run and (new_ids or cached_ids):
        save_manifest(manifest_path, manifest)

    # Rewrite JSON fixtures. In dry-run we still walk so the user can see what
    # would change, but we use the existing manifest only (placeholders are
    # excluded).
    changed, rewrite_failures = apply_stream_urls(
        sorted({p for plan in plans.values() for p in plan.sources}),
        manifest,
        dry_run=args.dry_run,
    )
    failures += rewrite_failures
    if not args.dry_run:
        logger.info("rewrote %d JSON fixture(s)", changed)

    if failures:
        logger.error("%d failure(s); see log above", failures)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
