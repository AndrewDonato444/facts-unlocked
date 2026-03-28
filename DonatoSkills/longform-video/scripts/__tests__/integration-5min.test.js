/**
 * Integration test — 5-minute long-form video pipeline
 *
 * Wires together the full pipeline:
 *   Script (simulated) → TTS → Image resolution → Composition → Dry-run cost
 *
 * Uses fake providers to avoid real API calls, but exercises real data flow
 * between all modules with realistic scene counts and durations.
 *
 * Target: ~5 minute video with 2 chapters, 6 scenes
 */

const path = require("path");
const fs = require("fs");
const os = require("os");

const { generateSceneTTS } = require("../generate-tts");
const { buildCompositionPlan } = require("../build-composition");
const { estimateCost } = require("../dry-run");

// ─────────────────────────────────────────────
// Test Setup
// ─────────────────────────────────────────────

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lf-integ-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// Creates a fake WAV file
function createFakeWav(filePath, durationSec) {
  const sampleRate = 24000;
  const bytesPerSample = 2;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * bytesPerSample;
  const fileSize = dataSize + 44;
  const buf = Buffer.alloc(fileSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(fileSize - 8, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buf.writeUInt16LE(bytesPerSample, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buf);
  return filePath;
}

// ─────────────────────────────────────────────
// Simulated Script (what Claude would generate)
// ─────────────────────────────────────────────

const SCRIPT = {
  title: "5 Surprising Facts About How Babies Learn",
  description: "Discover the incredible ways newborns absorb the world around them.",
  scenes: [
    {
      scene_id: "hook_01",
      chapter: "intro",
      narration: "Did you know that babies start learning before they're even born? In this video, we'll explore five incredible facts about how babies absorb the world around them from day one.",
      image_hint: "newborn baby looking curiously at colorful mobile",
      image_tags: ["baby", "curiosity", "learning", "mobile"],
    },
    {
      scene_id: "ch1_fact1",
      chapter: "chapter_1",
      narration: "Babies can recognize their mother's voice within hours of being born. Scientists discovered this by measuring how newborns respond to familiar versus unfamiliar voices. The results were remarkable — babies would turn toward their mother's voice and their heart rate would actually slow down, showing a calming response that doesn't happen with strangers.",
      image_hint: "mother holding newborn close, whispering gently",
      image_tags: ["mother", "newborn", "voice", "bonding"],
    },
    {
      scene_id: "ch1_fact2",
      chapter: "chapter_1",
      narration: "By just three months old, babies can distinguish between hundreds of different speech sounds from any language on earth. This ability gradually narrows as they focus on the sounds of their native language.",
      image_hint: "baby listening intently to parent talking",
      image_tags: ["baby", "listening", "language", "development"],
    },
    {
      scene_id: "ch2_fact1",
      chapter: "chapter_2",
      narration: "Here's something that might blow your mind. Newborn babies can only see about eight to twelve inches in front of them. That's roughly the distance from a parent's arms to their face. Nature designed it this way so babies focus on the most important thing — their caregiver's face.",
      image_hint: "close-up of baby staring at parent face, soft focus background",
      image_tags: ["baby", "vision", "close-up", "parent", "face"],
    },
    {
      scene_id: "ch2_fact2",
      chapter: "chapter_2",
      narration: "Babies are born with a preference for high-contrast patterns. Black and white stripes, checkerboards, and bold geometric shapes capture their attention far more than subtle pastel colors. This is why many baby toys feature bold contrasting patterns.",
      image_hint: "baby fascinated by black and white geometric mobile",
      image_tags: ["baby", "contrast", "patterns", "vision", "toys"],
    },
    {
      scene_id: "outro_01",
      chapter: "outro",
      narration: "Those are five incredible facts about how babies learn from the very start of their lives. If you enjoyed this video, hit subscribe for more fascinating baby facts every week. Drop a comment telling us which fact surprised you the most!",
      image_hint: "happy baby smiling at camera with colorful background",
      image_tags: ["baby", "happy", "smile", "subscribe"],
    },
  ],
  chapters: [
    { chapter_id: "intro", title: "Introduction" },
    { chapter_id: "chapter_1", title: "How Babies Hear" },
    { chapter_id: "chapter_2", title: "Baby Vision" },
    { chapter_id: "outro", title: "Wrap Up" },
  ],
};

// Scene durations that add up to ~5 minutes total
// intro: 12s, ch1: 30s + 15s, ch2: 25s + 22s, outro: 10s → raw ~114s
// With padding (0.5s × 6 = 3s) → ~117s → ~2 min
// Scale up narration durations to hit ~5 min (300s)
const SCENE_DURATIONS = [18, 52, 28, 48, 40, 15]; // ≈201s + 3s padding = ~204s ≈ 3.4 min raw
// After composition adds chapter titles (2 × 3s = 6s) and subtracts transitions...

// ─────────────────────────────────────────────
// Integration: Full pipeline
// ─────────────────────────────────────────────

test("INTEG-001: 5-minute video pipeline — TTS → composition → cost estimate", async () => {
  // ── Step 1: TTS Generation ──
  let durationIdx = 0;
  const ttsProvider = async (text, voiceConfig) => {
    const duration = SCENE_DURATIONS[durationIdx++];
    const wavPath = path.join(tmpDir, `scene-${durationIdx}.wav`);
    createFakeWav(wavPath, duration);
    return { wavPath, durationSec: duration };
  };

  const audioManifest = await generateSceneTTS({
    scenes: SCRIPT.scenes,
    chapters: SCRIPT.chapters,
    provider: ttsProvider,
    voiceConfig: { voice_id: "XrExE9yKIg1WjnnlVkGX", provider: "elevenlabs" },
    outputDir: tmpDir,
    fps: 30,
    scenePaddingSec: 0.5,
    costPerChar: 0.00003,
  });

  // Verify TTS output
  expect(audioManifest.scenes).toHaveLength(6);
  expect(audioManifest.total_duration_seconds).toBeGreaterThan(100);
  expect(audioManifest.chapter_markers).toHaveLength(4);
  expect(audioManifest.tts_cost_estimate).toBeGreaterThan(0);

  // ── Step 2: Image Resolution (simulated manifest) ──
  const imageManifest = {};
  for (const scene of SCRIPT.scenes) {
    imageManifest[scene.scene_id] = {
      path: `images/${scene.scene_id}.png`,
      source: scene.scene_id.startsWith("ch1") ? "cache" : "generated",
    };
  }

  // ── Step 3: Build Composition Plan ──
  const compositionPlan = buildCompositionPlan(audioManifest, imageManifest, {
    fps: 30,
    width: 1920,
    height: 1080,
    transitionDurationSec: 1.5,
    chapterTitleDurationSec: 3,
    kenBurnsZoomRange: [1.0, 1.12],
  });

  // Verify composition
  expect(compositionPlan.width).toBe(1920);
  expect(compositionPlan.height).toBe(1080);
  expect(compositionPlan.fps).toBe(30);
  expect(compositionPlan.totalDurationInFrames).toBeGreaterThan(0);

  // Check sequence types
  const scenes = compositionPlan.sequences.filter((s) => s.type === "scene");
  const transitions = compositionPlan.sequences.filter((s) => s.type === "transition");
  const titles = compositionPlan.sequences.filter((s) => s.type === "chapter_title");

  expect(scenes).toHaveLength(6);
  expect(transitions.length).toBe(5); // Between each consecutive scene
  expect(titles).toHaveLength(2); // chapter_1 and chapter_2 (not intro/outro)

  // Ken Burns directions should not repeat consecutively
  for (let i = 1; i < scenes.length; i++) {
    expect(scenes[i].kenBurnsDirection).not.toBe(scenes[i - 1].kenBurnsDirection);
  }

  // Total duration accounts for overlaps
  const naiveFrames = scenes.reduce((s, sc) => s + sc.durationInFrames, 0)
    + titles.reduce((s, t) => s + t.durationInFrames, 0);
  expect(compositionPlan.totalDurationInFrames).toBeLessThan(naiveFrames);

  // Duration should be roughly in the right ballpark (3-6 minutes → 5400-10800 frames at 30fps)
  expect(compositionPlan.totalDurationInFrames).toBeGreaterThan(4000);
  expect(compositionPlan.totalDurationInFrames).toBeLessThan(15000);

  // ── Step 4: Dry-Run Cost Estimate ──
  const cacheQueryResults = {};
  for (const scene of SCRIPT.scenes) {
    cacheQueryResults[scene.scene_id] = {
      hit: imageManifest[scene.scene_id].source === "cache",
      score: imageManifest[scene.scene_id].source === "cache" ? 0.7 : 0.1,
    };
  }

  const costEstimate = estimateCost(SCRIPT, cacheQueryResults, {
    ttsProvider: "elevenlabs",
    imageProvider: "gemini",
    costRates: {
      tts: {
        elevenlabs: { perChar: 0.00003 },
        grok: { perChar: 0.000005 },
        kokoro: { perChar: 0 },
      },
      image: {
        gemini: { perImage: 0.04 },
      },
    },
  });

  expect(costEstimate.dryRun).toBe(true);
  expect(costEstimate.apiCallsMade).toBe(0);
  expect(costEstimate.tts.totalCharacters).toBeGreaterThan(500);
  expect(costEstimate.images.cacheHits).toBe(2);
  expect(costEstimate.images.cacheMisses).toBe(4);
  expect(costEstimate.totalEstimatedCost).toBeGreaterThan(0);

  // Kokoro should be free
  expect(costEstimate.providerComparison.kokoro).toBe(0);
  // ElevenLabs should cost more than Grok
  expect(costEstimate.providerComparison.elevenlabs).toBeGreaterThan(
    costEstimate.providerComparison.grok
  );

  // ── Final Summary ──
  const totalDurationMin = compositionPlan.totalDurationInSeconds / 60;
  const summary = {
    title: SCRIPT.title,
    scenes: scenes.length,
    chapters: titles.length + 2, // +intro +outro (no title cards)
    totalDurationSec: compositionPlan.totalDurationInSeconds,
    totalDurationMin: Math.round(totalDurationMin * 10) / 10,
    totalFrames: compositionPlan.totalDurationInFrames,
    transitions: transitions.length,
    ttsCost: costEstimate.tts.estimatedCost,
    imageCost: costEstimate.images.estimatedCost,
    totalCost: costEstimate.totalEstimatedCost,
    cacheHitRate: costEstimate.images.hitRate,
  };

  // Log for visibility during test runs
  console.log("\n═══ 5-Minute Video Integration Test ═══");
  console.log(`Title: ${summary.title}`);
  console.log(`Scenes: ${summary.scenes} | Chapters: ${summary.chapters}`);
  console.log(`Duration: ${summary.totalDurationMin} min (${summary.totalFrames} frames)`);
  console.log(`Transitions: ${summary.transitions} crossfades`);
  console.log(`TTS cost: $${summary.ttsCost.toFixed(4)} | Image cost: $${summary.imageCost.toFixed(2)}`);
  console.log(`Total cost: $${summary.totalCost.toFixed(4)} | Cache hit rate: ${summary.cacheHitRate}%`);
  console.log("═══════════════════════════════════════\n");

  // The video should be roughly 3-4 minutes with these durations
  // (shorter than 5 min because our fake durations sum to ~204s)
  expect(summary.totalDurationMin).toBeGreaterThan(2);
  expect(summary.totalDurationMin).toBeLessThan(6);
});

test("INTEG-002: chapter markers align with composition plan", async () => {
  let durationIdx = 0;
  const ttsProvider = async (text) => {
    const duration = SCENE_DURATIONS[durationIdx++];
    const wavPath = path.join(tmpDir, `scene-${durationIdx}.wav`);
    createFakeWav(wavPath, duration);
    return { wavPath, durationSec: duration };
  };

  const audioManifest = await generateSceneTTS({
    scenes: SCRIPT.scenes,
    chapters: SCRIPT.chapters,
    provider: ttsProvider,
    outputDir: tmpDir,
    fps: 30,
    scenePaddingSec: 0.5,
  });

  const compositionPlan = buildCompositionPlan(
    audioManifest,
    SCRIPT.scenes.reduce((m, s) => {
      m[s.scene_id] = { path: `img/${s.scene_id}.png` };
      return m;
    }, {}),
    {
      fps: 30,
      width: 1920,
      height: 1080,
      transitionDurationSec: 1.5,
      chapterTitleDurationSec: 3,
      kenBurnsZoomRange: [1.0, 1.12],
    }
  );

  // Chapter markers from audio manifest should match composition
  expect(compositionPlan.chapterMarkers).toHaveLength(4);
  expect(compositionPlan.chapterMarkers[0].chapter).toBe("intro");
  expect(compositionPlan.chapterMarkers[0].start_seconds).toBe(0);

  // Chapter title cards should exist for chapter_1 and chapter_2
  const titleSequences = compositionPlan.sequences.filter(
    (s) => s.type === "chapter_title"
  );
  expect(titleSequences[0].chapter).toBe("chapter_1");
  expect(titleSequences[0].label).toBe("How Babies Hear");
  expect(titleSequences[1].chapter).toBe("chapter_2");
  expect(titleSequences[1].label).toBe("Baby Vision");
});

test("INTEG-003: analytics scoring works with TTS-produced manifest data", async () => {
  const { scoreLongformVideo } = require("../../../analytics-loop/scripts/score-longform");

  // Simulate a published video with analytics from Zernio
  const publishedVideo = {
    videoId: "yt_integ_001",
    title: SCRIPT.title,
    publishedAt: "2026-03-15T10:00:00Z",
    videoDurationSec: 204, // ~3.4 min
    analytics: {
      views: 2500,
      watch_time_hours: 50, // 50 hrs / (2500 × 204s) = 50*3600/(2500*204) = 35.3% retention
      likes: 180,
      comments: 35,
      shares: 12,
      subscribers_gained: 15,
    },
    variables: {
      chapter_count: 2,
      intro_style: "did_you_know",
      narration_pace: "moderate",
      visual_density: "medium",
      voice: "matilda",
      video_length_min: 3.4,
    },
  };

  const weights = {
    avg_retention_pct: 3,
    watch_hours: 2,
    comments: 2,
    subscribers_gained: 4,
    likes: 1,
  };

  const scored = scoreLongformVideo(publishedVideo, weights, 50);

  expect(scored.excluded).toBe(false);
  expect(scored.score.avg_retention_pct).toBeGreaterThan(30);
  expect(scored.score.avg_retention_pct).toBeLessThan(40);
  expect(scored.score.weightedScore).toBeGreaterThan(0);
  expect(scored.score.components.retentionContribution).toBeGreaterThan(0);
  expect(scored.score.components.watchHoursContribution).toBe(50 * 2);
  expect(scored.score.components.subscribersContribution).toBe(15 * 4);
});
