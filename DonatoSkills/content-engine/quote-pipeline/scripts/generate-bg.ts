/**
 * generate-bg.ts — Generate a whimsical illustrated background for a quote card.
 *
 * Uses Google Gemini (Nano Banana). The style is locked to "whimsical illustration"
 * because that's the validated house style for Baby Facts (analytics backfill
 * 2026-04-23 showed text-overlay on illustrated bg is the winning composite).
 *
 * Output: 1080x1920 PNG (9:16 portrait) to <outDir>/background.png
 *
 * Usage:
 *   npx tsx generate-bg.ts --theme "The Bond" --out ./public
 */

import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

const args = process.argv.slice(2);
function getArg(name: string, fallback: string = ""): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const theme = getArg("theme", "mother-baby-bond");
const outDir = getArg("out", "./public");
const seed = getArg("seed", "");

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const outputPath = path.join(outDir, "background.png");

// Theme-specific mood descriptors — keeps backgrounds varied across themes
// but all within the soft whimsical illustration family.
const THEME_MOODS: Record<string, string> = {
  "Birth & First Moments":
    "a soft dreamy illustration of a parent cradling a newborn, warm pastel morning light, soft watercolor textures, emotional and tender",
  "The Bond":
    "a gentle watercolor illustration of a mother and baby with foreheads touching, soft pinks and creams, storybook quality, warm and intimate",
  "A Mother's Love":
    "a dreamy illustration of a mother holding her baby close, soft golden-hour light through a window, painterly watercolor style, feelings of warmth and sanctuary",
  "Strength & Sacrifice":
    "a tender illustration of a mother silhouette against a soft sunrise, warm muted pastels, painterly brushstrokes, quiet strength and devotion",
  "Wonder & Magic":
    "a whimsical illustration of a baby gazing up with wonder, soft stars and sparkles, dreamy pastel sky, storybook children's-book style",
  "Time & Growth":
    "a soft illustration of tiny hands reaching toward larger hands, warm nostalgic tones, watercolor with gentle grain, the feeling of time passing",
  "Home & Belonging":
    "a cozy illustration of a baby sleeping on a parent's chest in a warmly lit room, soft amber light, painterly watercolor style, deeply safe and warm",
  "Science Meets Sentiment":
    "a soft dreamy illustration of a mother and baby with a subtle glowing thread connecting their hearts, watercolor style, painterly, emotional and slightly magical",
};

const DEFAULT_MOOD =
  "a soft dreamy watercolor illustration of a mother and baby in a tender moment, pastel palette, painterly and emotional, storybook quality";

const themeMood = THEME_MOODS[theme] || DEFAULT_MOOD;

const prompt = `${themeMood}. 9:16 vertical composition. Leave the center and lower-middle of the frame relatively open and softer in detail so text can be overlaid readably. No text, no logos, no watermarks, no hard edges, no harsh contrast. Whimsical illustrated style — NOT photorealistic. Soft pastels, warm tones, painterly brushwork. The image should evoke maternal love, warmth, and gentle emotion. High-quality digital illustration, 4k detail, children's storybook aesthetic crossed with fine-art watercolor.`;

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not set");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  console.log(`Generating background for theme: "${theme}"`);
  if (seed) console.log(`Seed/variant: ${seed}`);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: prompt,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: "9:16" },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      const buffer = Buffer.from(part.inlineData.data, "base64");
      fs.writeFileSync(outputPath, buffer);
      console.log(`BG_COMPLETE: ${outputPath} (${buffer.length} bytes)`);
      return;
    }
  }

  console.error("BG_FAILED: no image data in response");
  process.exit(1);
}

main().catch((err) => {
  console.error(`BG_FAILED: ${err.message || err}`);
  process.exit(1);
});
