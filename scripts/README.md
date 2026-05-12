# scripts/

One-shot maintenance scripts. Mostly stdlib Python; subprocess out to
`gcloud` for GCS uploads, and call the Drive v3 API directly via
`google-api-python-client` for downloads.

## migrate_audio_to_gcs.py

Migrates audio referenced from `data/**/*.json` out of Google Drive and
into a GCS bucket, then rewrites each `audioReference` so it carries
a `streamUrl` pointing at the GCS object. The original `viewUrl` and
`previewUrl` Drive fields are preserved.

### Prereqs

1. **Python dependencies** (required for live runs; `--dry-run` and
   `--help` work without these):

   ```bash
   pip install --user -r scripts/requirements.txt
   ```

   If you use `uv`, either `uv pip install -r scripts/requirements.txt`
   inside a project venv, or invoke via PEP-723 inline-deps like the
   POC at `local-state/audio-hosting-research/poc-drive-download.py`.

2. **OAuth client_secret** for the Drive API. The script reuses gws's
   installed-app client at `~/.config/gws/client_secret.json` by
   default. Override with `--client-secret PATH` or `GWS_CLIENT_SECRET`.
   (Why piggyback on gws's client? Google has whitelisted that
   project_id for Drive scope on consumer `@gmail.com` accounts;
   gcloud's built-in OAuth client is not.)

3. `gcloud auth login` and `gcloud config set project ...` — must be
   authed to a project that owns the destination bucket and has
   `roles/storage.objectAdmin` on it.

4. The destination bucket must already exist (`gcloud storage buckets
   create gs://${MOCKINGBIRD_AUDIO_BUCKET} --location=...`).

5. `MOCKINGBIRD_AUDIO_BUCKET` env var (or `--bucket`) — required.

### Authentication

The script uses an OAuth installed-app flow for Drive access:

- **First live run.** A browser tab opens, you click through Google's
  consent screen ("Allow gws to read your Drive — read-only"), and the
  resulting credentials are cached at
  `local-state/.cache/migrate-audio-token.json` (gitignored, `0600`).
- **Subsequent runs.** The cached token is reused. If it has expired
  but the refresh token is still valid, the script refreshes silently.
  No browser interaction.
- **Scope.** `drive.readonly` only. The script never writes to Drive.
- **Forcing reauth.** Pass `--reauth` to delete the cached token before
  starting; the next download triggers a fresh consent flow.

`--dry-run` never triggers the OAuth flow, never creates a token file,
and works without the `google-*` packages installed.

### Invocation

```bash
# Preview every action; touches nothing, no OAuth.
MOCKINGBIRD_AUDIO_BUCKET=mockingbird-audio-prod \
  python3 scripts/migrate_audio_to_gcs.py --dry-run

# Real run. First time opens a browser tab for consent.
MOCKINGBIRD_AUDIO_BUCKET=mockingbird-audio-prod \
  python3 scripts/migrate_audio_to_gcs.py

# Verbose logging.
MOCKINGBIRD_AUDIO_BUCKET=mockingbird-audio-prod \
  python3 scripts/migrate_audio_to_gcs.py --verbose

# Force a fresh OAuth flow (e.g. refresh token expired).
MOCKINGBIRD_AUDIO_BUCKET=mockingbird-audio-prod \
  python3 scripts/migrate_audio_to_gcs.py --reauth

# Point at a different client_secret.json.
MOCKINGBIRD_AUDIO_BUCKET=mockingbird-audio-prod \
  python3 scripts/migrate_audio_to_gcs.py --client-secret /path/to/client_secret.json
```

The script is idempotent. Re-runs skip already-migrated files (matched
by `driveId` against the manifest) and only rewrite JSON fixtures that
are missing the right `streamUrl`. Per-file failures are logged and
the run continues; the script exits non-zero if any file failed.

### Manifest

`data/scout/audio-migration-manifest.json` is the source of truth for
"this Drive file is in GCS at this URL". Shape:

```json
{
  "<driveId>": {
    "hash": "<first 16 hex chars of sha256>",
    "ext": "m4a",
    "gcsUrl": "https://storage.googleapis.com/<bucket>/audio/<hash>.m4a",
    "sizeBytes": 53896450,
    "contentType": "audio/x-m4a"
  }
}
```

Entries are written after each successful upload, so a crash mid-batch
loses at most one in-flight file. Delete an entry to force a re-upload.

### Recovery

- **Corrupted manifest.** Delete `data/scout/audio-migration-manifest.json`
  and rebuild from the bucket: `gcloud storage ls gs://${MOCKINGBIRD_AUDIO_BUCKET}/audio/`
  lists every migrated object. Re-run the script — it will re-derive the
  manifest from JSON fixtures still missing `streamUrl` and skip uploads
  for hashes already present in the bucket.
- **Interrupted JSON-rewrite phase.** Both phases are idempotent — just
  re-run. Uploads skip already-migrated `driveId`s (manifest match) and
  the rewrite phase only touches fixtures missing the right `streamUrl`.
- **OAuth token corrupted or scopes changed.** Run with `--reauth` to
  delete the cached token and re-trigger the consent flow.
