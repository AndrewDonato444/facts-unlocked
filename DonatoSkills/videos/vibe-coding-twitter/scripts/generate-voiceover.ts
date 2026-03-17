import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not set");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey, vertexai: false });

interface SceneScript {
  name: string;
  script: string;
  direction?: string;
}

function writeWav(filepath: string, pcmData: Buffer, sampleRate: number = 24000, channels: number = 1, bitDepth: number = 16) {
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;
  const fileSize = headerSize + dataSize;

  const header = Buffer.alloc(headerSize);
  header.write("RIFF", 0);
  header.writeUInt32LE(fileSize - 8, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20);  // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  fs.writeFileSync(filepath, Buffer.concat([header, pcmData]));
}

async function generateVoiceover(scenes: SceneScript[], voice: string = "Puck") {
  const outputDir = path.join(__dirname, "..", "public", "audio");
  fs.mkdirSync(outputDir, { recursive: true });

  const manifest: Record<string, { file: string; durationSec: number }> = {};

  for (const scene of scenes) {
    console.log(`Generating: ${scene.name}...`);
    const prompt = scene.direction
      ? `Speak in a ${scene.direction} tone:\n${scene.script}`
      : scene.script;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const data = response.candidates![0].content!.parts![0].inlineData!.data!;
    const audioBuffer = Buffer.from(data, "base64");

    const filepath = path.join(outputDir, `${scene.name}.wav`);
    writeWav(filepath, audioBuffer);

    const durationSec = audioBuffer.length / (24000 * 2);
    manifest[scene.name] = { file: `audio/${scene.name}.wav`, durationSec };
    console.log(`  Saved: ${filepath} (${durationSec.toFixed(1)}s)`);
  }

  const manifestPath = path.join(outputDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nTiming manifest: ${manifestPath}`);

  return manifest;
}

const scenes: SceneScript[] = [
  {
    name: "scene-1-hook",
    script: "Vibe coding. You describe the app. The AI builds it. You sip coffee.",
    direction: "upbeat, amused, like you're telling a friend something unbelievable",
  },
  {
    name: "scene-2-body",
    script: "It just... works. No boilerplate. No Stack Overflow rabbit holes. Just vibes.",
  },
  {
    name: "scene-3-cta",
    script: "Welcome to the future — where the only skill you need... is knowing what you want.",
  },
];

generateVoiceover(scenes).catch(console.error);
