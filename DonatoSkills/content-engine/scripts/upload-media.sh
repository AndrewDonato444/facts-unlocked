#!/usr/bin/env bash
#
# upload-media.sh — Upload a local file to Cloudflare R2 and print the public URL.
#
# Usage:
#   ./upload-media.sh <local-file> <campaign-slug> <item-id>
#
# Example:
#   ./upload-media.sh ./videos/001-baby-facts/out.mp4 baby-facts-2026-04-05 001-baby-facts
#   # => https://pub-xxx.r2.dev/content-engine/baby-facts-2026-04-05/001-baby-facts.mp4
#
# Required env vars (set in .env / .env.local):
#   R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL
#

set -euo pipefail

LOCAL_FILE="$1"
CAMPAIGN_SLUG="$2"
ITEM_ID="$3"

# ── Validate inputs ──────────────────────────────────────────────────────────

if [[ ! -f "$LOCAL_FILE" ]]; then
  echo "[upload] File not found: $LOCAL_FILE" >&2
  exit 1
fi

for var in R2_ACCOUNT_ID R2_BUCKET_NAME R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_PUBLIC_URL; do
  if [[ -z "${!var:-}" ]]; then
    echo "[upload] R2 not configured. Set R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL in .env" >&2
    exit 1
  fi
done

# ── Derive object key ────────────────────────────────────────────────────────

EXT="${LOCAL_FILE##*.}"
SAFE_SLUG=$(echo "$CAMPAIGN_SLUG" | sed 's/[^a-zA-Z0-9._-]/-/g')
SAFE_ID=$(echo "$ITEM_ID" | sed 's/[^a-zA-Z0-9._-]/-/g')
OBJECT_KEY="content-engine/${SAFE_SLUG}/${SAFE_ID}.${EXT}"

# ── Detect content type ──────────────────────────────────────────────────────

case "$EXT" in
  mp4)  CONTENT_TYPE="video/mp4" ;;
  webm) CONTENT_TYPE="video/webm" ;;
  mov)  CONTENT_TYPE="video/quicktime" ;;
  png)  CONTENT_TYPE="image/png" ;;
  jpg|jpeg) CONTENT_TYPE="image/jpeg" ;;
  gif)  CONTENT_TYPE="image/gif" ;;
  webp) CONTENT_TYPE="image/webp" ;;
  *)    CONTENT_TYPE="application/octet-stream" ;;
esac

# ── S3v4 signing ─────────────────────────────────────────────────────────────

ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
HOST="${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
REGION="auto"
SERVICE="s3"

DATE_STAMP=$(date -u +%Y%m%d)
AMZ_DATE=$(date -u +%Y%m%dT%H%M%SZ)
CONTENT_SHA256=$(shasum -a 256 "$LOCAL_FILE" | cut -d' ' -f1)

CANONICAL_URI="/${R2_BUCKET_NAME}/${OBJECT_KEY}"
CANONICAL_QUERYSTRING=""
CANONICAL_HEADERS="content-type:${CONTENT_TYPE}\nhost:${HOST}\nx-amz-content-sha256:${CONTENT_SHA256}\nx-amz-date:${AMZ_DATE}\n"
SIGNED_HEADERS="content-type;host;x-amz-content-sha256;x-amz-date"

CANONICAL_REQUEST="PUT\n${CANONICAL_URI}\n${CANONICAL_QUERYSTRING}\n${CANONICAL_HEADERS}\n${SIGNED_HEADERS}\n${CONTENT_SHA256}"

CREDENTIAL_SCOPE="${DATE_STAMP}/${REGION}/${SERVICE}/aws4_request"
STRING_TO_SIGN="AWS4-HMAC-SHA256\n${AMZ_DATE}\n${CREDENTIAL_SCOPE}\n$(printf '%b' "$CANONICAL_REQUEST" | shasum -a 256 | cut -d' ' -f1)"

# HMAC helper using openssl
hmac_sha256() {
  printf '%b' "$2" | openssl dgst -sha256 -mac HMAC -macopt "hexkey:$1" 2>/dev/null | cut -d' ' -f2
}

# Signing key chain
K_SECRET=$(printf 'AWS4%s' "$R2_SECRET_ACCESS_KEY" | xxd -p -c 256)
K_DATE=$(hmac_sha256 "$K_SECRET" "$DATE_STAMP")
K_REGION=$(hmac_sha256 "$K_DATE" "$REGION")
K_SERVICE=$(hmac_sha256 "$K_REGION" "$SERVICE")
K_SIGNING=$(hmac_sha256 "$K_SERVICE" "aws4_request")

SIGNATURE=$(printf '%b' "$STRING_TO_SIGN" | openssl dgst -sha256 -mac HMAC -macopt "hexkey:${K_SIGNING}" 2>/dev/null | cut -d' ' -f2)

AUTHORIZATION="AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${CREDENTIAL_SCOPE}, SignedHeaders=${SIGNED_HEADERS}, Signature=${SIGNATURE}"

# ── Upload with retry ────────────────────────────────────────────────────────

upload() {
  curl -s -o /dev/null -w "%{http_code}" -X PUT \
    "${ENDPOINT}/${R2_BUCKET_NAME}/${OBJECT_KEY}" \
    -H "Authorization: ${AUTHORIZATION}" \
    -H "Content-Type: ${CONTENT_TYPE}" \
    -H "Host: ${HOST}" \
    -H "x-amz-date: ${AMZ_DATE}" \
    -H "x-amz-content-sha256: ${CONTENT_SHA256}" \
    --data-binary "@${LOCAL_FILE}"
}

STATUS=$(upload)
if [[ "$STATUS" != "200" && "$STATUS" != "201" ]]; then
  echo "[upload] First attempt failed (HTTP $STATUS). Retrying in 3s..." >&2
  sleep 3
  STATUS=$(upload)
  if [[ "$STATUS" != "200" && "$STATUS" != "201" ]]; then
    echo "[upload] Failed after retry: HTTP $STATUS" >&2
    exit 1
  fi
fi

# ── Output public URL ────────────────────────────────────────────────────────

PUBLIC_URL="${R2_PUBLIC_URL%/}/${OBJECT_KEY}"
echo "$PUBLIC_URL"
