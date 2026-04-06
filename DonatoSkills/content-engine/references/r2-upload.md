# Cloudflare R2 Upload Reference

Upload local media files to Cloudflare R2 to get public URLs for Zernio scheduling.

Replaces Cloudinary (free tier exhausted 2026-04-05).

## Environment Variables

```
R2_ACCOUNT_ID=            # Cloudflare account ID (dashboard URL or sidebar)
R2_BUCKET_NAME=           # e.g. facts-unlocked-media
R2_ACCESS_KEY_ID=         # From R2 > Manage R2 API Tokens
R2_SECRET_ACCESS_KEY=     # Shown once at token creation
R2_PUBLIC_URL=            # e.g. https://pub-xxx.r2.dev (from bucket Settings > Public Access)
```

## Upload Script

Use the shell script for quick uploads:

```bash
./content-engine/scripts/upload-media.sh <local-file> <campaign-slug> <item-id>

# Example:
./content-engine/scripts/upload-media.sh \
  ./calendars/baby-facts-2026-04-05/videos/001-newborns-hear/out.mp4 \
  baby-facts-2026-04-05 \
  001-newborns-hear

# Output: https://pub-xxx.r2.dev/content-engine/baby-facts-2026-04-05/001-newborns-hear.mp4
```

## Node.js Module

For programmatic use within the content engine:

```javascript
const { uploadToR2, buildObjectKey, loadR2ConfigFromEnv } = require("./scripts/r2-upload");

const config = loadR2ConfigFromEnv();
const objectKey = buildObjectKey({
  campaignSlug: "baby-facts-2026-04-05",
  itemId: "001-newborns-hear",
  extension: ".mp4",
});

const result = uploadToR2({ filePath: "/path/to/video.mp4", objectKey, config });

if (result.success) {
  console.log("Public URL:", result.url);
  // => https://pub-xxx.r2.dev/content-engine/baby-facts-2026-04-05/001-newborns-hear.mp4
} else {
  console.error("Upload failed:", result.error);
}
```

## Object Key Format

All uploads use the prefix `content-engine/` for organization:

```
content-engine/{campaign-slug}/{item-id}.{ext}
```

## How It Works

1. File is read and SHA-256 hashed
2. AWS Signature V4 headers are computed (R2 uses region `auto`)
3. `curl` PUTs the file to `https://{ACCOUNT_ID}.r2.cloudflarestorage.com/{BUCKET}/{key}`
4. Public URL is constructed from `R2_PUBLIC_URL` + object key
5. On failure, retries once after 3 seconds

No SDK dependencies — pure curl + crypto.

## Error Handling

| Situation | Behavior |
|-----------|----------|
| Missing env vars | Returns error listing which vars are missing |
| File not found | Returns error immediately |
| Network/5xx error | Retries once after 3s, then fails |
| Success (200/201) | Returns `{ success: true, url: "..." }` |

## Lifecycle

Bucket has a 30-day auto-delete lifecycle rule. Zernio fetches the media URL once at
scheduling time, so the file only needs to exist briefly. Analytics data is retained
independently in `calendar.json`.

## Cost

- Storage: $0.015/GB/month
- Egress: $0 (free)
- At ~27 videos/day x ~5MB = ~4GB/month = ~$0.06/month
- With 30-day lifecycle: even less since old files are cleaned up

## Migration Notes

- Old Cloudinary URLs in historical `calendar.json` files continue to work
- No data migration needed — only new uploads go to R2
- `cloudinary-upload.md` is deprecated and removed
