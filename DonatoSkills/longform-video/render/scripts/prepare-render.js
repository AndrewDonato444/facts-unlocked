#!/usr/bin/env node
/**
 * prepare-render.js — Copy pipeline output into Remotion's public/ directory
 *
 * Remotion bundles for the browser, so it can't use `fs` or absolute paths.
 * This script:
 *   1. Reads composition.json from the pipeline output
 *   2. Rewrites audio/image paths to use staticFile() relative paths
 *   3. Copies audio + image assets into public/
 *   4. Writes the rewritten composition as public/composition.json
 *
 * Usage:
 *   node scripts/prepare-render.js <output-dir>
 *   node scripts/prepare-render.js  (auto-detects latest output)
 */

const fs = require("fs");
const path = require("path");

const renderDir = path.resolve(__dirname, "..");
const publicDir = path.join(renderDir, "public");

// Resolve output directory
let outputDir = process.argv[2];
if (!outputDir) {
  const outputRoot = path.resolve(renderDir, "../output");
  if (!fs.existsSync(outputRoot)) {
    console.error("No output directory found. Run the pipeline first.");
    process.exit(1);
  }
  const dirs = fs
    .readdirSync(outputRoot)
    .filter((d) => fs.statSync(path.join(outputRoot, d)).isDirectory())
    .sort()
    .reverse();
  if (dirs.length === 0) {
    console.error("No output runs found.");
    process.exit(1);
  }
  outputDir = path.join(outputRoot, dirs[0]);
}

outputDir = path.resolve(outputDir);
console.log(`Preparing render from: ${outputDir}`);

// Read composition
const compositionPath = path.join(outputDir, "composition.json");
if (!fs.existsSync(compositionPath)) {
  console.error(`No composition.json found at ${compositionPath}`);
  process.exit(1);
}
const composition = JSON.parse(fs.readFileSync(compositionPath, "utf-8"));

// Create public directories
fs.mkdirSync(path.join(publicDir, "audio"), { recursive: true });
fs.mkdirSync(path.join(publicDir, "images"), { recursive: true });

// Copy assets and rewrite paths
let audioCount = 0;
let imageCount = 0;

for (const seq of composition.sequences) {
  if (seq.type === "scene") {
    // Copy audio
    if (seq.audioFile && fs.existsSync(seq.audioFile)) {
      const audioFilename = path.basename(seq.audioFile);
      fs.copyFileSync(seq.audioFile, path.join(publicDir, "audio", audioFilename));
      seq.audioFile = `audio/${audioFilename}`;
      audioCount++;
    }

    // Copy image
    if (seq.imagePath && fs.existsSync(seq.imagePath)) {
      const imageFilename = path.basename(seq.imagePath);
      fs.copyFileSync(seq.imagePath, path.join(publicDir, "images", imageFilename));
      seq.imagePath = `images/${imageFilename}`;
      imageCount++;
    }
  }
}

// Write rewritten composition
fs.writeFileSync(
  path.join(publicDir, "composition.json"),
  JSON.stringify(composition, null, 2)
);

console.log(`Copied ${audioCount} audio files, ${imageCount} images`);
console.log(`Wrote public/composition.json`);
console.log(`Ready to render!`);
