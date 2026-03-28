/**
 * Tests for resolve-images.js — Long-Form Scene Image Resolution
 *
 * Tests cover:
 *   - Cache-first resolution per scene (LF-IMG-001 to LF-IMG-003)
 *   - Cache miss triggers generation placeholder (LF-IMG-004 to LF-IMG-005)
 *   - All images tagged and added to cache (LF-IMG-006 to LF-IMG-007)
 *   - 16:9 aspect ratio enforced on all images (LF-IMG-008)
 *   - Image manifest output format (LF-IMG-009 to LF-IMG-010)
 *   - used_in tracking for long-form videos (LF-IMG-011)
 *   - Cache report with hit/miss/cost stats (LF-IMG-012)
 */

const path = require("path");
const fs = require("fs");
const os = require("os");

const { ImageCache } = require("../../../image-cache/scripts/image-cache");

// Module under test — does not exist yet (RED phase)
const { resolveSceneImages } = require("../resolve-images");

// ─────────────────────────────────────────────
// Test Helpers
// ─────────────────────────────────────────────

let tmpDir;
let cachePath;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lf-img-test-"));
  cachePath = path.join(tmpDir, "image-cache");
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

let fakeImageCounter = 0;
function createFakeImage(dir, name) {
  const filePath = path.join(dir, name || `fake-${fakeImageCounter}.png`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const counter = Buffer.alloc(4);
  counter.writeUInt32BE(fakeImageCounter++);
  fs.writeFileSync(
    filePath,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      counter,
    ])
  );
  return filePath;
}

function seedCache(channel, tags, count = 1) {
  const cache = new ImageCache({
    cachePath,
    channel,
    maxReuse: 5,
    maxCacheSize: 300,
    minMatchScore: 0.4,
  });
  const entries = [];
  for (let i = 0; i < count; i++) {
    const img = createFakeImage(tmpDir, `seed-${channel}-${i}.png`);
    const entry = cache.addImage({
      sourcePath: img,
      prompt: `seeded image ${i}`,
      tags: tags,
      aspectRatio: "16:9",
      provider: "gemini",
      model: "gemini-2.5-flash-image",
    });
    entries.push(entry);
  }
  return entries;
}

// Sample script scenes (minimal structure matching script.json format)
const SAMPLE_SCENES = [
  {
    scene_id: "hook_01",
    narration: "Here's something that might surprise you about newborn babies.",
    image_hint: "newborn baby looking up at parent, soft warm lighting",
    image_tags: ["newborn", "baby", "parent", "warm", "soft"],
  },
  {
    scene_id: "ch1_fact1",
    narration: "Babies can hear their mother's voice from inside the womb.",
    image_hint: "pregnant mother speaking softly, warm pastel colors",
    image_tags: ["pregnant", "mother", "speaking", "womb", "warm", "pastel"],
  },
  {
    scene_id: "ch1_fact2",
    narration: "By three months, babies can track objects across a room.",
    image_hint: "baby watching a colorful mobile, bright nursery",
    image_tags: ["baby", "mobile", "colorful", "nursery", "watching"],
  },
];

// Fake image generator (replaces real API calls in tests)
function fakeImageGenerator(prompt, tags) {
  const img = createFakeImage(tmpDir, `generated-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);
  return { path: img, provider: "gemini", model: "gemini-2.5-flash-image" };
}

// ─────────────────────────────────────────────
// LF-IMG-001: Cache hit returns cached image
// ─────────────────────────────────────────────

test("LF-IMG-001: returns cached image when tags match above threshold", async () => {
  // Seed cache with an image matching hook_01's tags
  seedCache("baby-facts-unlocked", ["newborn", "baby", "parent", "warm", "soft", "gentle"]);

  const result = await resolveSceneImages({
    scenes: [SAMPLE_SCENES[0]],
    channel: "baby-facts-unlocked",
    cachePath,
    cacheConfig: { maxReuse: 5, maxCacheSize: 300, minMatchScore: 0.4 },
    generateImage: fakeImageGenerator,
    videoId: "lf-001",
  });

  expect(result.manifest["hook_01"]).toBeDefined();
  expect(result.manifest["hook_01"].source).toBe("cache");
  expect(result.manifest["hook_01"].score).toBeGreaterThanOrEqual(0.4);
});

// ─────────────────────────────────────────────
// LF-IMG-002: Cache miss triggers image generation
// ─────────────────────────────────────────────

test("LF-IMG-002: generates new image when no cache match exists", async () => {
  // Empty cache — no seeding
  const result = await resolveSceneImages({
    scenes: [SAMPLE_SCENES[0]],
    channel: "baby-facts-unlocked",
    cachePath,
    cacheConfig: { maxReuse: 5, maxCacheSize: 300, minMatchScore: 0.4 },
    generateImage: fakeImageGenerator,
    videoId: "lf-001",
  });

  expect(result.manifest["hook_01"]).toBeDefined();
  expect(result.manifest["hook_01"].source).toBe("generated");
  expect(result.manifest["hook_01"].provider).toBe("gemini");
});

// ─────────────────────────────────────────────
// LF-IMG-003: Multiple scenes resolved in order
// ─────────────────────────────────────────────

test("LF-IMG-003: resolves all scenes and returns complete manifest", async () => {
  const result = await resolveSceneImages({
    scenes: SAMPLE_SCENES,
    channel: "baby-facts-unlocked",
    cachePath,
    cacheConfig: { maxReuse: 5, maxCacheSize: 300, minMatchScore: 0.4 },
    generateImage: fakeImageGenerator,
    videoId: "lf-001",
  });

  expect(Object.keys(result.manifest)).toHaveLength(3);
  expect(result.manifest["hook_01"]).toBeDefined();
  expect(result.manifest["ch1_fact1"]).toBeDefined();
  expect(result.manifest["ch1_fact2"]).toBeDefined();
});

// ─────────────────────────────────────────────
// LF-IMG-004: Generated images added to cache
// ─────────────────────────────────────────────

test("LF-IMG-004: newly generated images are written to cache for future reuse", async () => {
  await resolveSceneImages({
    scenes: [SAMPLE_SCENES[0]],
    channel: "baby-facts-unlocked",
    cachePath,
    cacheConfig: { maxReuse: 5, maxCacheSize: 300, minMatchScore: 0.4 },
    generateImage: fakeImageGenerator,
    videoId: "lf-001",
  });

  // Now query the cache directly — the generated image should be there
  const cache = new ImageCache({
    cachePath,
    channel: "baby-facts-unlocked",
    maxReuse: 5,
    maxCacheSize: 300,
    minMatchScore: 0.4,
  });

  const hit = cache.query(["newborn", "baby", "parent", "warm", "soft"]);
  expect(hit).not.toBeNull();
  expect(hit.score).toBeGreaterThanOrEqual(0.4);
});

// ─────────────────────────────────────────────
// LF-IMG-005: Second run benefits from cache
// ─────────────────────────────────────────────

test("LF-IMG-005: second video with similar scenes gets cache hits", async () => {
  // First run — generates all images
  await resolveSceneImages({
    scenes: SAMPLE_SCENES,
    channel: "baby-facts-unlocked",
    cachePath,
    cacheConfig: { maxReuse: 5, maxCacheSize: 300, minMatchScore: 0.4 },
    generateImage: fakeImageGenerator,
    videoId: "lf-001",
  });

  // Second run — same scenes should hit cache
  const result2 = await resolveSceneImages({
    scenes: SAMPLE_SCENES,
    channel: "baby-facts-unlocked",
    cachePath,
    cacheConfig: { maxReuse: 5, maxCacheSize: 300, minMatchScore: 0.4 },
    generateImage: fakeImageGenerator,
    videoId: "lf-002",
  });

  const cached = Object.values(result2.manifest).filter((m) => m.source === "cache");
  expect(cached.length).toBeGreaterThanOrEqual(2); // At least 2 of 3 should hit
});

// ─────────────────────────────────────────────
// LF-IMG-006: 16:9 aspect ratio on all generated images
// ─────────────────────────────────────────────

test("LF-IMG-006: generated images stored with 16:9 aspect ratio", async () => {
  await resolveSceneImages({
    scenes: [SAMPLE_SCENES[1]],
    channel: "baby-facts-unlocked",
    cachePath,
    cacheConfig: { maxReuse: 5, maxCacheSize: 300, minMatchScore: 0.4 },
    generateImage: fakeImageGenerator,
    videoId: "lf-001",
  });

  const cache = new ImageCache({
    cachePath,
    channel: "baby-facts-unlocked",
    maxReuse: 5,
    maxCacheSize: 300,
    minMatchScore: 0.4,
  });

  // Check the cached entry has 16:9
  const hit = cache.query(["pregnant", "mother", "speaking"]);
  expect(hit).not.toBeNull();
  const entry = cache.getEntry(hit.hash);
  expect(entry.aspect_ratio).toBe("16:9");
});

// ─────────────────────────────────────────────
// LF-IMG-007: used_in tracks video ID
// ─────────────────────────────────────────────

test("LF-IMG-007: cache entries track which long-form video used them", async () => {
  seedCache("baby-facts-unlocked", ["newborn", "baby", "parent", "warm", "soft"]);

  await resolveSceneImages({
    scenes: [SAMPLE_SCENES[0]],
    channel: "baby-facts-unlocked",
    cachePath,
    cacheConfig: { maxReuse: 5, maxCacheSize: 300, minMatchScore: 0.4 },
    generateImage: fakeImageGenerator,
    videoId: "lf-042",
  });

  const cache = new ImageCache({
    cachePath,
    channel: "baby-facts-unlocked",
    maxReuse: 5,
    maxCacheSize: 300,
    minMatchScore: 0.4,
  });

  const hit = cache.query(["newborn", "baby", "parent", "warm", "soft"]);
  const entry = cache.getEntry(hit.hash);
  expect(entry.used_in).toContain("lf-042");
});

// ─────────────────────────────────────────────
// LF-IMG-008: Manifest includes path for every scene
// ─────────────────────────────────────────────

test("LF-IMG-008: manifest has a valid file path for each scene_id", async () => {
  const result = await resolveSceneImages({
    scenes: SAMPLE_SCENES,
    channel: "baby-facts-unlocked",
    cachePath,
    cacheConfig: { maxReuse: 5, maxCacheSize: 300, minMatchScore: 0.4 },
    generateImage: fakeImageGenerator,
    videoId: "lf-001",
  });

  for (const scene of SAMPLE_SCENES) {
    const entry = result.manifest[scene.scene_id];
    expect(entry).toBeDefined();
    expect(entry.path).toBeDefined();
    expect(fs.existsSync(entry.path)).toBe(true);
  }
});

// ─────────────────────────────────────────────
// LF-IMG-009: Stats report includes hit/miss/cost
// ─────────────────────────────────────────────

test("LF-IMG-009: returns stats with cached, generated counts and cost estimate", async () => {
  seedCache("baby-facts-unlocked", ["newborn", "baby", "parent", "warm", "soft"]);

  const result = await resolveSceneImages({
    scenes: SAMPLE_SCENES,
    channel: "baby-facts-unlocked",
    cachePath,
    cacheConfig: { maxReuse: 5, maxCacheSize: 300, minMatchScore: 0.4 },
    generateImage: fakeImageGenerator,
    costPerImage: 0.04,
    videoId: "lf-001",
  });

  expect(result.stats).toBeDefined();
  expect(typeof result.stats.cached).toBe("number");
  expect(typeof result.stats.generated).toBe("number");
  expect(result.stats.cached + result.stats.generated).toBe(3);
  expect(typeof result.stats.cost).toBe("number");
  expect(result.stats.cost).toBeGreaterThanOrEqual(0);
});

// ─────────────────────────────────────────────
// LF-IMG-010: Dry run mode queries cache but doesn't generate
// ─────────────────────────────────────────────

test("LF-IMG-010: dry run returns predictions without calling generateImage", async () => {
  let generateCalled = false;
  const trackingGenerator = () => {
    generateCalled = true;
    return fakeImageGenerator();
  };

  seedCache("baby-facts-unlocked", ["newborn", "baby", "parent", "warm", "soft"]);

  const result = await resolveSceneImages({
    scenes: SAMPLE_SCENES,
    channel: "baby-facts-unlocked",
    cachePath,
    cacheConfig: { maxReuse: 5, maxCacheSize: 300, minMatchScore: 0.4 },
    generateImage: trackingGenerator,
    dryRun: true,
    costPerImage: 0.04,
    videoId: "lf-001",
  });

  expect(generateCalled).toBe(false);
  expect(result.stats.cached).toBeGreaterThanOrEqual(1);
  expect(result.stats.wouldGenerate).toBeDefined();
  expect(typeof result.stats.estimatedCost).toBe("number");
});
