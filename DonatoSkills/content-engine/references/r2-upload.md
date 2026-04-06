# R2 Upload Reference

Media hosting uses **Cloudflare R2** (migrated from Cloudinary, ~2026-03).

## Script

```bash
node DonatoSkills/content-engine/scripts/r2-upload.js <local-file> [destination-key]
```

- **local-file** — absolute or relative path to the MP4/image to upload
- **destination-key** — optional R2 key (path inside the bucket). Defaults to `videos/<YYYY-MM-DD>/<basename>`

**Output**: prints the public URL to stdout on success.

## Env Vars (in `.env.local`)

| Var | Purpose |
|-----|---------|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_BUCKET_NAME` | Bucket name (`factsunlocked`) |
| `R2_ACCESS_KEY_ID` | R2 API token key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_PUBLIC_URL` | Public base URL for the bucket |

## Examples

```bash
# Upload a rendered video (auto-generates key from date + filename)
node DonatoSkills/content-engine/scripts/r2-upload.js \
  DonatoSkills/content-engine/calendars/facts-unlocked-2026-04-06/videos/001-fetal-heartbeat-starts/out/video.mp4

# Upload with explicit key
node DonatoSkills/content-engine/scripts/r2-upload.js \
  out/video.mp4 \
  videos/2026-04-06/001-fetal-heartbeat-starts.mp4
```

## Using the URL

The returned URL is suitable for:
- Zernio `mediaItems[].url`
- Buffer `assets.videos[].url`
- Calendar JSON `asset_url` field

## Disk Cleanup After Upload

After a successful upload, delete the local MP4 to free disk space:

```bash
ASSET_URL=$(node DonatoSkills/content-engine/scripts/r2-upload.js out/video.mp4)
rm out/video.mp4
echo "Uploaded: $ASSET_URL"
```

**Always upload before deleting.** Never delete before confirming the URL is returned.
