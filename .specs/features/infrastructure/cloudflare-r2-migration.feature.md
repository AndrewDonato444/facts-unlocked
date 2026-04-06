---
feature: Cloudflare R2 Migration
domain: infrastructure
source: DonatoSkills/content-engine/SKILL.md
tests:
  - DonatoSkills/content-engine/__tests__/r2-upload.test.js
components: []
personas: []
status: specced
created: 2026-04-05
updated: 2026-04-05
---

# Cloudflare R2 Migration

**Source Files**:
- `DonatoSkills/content-engine/references/r2-upload.md` (new — replaces cloudinary-upload.md)
- `DonatoSkills/content-engine/scripts/upload-media.sh` (new — unified upload script)
- `DonatoSkills/content-engine/SKILL.md` (updated — swap Cloudinary refs to R2)
- `DonatoSkills/projects.json` (updated — replace cloudinary config with r2 config)
- `DonatoSkills/cost-tracker/rates.json` (updated — replace cloudinary entry with r2)
- `DonatoSkills/content-engine/references/cloudinary-upload.md` (deleted)

**Design System**: N/A (infrastructure change, no UI)

## Feature: Cloudflare R2 Migration

Replace Cloudinary as the media upload/hosting layer with Cloudflare R2. Cloudinary's
free tier (25GB storage, 25GB bandwidth) is exhausted. R2 offers zero egress fees and
$0.015/GB/month storage — effectively free at our volume (~27 videos/day, ~5MB each).

The pipeline role is unchanged: upload a local video/image, get back a public HTTPS URL,
pass that URL to Zernio for scheduling. R2 is a drop-in replacement using its S3-compatible
API.

---

### Scenario: Upload a video to R2 and get a public URL

```gherkin
Given R2 credentials are configured in .env:
  | Variable              | Purpose                          |
  | R2_ACCOUNT_ID         | Cloudflare account ID            |
  | R2_BUCKET_NAME        | R2 bucket name                   |
  | R2_ACCESS_KEY_ID      | R2 API token access key          |
  | R2_SECRET_ACCESS_KEY  | R2 API token secret key          |
  | R2_PUBLIC_URL         | Public bucket URL (custom domain or *.r2.dev) |
And the bucket has public access enabled
When the content engine uploads a rendered video at path/to/video.mp4
Then it PUTs the file to R2 using the S3-compatible API:
  endpoint: https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com
  bucket: {R2_BUCKET_NAME}
  key: content-engine/{campaign-slug}/{item-id}.mp4
And the returned public URL is: {R2_PUBLIC_URL}/content-engine/{campaign-slug}/{item-id}.mp4
And the calendar item is updated with asset_url = the public URL
```

### Scenario: Upload an image to R2

```gherkin
Given R2 credentials are configured
When the content engine uploads an image at path/to/image.png
Then it PUTs the file to R2 with:
  key: content-engine/{campaign-slug}/{item-id}.png
  content-type: image/png
And returns the public URL
```

### Scenario: Upload uses curl with S3v4 signing (no SDK dependency)

```gherkin
Given we want zero new npm dependencies
When uploading a file to R2
Then the upload script uses curl with AWS Signature V4 headers
  (date, x-amz-content-sha256, authorization)
Or alternatively uses the aws CLI if available:
  aws s3 cp file.mp4 s3://{bucket}/key --endpoint-url https://{account}.r2.cloudflarestorage.com
And does NOT require installing @aws-sdk/client-s3 or any Node package
```

### Scenario: R2 credentials missing — fail with clear message

```gherkin
Given R2_ACCOUNT_ID or R2_ACCESS_KEY_ID is not set in .env
When the content engine attempts an upload
Then it logs: "[upload] R2 not configured. Set R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL in .env"
And the calendar item is marked as "failed" with reason "upload_config_missing"
And the pipeline continues to the next item (does not crash)
```

### Scenario: R2 upload failure — retry once then fail

```gherkin
Given R2 credentials are configured
When an upload to R2 fails (network error, 5xx, timeout)
Then the script retries the upload once after a 3-second wait
And if the retry also fails, marks the item as "failed" with the error message
And logs: "[upload] Failed after retry: {error}"
And continues to the next calendar item
```

### Scenario: projects.json updated to reference R2 instead of Cloudinary

```gherkin
Given projects.json has a "cloudinary" config block per project:
  { "cloud_name_env": "CLOUDINARY_CLOUD_NAME", "api_key_env": ..., "api_secret_env": ... }
When the migration is applied
Then each project's "cloudinary" block is replaced with "r2":
  {
    "account_id_env": "R2_ACCOUNT_ID",
    "bucket_name_env": "R2_BUCKET_NAME",
    "access_key_id_env": "R2_ACCESS_KEY_ID",
    "secret_access_key_env": "R2_SECRET_ACCESS_KEY",
    "public_url_env": "R2_PUBLIC_URL"
  }
And no Cloudinary references remain in projects.json
```

### Scenario: Content engine SKILL.md references R2 instead of Cloudinary

```gherkin
Given the content engine SKILL.md has Cloudinary upload instructions and curl examples
When the migration is applied
Then all Cloudinary upload instructions are replaced with R2 equivalents
And the prerequisites table lists R2 env vars instead of CLOUDINARY_* vars
And the execution pipeline step 2 ("Upload to Cloudinary") becomes "Upload to R2"
And the reference points to references/r2-upload.md instead of cloudinary-upload.md
```

### Scenario: Cost tracker rates updated

```gherkin
Given rates.json has: "cloudinary": { "default": { "unit": "upload", "rate": 0.0, "plan": "free" } }
When the migration is applied
Then it becomes: "r2": { "default": { "unit": "GB-month", "rate": 0.015, "plan": "pay-as-you-go", "note": "zero egress fees" } }
And the daily briefing script references "r2" instead of "cloudinary"
```

### Scenario: Old Cloudinary assets still accessible (no migration needed)

```gherkin
Given videos previously uploaded to Cloudinary have public URLs
And those URLs are stored in historical calendar.json files
When nothing changes about Cloudinary's read access
Then old Cloudinary URLs continue to work (Cloudinary free tier still serves existing files)
And no data migration is needed — only new uploads go to R2
```

---

## Pipeline Integration

```
Step 7 (previously "Upload to Cloudinary + schedule via Zernio"):

  BEFORE:
    Render MP4 → curl POST to Cloudinary → get secure_url → schedule via Zernio

  AFTER:
    Render MP4 → upload-media.sh (PUT to R2 via S3 API) → get public URL → schedule via Zernio
```

Everything else in the pipeline is unchanged. Zernio doesn't care where the URL points — it just needs a valid public HTTPS URL to a video/image file.

---

## Files Changed

| File | Change |
|------|--------|
| `DonatoSkills/content-engine/references/r2-upload.md` | NEW — R2 upload reference (replaces cloudinary-upload.md) |
| `DonatoSkills/content-engine/scripts/upload-media.sh` | NEW — Shell script for R2 uploads via aws CLI or curl |
| `DonatoSkills/content-engine/SKILL.md` | UPDATE — Replace all Cloudinary refs with R2 |
| `DonatoSkills/projects.json` | UPDATE — Replace cloudinary config blocks with r2 |
| `DonatoSkills/cost-tracker/rates.json` | UPDATE — Replace cloudinary rate with r2 |
| `DonatoSkills/shared-references/project-registry.md` | UPDATE — Document r2 config fields |
| `DonatoSkills/analytics-loop/scripts/daily-briefing.js` | UPDATE — Reference r2 instead of cloudinary |
| `DonatoSkills/content-engine/references/cloudinary-upload.md` | DELETE |

---

## What This Does NOT Change

- Video rendering (Remotion) — unchanged
- TTS audio generation — unchanged
- Image generation — unchanged
- Zernio scheduling — unchanged (just receives a different URL domain)
- Analytics loop scoring — unchanged
- Stock video fetcher — unchanged
- Historical Cloudinary URLs — still work, no migration needed

---

## R2 Upload Reference (preview)

```bash
# Upload a file to R2 using aws CLI (preferred — handles signing automatically)
aws s3 cp "$LOCAL_FILE" "s3://${R2_BUCKET_NAME}/${OBJECT_KEY}" \
  --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
  --content-type "${CONTENT_TYPE}"

# Public URL:
echo "${R2_PUBLIC_URL}/${OBJECT_KEY}"
```

The `aws` CLI is pre-installed on macOS via Homebrew. If not available, fall back to
curl with manual S3v4 signing (more complex but zero dependencies).

---

## Environment Variables (new)

```bash
# .env / .env.local
R2_ACCOUNT_ID=          # Cloudflare account ID
R2_BUCKET_NAME=         # e.g. facts-unlocked-media
R2_ACCESS_KEY_ID=       # From R2 API token
R2_SECRET_ACCESS_KEY=   # From R2 API token (shown once at creation)
R2_PUBLIC_URL=          # e.g. https://media.factsunlocked.com or https://pub-xxx.r2.dev
```

---

## Cost Comparison

| Service | Storage | Bandwidth | Monthly Cost (est.) |
|---------|---------|-----------|---------------------|
| Cloudinary Free | 25GB | 25GB/mo | $0 (exhausted) |
| Cloudinary Plus | 25GB+ | 25GB+ | $99/mo |
| **R2** | **Pay per GB** | **Free egress** | **~$0.50/mo** |

At ~27 videos/day x ~5MB = ~135MB/day = ~4GB/month storage. R2 cost: $0.06/month.

---

## Decisions

- **Upload method**: curl with manual S3v4 signing (aws CLI not installed, avoid new dependency)
- **Public URL**: *.r2.dev subdomain (free, no custom domain setup needed)
- **Lifecycle**: Auto-delete uploads after 30 days (Zernio fetches once; analytics data is retained in calendar.json independently of the media URL)

---

## Learnings

<!-- This section grows over time via /compound -->
