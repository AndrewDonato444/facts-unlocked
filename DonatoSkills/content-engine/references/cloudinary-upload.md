# Cloudinary Upload Reference

Upload local media files to Cloudinary to get public URLs for Buffer.

## Environment Variables

```
CLOUDINARY_CLOUD_NAME=dk74vmp31
CLOUDINARY_API_KEY=169928797558157
CLOUDINARY_API_SECRET=Yj0i7fJ-DpbFfBs7rcu0qEXMaKU
```

## Signed Upload (Recommended)

Signed uploads use the API key + secret for authentication. Generate the signature inline.

### Video Upload

```bash
TIMESTAMP=$(date +%s)
SIGNATURE=$(echo -n "timestamp=${TIMESTAMP}${CLOUDINARY_API_SECRET}" | shasum -a 1 | cut -d' ' -f1)

curl -s -X POST "https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload" \
  -F "file=@path/to/video.mp4" \
  -F "api_key=${CLOUDINARY_API_KEY}" \
  -F "timestamp=${TIMESTAMP}" \
  -F "signature=${SIGNATURE}"
```

### Image Upload

```bash
TIMESTAMP=$(date +%s)
SIGNATURE=$(echo -n "timestamp=${TIMESTAMP}${CLOUDINARY_API_SECRET}" | shasum -a 1 | cut -d' ' -f1)

curl -s -X POST "https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload" \
  -F "file=@path/to/image.png" \
  -F "api_key=${CLOUDINARY_API_KEY}" \
  -F "timestamp=${TIMESTAMP}" \
  -F "signature=${SIGNATURE}"
```

## Response

```json
{
  "public_id": "sample_video",
  "version": 1234567890,
  "signature": "abc123...",
  "width": 1080,
  "height": 1080,
  "format": "mp4",
  "resource_type": "video",
  "bytes": 1234567,
  "url": "http://res.cloudinary.com/dk74vmp31/video/upload/v1234567890/sample_video.mp4",
  "secure_url": "https://res.cloudinary.com/dk74vmp31/video/upload/v1234567890/sample_video.mp4",
  "duration": 15.0
}
```

**Use `secure_url`** -- this is the HTTPS URL you pass to Buffer.

## With Custom Public ID

To organize uploads by campaign:

```bash
TIMESTAMP=$(date +%s)
PUBLIC_ID="content-engine/campaign-slug/item-001"
SIGNATURE=$(echo -n "public_id=${PUBLIC_ID}&timestamp=${TIMESTAMP}${CLOUDINARY_API_SECRET}" | shasum -a 1 | cut -d' ' -f1)

curl -s -X POST "https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload" \
  -F "file=@path/to/video.mp4" \
  -F "api_key=${CLOUDINARY_API_KEY}" \
  -F "timestamp=${TIMESTAMP}" \
  -F "signature=${SIGNATURE}" \
  -F "public_id=${PUBLIC_ID}"
```

**Note**: When adding extra parameters to signed uploads, ALL parameters (alphabetically sorted) must be included in the signature string, separated by `&`, before appending the API secret.

## Error Handling

| HTTP Code | Meaning | Action |
|-----------|---------|--------|
| 200 | Success | Extract `secure_url` |
| 400 | Bad request | Check file path, params |
| 401 | Auth error | Check API key/secret |
| 413 | File too large | Compress video first |
| 420 | Rate limited | Wait and retry |

Free tier limits:
- 25GB storage
- 25GB bandwidth/month
- Max file size: 100MB (video), 10MB (image)
