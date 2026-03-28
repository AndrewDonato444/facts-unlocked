/**
 * Tests for build-composition.js — Long-Form Remotion Composition Plan Builder
 *
 * Builds the sequence timing plan from audio + image manifests.
 * Tests cover:
 *   - Sequence timing from audio manifest (LF-COMP-001 to LF-COMP-003)
 *   - Ken Burns direction cycling (LF-COMP-004 to LF-COMP-005)
 *   - Crossfade overlap reduces total duration (LF-COMP-006 to LF-COMP-007)
 *   - Chapter title cards with fixed duration (LF-COMP-008)
 *   - Total video duration calculation (LF-COMP-009)
 *   - 16:9 dimensions enforced (LF-COMP-010)
 *   - Remotion props output format (LF-COMP-011)
 */

// Module under test — does not exist yet (RED phase)
const { buildCompositionPlan } = require("../build-composition");

// ─────────────────────────────────────────────
// Test Data
// ─────────────────────────────────────────────

const AUDIO_MANIFEST = {
  scenes: [
    { scene_id: "hook_01", chapter: "intro", duration_seconds: 12.5, duration_frames: 375, audio_file: "audio/hook_01.wav" },
    { scene_id: "ch1_fact1", chapter: "chapter_1", duration_seconds: 28.5, duration_frames: 855, audio_file: "audio/ch1_fact1.wav" },
    { scene_id: "ch1_fact2", chapter: "chapter_1", duration_seconds: 15.0, duration_frames: 450, audio_file: "audio/ch1_fact2.wav" },
    { scene_id: "ch2_fact1", chapter: "chapter_2", duration_seconds: 22.0, duration_frames: 660, audio_file: "audio/ch2_fact1.wav" },
    { scene_id: "ch2_fact2", chapter: "chapter_2", duration_seconds: 18.0, duration_frames: 540, audio_file: "audio/ch2_fact2.wav" },
    { scene_id: "outro_01", chapter: "outro", duration_seconds: 10.0, duration_frames: 300, audio_file: "audio/outro_01.wav" },
  ],
  chapter_markers: [
    { chapter: "intro", start_seconds: 0, label: "Introduction" },
    { chapter: "chapter_1", start_seconds: 12.5, label: "How Babies Hear" },
    { chapter: "chapter_2", start_seconds: 56.0, label: "Baby Vision" },
    { chapter: "outro", start_seconds: 96.0, label: "Wrap Up" },
  ],
  total_duration_seconds: 106.0,
  total_duration_frames: 3180,
};

const IMAGE_MANIFEST = {
  "hook_01": { path: "images/hook_01.png", source: "cache" },
  "ch1_fact1": { path: "images/ch1_fact1.png", source: "generated" },
  "ch1_fact2": { path: "images/ch1_fact2.png", source: "cache" },
  "ch2_fact1": { path: "images/ch2_fact1.png", source: "generated" },
  "ch2_fact2": { path: "images/ch2_fact2.png", source: "cache" },
  "outro_01": { path: "images/outro_01.png", source: "cache" },
};

const CONFIG = {
  fps: 30,
  width: 1920,
  height: 1080,
  transitionDurationSec: 1.5,
  chapterTitleDurationSec: 3,
  kenBurnsZoomRange: [1.0, 1.12],
};

// ─────────────────────────────────────────────
// LF-COMP-001: Each scene gets a sequence entry
// ─────────────────────────────────────────────

test("LF-COMP-001: produces a sequence entry for every scene", () => {
  const plan = buildCompositionPlan(AUDIO_MANIFEST, IMAGE_MANIFEST, CONFIG);

  // Should have entries for scenes + chapter titles
  const sceneEntries = plan.sequences.filter((s) => s.type === "scene");
  expect(sceneEntries).toHaveLength(6);
  expect(sceneEntries[0].scene_id).toBe("hook_01");
  expect(sceneEntries[5].scene_id).toBe("outro_01");
});

// ─────────────────────────────────────────────
// LF-COMP-002: Scene durations match audio manifest
// ─────────────────────────────────────────────

test("LF-COMP-002: scene sequence durations match audio manifest frames", () => {
  const plan = buildCompositionPlan(AUDIO_MANIFEST, IMAGE_MANIFEST, CONFIG);

  const sceneEntries = plan.sequences.filter((s) => s.type === "scene");
  for (const entry of sceneEntries) {
    const audioScene = AUDIO_MANIFEST.scenes.find(
      (s) => s.scene_id === entry.scene_id
    );
    expect(entry.durationInFrames).toBe(audioScene.duration_frames);
  }
});

// ─────────────────────────────────────────────
// LF-COMP-003: Scene entries have image and audio paths
// ─────────────────────────────────────────────

test("LF-COMP-003: scene entries include image path and audio file", () => {
  const plan = buildCompositionPlan(AUDIO_MANIFEST, IMAGE_MANIFEST, CONFIG);

  const sceneEntries = plan.sequences.filter((s) => s.type === "scene");
  for (const entry of sceneEntries) {
    expect(entry.imagePath).toBeDefined();
    expect(entry.audioFile).toBeDefined();
  }
});

// ─────────────────────────────────────────────
// LF-COMP-004: Ken Burns directions cycle and don't repeat
// ─────────────────────────────────────────────

test("LF-COMP-004: consecutive scenes have different Ken Burns directions", () => {
  const plan = buildCompositionPlan(AUDIO_MANIFEST, IMAGE_MANIFEST, CONFIG);

  const sceneEntries = plan.sequences.filter((s) => s.type === "scene");
  for (let i = 1; i < sceneEntries.length; i++) {
    expect(sceneEntries[i].kenBurnsDirection).not.toBe(
      sceneEntries[i - 1].kenBurnsDirection
    );
  }
});

// ─────────────────────────────────────────────
// LF-COMP-005: Ken Burns zoom range from config
// ─────────────────────────────────────────────

test("LF-COMP-005: Ken Burns zoom range matches config", () => {
  const plan = buildCompositionPlan(AUDIO_MANIFEST, IMAGE_MANIFEST, CONFIG);

  const sceneEntries = plan.sequences.filter((s) => s.type === "scene");
  for (const entry of sceneEntries) {
    expect(entry.kenBurnsZoomRange).toEqual([1.0, 1.12]);
  }
});

// ─────────────────────────────────────────────
// LF-COMP-006: Crossfade transitions inserted between scenes
// ─────────────────────────────────────────────

test("LF-COMP-006: transition entries exist between scenes within same chapter", () => {
  const plan = buildCompositionPlan(AUDIO_MANIFEST, IMAGE_MANIFEST, CONFIG);

  const transitions = plan.sequences.filter((s) => s.type === "transition");
  expect(transitions.length).toBeGreaterThan(0);

  for (const t of transitions) {
    expect(t.durationInFrames).toBe(Math.ceil(1.5 * 30)); // 1.5s × 30fps
  }
});

// ─────────────────────────────────────────────
// LF-COMP-007: Crossfade overlap reduces total duration
// ─────────────────────────────────────────────

test("LF-COMP-007: total duration is less than naive sum due to transition overlaps", () => {
  const plan = buildCompositionPlan(AUDIO_MANIFEST, IMAGE_MANIFEST, CONFIG);

  const naiveSum =
    AUDIO_MANIFEST.total_duration_frames +
    plan.sequences.filter((s) => s.type === "chapter_title").length *
      Math.ceil(CONFIG.chapterTitleDurationSec * CONFIG.fps);

  expect(plan.totalDurationInFrames).toBeLessThan(naiveSum);
});

// ─────────────────────────────────────────────
// LF-COMP-008: Chapter title cards have fixed duration
// ─────────────────────────────────────────────

test("LF-COMP-008: chapter title entries use fixed duration from config", () => {
  const plan = buildCompositionPlan(AUDIO_MANIFEST, IMAGE_MANIFEST, CONFIG);

  const titleEntries = plan.sequences.filter((s) => s.type === "chapter_title");
  // Should have titles for chapter_1 and chapter_2 (not intro/outro)
  expect(titleEntries.length).toBeGreaterThanOrEqual(2);

  for (const entry of titleEntries) {
    expect(entry.durationInFrames).toBe(
      Math.ceil(CONFIG.chapterTitleDurationSec * CONFIG.fps)
    );
    expect(entry.label).toBeDefined();
  }
});

// ─────────────────────────────────────────────
// LF-COMP-009: Total video duration is computed correctly
// ─────────────────────────────────────────────

test("LF-COMP-009: totalDurationInFrames is sum of sequences minus overlaps", () => {
  const plan = buildCompositionPlan(AUDIO_MANIFEST, IMAGE_MANIFEST, CONFIG);

  expect(plan.totalDurationInFrames).toBeGreaterThan(0);
  expect(plan.totalDurationInFrames).toBe(
    Math.ceil(plan.totalDurationInSeconds * CONFIG.fps)
  );
});

// ─────────────────────────────────────────────
// LF-COMP-010: Dimensions are 1920x1080 (16:9)
// ─────────────────────────────────────────────

test("LF-COMP-010: composition dimensions are 1920x1080", () => {
  const plan = buildCompositionPlan(AUDIO_MANIFEST, IMAGE_MANIFEST, CONFIG);

  expect(plan.width).toBe(1920);
  expect(plan.height).toBe(1080);
  expect(plan.fps).toBe(30);
});

// ─────────────────────────────────────────────
// LF-COMP-011: Output has all required Remotion props
// ─────────────────────────────────────────────

test("LF-COMP-011: plan includes all fields needed by Remotion composition", () => {
  const plan = buildCompositionPlan(AUDIO_MANIFEST, IMAGE_MANIFEST, CONFIG);

  expect(plan).toHaveProperty("sequences");
  expect(plan).toHaveProperty("totalDurationInFrames");
  expect(plan).toHaveProperty("totalDurationInSeconds");
  expect(plan).toHaveProperty("width");
  expect(plan).toHaveProperty("height");
  expect(plan).toHaveProperty("fps");
  expect(plan).toHaveProperty("chapterMarkers");
  expect(Array.isArray(plan.sequences)).toBe(true);
  expect(Array.isArray(plan.chapterMarkers)).toBe(true);
});
