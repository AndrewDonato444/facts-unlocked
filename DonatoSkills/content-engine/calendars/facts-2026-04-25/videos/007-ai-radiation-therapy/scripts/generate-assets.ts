import * as fs from "node:fs";
import * as path from "node:path";

// Grok grok-imagine-image — AI Facts Unlocked: 007-ai-radiation-therapy
// Style: deep space black + electric blue/cyan, medical AI, precision tech aesthetic, 9:16 portrait

if (!process.env.GROK_API_KEY) throw new Error("GROK_API_KEY not set");

const GROK_API_KEY = process.env.GROK_API_KEY;

const STYLE_PREFIX =
  "deep space black and navy background, electric blue and cyan accent lighting, dramatic cinematic medical tech aesthetic, " +
  "no text or numbers in image, seamless expansive composition suitable as video background, " +
  "space for text overlay in center, no borders, ultra high contrast, photorealistic or cinematic 3D render, " +
  "futuristic medical technology, bioluminescent blue glow";

const assets = [
  {
    name: "scene-1-bg",
    prompt: `Dramatic visualization of AI medical planning — glowing holographic radiation beams precisely targeting a translucent tumor mass, electric blue laser-precision lines converging on a single point, dark space black background with cyan particle trails, a human silhouette partially visible with AI scan overlay radiating from the body, sense of unmatched precision and speed, cinematic medical breakthrough, ${STYLE_PREFIX}`,
  },
  {
    name: "scene-2-bg",
    prompt: `Medical AI interface visualization — abstract CT scan and radiation field planning overlay glowing in electric blue, multiple translucent patient silhouettes processed simultaneously by glowing AI nodes, timeline comparison visual showing old slow process dissolving into instant AI precision, blue data streams flowing through a neural network shaped like a medical cross, stark contrast between manual complexity and AI clarity, ${STYLE_PREFIX}`,
  },
  {
    name: "scene-3-bg",
    prompt: `Breakthrough moment visualization — a massive bottleneck represented as a narrow glowing corridor suddenly opening into infinite blue light, human oncologist silhouette steps aside as AI takes over with flawless precision, electric blue energy expanding outward in all directions symbolizing unlimited capacity, dramatic transformation from limitation to limitless, cinematic wide-angle reveal, ${STYLE_PREFIX}`,
  },
  {
    name: "scene-4-bg",
    prompt: `Abstract AI knowledge network — glowing blue nodes connected by electric cyan lines forming an expansive constellation against deep black space, medical caduceus silhouette subtly embedded in the network pattern, upward momentum and discovery energy, aspirational technology aesthetic, particles flowing upward like data being processed, ${STYLE_PREFIX}`,
  },
];

interface GrokImageResponse {
  data: Array<{ b64_json?: string; url?: string }>;
}

async function generateAssets() {
  const outputDir = path.join(__dirname, "..", "public", "generated");
  fs.mkdirSync(outputDir, { recursive: true });

  for (const asset of assets) {
    const filepath = path.join(outputDir, `${asset.name}.png`);
    if (fs.existsSync(filepath)) {
      console.log(`Skipping ${asset.name} (already exists)`);
      continue;
    }
    console.log(`Generating: ${asset.name}...`);
    try {
      const response = await fetch("https://api.x.ai/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-imagine-image",
          prompt: asset.prompt,
          n: 1,
          response_format: "b64_json",
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Grok API error ${response.status}: ${err}`);
      }

      const result = (await response.json()) as GrokImageResponse;
      const imageData = result.data[0];

      if (imageData.b64_json) {
        const buffer = Buffer.from(imageData.b64_json, "base64");
        fs.writeFileSync(filepath, buffer);
        console.log(`  Saved: ${filepath} (${(buffer.length / 1024).toFixed(0)} KB)`);
      } else if (imageData.url) {
        const https = await import("node:https");
        await new Promise<void>((resolve, reject) => {
          const file = fs.createWriteStream(filepath);
          https.get(imageData.url!, (res) => {
            res.pipe(file);
            file.on("finish", () => { file.close(); resolve(); });
          }).on("error", reject);
        });
        const size = fs.statSync(filepath).size;
        console.log(`  Saved (URL): ${filepath} (${(size / 1024).toFixed(0)} KB)`);
      } else {
        console.error(`  No image data returned for ${asset.name}`);
      }

      if (assets.indexOf(asset) < assets.length - 1) await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.error(`  Failed: ${asset.name}`, e);
    }
  }
  console.log("\nAsset generation complete.");
}

generateAssets().catch(e => { console.error(e); process.exit(1); });
