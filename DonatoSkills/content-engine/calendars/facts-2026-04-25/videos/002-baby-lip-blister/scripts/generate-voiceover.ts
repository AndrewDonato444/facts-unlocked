import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

// Baby Facts #052 — Sucking Blister
// Voice: Aoede (warm, maternal, conversational)

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set.");
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

function reencodeAsPcmWav(inputPath: string, outputPath: string): void {
  execSync(`ffmpeg -y -i "${inputPath}" -acodec pcm_s16le -ar 44100 "${outputPath}"`, { stdio: "inherit" });
}

interface SceneScript {
  name: string;
  script: string;
  direction?: string;
}

const callTTS = ai.models.generateContent.bind(ai.models);

async function generateWithRetry(
  params: Parameters<typeof ai.models.generateContent>[0],
  retries = 3,
): ReturnType<typeof ai.models.generateContent> {
  for (let i = 0; i < retries; i++) {
    try {
      return await callTTS(params);
    } catch (e: unknown) {
      const status = (e as { status?: number }).status;
      if ((status === 429 || status === 500) && i < retries - 1) {
        const waitMs = 20000 * (i + 1);
        console.log(`  Rate limited, waiting ${waitMs / 1000}s...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw e;
    }
  }
  throw new Error(`generateWithRetry: all ${retries} attempts failed`);
}

async function generateVoiceover(scenes: SceneScript[], voice: string = "Aoede") {
  const outputDir = path.join(__dirname, "..", "public", "audio");
  fs.mkdirSync(outputDir, { recursive: true });

  const manifestPath = path.join(outputDir, "manifest.json");
  const manifest: Record<string, { file: string; durationSec: number }> = {};

  if (fs.existsSync(manifestPath)) {
    const existing = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    Object.assign(manifest, existing);
    console.log(`Resuming — have: ${Object.keys(existing).join(", ")}`);
  }

  for (const scene of scenes) {
    if (manifest[scene.name]) {
      console.log(`Skipping ${scene.name} (${manifest[scene.name].durationSec.toFixed(2)}s)`);
      continue;
    }
    console.log(`Generating: ${scene.name}...`);
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
      } as any,
    });

    const data = response.candidates![0].content!.parts![0].inlineData!.data!;
    const audioBuffer = Buffer.from(data, "base64");

    const rawPath = path.join(outputDir, `${scene.name}-raw.wav`);
    writeWavSync(rawPath, audioBuffer);

    const finalPath = path.join(outputDir, `${scene.name}.wav`);
    reencodeAsPcmWav(rawPath, finalPath);
    fs.unlinkSync(rawPath);

    const finalBuffer = fs.readFileSync(finalPath);
    const durationSec = (finalBuffer.length - 44) / (44100 * 2);

    manifest[scene.name] = { file: `audio/${scene.name}.wav`, durationSec };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`  Saved: ${finalPath} (${durationSec.toFixed(2)}s)`);

    if (scenes.indexOf(scene) < scenes.length - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log("Timing manifest written.");
  console.log(JSON.stringify(manifest, null, 2));
}

const scenes: SceneScript[] = [
  {
    name: "scene-1-hook",
    script: "That little blister on your baby's lip? It's actually good news.",
    direction: "warm, gently surprising, reassuring — land on 'good news' with a smile",
  },
  {
    name: "scene-2-body",
    script: "Sucking blisters are tiny calluses that form on newborns' lips from the intense suction of feeding. They appear within the first few weeks, feel completely painless to your baby, and disappear on their own as the lip toughens up. No treatment needed — it's simply evidence that your baby is latching and feeding well.",
    direction: "warm, reassuring, knowledgeable — like a trusted pediatrician calming a new parent",
  },
  {
    name: "scene-3-cta",
    script: "Did you know? Follow for more baby facts.",
    direction: "warm, encouraging, inviting",
  },
];

generateVoiceover(scenes, "Aoede").catch(console.error);
