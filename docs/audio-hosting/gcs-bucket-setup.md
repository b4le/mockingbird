# GCS Bucket Setup for Mockingbird Audio Hosting

This runbook provisions a public-read GCS bucket that hosts ~13 audio files (~500 MB total) referenced from the GitHub Pages site at `https://b4le.github.io/mockingbird`. The architecture is **Option A — public bucket with content-hashed object names, no signed URLs.** URLs are effectively public; obscurity comes from unguessable hashes plus disabled object listing, not authentication.

> Do NOT run any `create`/`update`/`cp` command in this document until you have read the section it appears in and substituted real values for the variables at the top of Step 1.

---

## Prerequisites

- `gcloud` CLI installed and authenticated as an account with `roles/storage.admin` on the target project.
  - Verify: `gcloud auth list` and `gcloud config list project`.
  - Docs: https://cloud.google.com/sdk/docs/install
- A GCP project with **billing linked**, even though usage is expected to stay inside the Always Free tier. Cloud Storage will reject bucket creation in a project without a billing account.
  - Verify: `gcloud beta billing projects describe $(gcloud config get-value project)` should show `billingEnabled: true`.
  - Docs: https://cloud.google.com/billing/docs/how-to/modify-project
- The Cloud Storage API enabled in the project: `gcloud services enable storage.googleapis.com`.
- A local copy of the audio files staged in `data/audio/` (or wherever you keep them) ready to upload.

---

## Configure once at the top

Set these shell variables once. Every subsequent command references them.

```bash
# Pick your project ID
export PROJECT_ID="your-gcp-project-id"

# Bucket name — see "Notes / Open question: bucket name" at the bottom for the
# tradeoff between predictable and random suffixes. Recommended: random suffix.
export BUCKET="mockingbird-audio-3f7a2c8e"

# Region — must be us-west1, us-central1, or us-east1 to qualify for the
# Always Free 5 GB / 100 GB egress allowance.
# https://cloud.google.com/free/docs/free-cloud-features#storage
export LOCATION="us-central1"

# Origin allowed to fetch objects (GitHub Pages site)
export ALLOWED_ORIGIN="https://b4le.github.io"

gcloud config set project "$PROJECT_ID"
```

---

## Step 1 — Create the bucket

Create a Standard-class, single-region bucket with **uniform bucket-level access enabled** and **public access prevention disabled**. UBLA (`-b` / `--uniform-bucket-level-access`) is required so we can manage permissions cleanly via IAM rather than per-object ACLs. PAP must be off so we can later grant `allUsers` read access — Google blocks that grant when PAP is `enforced`.

```bash
gcloud storage buckets create "gs://${BUCKET}" \
  --location="${LOCATION}" \
  --default-storage-class=STANDARD \
  --uniform-bucket-level-access \
  --no-public-access-prevention \
  --soft-delete-duration=0s
```

Notes:

- `--default-storage-class=STANDARD` keeps us in the Always Free tier (5 GB Standard storage in us-west1/central1/east1). Other classes are not free-tier eligible.
  - https://cloud.google.com/storage/pricing
- `--uniform-bucket-level-access` (alias `-b`) disables per-object ACLs — this is what we want; it makes "make the whole bucket world-readable but never world-listable" expressible as a single IAM binding in Step 4.
  - https://cloud.google.com/storage/docs/uniform-bucket-level-access
- `--no-public-access-prevention` is **required** for the public-read grant in Step 4 to succeed. If you forget it, the IAM binding will fail with `PUBLIC_ACCESS_PREVENTION_VIOLATION`.
  - https://cloud.google.com/storage/docs/public-access-prevention
- `--soft-delete-duration=0s` disables the soft-delete retention feature. Soft-deleted objects are billed at Standard rates and can push us out of free-tier; we don't need it for static, immutable, content-hashed audio. Default is 7 days.
  - https://cloud.google.com/storage/docs/soft-delete

---

## Step 2 — (Already done in Step 1) Confirm UBLA + PAP

Verify the two settings landed correctly. This is read-only.

```bash
gcloud storage buckets describe "gs://${BUCKET}" \
  --format="yaml(iamConfiguration)"
```

Expected output should include:

```yaml
iamConfiguration:
  publicAccessPrevention: inherited
  uniformBucketLevelAccess:
    enabled: true
```

If `publicAccessPrevention` shows `enforced`, run:

```bash
gcloud storage buckets update "gs://${BUCKET}" --no-public-access-prevention
```

Docs: https://cloud.google.com/storage/docs/using-public-access-prevention

---

## Step 3 — Configure CORS for Range requests from GitHub Pages

The HTML5 `<audio>` element issues `Range` requests for seek and progressive playback. Browsers will not send those cross-origin without a CORS preflight that explicitly allows the `Range` request header. We allow only `GET` from the GitHub Pages origin.

Create the CORS file (project-relative so it survives reboots and is
discoverable for review before applying):

```bash
mkdir -p tmp/
cat > ./tmp/mockingbird-cors.json <<EOF
[
  {
    "origin": ["${ALLOWED_ORIGIN}"],
    "method": ["GET", "HEAD"],
    "responseHeader": [
      "Content-Type",
      "Content-Length",
      "Content-Range",
      "Accept-Ranges",
      "Cache-Control",
      "ETag",
      "Last-Modified"
    ],
    "maxAgeSeconds": 3600
  }
]
EOF
```

Apply it:

```bash
gcloud storage buckets update "gs://${BUCKET}" \
  --cors-file=./tmp/mockingbird-cors.json
```

Notes:

- `Range` is a CORS-safelisted request header in modern browsers, so it does not need to appear in any `Access-Control-Allow-Headers` (you do not configure request-allowed headers via the `responseHeader` array — that array names *response* headers the browser is allowed to read).
- We list `Content-Range` and `Accept-Ranges` in `responseHeader` so the audio element can read them after a 206 response.
- `maxAgeSeconds: 3600` caches preflights for one hour — safe for read-only static content.
- Docs: https://cloud.google.com/storage/docs/cross-origin and https://cloud.google.com/storage/docs/using-cors

Verify:

```bash
gcloud storage buckets describe "gs://${BUCKET}" --format="yaml(cors_config)"
```

---

## Step 4 — Grant public read (object viewer)

This is the explicit, accepted decision: anyone on the internet who knows the URL can read the object. We grant `roles/storage.objectViewer` to `allUsers`.

```bash
gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member=allUsers \
  --role=roles/storage.objectViewer
```

What this role grants on this bucket: `storage.objects.get` and `storage.objects.list`.

> **Listing is NOT prevented by `objectViewer` — be honest about this.** `objectViewer` includes `storage.objects.list`. The JSON API listing path (`storage.googleapis.com/storage/v1/b/${BUCKET}/o`) does happen to gate on `storage.buckets.get`, which `allUsers` lacks, so JSON-API listing returns 401/403. **However, the GCS XML API listing endpoint** (`https://storage.googleapis.com/${BUCKET}?list-type=2`) **only requires `storage.objects.list` and will succeed for anonymous callers with `objectViewer`.** Anyone who knows the bucket name can enumerate every object name via that endpoint.
>
> The actual protection in this architecture is the **unguessable bucket name** (see the random-suffix recommendation in "Open question: bucket name" below), not listing prevention. The object hashes provide further obscurity once a bucket name is known, but listing makes that hash brute-force unnecessary.
>
> If you genuinely need listing to fail for anonymous callers, create a custom role with only `storage.objects.get` and bind that to `allUsers` instead. That trades operational overhead for stricter posture. The accepted path for this project is `roles/storage.objectViewer` plus a random-suffix bucket name.

References:

- Role contents: https://cloud.google.com/storage/docs/access-control/iam-roles
- Public bucket recipe (official): https://cloud.google.com/storage/docs/access-control/making-data-public

Verify the binding:

```bash
gcloud storage buckets get-iam-policy "gs://${BUCKET}" \
  --format="yaml(bindings)"
```

You should see exactly one binding with `members: ['allUsers']` and `role: roles/storage.objectViewer`.

---

## Step 5 — Object naming convention

Object keys must be **content-hashed and unguessable**. Recommended: SHA-256 of the file contents, truncated to 16 hex characters (~64 bits of entropy — far beyond brute-force). This also gives free deduplication and lets us use long-lived immutable cache headers.

Layout under the bucket:

```
audio/
  3f7a2c8e1b9d4f6a.mp3
  a91b04dc7e3f5821.m4a
  ...
```

Generate a hash on macOS:

```bash
HASH=$(shasum -a 256 path/to/source.mp3 | cut -c1-16)
echo "$HASH"
```

Or on Linux: `sha256sum path/to/source.mp3 | cut -c1-16`.

Listing is disabled for `allUsers` (Step 4 note), so even if the key space is small in theory, no one can enumerate the bucket — they have to guess the full hash.

> **Do not** name objects after the source filenames (e.g. `audio/2024-09-15-call-with-jane.mp3`). That defeats the entire obscurity model.

---

## Step 6 — Upload with explicit metadata

Upload each audio file with `--cache-control` (long-lived, immutable — safe because the URL changes when the content changes) and `--content-type` set explicitly so browsers don't rely on extension sniffing.

```bash
# Example: upload one file
gcloud storage cp \
  /path/to/local/source.mp3 \
  "gs://${BUCKET}/audio/${HASH}.mp3" \
  --cache-control="public, max-age=31536000, immutable" \
  --content-type="audio/mpeg"
```

Content-Type cheat sheet:

| Extension | `--content-type=` |
|-----------|-------------------|
| `.mp3`    | `audio/mpeg`      |
| `.m4a`    | `audio/mp4`       |
| `.aac`    | `audio/aac`       |
| `.ogg`    | `audio/ogg`       |
| `.opus`   | `audio/ogg` (Opus-in-Ogg) or `audio/opus` |
| `.wav`    | `audio/wav`       |
| `.flac`   | `audio/flac`      |

`--cache-control="public, max-age=31536000, immutable"` is correct because:

- Object names are content-hashed → the URL is stable for the lifetime of that file content.
- `immutable` tells the browser to skip revalidation for the cache lifetime.
- Docs: https://cloud.google.com/storage/docs/metadata#cache-control and https://cloud.google.com/storage/docs/caching#performance_considerations

If you want to bulk-upload a directory of pre-renamed files:

```bash
gcloud storage cp --recursive ./audio-staged/ "gs://${BUCKET}/audio/" \
  --cache-control="public, max-age=31536000, immutable"
# Then verify Content-Type per file (see Step 7).
```

Note that `--recursive` does not let you set per-extension Content-Type. Either upload files in one-extension batches with explicit `--content-type`, or run a follow-up `gcloud storage objects update --content-type=...` per file.

---

## Step 7 — Verification

The final URL pattern is:

```
https://storage.googleapis.com/<BUCKET>/audio/<HASH>.<ext>
```

Run these against a real uploaded object. Replace `${URL}` with one full audio URL.

```bash
URL="https://storage.googleapis.com/${BUCKET}/audio/${HASH}.mp3"
```

### 7a. Object is publicly readable, correct Content-Type, Range supported

```bash
curl -sI "$URL"
```

Expected response headers (key lines):

```
HTTP/2 200
content-type: audio/mpeg
accept-ranges: bytes
cache-control: public, max-age=31536000, immutable
content-length: <bytes>
```

If `accept-ranges` is missing, partial playback / seek will not work — verify upload completed and `--content-type` was set.

### 7b. Range request returns 206 with the correct slice

```bash
curl -sI -r 0-1023 "$URL"
```

Expected:

```
HTTP/2 206
content-range: bytes 0-1023/<total>
content-length: 1024
```

### 7c. CORS preflight from GitHub Pages

```bash
curl -sI -X OPTIONS \
  -H "Origin: ${ALLOWED_ORIGIN}" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: range" \
  "$URL"
```

Expected response includes:

```
access-control-allow-origin: https://b4le.github.io
access-control-allow-methods: GET, HEAD
access-control-max-age: 3600
```

Docs on testing CORS: https://cloud.google.com/storage/docs/using-cors#troubleshooting

### 7d. Anonymous listing behaviour (XML API succeeds — expected)

The actual listing path that anonymous callers hit is the GCS XML API, not the JSON API. Test it:

```bash
curl -s "https://storage.googleapis.com/${BUCKET}?list-type=2" | head -40
```

**Expected: this WILL return XML containing every `<Contents>` entry in the bucket.** That is the documented behaviour of `roles/storage.objectViewer` — it is not a misconfiguration. The actual obscurity protection is the unguessable bucket name, per Step 4.

If you also want to verify the JSON API path returns 401/403 (it does — but note this does **not** test the actual listing path):

```bash
# Belt-and-braces only — does not test the actual listing path.
curl -s "https://storage.googleapis.com/storage/v1/b/${BUCKET}/o" | head -20
```

Expected: a JSON 401 or 403 (`Anonymous caller does not have storage.objects.list`). The JSON API gates on `storage.buckets.get` which `allUsers` lacks. The XML API does not — that is the path to verify.

---

## Rollback

If you need to delete the bucket cleanly:

```bash
# Remove all objects first
gcloud storage rm --recursive "gs://${BUCKET}/**"

# Delete the bucket
gcloud storage buckets delete "gs://${BUCKET}"
```

To revoke public read without deleting the bucket:

```bash
gcloud storage buckets remove-iam-policy-binding "gs://${BUCKET}" \
  --member=allUsers \
  --role=roles/storage.objectViewer
```

To temporarily disable public read by re-enforcing PAP (objects stay, but `allUsers` IAM grants are blocked):

```bash
gcloud storage buckets update "gs://${BUCKET}" --pap
```

Docs: https://cloud.google.com/storage/docs/using-public-access-prevention

---

## Cost expectations

The Always Free tier covers Standard-class storage in `us-west1`, `us-central1`, or `us-east1` up to **5 GB** of storage and **100 GB** of network egress per month, aggregated across the three regions, with no expiration. Our footprint is ~500 MB stored and likely <5 GB egress per month for personal use, so we sit comfortably inside the free tier.

What would push us out:

- **Storage > 5 GB** — won't happen at the current 13-file / 500 MB scale unless we add hundreds more files.
- **Egress > 100 GB/month** — would require either viral traffic or many full-file replays. The `<audio>` element streams via Range requests, and the `immutable` cache header keeps repeat visits from re-fetching.
- **Class A operations > 5,000/month** (uploads, listings) — uploads are one-time, listing is disabled, so this is not a concern.
- **Choosing a non-free region** (e.g. `europe-west1`, multi-region `US`) — bills from byte one. Stay in `us-central1` (or `us-west1` / `us-east1`).

References:
- https://cloud.google.com/free/docs/free-cloud-features#storage
- https://cloud.google.com/storage/pricing
- https://cloud.google.com/storage/pricing#network-egress

Set a billing alert at $1/month as a tripwire: https://cloud.google.com/billing/docs/how-to/budgets

---

## What goes in the repo / GH Actions

Because the bucket is publicly readable, **no service-account JSON, no OIDC token, no GH Actions secret is required at runtime** to play audio from the site. Object URLs are baked directly into the static HTML/JSON.

What you should NOT add:

- Any `GCP_SA_KEY` / `GCP_CREDENTIALS` GitHub secret. There is nothing for it to do.
- Any workflow that authenticates to GCP at deploy time. Deploys are static.
- Any tool that loads gcloud auth in CI.

What you MAY add later (only if you re-migrate or re-render audio in a CI workflow):

- A workflow step that installs the gcloud CLI: `google-github-actions/setup-gcloud@v2`.
- Authentication via Workload Identity Federation (no JSON key checked in): https://github.com/google-github-actions/auth.

Until and unless you build that re-migration pipeline, do nothing. The whole point of Option A is that the public bucket lets the static site work with zero runtime auth.

---

## Notes / decision rationale

- **Why a public bucket and not signed URLs?** Signed URLs require server-side signing on every page load, which a static GitHub Pages site cannot do without an external token-vending service. The user explicitly accepted "URLs are effectively public" to avoid that infrastructure.
- **Why content-hashed names?** Two reasons. (1) Without listing, the only way to discover an object is to know its full URL — an unguessable hash makes that infeasible. (2) Stable URL per content version unlocks `Cache-Control: immutable` and zero-config CDN caching.
- **Why SHA-256 truncated to 16 hex chars (64 bits) and not full 64 chars?** 64 bits is ~1.8e19 — well beyond brute force, and it keeps URLs short. Collision probability for 13 files is ~3.5e-18, which is fine. Use full SHA-256 if you ever scale to billions of files.
- **Why disable soft-delete?** Soft-deleted objects bill as Standard storage and can silently push us above 5 GB. Audio is content-hashed so accidental deletes are recoverable by re-running the upload from the source files in `data/audio/`.
- **Why `us-central1` and not multi-region `US`?** Multi-region buckets are NOT in the Always Free tier — only single-region in us-west1/us-central1/us-east1. Multi-region storage bills from byte one.
- **Why is `data/scout/audio-migration-manifest.json` gitignored?** The manifest stores `gcsUrl` values that contain the bucket name in plaintext. Committing it to a public repo would defeat the random-suffix obscurity goal that this runbook recommends in "Open question: bucket name". The manifest is a local idempotency anchor for the migration script — it is not needed at runtime, because each JSON fixture carries its own `streamUrl` post-migration. See `.gitignore` and `scripts/migrate_audio_to_gcs.py`.

### Open question: bucket name

Bucket names are part of a flat global namespace. They do not appear in any public listing API (`storage.googleapis.com/storage/v1/b` requires authentication and lists only your own buckets), but they ARE individually probeable: anyone can `HEAD https://storage.googleapis.com/<name>` and learn whether a bucket of that name exists.

| Choice | Pro | Con |
|--------|-----|-----|
| `mockingbird-audio` | Memorable, easy to type | Anyone who knows the project name can probe the bucket and confirm it exists; combined with anything that leaks an object name (e.g. a stale page cache, a screenshot), they can request that specific object. |
| `mockingbird-audio-3f7a2c8e` (random suffix) | Bucket existence is itself unguessable; project name leaking does not reveal the bucket name. | Slightly less memorable. Must be referenced by the variable, not typed. |

**Recommendation: random suffix.** Generate it once: `openssl rand -hex 4`. The site references the bucket name from a single config, so the readability cost is zero.

This does not change the threat model materially — once a real audio URL leaks anywhere, the file is exfiltrable regardless. But it raises the bar against casual probing of the project's GCS footprint.

### Object-level cache headers — why `immutable`?

`Cache-Control: public, max-age=31536000, immutable` is appropriate **only because** object names change when content changes (content-hashed). If anyone ever overwrites `audio/3f7a2c8e1b9d4f6a.mp3` with different content, every browser cache holding the old version will keep serving it for up to a year. The rule is: never overwrite a hashed object. Upload a new hash and update the page references.

### Explicit Content-Type — why?

`gcloud storage cp` infers Content-Type from the local file's extension. That is fine on macOS for `.mp3`/`.wav` but unreliable for `.m4a` (often inferred as `application/octet-stream`) and `.opus`. Setting it explicitly via `--content-type=` removes the ambiguity. Browsers refuse to use `<audio>` for objects served as `application/octet-stream`.
