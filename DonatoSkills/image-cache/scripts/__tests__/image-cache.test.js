/**
 * Tests for image-cache.js — Per-Channel Image Caching and Reuse
 *
 * Tests cover:
 *   - Cache miss: first-time generation (UT-IC-001 to UT-IC-003)
 *   - Cache hit: reusable image found (UT-IC-004 to UT-IC-006)
 *   - Reuse limit enforcement (UT-IC-007 to UT-IC-008)
 *   - Tag extraction from prompts (UT-IC-009 to UT-IC-012)
 *   - Cross-topic reuse within channel (UT-IC-013 to UT-IC-014)
 *   - No cross-channel reuse (UT-IC-015 to UT-IC-016)
 *   - Cache cleanup / LRU eviction (UT-IC-017 to UT-IC-019)
 *   - Cache statistics reporting (UT-IC-020 to UT-IC-021)
 *   - Cache index persistence (UT-IC-022 to UT-IC-023)
 */

const path = require("path");
const fs = require("fs");
const os = require("os");

const {
  ImageCache,
  extractTags,
  jaccardSimilarity,
  generateCacheReport,
} = require("../image-cache");

// ─────────────────────────────────────────────
// Test Helpers
// ─────────────────────────────────────────────

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "image-cache-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function createFakeImage(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  // Write a minimal fake PNG (8-byte header)
  fs.writeFileSync(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return filePath;
}

function makeCache(channel, opts = {}) {
  return new ImageCache({
    cachePath: tmpDir,
    channel,
    maxReuse: opts.maxReuse || 5,
    maxCacheSize: opts.maxCacheSize || 150,
    minMatchScore: opts.minMatchScore || 0.4,
  });
}

function seedCacheEntry(cache, overrides = {}) {
  const hash = overrides.hash || "abc123";
  const imgPath = path.join(tmpDir, cache.channel, "images", `${hash}.png`);
  createFakeImage(imgPath);

  const entry = {
    hash,
    file: `images/${hash}.png`,
    prompt: overrides.prompt || "A baby sleeping in a crib",
    tags: overrides.tags || ["baby", "sleeping", "crib"],
    aspect_ratio: overrides.aspect_ratio || "9:16",
    provider: overrides.provider || "gemini",
    model: overrides.model || "gemini-2.5-flash-image",
    file_size_bytes: 8,
    created: overrides.created || "2026-03-17T10:00:00Z",
    last_used: overrides.last_used || "2026-03-17T10:00:00Z",
    use_count: overrides.use_count || 1,
    used_in: overrides.used_in || [],
  };

  cache._addEntryDirectly(entry);
  return entry;
}

// ─────────────────────────────────────────────
// Jaccard Similarity (pure function)
// ─────────────────────────────────────────────

describe("jaccardSimilarity", () => {
  test("UT-IC-000a: identical sets score 1.0", () => {
    expect(jaccardSimilarity(["a", "b", "c"], ["a", "b", "c"])).toBe(1.0);
  });

  test("UT-IC-000b: disjoint sets score 0.0", () => {
    expect(jaccardSimilarity(["a", "b"], ["c", "d"])).toBe(0.0);
  });

  test("UT-IC-000c: partial overlap scores correctly", () => {
    // intersection = {a, b}, union = {a, b, c, d} → 2/4 = 0.5
    expect(jaccardSimilarity(["a", "b", "c"], ["a", "b", "d"])).toBeCloseTo(0.5, 2);
  });

  test("UT-IC-000d: empty sets return 0.0", () => {
    expect(jaccardSimilarity([], [])).toBe(0.0);
    expect(jaccardSimilarity(["a"], [])).toBe(0.0);
  });
});

// ─────────────────────────────────────────────
// Tag Extraction
// ─────────────────────────────────────────────

describe("Tag extraction: extractTags", () => {
  test("UT-IC-009: extracts meaningful nouns and adjectives from prompt", () => {
    const tags = extractTags(
      "A cozy nursery with soft pastel colors, a sleeping baby in a crib, warm morning light"
    );
    expect(tags).toContain("nursery");
    expect(tags).toContain("baby");
    expect(tags).toContain("sleeping");
    expect(tags).toContain("crib");
    expect(tags).toContain("warm");
    expect(tags).toContain("pastel");
  });

  test("UT-IC-010: filters out stop words and articles", () => {
    const tags = extractTags("A beautiful scene with the baby in a warm room");
    expect(tags).not.toContain("a");
    expect(tags).not.toContain("the");
    expect(tags).not.toContain("with");
    expect(tags).not.toContain("in");
  });

  test("UT-IC-011: returns lowercase tags", () => {
    const tags = extractTags("Bright COLORFUL Nursery");
    for (const tag of tags) {
      expect(tag).toBe(tag.toLowerCase());
    }
  });

  test("UT-IC-012: empty prompt returns empty array", () => {
    expect(extractTags("")).toEqual([]);
    expect(extractTags(null)).toEqual([]);
    expect(extractTags(undefined)).toEqual([]);
  });
});

// ─────────────────────────────────────────────
// Cache Miss: First-time generation
// ─────────────────────────────────────────────

describe("Cache miss: first-time generation", () => {
  test("UT-IC-001: query returns null when cache is empty", () => {
    const cache = makeCache("baby-facts-unlocked");
    const result = cache.query(["baby", "sleeping", "peaceful"]);
    expect(result).toBeNull();
  });

  test("UT-IC-002: addImage writes entry to cache index", () => {
    const cache = makeCache("baby-facts-unlocked");
    const imgPath = createFakeImage(path.join(tmpDir, "source", "bg.png"));

    const entry = cache.addImage({
      sourcePath: imgPath,
      prompt: "A sleeping baby in a nursery",
      tags: ["baby", "sleeping", "nursery"],
      aspectRatio: "9:16",
      provider: "gemini",
      model: "gemini-2.5-flash-image",
    });

    expect(entry.hash).toBeDefined();
    expect(entry.tags).toEqual(["baby", "sleeping", "nursery"]);
    expect(entry.use_count).toBe(1);
    expect(entry.aspect_ratio).toBe("9:16");
    expect(entry.provider).toBe("gemini");

    // File should exist in cache directory
    const cachedFile = path.join(tmpDir, "baby-facts-unlocked", entry.file);
    expect(fs.existsSync(cachedFile)).toBe(true);
  });

  test("UT-IC-003: addImage persists to cache-index.json", () => {
    const cache = makeCache("baby-facts-unlocked");
    const imgPath = createFakeImage(path.join(tmpDir, "source", "bg.png"));

    cache.addImage({
      sourcePath: imgPath,
      prompt: "A sleeping baby",
      tags: ["baby", "sleeping"],
      aspectRatio: "9:16",
      provider: "gemini",
      model: "gemini-2.5-flash-image",
    });

    // Read raw JSON to verify persistence
    const indexPath = path.join(tmpDir, "baby-facts-unlocked", "cache-index.json");
    expect(fs.existsSync(indexPath)).toBe(true);

    const raw = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
    expect(raw.version).toBe(1);
    expect(raw.channel).toBe("baby-facts-unlocked");
    expect(raw.images.length).toBe(1);
    expect(raw.images[0].tags).toEqual(["baby", "sleeping"]);
  });
});

// ─────────────────────────────────────────────
// Cache Hit: Reusable image found
// ─────────────────────────────────────────────

describe("Cache hit: reusable image found", () => {
  test("UT-IC-004: query returns matching image when tags overlap sufficiently", () => {
    const cache = makeCache("baby-facts-unlocked");
    seedCacheEntry(cache, {
      hash: "match1",
      tags: ["baby", "sleeping", "nursery"],
      use_count: 2,
    });

    // Query with 2/4 overlap → Jaccard = 2 / union(baby,sleeping,nursery,calm) = 2/4 = 0.5
    const result = cache.query(["baby", "sleeping", "calm"]);
    expect(result).not.toBeNull();
    expect(result.hash).toBe("match1");
  });

  test("UT-IC-005: query increments use_count on hit", () => {
    const cache = makeCache("baby-facts-unlocked");
    seedCacheEntry(cache, {
      hash: "inc1",
      tags: ["baby", "sleeping", "nursery"],
      use_count: 2,
    });

    cache.query(["baby", "sleeping", "calm"]);

    const entry = cache.getEntry("inc1");
    expect(entry.use_count).toBe(3);
  });

  test("UT-IC-006: query updates last_used timestamp on hit", () => {
    const cache = makeCache("baby-facts-unlocked");
    seedCacheEntry(cache, {
      hash: "ts1",
      tags: ["baby", "sleeping"],
      last_used: "2026-03-10T00:00:00Z",
    });

    const before = new Date("2026-03-10T00:00:00Z");
    cache.query(["baby", "sleeping"]);

    const entry = cache.getEntry("ts1");
    const after = new Date(entry.last_used);
    expect(after.getTime()).toBeGreaterThan(before.getTime());
  });
});

// ─────────────────────────────────────────────
// Reuse Limit Enforcement
// ─────────────────────────────────────────────

describe("Reuse limit enforcement", () => {
  test("UT-IC-007: query returns null when only match is at max reuse", () => {
    const cache = makeCache("baby-facts-unlocked", { maxReuse: 5 });
    seedCacheEntry(cache, {
      hash: "maxed",
      tags: ["baby", "sleeping"],
      use_count: 5,
    });

    const result = cache.query(["baby", "sleeping"]);
    expect(result).toBeNull();
  });

  test("UT-IC-008: query skips maxed image and returns next best match", () => {
    const cache = makeCache("baby-facts-unlocked", { maxReuse: 5 });

    // Maxed out image — perfect match
    seedCacheEntry(cache, {
      hash: "maxed",
      tags: ["baby", "sleeping", "nursery"],
      use_count: 5,
    });

    // Lower match but under limit
    seedCacheEntry(cache, {
      hash: "available",
      tags: ["baby", "sleeping", "blanket"],
      use_count: 2,
    });

    const result = cache.query(["baby", "sleeping", "nursery"]);
    expect(result).not.toBeNull();
    expect(result.hash).toBe("available");
  });
});

// ─────────────────────────────────────────────
// Cross-topic reuse within same channel
// ─────────────────────────────────────────────

describe("Cross-topic reuse within channel", () => {
  test("UT-IC-013: image cached for one topic is reused for related topic", () => {
    const cache = makeCache("baby-facts-unlocked");
    seedCacheEntry(cache, {
      hash: "milestones",
      tags: ["baby", "happy", "colorful", "playroom"],
      use_count: 1,
    });

    // Query for related topic — 3/5 Jaccard overlap
    const result = cache.query(["baby", "first-steps", "happy", "playroom"]);
    expect(result).not.toBeNull();
    expect(result.hash).toBe("milestones");
  });

  test("UT-IC-014: prefers less-used image when scores are equal", () => {
    const cache = makeCache("baby-facts-unlocked");
    seedCacheEntry(cache, {
      hash: "used-more",
      tags: ["baby", "happy"],
      use_count: 4,
    });
    seedCacheEntry(cache, {
      hash: "used-less",
      tags: ["baby", "happy"],
      use_count: 1,
    });

    const result = cache.query(["baby", "happy"]);
    expect(result.hash).toBe("used-less");
  });
});

// ─────────────────────────────────────────────
// No Cross-Channel Reuse
// ─────────────────────────────────────────────

describe("No cross-channel reuse", () => {
  test("UT-IC-015: channel A cache is invisible to channel B", () => {
    const cacheA = makeCache("baby-facts-unlocked");
    seedCacheEntry(cacheA, {
      hash: "baby1",
      tags: ["baby", "sleeping"],
    });

    const cacheB = makeCache("money-facts-unlocked");
    const result = cacheB.query(["baby", "sleeping"]);
    expect(result).toBeNull();
  });

  test("UT-IC-016: adding image to channel A does not affect channel B index", () => {
    const cacheA = makeCache("baby-facts-unlocked");
    const imgPath = createFakeImage(path.join(tmpDir, "source", "bg.png"));

    cacheA.addImage({
      sourcePath: imgPath,
      prompt: "baby sleeping",
      tags: ["baby", "sleeping"],
      aspectRatio: "9:16",
      provider: "gemini",
      model: "gemini-2.5-flash-image",
    });

    // Channel B should have no index file
    const indexB = path.join(tmpDir, "money-facts-unlocked", "cache-index.json");
    expect(fs.existsSync(indexB)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Cache Cleanup / LRU Eviction
// ─────────────────────────────────────────────

describe("Cache cleanup: LRU eviction", () => {
  test("UT-IC-017: evicts oldest images when cache exceeds max size", () => {
    const cache = makeCache("baby-facts-unlocked", { maxCacheSize: 5 });

    // Seed 5 images with staggered last_used dates
    for (let i = 0; i < 5; i++) {
      seedCacheEntry(cache, {
        hash: `old-${i}`,
        tags: ["baby", `tag-${i}`],
        last_used: `2026-03-${String(10 + i).padStart(2, "0")}T00:00:00Z`,
      });
    }

    // Add a 6th image — should evict the oldest (old-0, last_used Mar 10)
    const imgPath = createFakeImage(path.join(tmpDir, "source", "new.png"));
    cache.addImage({
      sourcePath: imgPath,
      prompt: "new baby image",
      tags: ["baby", "new"],
      aspectRatio: "9:16",
      provider: "gemini",
      model: "gemini-2.5-flash-image",
    });

    expect(cache.size()).toBe(5);
    expect(cache.getEntry("old-0")).toBeUndefined();
  });

  test("UT-IC-018: evicted image files are deleted from disk", () => {
    const cache = makeCache("baby-facts-unlocked", { maxCacheSize: 2 });

    seedCacheEntry(cache, {
      hash: "evict-me",
      tags: ["baby"],
      last_used: "2026-03-01T00:00:00Z",
    });
    seedCacheEntry(cache, {
      hash: "keep-me",
      tags: ["baby"],
      last_used: "2026-03-15T00:00:00Z",
    });

    const evictPath = path.join(tmpDir, "baby-facts-unlocked", "images", "evict-me.png");
    expect(fs.existsSync(evictPath)).toBe(true);

    // Add new image to trigger eviction
    const imgPath = createFakeImage(path.join(tmpDir, "source", "new.png"));
    cache.addImage({
      sourcePath: imgPath,
      prompt: "new image",
      tags: ["baby", "new"],
      aspectRatio: "9:16",
      provider: "gemini",
      model: "gemini-2.5-flash-image",
    });

    expect(fs.existsSync(evictPath)).toBe(false);
  });

  test("UT-IC-019: eviction does not affect images under the limit", () => {
    const cache = makeCache("baby-facts-unlocked", { maxCacheSize: 10 });

    for (let i = 0; i < 5; i++) {
      seedCacheEntry(cache, {
        hash: `safe-${i}`,
        tags: ["baby", `tag-${i}`],
      });
    }

    const imgPath = createFakeImage(path.join(tmpDir, "source", "new.png"));
    cache.addImage({
      sourcePath: imgPath,
      prompt: "new image",
      tags: ["baby", "new"],
      aspectRatio: "9:16",
      provider: "gemini",
      model: "gemini-2.5-flash-image",
    });

    // All 6 should still be there
    expect(cache.size()).toBe(6);
  });
});

// ─────────────────────────────────────────────
// Cache Statistics Reporting
// ─────────────────────────────────────────────

describe("Cache statistics reporting", () => {
  test("UT-IC-020: generateCacheReport produces correct per-channel stats", () => {
    const stats = {
      "baby-facts-unlocked": { generated: 6, cached: 3, cacheSize: 47 },
      "money-facts-unlocked": { generated: 3, cached: 0, cacheSize: 12 },
    };

    const report = generateCacheReport(stats);

    expect(report).toContain("baby-facts-unlocked");
    expect(report).toContain("33%");
    expect(report).toContain("money-facts-unlocked");
    expect(report).toContain("0%");
    expect(report).toContain("3"); // total saved
  });

  test("UT-IC-021: report handles zero totals without division errors", () => {
    const stats = {
      "new-channel": { generated: 0, cached: 0, cacheSize: 0 },
    };

    const report = generateCacheReport(stats);
    expect(report).toContain("new-channel");
    expect(report).toContain("0%");
  });
});

// ─────────────────────────────────────────────
// Cache Index Persistence
// ─────────────────────────────────────────────

describe("Cache index persistence", () => {
  test("UT-IC-022: new ImageCache instance loads existing cache-index.json", () => {
    const cache1 = makeCache("baby-facts-unlocked");
    const imgPath = createFakeImage(path.join(tmpDir, "source", "bg.png"));

    cache1.addImage({
      sourcePath: imgPath,
      prompt: "baby sleeping",
      tags: ["baby", "sleeping"],
      aspectRatio: "9:16",
      provider: "gemini",
      model: "gemini-2.5-flash-image",
    });

    // Create a new instance pointing to the same path
    const cache2 = makeCache("baby-facts-unlocked");
    expect(cache2.size()).toBe(1);

    const result = cache2.query(["baby", "sleeping"]);
    expect(result).not.toBeNull();
  });

  test("UT-IC-023: cache survives write → read → write cycle", () => {
    const cache1 = makeCache("baby-facts-unlocked");
    const img1 = createFakeImage(path.join(tmpDir, "source", "bg1.png"));
    cache1.addImage({
      sourcePath: img1,
      prompt: "baby sleeping",
      tags: ["baby", "sleeping"],
      aspectRatio: "9:16",
      provider: "gemini",
      model: "gemini-2.5-flash-image",
    });

    // New session
    const cache2 = makeCache("baby-facts-unlocked");
    const img2 = createFakeImage(path.join(tmpDir, "source", "bg2.png"));
    cache2.addImage({
      sourcePath: img2,
      prompt: "baby playing",
      tags: ["baby", "playing"],
      aspectRatio: "9:16",
      provider: "gemini",
      model: "gemini-2.5-flash-image",
    });

    // Third session should see both
    const cache3 = makeCache("baby-facts-unlocked");
    expect(cache3.size()).toBe(2);
  });
});
