import { GoogleGenAI } from "@google/genai";
import * as child_process from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

// Gemini TTS — AI Facts Unlocked: 007-ai-radiation-therapy
// Voice: Kore (authoritative, medical precision tone)

if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function writeWavSync(filepath: string, pcmData: Buffer, sampleRate = 24000, channels = 1, bitDepth = 16) {
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + dataSize, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22); header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28); header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34); header.write("data", 36); header.writeUInt32LE(dataSize, 40);
  fs.writeFileSync(filepath, Buffer.concat([header, pcmData]));
}

const scenes = [
  {
    name: "scene-1",
    script: "AI now designs radiation therapy plans in minutes.",
    direction: "bold, punchy, urgent — grab attention immediately",
  },
  {
    name: "scene-2",
    script: "For decades, oncologists spent days manually plotting treatment fields around tumors. Systems like Elekta's AI achieve ninety-nine point eight percent precision matching expert radiologists — and can process ten times more patients in the same window.",
    direction: "factual, precise, building awe — let the numbers land with weight",
  },
  {
    name: "scene-3",
    script: "The bottleneck was human capacity. Now it's not.",
    direction: "definitive, confident, slightly ominous — this changes everything",
  },
  {
    name: "scene-4",
    script: "Did you know?",
    direction: "warm, inviting, conspiratorial — like sharing a secret",
  },
];

const callTTS = ai.models.generateContent.bind(ai.models);

async function generateWithRetry(
  params: Parameters<typeof ai.models.generateContent>[0],
  retries = 3,
): ReturnType<typeof ai.models.generateContent> {
  for (let i = 0; i < retries; i++) {
    try { return await callTTS(params); }
    catch (e: unknown) {
      const status = (e as { status?: number }).status;
      if ((status === 429 || status === 500) && i < retries - 1) {
        const wait = 15000 * (i + 1);
        console.log(`  Error ${status} — waiting ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw e;
    }
  }
  throw new Error("All retries failed");
}

async function main() {
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
    const prompt = `Speak in a ${scene.direction} tone:\n${scene.script}`;

    const response = await generateWithRetry({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
        },
      },
    });

    const data = response.candidates![0].content!.parts![0].inlineData!.data!;
    const pcmBuffer = Buffer.from(data, "base64");
    const filepath = path.join(outputDir, `${scene.name}.wav`);
    writeWavSync(filepath, pcmBuffer);

    try {
      const rawPath = filepath.replace(".wav", ".raw.wav");
      fs.renameSync(filepath, rawPath);
      child_process.execSync(
        `ffmpeg -y -i "${rawPath}" -acodec pcm_s16le -ar 24000 -ac 1 "${filepath}"`,
        { stdio: "pipe" },
      );
      fs.unlinkSync(rawPath);
      const durationStr = child_process.execSync(
        `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filepath}"`,
        { encoding: "utf8" },
      ).trim();
      const durationSec = parseFloat(durationStr);
      manifest[scene.name] = { file: `audio/${scene.name}.wav`, durationSec };
      console.log(`  -> ${filepath} (${durationSec.toFixed(2)}s, ffprobe)`);
    } catch {
      const durationSec = pcmBuffer.length / (24000 * 2);
      manifest[scene.name] = { file: `audio/${scene.name}.wav`, durationSec };
      console.log(`  -> ${filepath} (${durationSec.toFixed(2)}s, byte-count)`);
    }

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    if (scenes.indexOf(scene) < scenes.length - 1) await new Promise(r => setTimeout(r, 1500));
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log("\nManifest written.");
  for (const [name, entry] of Object.entries(manifest)) {
    console.log(`  ${name}: ${entry.durationSec.toFixed(2)}s`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
