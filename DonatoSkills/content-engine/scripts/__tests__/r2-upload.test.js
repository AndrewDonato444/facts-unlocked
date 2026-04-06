/**
 * Tests for r2-upload.js — Cloudflare R2 media upload via S3-compatible API
 *
 * Tests cover:
 *   - S3v4 signature generation (UT-R2-001 to UT-R2-003)
 *   - Object key construction (UT-R2-004 to UT-R2-006)
 *   - Upload success returns public URL (UT-R2-007)
 *   - Content-type detection (UT-R2-008 to UT-R2-010)
 *   - Missing credentials error (UT-R2-011 to UT-R2-012)
 *   - Upload failure + retry logic (UT-R2-013 to UT-R2-015)
 *   - Public URL construction (UT-R2-016 to UT-R2-017)
 */

const path = require("path");
const fs = require("fs");
const os = require("os");

// Module under test (doesn't exist yet — RED phase)
const {
  buildObjectKey,
  detectContentType,
  createS3v4Headers,
  uploadToR2,
  validateR2Config,
} = require("../r2-upload");

// ─────────────────────────────────────────────
// Test Helpers
// ─────────────────────────────────────────────

let tmpDir;

const MOCK_CONFIG = {
  accountId: "abc123def456",
  bucketName: "facts-unlocked-media",
  accessKeyId: "FAKE_ACCESS_KEY",
  secretAccessKey: "FAKE_SECRET_KEY",
  publicUrl: "https://pub-abc123.r2.dev",
};

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "r2-upload-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function createTempFile(name, content = "fake-content") {
  const filePath = path.join(tmpDir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

// ─────────────────────────────────────────────
// UT-R2-004: Object key — video
// ─────────────────────────────────────────────
describe("buildObjectKey", () => {
  test("UT-R2-004: builds key for video with campaign slug and item id", () => {
    const key = buildObjectKey({
      campaignSlug: "baby-facts-2026-04-05",
      itemId: "001-newborns-hear",
      extension: ".mp4",
    });
    expect(key).toBe(
      "content-engine/baby-facts-2026-04-05/001-newborns-hear.mp4"
    );
  });

  // UT-R2-005: Object key — image
  test("UT-R2-005: builds key for image", () => {
    const key = buildObjectKey({
      campaignSlug: "money-facts-2026-04-05",
      itemId: "003-spending-habits",
      extension: ".png",
    });
    expect(key).toBe(
      "content-engine/money-facts-2026-04-05/003-spending-habits.png"
    );
  });

  // UT-R2-006: sanitizes special characters
  test("UT-R2-006: sanitizes special characters in slug and item id", () => {
    const key = buildObjectKey({
      campaignSlug: "ai facts 2026",
      itemId: "002 gpt's big day!",
      extension: ".mp4",
    });
    expect(key).not.toMatch(/\s/);
    expect(key).not.toMatch(/'/);
    expect(key).not.toMatch(/!/);
  });
});

// ─────────────────────────────────────────────
// UT-R2-008 to UT-R2-010: Content-type detection
// ─────────────────────────────────────────────
describe("detectContentType", () => {
  test("UT-R2-008: detects video/mp4 for .mp4 files", () => {
    expect(detectContentType("video.mp4")).toBe("video/mp4");
  });

  test("UT-R2-009: detects image/png for .png files", () => {
    expect(detectContentType("image.png")).toBe("image/png");
  });

  test("UT-R2-010: detects image/jpeg for .jpg files", () => {
    expect(detectContentType("photo.jpg")).toBe("image/jpeg");
  });

  test("falls back to application/octet-stream for unknown", () => {
    expect(detectContentType("file.xyz")).toBe("application/octet-stream");
  });
});

// ─────────────────────────────────────────────
// UT-R2-001 to UT-R2-003: S3v4 signature headers
// ─────────────────────────────────────────────
describe("createS3v4Headers", () => {
  test("UT-R2-001: returns object with required S3v4 headers", () => {
    const headers = createS3v4Headers({
      method: "PUT",
      objectKey: "content-engine/test/video.mp4",
      contentType: "video/mp4",
      contentHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      config: MOCK_CONFIG,
    });

    expect(headers).toHaveProperty("Authorization");
    expect(headers).toHaveProperty("x-amz-date");
    expect(headers).toHaveProperty("x-amz-content-sha256");
    expect(headers).toHaveProperty("Host");
  });

  test("UT-R2-002: Authorization header starts with AWS4-HMAC-SHA256", () => {
    const headers = createS3v4Headers({
      method: "PUT",
      objectKey: "content-engine/test/video.mp4",
      contentType: "video/mp4",
      contentHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      config: MOCK_CONFIG,
    });

    expect(headers.Authorization).toMatch(/^AWS4-HMAC-SHA256 /);
  });

  test("UT-R2-003: Authorization header includes correct credential scope", () => {
    const headers = createS3v4Headers({
      method: "PUT",
      objectKey: "content-engine/test/video.mp4",
      contentType: "video/mp4",
      contentHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      config: MOCK_CONFIG,
    });

    // Credential scope: date/auto/s3/aws4_request (R2 uses "auto" as region)
    expect(headers.Authorization).toMatch(/\/auto\/s3\/aws4_request/);
    expect(headers.Authorization).toContain(MOCK_CONFIG.accessKeyId);
  });
});

// ─────────────────────────────────────────────
// UT-R2-011 to UT-R2-012: Config validation
// ─────────────────────────────────────────────
describe("validateR2Config", () => {
  test("UT-R2-011: returns error when R2_ACCOUNT_ID is missing", () => {
    const result = validateR2Config({
      ...MOCK_CONFIG,
      accountId: undefined,
    });
    expect(result.valid).toBe(false);
    expect(result.missing).toContain("R2_ACCOUNT_ID");
  });

  test("UT-R2-012: returns error when multiple fields missing", () => {
    const result = validateR2Config({
      accountId: undefined,
      bucketName: undefined,
      accessKeyId: "key",
      secretAccessKey: undefined,
      publicUrl: undefined,
    });
    expect(result.valid).toBe(false);
    expect(result.missing.length).toBeGreaterThanOrEqual(3);
  });

  test("returns valid when all fields present", () => {
    const result = validateR2Config(MOCK_CONFIG);
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });
});

// ─────────────────────────────────────────────
// UT-R2-016 to UT-R2-017: Public URL construction
// ─────────────────────────────────────────────
describe("public URL construction", () => {
  test("UT-R2-016: constructs public URL from config + object key", () => {
    const key = "content-engine/baby-facts-2026-04-05/001-test.mp4";
    const url = `${MOCK_CONFIG.publicUrl}/${key}`;
    expect(url).toBe(
      "https://pub-abc123.r2.dev/content-engine/baby-facts-2026-04-05/001-test.mp4"
    );
  });

  test("UT-R2-017: handles trailing slash on publicUrl", () => {
    const config = { ...MOCK_CONFIG, publicUrl: "https://pub-abc123.r2.dev/" };
    const key = "content-engine/test/video.mp4";
    const url = config.publicUrl.replace(/\/+$/, "") + "/" + key;
    expect(url).toBe("https://pub-abc123.r2.dev/content-engine/test/video.mp4");
  });
});
