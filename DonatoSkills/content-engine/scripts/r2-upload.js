/**
 * r2-upload.js — Upload media to Cloudflare R2 via S3-compatible API
 *
 * Uses AWS Signature V4 signing (no SDK dependencies).
 * R2 uses "auto" as region and the endpoint is:
 *   https://{ACCOUNT_ID}.r2.cloudflarestorage.com
 *
 * Public URLs served via the *.r2.dev subdomain.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ─────────────────────────────────────────────
// Config validation
// ─────────────────────────────────────────────

const REQUIRED_FIELDS = {
  accountId: "R2_ACCOUNT_ID",
  bucketName: "R2_BUCKET_NAME",
  accessKeyId: "R2_ACCESS_KEY_ID",
  secretAccessKey: "R2_SECRET_ACCESS_KEY",
  publicUrl: "R2_PUBLIC_URL",
};

function validateR2Config(config) {
  const missing = [];
  for (const [field, envName] of Object.entries(REQUIRED_FIELDS)) {
    if (!config[field]) {
      missing.push(envName);
    }
  }
  return { valid: missing.length === 0, missing };
}

function loadR2ConfigFromEnv() {
  return {
    accountId: process.env.R2_ACCOUNT_ID,
    bucketName: process.env.R2_BUCKET_NAME,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    publicUrl: process.env.R2_PUBLIC_URL,
  };
}

// ─────────────────────────────────────────────
// Object key construction
// ─────────────────────────────────────────────

function sanitize(str) {
  return str
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildObjectKey({ campaignSlug, itemId, extension }) {
  const slug = sanitize(campaignSlug);
  const id = sanitize(itemId);
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  return `content-engine/${slug}/${id}${ext}`;
}

// ─────────────────────────────────────────────
// Content-type detection
// ─────────────────────────────────────────────

const MIME_TYPES = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function detectContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

// ─────────────────────────────────────────────
// AWS Signature V4 (for R2 S3-compatible API)
// ─────────────────────────────────────────────

function hmac(key, data) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function sha256hex(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function getSigningKey(secretKey, dateStamp, region, service) {
  const kDate = hmac(Buffer.from("AWS4" + secretKey), dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  return kSigning;
}

function createS3v4Headers({ method, objectKey, contentType, contentHash, config }) {
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").slice(0, 8); // YYYYMMDD
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, ""); // YYYYMMDDTHHMMSSZ

  const region = "auto"; // R2 uses "auto"
  const service = "s3";
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  // Canonical request
  const canonicalUri = `/${config.bucketName}/${objectKey}`;
  const canonicalQueryString = "";
  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${contentHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    contentHash,
  ].join("\n");

  // String to sign
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256hex(canonicalRequest),
  ].join("\n");

  // Signature
  const signingKey = getSigningKey(config.secretAccessKey, dateStamp, region, service);
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    Authorization: authorization,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": contentHash,
    Host: host,
    "Content-Type": contentType,
  };
}

// ─────────────────────────────────────────────
// Upload via curl
// ─────────────────────────────────────────────

function uploadToR2({ filePath, objectKey, config, retries = 1 }) {
  const validation = validateR2Config(config);
  if (!validation.valid) {
    return {
      success: false,
      error: `R2 not configured. Missing: ${validation.missing.join(", ")}`,
    };
  }

  if (!fs.existsSync(filePath)) {
    return { success: false, error: `File not found: ${filePath}` };
  }

  const fileBuffer = fs.readFileSync(filePath);
  const contentHash = sha256hex(fileBuffer);
  const contentType = detectContentType(filePath);

  const headers = createS3v4Headers({
    method: "PUT",
    objectKey,
    contentType,
    contentHash,
    config,
  });

  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucketName}/${objectKey}`;
  const publicUrl = config.publicUrl.replace(/\/+$/, "") + "/" + objectKey;

  // Build curl command
  const headerArgs = Object.entries(headers)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(" ");

  const curlCmd = `curl -s -o /dev/null -w "%{http_code}" -X PUT "${endpoint}" ${headerArgs} --data-binary @"${filePath}"`;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const statusCode = execSync(curlCmd, {
        encoding: "utf8",
        timeout: 120000,
      }).trim();

      if (statusCode === "200" || statusCode === "201") {
        return { success: true, url: publicUrl, statusCode: parseInt(statusCode) };
      }

      lastError = `HTTP ${statusCode}`;
    } catch (err) {
      lastError = err.message;
    }

    if (attempt < retries) {
      // Wait 3 seconds before retry
      execSync("sleep 3");
    }
  }

  return {
    success: false,
    error: `Failed after ${retries + 1} attempts: ${lastError}`,
  };
}

// ─────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────

module.exports = {
  buildObjectKey,
  detectContentType,
  createS3v4Headers,
  uploadToR2,
  validateR2Config,
  loadR2ConfigFromEnv,
};
