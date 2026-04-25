import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface AssetRequest {
  name: string;
  prompt: string;
  aspectRatio?: string;
}

async function generateAssets(requests: AssetRequest[]) {
  const outputDir = path.join(__dirname, "..", "public", "generated");
  fs.mkdirSync(outputDir, { recursive: true });

  for (const req of requests) {
    console.log(`Generating image: ${req.name}...`);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: req.prompt,
        config: {
          responseModalities: ["TEXT", "IMAGE"],
          ...(req.aspectRatio ? { imageConfig: { aspectRatio: req.aspectRatio } } : {}),
        } as any,
      });

      let saved = false;
      for (const part of response.candidates![0].content!.parts!) {
        if (part.inlineData) {
          const buffer = Buffer.from(part.inlineData.data!, "base64");
          const filepath = path.join(outputDir, `${req.name}.png`);
          fs.writeFileSync(filepath, buffer);
          console.log(`  Saved: ${filepath} (${(buffer.length / 1024).toFixed(0)} KB)`);
          saved = true;
        }
      }
      if (!saved) {
        console.warn(`  No image data returned for ${req.name}`);
      }
    } catch (e: any) {
      console.error(`  Error generating ${req.name}: ${e.message}`);
    }
  }
}

const assets: AssetRequest[] = [
  {
    name: "scene-1-hook",
    prompt: "Soft whimsical illustration of a sleeping baby surrounded by gentle glowing brain wave patterns — soft arcs of light suggesting sleep spindles forming in warm lavender and blush pink tones. The baby is peacefully asleep in a cozy crib, surrounded by soft aurora light and neural glow. Cream and rose pastel palette, baby-friendly whimsical style, 9:16 portrait orientation, no text, suitable as video background, seamless expansive composition with space for text overlay.",
    aspectRatio: "2:3",
  },
  {
    name: "scene-2-body",
    prompt: "Soft whimsical illustration of a sleeping baby's brain lit up with beautiful sleep spindle wave patterns — glowing arcs and bursts of warm pink and golden light forming memory-consolidation networks. Floating icons of tiny memories: faces, sounds, sensations being woven into neural threads during sleep. Warm cream and blush tones, whimsical baby-friendly illustration, 9:16 portrait, no text, suitable as video background.",
    aspectRatio: "2:3",
  },
  {
    name: "scene-3-cta",
    prompt: "Soft whimsical illustration of a peacefully sleeping baby with a gentle aurora of warm pink, cream, and lavender light surrounding them, suggesting wonder and discovery. Delicate neural glow patterns emanate softly from the sleeping baby suggesting active brain development. Warm pastel baby-friendly illustration, 9:16 portrait, no text, suitable as video background, seamless expansive composition.",
    aspectRatio: "2:3",
  },
];

generateAssets(assets).catch(console.error);
