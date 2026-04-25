/**
 * Generates TTS for all 7 remaining videos using Gemini.
 * Outputs separate per-video manifest files under public/audio/{videoId}/
 */
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";
import { VIDEOS } from "../src/videos-config";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function writeWavSync(filepath: string, pcmData: Buffer, sampleRate = 24000, channels = 1, bitDepth = 16) {
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  fs.writeFileSync(filepath, Buffer.concat([header, pcmData]));
}

const callTTS = ai.models.generateContent.bind(ai.models);

async function generateWithRetry(params: Parameters<typeof ai.models.generateContent>[0], retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await callTTS(params);
    } catch (e: unknown) {
      const status = (e as { status?: number }).status;
      if (status === 429 && i < retries - 1) {
        const wait = 15000 * (i + 1);
        console.log(`  Rate limited, retrying in ${wait / 1000}s...`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw e;
    }
  }
  throw new Error("All retries exhausted");
}

async function main() {
  const publicDir = path.join(__dirname, "..", "public", "audio");

  for (const video of VIDEOS) {
    console.log(`\n=== ${video.id} (voice: ${video.voice}) ===`);
    const videoAudioDir = path.join(publicDir, video.id);
    fs.mkdirSync(videoAudioDir, { recursive: true });

    const manifest: Record<string, { file: string; durationSec: number }> = {};

    for (const scene of video.scenes) {
      const prompt = scene.direction
        ? `Speak in a ${scene.direction} tone:\n${scene.script}`
        : scene.script;

      console.log(`  Generating ${scene.name}...`);

      const response = await generateWithRetry({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: video.voice } },
          },
        },
      });

      const data = response.candidates![0].content!.parts![0].inlineData!.data!;
      const pcmData = Buffer.from(data, "base64");

      const filepath = path.join(videoAudioDir, `${scene.name}.wav`);
      writeWavSync(filepath, pcmData);

      const durationSec = pcmData.length / (24000 * 2);
      manifest[scene.name] = { file: `audio/${video.id}/${scene.name}.wav`, durationSec };
      console.log(`    ${scene.name}.wav: ${durationSec.toFixed(1)}s`);

      // Rate limit buffer between calls
      await new Promise((r) => setTimeout(r, 2500));
    }

    const manifestPath = path.join(videoAudioDir, "manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    const total = Object.values(manifest).reduce((s, v) => s + v.durationSec, 0);
    console.log(`  Total: ${total.toFixed(1)}s → manifest saved`);

    // Pause between videos
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.log("\nAll TTS generated.");
}

main().catch((e) => {
  console.error("TTS generation failed:", e);
  process.exit(1);
});
