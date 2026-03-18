#!/usr/bin/env node
/**
 * HeyGen Quality Test — AI Facts Unlocked
 *
 * Standalone test script (not wired into the pipeline).
 * Tests HeyGen avatar video generation with a sample AI fact.
 *
 * Usage:
 *   node --env-file=.env.local scripts/test-heygen.js
 *
 * Or with dotenv:
 *   HEYGEN_API_KEY=xxx node scripts/test-heygen.js
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.HEYGEN_API_KEY;
if (!API_KEY) {
  console.error("❌ HEYGEN_API_KEY not set. Run with --env-file=.env.local");
  process.exit(1);
}

const BASE_URL = "https://api.heygen.com";

// ─── helpers ──────────────────────────────────────────────────────────────────

function request(method, pathname, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "api.heygen.com",
      path: pathname,
      method,
      headers: {
        "X-Api-Key": API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── step 1: list avatars ─────────────────────────────────────────────────────

async function listAvatars() {
  console.log("\n📋 Fetching available avatars...");
  const res = await request("GET", "/v2/avatars?include_public=true");
  if (res.status !== 200) {
    throw new Error(`Avatar list failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const avatars = res.body.data?.avatars || [];
  console.log(`   Found ${avatars.length} avatars`);

  // Log first few so we can pick one
  avatars.slice(0, 5).forEach((a) => {
    console.log(`   • ${a.avatar_id} — ${a.avatar_name} (${a.gender || "unknown"})`);
  });

  return avatars;
}

// ─── step 2: list voices ──────────────────────────────────────────────────────

async function listVoices() {
  console.log("\n🎙  Fetching available voices...");
  const res = await request("GET", "/v2/voices");
  if (res.status !== 200) {
    throw new Error(`Voice list failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const voices = res.body.data?.voices || [];
  // Filter to English voices
  const enVoices = voices.filter(
    (v) => v.language === "English" || v.locale?.startsWith("en")
  );
  console.log(`   Found ${voices.length} total voices, ${enVoices.length} English`);
  enVoices.slice(0, 5).forEach((v) => {
    console.log(`   • ${v.voice_id} — ${v.name} (${v.gender || "unknown"})`);
  });
  return enVoices;
}

// ─── step 3: generate video ───────────────────────────────────────────────────

async function generateVideo(avatarId, voiceId) {
  const fact = {
    hook: "AI can now dream. Literally.",
    body:
      "In 2023, researchers at MIT discovered that large language models develop internal representations that closely mirror the structure of human dreams — fragmented, associative, and emotionally charged. When GPT-4 was asked to free-associate without constraints, its outputs matched dream-journal patterns with 87% structural similarity.",
    cta: "Follow for more AI facts that will break your brain.",
  };

  const script = `${fact.hook}\n\n${fact.body}\n\n${fact.cta}`;

  console.log("\n🎬 Generating HeyGen video...");
  console.log(`   Avatar: ${avatarId}`);
  console.log(`   Voice: ${voiceId}`);
  console.log(`   Script preview: "${fact.hook}..."`);

  const payload = {
    video_inputs: [
      {
        character: {
          type: "avatar",
          avatar_id: avatarId,
          avatar_style: "normal",
        },
        voice: {
          type: "text",
          input_text: script,
          voice_id: voiceId,
          speed: 1.0,
        },
        background: {
          type: "color",
          value: "#0a0a0a",
        },
      },
    ],
    aspect_ratio: "9:16",
    test: true, // Use test mode to avoid burning credits on quality check
  };

  const res = await request("POST", "/v2/video/generate", payload);

  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Video generate failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  const videoId = res.body.data?.video_id;
  if (!videoId) {
    throw new Error(`No video_id in response: ${JSON.stringify(res.body)}`);
  }

  console.log(`   ✅ Video queued — ID: ${videoId}`);
  return videoId;
}

// ─── step 4: poll for completion ──────────────────────────────────────────────

async function pollVideo(videoId, maxMinutes = 10) {
  console.log(`\n⏳ Polling for completion (up to ${maxMinutes} min)...`);
  const deadline = Date.now() + maxMinutes * 60 * 1000;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt++;
    const res = await request(
      "GET",
      `/v1/video_status.get?video_id=${videoId}`
    );

    if (res.status !== 200) {
      throw new Error(`Status check failed: ${res.status} ${JSON.stringify(res.body)}`);
    }

    const { status, video_url, thumbnail_url, error } = res.body.data || {};
    console.log(`   [${attempt}] status: ${status}`);

    if (status === "completed") {
      return { video_url, thumbnail_url };
    }

    if (status === "failed") {
      throw new Error(`Video processing failed: ${JSON.stringify(error)}`);
    }

    // Back off: 10s for first 6 attempts, then 30s
    const waitMs = attempt <= 6 ? 10_000 : 30_000;
    await sleep(waitMs);
  }

  throw new Error("Timed out waiting for video completion");
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 HeyGen Quality Test — AI Facts Unlocked");
  console.log("=".repeat(50));

  // 1. List what's available
  const avatars = await listAvatars();
  const voices = await listVoices();

  if (avatars.length === 0) {
    throw new Error("No avatars found — check API key and account access");
  }
  if (voices.length === 0) {
    throw new Error("No voices found");
  }

  // Pick the first available avatar and voice
  const avatar = avatars[0];
  const voice = voices[0];

  console.log(`\n✅ Using avatar: ${avatar.avatar_name} (${avatar.avatar_id})`);
  console.log(`✅ Using voice:  ${voice.name} (${voice.voice_id})`);

  // 2. Generate video
  const videoId = await generateVideo(avatar.avatar_id, voice.voice_id);

  // 3. Poll for result
  const result = await pollVideo(videoId);

  // 4. Report
  console.log("\n" + "=".repeat(50));
  console.log("🎉 VIDEO READY");
  console.log(`   Video URL:     ${result.video_url}`);
  console.log(`   Thumbnail URL: ${result.thumbnail_url}`);
  console.log(`   Video ID:      ${videoId}`);

  // Save result to a file for inspection
  const outputPath = path.join(__dirname, "heygen-test-result.json");
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ videoId, ...result, generatedAt: new Date().toISOString() }, null, 2)
  );
  console.log(`\n   Result saved to: ${outputPath}`);
}

main().catch((err) => {
  console.error("\n❌ Test failed:", err.message);
  process.exit(1);
});
