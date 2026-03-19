/**
 * Tests for generate-tts.js — Long-Form Multi-Scene TTS Pipeline
 *
 * Tests cover:
 *   - Sequential TTS generation per scene (LF-TTS-001 to LF-TTS-003)
 *   - Audio manifest output format (LF-TTS-004 to LF-TTS-005)
 *   - Chapter markers computed from cumulative durations (LF-TTS-006)
 *   - Provider interface contract (LF-TTS-007)
 *   - Fallback on provider failure (LF-TTS-008)
 *   - Kokoro stub placeholder (LF-TTS-009)
 *   - Scene padding applied to durations (LF-TTS-010)
 *   - Cost tracking per scene (LF-TTS-011)
 */

const path = require("path");
const fs = require("fs");
const os = require("os");

// Module under test — does not exist yet (RED phase)
const { generateSceneTTS } = require("../generate-tts");

// ─────────────────────────────────────────────
// Test Helpers
// ─────────────────────────────────────────────

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lf-tts-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// Creates a fake WAV file with a known duration
// WAV PCM 24kHz mono: duration = (fileSize - 44) / (24000 * 2)
function createFakeWav(filePath, durationSec) {
  const sampleRate = 24000;
  const bytesPerSample = 2; // 16-bit
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * bytesPerSample;
  const fileSize = dataSize + 44; // 44-byte WAV header

  const buf = Buffer.alloc(fileSize);

  // WAV header
  buf.write("RIFF", 0);
  buf.writeUInt32LE(fileSize - 8, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); // chunk size
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buf.writeUInt16LE(bytesPerSample, 32);
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  // Audio data is zeros (silence) — fine for testing

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buf);
  return filePath;
}

// Fake TTS provider that writes a WAV file with predictable duration
function createFakeProvider(durationMap) {
  return async (text, voiceConfig) => {
    // Duration based on word count (~2.5 words/sec narration speed)
    const wordCount = text.split(/\s+/).length;
    const duration = durationMap
      ? durationMap.shift()
      : wordCount / 2.5;
    const wavPath = path.join(tmpDir, `tts-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`);
    createFakeWav(wavPath, duration);
    return { wavPath, durationSec: duration };
  };
}

// Fake provider that fails
function createFailingProvider(errorMsg) {
  return async () => {
    throw new Error(errorMsg || "TTS provider error");
  };
}

// Sample scenes from script.json
const SAMPLE_SCENES = [
  {
    scene_id: "hook_01",
    chapter: "intro",
    narration: "Here's something that might surprise you about newborn babies and how they see the world.",
  },
  {
    scene_id: "ch1_fact1",
    chapter: "chapter_1",
    narration: "Babies can hear their mother's voice from inside the womb. In fact, research shows that newborns can distinguish their mother's voice from a stranger's within just hours of being born. Scientists believe this happens because sound travels through amniotic fluid, and babies spend months listening to the muffled tones of their mother's speech.",
  },
  {
    scene_id: "ch1_fact2",
    chapter: "chapter_1",
    narration: "By three months old, a baby's hearing has developed enough to track where sounds come from. They'll turn their head toward a familiar voice across the room.",
  },
  {
    scene_id: "ch2_fact1",
    chapter: "chapter_2",
    narration: "Now here's where it gets really fascinating. Newborn babies can only see about eight to twelve inches in front of them.",
  },
];

const CHAPTER_INFO = [
  { chapter_id: "intro", title: "Introduction" },
  { chapter_id: "chapter_1", title: "How Babies Hear" },
  { chapter_id: "chapter_2", title: "Baby Vision" },
];

// ─────────────────────────────────────────────
// LF-TTS-001: Generates audio for each scene
// ─────────────────────────────────────────────

test("LF-TTS-001: generates a WAV file for each scene", async () => {
  const provider = createFakeProvider();

  const result = await generateSceneTTS({
    scenes: SAMPLE_SCENES,
    chapters: CHAPTER_INFO,
    provider,
    outputDir: tmpDir,
    fps: 30,
    scenePaddingSec: 0.5,
  });

  expect(result.scenes).toHaveLength(4);
  for (const scene of result.scenes) {
    expect(scene.audio_file).toBeDefined();
    expect(fs.existsSync(scene.audio_file)).toBe(true);
  }
});

// ─────────────────────────────────────────────
// LF-TTS-002: Scene durations are positive and reasonable
// ─────────────────────────────────────────────

test("LF-TTS-002: each scene has positive duration in seconds and frames", async () => {
  const provider = createFakeProvider([5.0, 25.0, 12.0, 10.0]);

  const result = await generateSceneTTS({
    scenes: SAMPLE_SCENES,
    chapters: CHAPTER_INFO,
    provider,
    outputDir: tmpDir,
    fps: 30,
    scenePaddingSec: 0.5,
  });

  for (const scene of result.scenes) {
    expect(scene.duration_seconds).toBeGreaterThan(0);
    expect(scene.duration_frames).toBeGreaterThan(0);
    expect(Number.isInteger(scene.duration_frames)).toBe(true);
  }
});

// ─────────────────────────────────────────────
// LF-TTS-003: Scene padding added to duration
// ─────────────────────────────────────────────

test("LF-TTS-003: scene duration includes padding on top of audio duration", async () => {
  const audioDuration = 10.0;
  const padding = 0.5;
  const provider = createFakeProvider([audioDuration]);

  const result = await generateSceneTTS({
    scenes: [SAMPLE_SCENES[0]],
    chapters: CHAPTER_INFO,
    provider,
    outputDir: tmpDir,
    fps: 30,
    scenePaddingSec: padding,
  });

  const scene = result.scenes[0];
  expect(scene.audio_duration_seconds).toBeCloseTo(audioDuration, 1);
  expect(scene.duration_seconds).toBeCloseTo(audioDuration + padding, 1);
  expect(scene.duration_frames).toBe(Math.ceil((audioDuration + padding) * 30));
});

// ─────────────────────────────────────────────
// LF-TTS-004: Audio manifest has correct structure
// ─────────────────────────────────────────────

test("LF-TTS-004: manifest contains scenes array with required fields", async () => {
  const provider = createFakeProvider([5.0, 25.0, 12.0, 10.0]);

  const result = await generateSceneTTS({
    scenes: SAMPLE_SCENES,
    chapters: CHAPTER_INFO,
    provider,
    outputDir: tmpDir,
    fps: 30,
    scenePaddingSec: 0.5,
  });

  expect(result.scenes).toBeDefined();
  expect(result.total_duration_seconds).toBeGreaterThan(0);
  expect(result.total_duration_frames).toBeGreaterThan(0);
  expect(result.chapter_markers).toBeDefined();

  const scene = result.scenes[0];
  expect(scene).toHaveProperty("scene_id");
  expect(scene).toHaveProperty("chapter");
  expect(scene).toHaveProperty("audio_file");
  expect(scene).toHaveProperty("audio_duration_seconds");
  expect(scene).toHaveProperty("duration_seconds");
  expect(scene).toHaveProperty("duration_frames");
});

// ─────────────────────────────────────────────
// LF-TTS-005: Total duration is sum of scene durations
// ─────────────────────────────────────────────

test("LF-TTS-005: total duration equals sum of all scene durations", async () => {
  const durations = [5.0, 25.0, 12.0, 10.0];
  const padding = 0.5;
  const provider = createFakeProvider([...durations]);

  const result = await generateSceneTTS({
    scenes: SAMPLE_SCENES,
    chapters: CHAPTER_INFO,
    provider,
    outputDir: tmpDir,
    fps: 30,
    scenePaddingSec: padding,
  });

  const sumSeconds = result.scenes.reduce((sum, s) => sum + s.duration_seconds, 0);
  expect(result.total_duration_seconds).toBeCloseTo(sumSeconds, 1);

  const sumFrames = result.scenes.reduce((sum, s) => sum + s.duration_frames, 0);
  expect(result.total_duration_frames).toBe(sumFrames);
});

// ─────────────────────────────────────────────
// LF-TTS-006: Chapter markers computed from cumulative durations
// ─────────────────────────────────────────────

test("LF-TTS-006: chapter markers have correct start times", async () => {
  const durations = [5.0, 25.0, 12.0, 10.0];
  const padding = 0.5;
  const provider = createFakeProvider([...durations]);

  const result = await generateSceneTTS({
    scenes: SAMPLE_SCENES,
    chapters: CHAPTER_INFO,
    provider,
    outputDir: tmpDir,
    fps: 30,
    scenePaddingSec: padding,
  });

  expect(result.chapter_markers).toHaveLength(3); // intro, chapter_1, chapter_2

  // First chapter starts at 0
  expect(result.chapter_markers[0].start_seconds).toBe(0);
  expect(result.chapter_markers[0].label).toBe("Introduction");

  // Second chapter starts after intro scene (5.0 + 0.5 = 5.5s)
  expect(result.chapter_markers[1].start_seconds).toBeCloseTo(5.5, 1);
  expect(result.chapter_markers[1].label).toBe("How Babies Hear");

  // Third chapter starts after intro + ch1 scenes
  const ch2Start = 5.5 + 25.5 + 12.5; // 43.5
  expect(result.chapter_markers[2].start_seconds).toBeCloseTo(ch2Start, 1);
});

// ─────────────────────────────────────────────
// LF-TTS-007: Provider interface contract
// ─────────────────────────────────────────────

test("LF-TTS-007: provider receives narration text and returns wavPath + durationSec", async () => {
  let capturedCalls = [];
  const trackingProvider = async (text, voiceConfig) => {
    capturedCalls.push({ text, voiceConfig });
    const wavPath = path.join(tmpDir, `tracked-${capturedCalls.length}.wav`);
    createFakeWav(wavPath, 5.0);
    return { wavPath, durationSec: 5.0 };
  };

  await generateSceneTTS({
    scenes: [SAMPLE_SCENES[0]],
    chapters: CHAPTER_INFO,
    provider: trackingProvider,
    voiceConfig: { voice_id: "test-voice", provider: "elevenlabs" },
    outputDir: tmpDir,
    fps: 30,
    scenePaddingSec: 0.5,
  });

  expect(capturedCalls).toHaveLength(1);
  expect(capturedCalls[0].text).toBe(SAMPLE_SCENES[0].narration);
  expect(capturedCalls[0].voiceConfig).toEqual({ voice_id: "test-voice", provider: "elevenlabs" });
});

// ─────────────────────────────────────────────
// LF-TTS-008: Fallback provider on failure
// ─────────────────────────────────────────────

test("LF-TTS-008: uses fallback provider when primary fails", async () => {
  const primaryFail = createFailingProvider("ElevenLabs rate limit");
  const fallbackOk = createFakeProvider([8.0]);

  const result = await generateSceneTTS({
    scenes: [SAMPLE_SCENES[0]],
    chapters: CHAPTER_INFO,
    provider: primaryFail,
    fallbackProvider: fallbackOk,
    outputDir: tmpDir,
    fps: 30,
    scenePaddingSec: 0.5,
  });

  expect(result.scenes).toHaveLength(1);
  expect(result.scenes[0].audio_file).toBeDefined();
  expect(fs.existsSync(result.scenes[0].audio_file)).toBe(true);
});

// ─────────────────────────────────────────────
// LF-TTS-009: Throws when all providers fail
// ─────────────────────────────────────────────

test("LF-TTS-009: throws when both primary and fallback fail", async () => {
  const primaryFail = createFailingProvider("Primary failed");
  const fallbackFail = createFailingProvider("Fallback failed");

  await expect(
    generateSceneTTS({
      scenes: [SAMPLE_SCENES[0]],
      chapters: CHAPTER_INFO,
      provider: primaryFail,
      fallbackProvider: fallbackFail,
      outputDir: tmpDir,
      fps: 30,
      scenePaddingSec: 0.5,
    })
  ).rejects.toThrow();
});

// ─────────────────────────────────────────────
// LF-TTS-010: Cost estimate computed from char count
// ─────────────────────────────────────────────

test("LF-TTS-010: returns total character count and cost estimate", async () => {
  const provider = createFakeProvider([5.0, 25.0, 12.0, 10.0]);

  const result = await generateSceneTTS({
    scenes: SAMPLE_SCENES,
    chapters: CHAPTER_INFO,
    provider,
    outputDir: tmpDir,
    fps: 30,
    scenePaddingSec: 0.5,
    costPerChar: 0.00003, // ~$0.03 per 1000 chars (ElevenLabs approx)
  });

  expect(result.total_characters).toBeGreaterThan(0);
  expect(result.tts_cost_estimate).toBeGreaterThan(0);

  // Verify cost = chars * costPerChar
  expect(result.tts_cost_estimate).toBeCloseTo(
    result.total_characters * 0.00003,
    4
  );
});
