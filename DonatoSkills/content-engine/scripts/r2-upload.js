#!/usr/bin/env node
/**
 * r2-upload.js — Upload a file to Cloudflare R2 and return the public URL.
 *
 * Usage:
 *   node r2-upload.js <local-file-path> [destination-key]
 *
 * If destination-key is omitted, defaults to:
 *   videos/<YYYY-MM-DD>/<basename>
 *
 * Env vars required (in .env.local or environment):
 *   R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID,
 *   R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL
 *
 * Output: prints the public URL to stdout on success.
 * Exit code: 0 on success, 1 on error.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");

// ── Load .env.local if env vars not already set ──────────────────────────────
function loadEnv() {
  const candidates = [
    path.resolve(__dirname, "../../../.env.local"),
    path.resolve(__dirname, "../../../../.env.local"),
    path.resolve(process.cwd(), ".env.local"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const lines = fs.readFileSync(p, "utf8").split("\n");
      for (const line of lines) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
        }
      }
      break;
    }
  }
}

loadEnv();

const {
  R2_ACCOUNT_ID,
  R2_BUCKET_NAME,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_PUBLIC_URL,
} = process.env;

if (!R2_ACCOUNT_ID || !R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL) {
  console.error(
    "Missing R2 env vars. Need: R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL"
  );
  process.exit(1);
}

const [, , localFile, destKey] = process.argv;

if (!localFile) {
  console.error("Usage: node r2-upload.js <local-file> [destination-key]");
  process.exit(1);
}

if (!fs.existsSync(localFile)) {
  console.error(`File not found: ${localFile}`);
  process.exit(1);
}

// ── Build destination key ────────────────────────────────────────────────────
function buildKey(filePath, key) {
  if (key) return key;
  const date = new Date().toISOString().slice(0, 10);
  return `videos/${date}/${path.basename(filePath)}`;
}

// ── AWS Signature V4 (Cloudflare R2 is S3-compatible) ────────────────────────
// Uses virtual-hosted style: bucket.accountId.r2.cloudflarestorage.com/<key>
function hmac(key, data) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function hmacHex(key, data) {
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

function sha256Hex(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

async function upload(localPath, key) {
  const fileBuffer = fs.readFileSync(localPath);
  const fileSize = fileBuffer.length;

  const ext = path.extname(localPath).toLowerCase();
  const contentType =
    ext === ".mp4" ? "video/mp4" :
    ext === ".mov" ? "video/quicktime" :
    ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
    ext === ".png" ? "image/png" :
    ext === ".gif" ? "image/gif" :
    ext === ".webp" ? "image/webp" :
    "application/octet-stream";

  // Virtual-hosted style: bucket name is part of the hostname
  const endpoint = `${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const region = "auto";
  const service = "s3";

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = sha256Hex(fileBuffer);
  const encodedKey = "/" + key.split("/").map(encodeURIComponent).join("/");

  const headers = {
    host: endpoint,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    "content-type": contentType,
    "content-length": String(fileSize),
  };

  const sortedHeaderKeys = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaderKeys.map((k) => `${k}:${headers[k]}\n`).join("");
  const signedHeaders = sortedHeaderKeys.join(";");

  const canonicalRequest = [
    "PUT",
    encodedKey,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmac("AWS4" + R2_SECRET_ACCESS_KEY, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmacHex(kSigning, stringToSign);

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: endpoint,
        path: encodedKey,
        method: "PUT",
        headers: {
          ...headers,
          Authorization: authorization,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const publicUrl = `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
            resolve(publicUrl);
          } else {
            reject(new Error(`R2 upload failed: HTTP ${res.statusCode}\n${body}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(fileBuffer);
    req.end();
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
const key = buildKey(localFile, destKey);

process.stderr.write(`Uploading ${path.basename(localFile)} → r2://${R2_BUCKET_NAME}/${key} ... `);

upload(localFile, key)
  .then((url) => {
    process.stderr.write("done\n");
    console.log(url);
  })
  .catch((err) => {
    process.stderr.write("FAILED\n");
    console.error(err.message);
    process.exit(1);
  });
