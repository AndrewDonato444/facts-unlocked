import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY not set — add to DonatoSkills/.env.local or export in shell");
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

interface SceneScript {
  name: string;
  script: string;
  direction?: string;
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
  throw new Error("All TTS retries exhausted");
}

async function generateVoiceover(scenes: SceneScript[], voice = "Kore") {
  const outputDir = path.join(__dirname, "..", "public", "audio");
  fs.mkdirSync(outputDir, { recursive: true });

  const manifest: Record<string, { file: string; durationSec: number }> = {};

  for (const scene of scenes) {
    console.log(`Generating TTS (Gemini ${voice}): ${scene.name}...`);
    const prompt = scene.direction
      ? `Speak in a ${scene.direction} tone:\n${scene.script}`
      : scene.script;

    const response = await generateWithRetry({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
        },
      },
    });

    const data = response.candidates![0].content!.parts![0].inlineData!.data!;
    const pcmData = Buffer.from(data, "base64");

    const filepath = path.join(outputDir, `${scene.name}.wav`);
    writeWavSync(filepath, pcmData);

    const durationSec = pcmData.length / (24000 * 2);
    manifest[scene.name] = { file: `audio/${scene.name}.wav`, durationSec };
    console.log(`  Saved ${scene.name}.wav (${durationSec.toFixed(1)}s)`);

    if (scenes.indexOf(scene) < scenes.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  const manifestPath = path.join(outputDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest: ${manifestPath}`);
  const total = Object.values(manifest).reduce((s, v) => s + v.durationSec, 0);
  console.log(`Total audio: ${total.toFixed(1)}s`);
  return manifest;
}

const scenes: SceneScript[] = [
  {
    name: "scene-1-hook",
    script: "Your baby is born with a window in their skull where you can watch their heartbeat.",
    direction: "warm, surprising, conversational",
  },
  {
    name: "scene-2-body",
    script: "It's called the fontanelle. Those two soft spots let the skull compress during birth — and give the brain room to triple in size during year one. It closes at 12 to 18 months, exactly when rapid growth slows.",
  },
  {
    name: "scene-3-cta",
    script: "That pulsing soft spot? That's your baby's heartbeat, visible through the skull. Follow for more.",
    direction: "warm, inviting",
  },
];

generateVoiceover(scenes, "Kore").catch((e) => {
  console.error("TTS failed:", e);
  process.exit(1);
});
