#!/usr/bin/env node
/**
 * run-longform.js — Long-Form Video Pipeline Orchestrator
 *
 * Runs the full long-form video pipeline end-to-end:
 *   1. Load script JSON
 *   2. Dry-run cost estimate
 *   3. Generate TTS audio (ElevenLabs)
 *   4. Resolve images (cache-first, Grok Aurora on miss)
 *   5. Build Remotion composition plan
 *   6. Output composition.json for Remotion rendering
 *
 * Usage:
 *   node run-longform.js <script.json> [--dry-run] [--skip-images] [--skip-tts]
 *
 * Environment:
 *   ELEVENLABS_API_KEY — ElevenLabs TTS
 *   GROK_API_KEY       — Grok image generation (Aurora)
 */

const fs = require("fs");
const path = require("path");

// Load .env.local from project root
const envPath = path.resolve(__dirname, "../../../.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

const { generateSceneTTS } = require("./generate-tts");
const { buildCompositionPlan } = require("./build-composition");
const { estimateCost } = require("./dry-run");

// ─────────────────────────────────────────────
// Providers
// ─────────────────────────────────────────────

/**
 * Grok TTS provider.
 * Uses api.x.ai/v1/tts — returns MP3, uses ffprobe for duration.
 */
function createGrokTTSProvider(outputDir) {
  const apiKey = process.env.GROK_API_KEY || process.env.XAI_GROK_API_KEY;
  if (!apiKey) throw new Error("GROK_API_KEY is not set");

  let callCount = 0;

  return async (text, voiceConfig) => {
    callCount++;
    const voice = voiceConfig?.grok_voice || "ara";

    console.log(`  [TTS] Scene ${callCount}: ${text.length} chars → Grok TTS (${voice})`);

    const response = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice_id: voice,
        language: "en",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Grok TTS error (${response.status}): ${errText}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // Grok returns MP3
    const mp3Path = path.join(outputDir, `scene-${callCount}.mp3`);
    fs.writeFileSync(mp3Path, audioBuffer);

    // Estimate duration from MP3 file size
    // MP3 at 128kbps: duration ≈ fileSize / (128000/8) = fileSize / 16000
    // At 192kbps: duration ≈ fileSize / 24000
    // Use 128kbps as default estimate, or try ffprobe if available
    let durationSec;
    try {
      const { execSync } = require("child_process");
      const durationStr = execSync(
        `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${mp3Path}"`,
        { stdio: ["pipe", "pipe", "pipe"] }
      ).toString().trim();
      durationSec = parseFloat(durationStr);
    } catch {
      // Fallback: estimate from MP3 bitrate (assume ~128kbps)
      durationSec = audioBuffer.length / 16000;
      console.log(`  [TTS] Scene ${callCount}: estimated duration from file size (no ffprobe)`);
    }

    console.log(`  [TTS] Scene ${callCount}: ${durationSec.toFixed(1)}s → ${mp3Path}`);

    return { wavPath: mp3Path, durationSec };
  };
}

/**
 * ElevenLabs TTS provider.
 * provider(text, voiceConfig) → { wavPath, durationSec }
 */
function createElevenLabsProvider(outputDir) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

  let callCount = 0;

  return async (text, voiceConfig) => {
    callCount++;
    const voiceId = voiceConfig?.voice_id || "XrExE9yKIg1WjnnlVkGX"; // Matilda
    const model = voiceConfig?.model || "eleven_multilingual_v2";

    console.log(`  [TTS] Scene ${callCount}: ${text.length} chars → ElevenLabs (${voiceId})`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: model,
          output_format: "pcm_24000",
          voice_settings: {
            stability: voiceConfig?.stability ?? 0.7,
            similarity_boost: voiceConfig?.similarity_boost ?? 0.8,
            speed: voiceConfig?.speed ?? 0.95,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`ElevenLabs API error (${response.status}): ${errText}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // Write WAV file (PCM 24kHz mono 16-bit)
    const wavPath = path.join(outputDir, `scene-${callCount}.wav`);
    writeWav(wavPath, audioBuffer, 24000);

    // Duration from PCM data length
    const durationSec = audioBuffer.length / (24000 * 2); // 16-bit mono

    console.log(`  [TTS] Scene ${callCount}: ${durationSec.toFixed(1)}s → ${wavPath}`);

    return { wavPath, durationSec };
  };
}

/**
 * Grok (Aurora) image generation provider.
 * Uses OpenAI-compatible API at api.x.ai
 */
function createGrokImageProvider(outputDir) {
  const apiKey = process.env.GROK_API_KEY || process.env.XAI_GROK_API_KEY;
  if (!apiKey) throw new Error("GROK_API_KEY is not set");

  let callCount = 0;

  return async (prompt, tags) => {
    callCount++;
    const fullPrompt = `soft whimsical illustration, warm pastel colors, baby-friendly, 16:9 landscape, no text, seamless expansive composition. ${prompt}`;

    console.log(`  [IMG] Scene ${callCount}: generating via Grok Aurora...`);

    const response = await fetch("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-imagine-image",
        prompt: fullPrompt,
        n: 1,
        response_format: "b64_json",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Grok image API error (${response.status}): ${errText}`);
    }

    const result = await response.json();
    const b64 = result.data[0].b64_json;
    const imgBuffer = Buffer.from(b64, "base64");

    const imgPath = path.join(outputDir, `scene-${callCount}.png`);
    fs.writeFileSync(imgPath, imgBuffer);

    console.log(`  [IMG] Scene ${callCount}: saved → ${imgPath}`);

    return {
      path: imgPath,
      provider: "grok",
      model: "grok-2-image",
    };
  };
}

// ─────────────────────────────────────────────
// WAV Writer
// ─────────────────────────────────────────────

function writeWav(filepath, pcmData, sampleRate = 24000, channels = 1, bitDepth = 16) {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmData.length;
  const fileSize = 44 + dataSize;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(fileSize - 8, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, Buffer.concat([header, pcmData]));
}

// ─────────────────────────────────────────────
// Config Loader
// ─────────────────────────────────────────────

function loadProjectConfig(projectSlug) {
  const registryPath = path.resolve(__dirname, "../../projects.json");
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
  const project = registry.projects[projectSlug];
  if (!project) throw new Error(`Project "${projectSlug}" not found in projects.json`);
  return project;
}

// ─────────────────────────────────────────────
// Main Pipeline
// ─────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const scriptPath = args.find((a) => !a.startsWith("--"));
  const dryRun = args.includes("--dry-run");
  const skipImages = args.includes("--skip-images");
  const skipTTS = args.includes("--skip-tts");
  const ttsFlag = args.find((a) => a.startsWith("--tts="));
  const ttsChoice = ttsFlag ? ttsFlag.split("=")[1] : "elevenlabs"; // elevenlabs | grok
  const imgFlag = args.find((a) => a.startsWith("--img="));
  const imgChoice = imgFlag ? imgFlag.split("=")[1] : "grok"; // grok | gemini

  if (!scriptPath) {
    console.error("Usage: node run-longform.js <script.json> [--dry-run] [--skip-images] [--skip-tts] [--tts=elevenlabs|grok] [--img=grok|gemini]");
    process.exit(1);
  }

  // Load script
  const script = JSON.parse(fs.readFileSync(scriptPath, "utf-8"));
  console.log(`\n═══ Long-Form Video Pipeline ═══`);
  console.log(`Title: ${script.title}`);
  console.log(`Scenes: ${script.scenes.length} | Chapters: ${script.chapters.length}`);
  console.log(`Target: ${script.target_length_min} minutes`);

  // Load project config
  const project = loadProjectConfig("baby-facts-unlocked");
  const longform = project.longform;

  // Setup output directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outputDir = path.resolve(__dirname, `../output/${timestamp}`);
  fs.mkdirSync(path.join(outputDir, "audio"), { recursive: true });
  fs.mkdirSync(path.join(outputDir, "images"), { recursive: true });

  // ── Step 1: Dry-Run Cost Estimate ──
  console.log("\n── Step 1: Cost Estimate ──");

  // Simulate cache queries (no cache for first run)
  const cacheQueryResults = {};
  for (const scene of script.scenes) {
    cacheQueryResults[scene.scene_id] = { hit: false, score: 0 };
  }

  const costEstimate = estimateCost(script, cacheQueryResults, {
    ttsProvider: ttsChoice,
    imageProvider: imgChoice,
    costRates: {
      tts: {
        elevenlabs: { perChar: 0.00022 },
        grok: { perChar: 0.0001 },
        kokoro: { perChar: 0 },
      },
      image: {
        grok: { perImage: 0.02 },
        gemini: { perImage: 0.04 },
      },
    },
  });

  console.log(`  TTS: ${costEstimate.tts.totalCharacters} chars → $${costEstimate.tts.estimatedCost.toFixed(4)}`);
  console.log(`  Images: ${costEstimate.images.cacheMisses} to generate → $${costEstimate.images.estimatedCost.toFixed(2)}`);
  console.log(`  Cache hit rate: ${costEstimate.images.hitRate}%`);
  console.log(`  ─────────────────`);
  console.log(`  Total estimated: $${costEstimate.totalEstimatedCost.toFixed(4)}`);
  console.log(`  Provider comparison (TTS): ElevenLabs=$${costEstimate.providerComparison.elevenlabs?.toFixed(4) || "N/A"} | Grok=$${costEstimate.providerComparison.grok?.toFixed(4) || "N/A"} | Kokoro=$0`);

  // Save cost estimate
  fs.writeFileSync(
    path.join(outputDir, "cost-estimate.json"),
    JSON.stringify(costEstimate, null, 2)
  );

  if (dryRun) {
    console.log("\n✅ Dry run complete. No API calls made.");
    console.log(`Output: ${outputDir}/cost-estimate.json`);
    return;
  }

  // ── Step 2: TTS Generation ──
  let audioManifest;
  if (skipTTS) {
    console.log("\n── Step 2: TTS (skipped) ──");
    // Create a fake audio manifest for testing composition without TTS
    audioManifest = {
      scenes: script.scenes.map((s, i) => ({
        scene_id: s.scene_id,
        chapter: s.chapter,
        audio_file: `audio/${s.scene_id}.wav`,
        audio_duration_seconds: Math.ceil(s.narration.split(/\s+/).length / 2.5),
        duration_seconds: Math.ceil(s.narration.split(/\s+/).length / 2.5) + 0.5,
        duration_frames: Math.ceil((Math.ceil(s.narration.split(/\s+/).length / 2.5) + 0.5) * 30),
      })),
      chapter_markers: script.chapters.map((c, i) => ({
        chapter: c.chapter_id,
        start_seconds: 0,
        label: c.title,
      })),
      total_duration_seconds: 0,
      total_duration_frames: 0,
      total_characters: 0,
      tts_cost_estimate: 0,
    };
    audioManifest.total_duration_seconds = audioManifest.scenes.reduce((s, sc) => s + sc.duration_seconds, 0);
    audioManifest.total_duration_frames = audioManifest.scenes.reduce((s, sc) => s + sc.duration_frames, 0);
  } else {
    console.log(`\n── Step 2: TTS Generation (${ttsChoice}) ──`);

    const audioDir = path.join(outputDir, "audio");
    let ttsProvider, fallbackProvider, costPerChar;

    if (ttsChoice === "grok") {
      ttsProvider = createGrokTTSProvider(audioDir);
      costPerChar = 0.0001;
      if (process.env.ELEVENLABS_API_KEY) {
        try { fallbackProvider = createElevenLabsProvider(audioDir); } catch {}
      }
    } else {
      ttsProvider = createElevenLabsProvider(audioDir);
      costPerChar = 0.00022;
      if (process.env.GROK_API_KEY || process.env.XAI_GROK_API_KEY) {
        try { fallbackProvider = createGrokTTSProvider(audioDir); } catch {}
      }
    }

    if (fallbackProvider) {
      console.log(`  [TTS] Fallback: ${ttsChoice === "grok" ? "elevenlabs" : "grok"}`);
    }

    audioManifest = await generateSceneTTS({
      scenes: script.scenes,
      chapters: script.chapters,
      provider: ttsProvider,
      fallbackProvider,
      voiceConfig: {
        grok_voice: "ara",
        voice_id: longform.voice.voice_id,
        model: longform.voice.model,
        stability: longform.voice.stability,
        similarity_boost: longform.voice.similarity_boost,
        speed: longform.voice.speed,
      },
      outputDir: audioDir,
      fps: longform.visuals.fps,
      scenePaddingSec: longform.audio.scene_padding_sec,
      costPerChar,
    });

    console.log(`  Total audio: ${audioManifest.total_duration_seconds.toFixed(1)}s (${audioManifest.scenes.length} scenes)`);
    console.log(`  TTS cost: $${audioManifest.tts_cost_estimate.toFixed(4)}`);
  }

  // Save audio manifest
  fs.writeFileSync(
    path.join(outputDir, "audio-manifest.json"),
    JSON.stringify(audioManifest, null, 2)
  );

  // ── Step 3: Image Resolution ──
  let imageManifest;
  if (skipImages) {
    console.log("\n── Step 3: Images (skipped) ──");
    imageManifest = {};
    for (const scene of script.scenes) {
      imageManifest[scene.scene_id] = {
        path: `images/${scene.scene_id}.png`,
        source: "placeholder",
      };
    }
  } else {
    console.log("\n── Step 3: Image Generation (Grok Aurora) ──");
    const generateImage = createGrokImageProvider(path.join(outputDir, "images"));

    imageManifest = {};
    for (const scene of script.scenes) {
      try {
        const result = await generateImage(scene.image_hint, scene.image_tags);
        imageManifest[scene.scene_id] = {
          path: result.path,
          source: "generated",
          provider: result.provider,
        };
      } catch (err) {
        console.error(`  [IMG] ERROR on ${scene.scene_id}: ${err.message}`);
        imageManifest[scene.scene_id] = {
          path: null,
          source: "error",
          error: err.message,
        };
      }
    }
  }

  // Save image manifest
  fs.writeFileSync(
    path.join(outputDir, "image-manifest.json"),
    JSON.stringify(imageManifest, null, 2)
  );

  // ── Step 4: Build Composition Plan ──
  console.log("\n── Step 4: Composition Plan ──");

  const compositionPlan = buildCompositionPlan(audioManifest, imageManifest, {
    fps: longform.visuals.fps,
    width: 1920,
    height: 1080,
    transitionDurationSec: longform.visuals.transition_duration_sec,
    chapterTitleDurationSec: longform.audio.chapter_title_duration_sec,
    kenBurnsZoomRange: longform.visuals.ken_burns_zoom_range,
  });

  const scenes = compositionPlan.sequences.filter((s) => s.type === "scene");
  const transitions = compositionPlan.sequences.filter((s) => s.type === "transition");
  const titles = compositionPlan.sequences.filter((s) => s.type === "chapter_title");
  const durationMin = compositionPlan.totalDurationInSeconds / 60;

  console.log(`  Duration: ${durationMin.toFixed(1)} minutes (${compositionPlan.totalDurationInFrames} frames)`);
  console.log(`  Scenes: ${scenes.length} | Transitions: ${transitions.length} | Chapter titles: ${titles.length}`);
  console.log(`  Resolution: ${compositionPlan.width}x${compositionPlan.height} @ ${compositionPlan.fps}fps`);

  // Save composition plan
  fs.writeFileSync(
    path.join(outputDir, "composition.json"),
    JSON.stringify(compositionPlan, null, 2)
  );

  // ── Step 5: Generate metadata ──
  const metadata = {
    title: script.title,
    description: script.description,
    tags: script.tags,
    chapters: compositionPlan.chapterMarkers.map((m) => ({
      time: formatTimestamp(m.start_seconds),
      label: m.label,
    })),
    duration_seconds: compositionPlan.totalDurationInSeconds,
    duration_minutes: Math.round(durationMin * 10) / 10,
    variables: script.variables,
    generated_at: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(outputDir, "metadata.json"),
    JSON.stringify(metadata, null, 2)
  );

  // ── Summary ──
  console.log("\n═══════════════════════════════════════");
  console.log(`✅ Pipeline complete!`);
  console.log(`Output: ${outputDir}`);
  console.log(`Files:`);
  console.log(`  - cost-estimate.json`);
  console.log(`  - audio-manifest.json (${audioManifest.scenes.length} scenes)`);
  console.log(`  - image-manifest.json (${Object.keys(imageManifest).length} images)`);
  console.log(`  - composition.json (${compositionPlan.totalDurationInFrames} frames)`);
  console.log(`  - metadata.json`);
  if (!skipTTS) console.log(`  - audio/ (${audioManifest.scenes.length} WAV files)`);
  if (!skipImages) console.log(`  - images/ (${Object.keys(imageManifest).length} PNGs)`);
  console.log(`\nYouTube chapters:`);
  metadata.chapters.forEach((ch) => console.log(`  ${ch.time} ${ch.label}`));
  console.log(`\nTotal duration: ${metadata.duration_minutes} min`);
  console.log("═══════════════════════════════════════\n");
}

function formatTimestamp(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

main().catch((err) => {
  console.error("\n❌ Pipeline failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});
