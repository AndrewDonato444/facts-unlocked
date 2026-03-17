import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

interface ImageJob {
  name: string;
  prompt: string;
  aspectRatio: string;
  model?: string;
}

async function generateImage(job: ImageJob): Promise<string> {
  const model = job.model || "gemini-2.5-flash-image";

  console.log(`Generating "${job.name}" with ${model}...`);

  const response = await ai.models.generateContent({
    model,
    contents: job.prompt,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: job.aspectRatio as any,
      },
    },
  });

  const outputDir = path.join(__dirname, "..", "output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  for (const part of response.candidates![0].content!.parts!) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data!, "base64");
      const outputPath = path.join(outputDir, `${job.name}.png`);
      fs.writeFileSync(outputPath, buffer);
      console.log(`Generated: ${outputPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
      return outputPath;
    }
  }

  throw new Error("No image data in response");
}

// Quote card for Twitter/X about vibe coding
const job: ImageJob = {
  name: "vibe-coding-quote",
  prompt: `Social media quote card with the text "Ship first. Understand later." in bold white sans-serif font, centered vertically. Dark background with subtle neon purple and electric blue gradient glow effects, faint code symbols and brackets floating in the background out of focus. Modern, techy, slightly irreverent vibe. Clean and minimal with plenty of contrast for readability. Square format for Twitter. No blur, no distortion, no watermark.`,
  aspectRatio: "1:1",
};

generateImage(job).catch(console.error);
