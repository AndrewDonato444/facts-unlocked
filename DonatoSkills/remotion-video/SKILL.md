---
name: remotion-video
description: Create social media videos using Remotion (React-based video framework). Use this skill whenever the user wants to make a video, short-form content, animated clip, reel, TikTok, YouTube Short, Instagram story, or any motion graphics for social media. Also trigger when the user mentions Remotion, video rendering, animated text, kinetic typography, or wants to turn text/images/data into a video. Even if they just say "make me a video" or "create a reel" or "animate this", use this skill.
---

# Remotion Video Creator

Create highly animated social media videos using [Remotion](https://www.remotion.dev) — a React framework that turns components into videos.

## How This Works

Remotion treats video as a function of time. You write React components that read the current frame number, and Remotion renders each frame into a video file. Everything you know about React (components, props, CSS, layout) applies directly to video creation.

The user tells you what video they want. **You guide them through an interactive question flow**, then scaffold a Remotion project, write the compositions, and render the final `.mp4`. They get both the rendered video AND the full project so they can tweak and re-render later.

---

## Orchestrated Mode

When invoked by the `content-engine` skill (or any orchestrator), the prompt will contain **"ORCHESTRATED MODE"** and all required parameters (platform, message, style, duration, voiceover, visual_mode, tts_provider). In this case:

1. **Skip the interactive question flow entirely** — all decisions are already made
2. **Confirm the plan in one line** — e.g., "Building 15s Twitter video with AI voiceover..."
3. **Proceed directly to scaffolding and building**
4. **Output a structured summary when done:**
   ```
   VIDEO_COMPLETE
   asset_path: videos/campaign-slug/item-001/out/video.mp4
   duration: 15s
   dimensions: 1080x1080
   ```

If any required parameter is missing, fall back to the interactive question flow for that parameter only.

---

## Project Registry (Multi-Project Support)

**Before building any video**, resolve which project/brand this is for.

### Step 0: Resolve Active Project

1. **Read `projects.json`** from the DonatoSkills root directory (`~/DonatoSkills/projects.json`)
2. **Resolve the active project:**
   - **CWD match** — Current directory is inside a project's `specs_path` → auto-select (most common — zero friction)
   - **Orchestrated** — Content-engine passed `project_id` → use directly
   - **Explicit** — User said "for [project name]" → match against project names/slugs
   - **Single project** — Only one project in registry → use it automatically
   - **Ask** — Multiple projects, can't auto-detect → "Which project is this video for?"

3. **Use the project's brand context:**
   - If `specs_path` is set → read vision.md, personas, and design tokens from there
   - If `brand_brief` is set → read that for tone, audience, and visual style
   - Apply `defaults.tone` and `defaults.content_pillars` as starting defaults

See `shared-references/project-registry.md` for the full resolution logic.

---

## Shared References

Before building any video, read these shared references:

1. **`shared-references/hook-writing.md`** — Hook best practices per platform. The first 3-5 seconds of every video IS the hook — it must stop the scroll.
2. **`shared-references/platform-specs.md`** — Video dimensions, max durations, aspect ratios, file size limits, and recommended engagement durations per platform. Use this to set the correct resolution, fps, and duration for the target platform.
3. **`shared-references/caption-writing.md`** — Caption formulas per platform. When the video will be posted with a caption (e.g., via content-engine), the caption structure should complement the video hook.
4. **`shared-references/content-pillars.md`** — Content pillar frameworks. When creating videos as part of a content strategy, align the video's message to the appropriate pillar.
5. **`shared-references/provider-resilience.md`** — Retry, fallback, and failure signaling patterns for TTS (and image gen) providers. Defines `withRetry`, `withFallback`, error classification, and signal formats used in generated scripts.

---

## Interactive Question Flow

**DO NOT jump straight to building.** Walk the user through these questions conversationally. Skip any that are already answered by their initial request or by project context (SDD files, design tokens, etc). Group related questions together — don't ask one at a time.

### Step 1: Absorb Project Identity (silent — no questions)

Before asking the user anything, silently read whatever project context exists. **The active project (resolved in Step 0) determines where to find brand context.**

**From the active project (`projects.json`):**
- If `specs_path` is set → read SDD files from there
- If `brand_brief` is set → read that for brand context
- Apply `defaults.tone` as starting default for style questions

**Brand & Audience (from project's specs_path):**

1. **`.specs/vision.md`** — What the product is, who it's for, its personality and positioning. This shapes the *content and tone* of the video.

2. **`.specs/personas/*.md`** — Who the target users are. Personas contain vocabulary, patience level, and frustrations.

3. **`.specs/design-system/tokens.md`** — Colors, typography, spacing, and personality. This shapes the *visual style*.

**Non-SDD projects (no specs_path):**

4. **`tailwind.config.*`** — Tailwind theme with custom colors/fonts
5. **`src/styles/theme.*` or `src/lib/theme.*`** — Custom theme files
6. **`package.json`** — Check for font packages

### Step 2: Ask Questions

Present questions as a grouped, conversational message. Here's the full question set — **skip any you can already answer from context**:

#### Always Ask:
1. **Platform** — "What platform is this for? (TikTok, Instagram Reels, YouTube Shorts, Twitter/X, LinkedIn, or multiple?)"
2. **Content** — "What's the message? What should the video say/show?"
3. **Visual Mode** — "Do you want this to be:
   - **Text-only** — animated text on gradient/particle backgrounds (fastest, no API calls)
   - **AI-generated backgrounds** — I'll generate custom scene images using Gemini or OpenAI, with optional Ken Burns zoom/pan effect *(requires GEMINI_API_KEY or OPENAI_API_KEY)*
   - **Your own assets** — you provide images/photos for me to animate (with optional Ken Burns)"

   If AI-generated or user assets selected, follow up: "Want Ken Burns animation on the backgrounds? (slow zoom/pan that adds cinematic movement — recommended, or I can keep them static)"

#### Ask If Multiple Personas Exist:
4. **Persona** — "I see you have personas for [list them]. Who's this video for, or should I aim for a general brand feel?"

#### Ask Based on Content:
5. **Duration** — "How long? (default: 15s for short-form, 30s for story-style)" *(skip if platform implies it)*

#### Only If Not Covered by Design Tokens:
6. **Style** — "What vibe? (premium/luxury, energetic, minimal, playful, corporate, techy)" *(skip if tokens.md has a personality)*
7. **Colors** — "Any specific colors or brand palette?" *(skip if tokens.md or tailwind covers this)*

#### Optional:
8. **Voiceover** — "Want a voiceover narration?
   - **No voiceover** — video only (default)
   - **AI voiceover (ElevenLabs)** — Highest quality voices, 45+ premade options *(requires ELEVENLABS_API_KEY)*
   - **AI voiceover (Grok)** — Great quality, 10 voices *(requires GROK_API_KEY)*
   - **AI voiceover (Gemini)** — Good quality, 30 voices *(requires GEMINI_API_KEY)*
   - **Script only** — I'll write the voiceover script but you record it yourself"
   *(Check the project's `tts` config in `projects.json` for the default provider and voice. If no config, check which API keys are available. Multiple providers can be enabled for voice rotation.)*
9. **Logo** — "Want a logo included? I can check your project for one, or you can point me to a file." *(Check `public/` and project root first — if you find one, just mention it: "I found logo.png — want me to include it?")*
10. **Multi-platform** — "Want me to render for multiple platforms at once? I can create compositions for different aspect ratios from the same content."

### Step 3: Confirm & Build

After gathering answers, give a brief summary of what you'll build:

> "Here's what I'll create:
> - **Platform**: TikTok (1080×1920, 30fps)
> - **Duration**: 15 seconds (450 frames)
> - **Style**: Premium/luxury using your design tokens (navy + gold palette)
> - **Visuals**: Text-only *(or "AI-generated backgrounds via Gemini with Ken Burns zoom/pan" or "AI-generated backgrounds (static)" or "Your provided assets with Ken Burns")*
> - **Voiceover**: AI narration via Grok TTS (leo voice) *(or "via Gemini TTS (Kore voice)" or "via ElevenLabs" or "None")*
> - **Scenes**: [brief scene breakdown]
> - **Logo**: Your logo.png as an end-card reveal
>
> Ready to build?"

**If AI voiceover was selected**, the workflow forks to audio-first (see [Audio-First Workflow](#audio-first-workflow-voiceover) below). Write the script, show it to the user for approval, then generate audio before building visuals.

Then build it.

---

## Visual Modes

### Text-Only Mode (Default — No API Keys Needed)

Pure Remotion — animated text, gradients, shapes, and data visualizations. No external calls. This is the fastest path and produces great results for most social media content.

Use gradient backgrounds, particle effects, geometric shapes, and the full animation patterns library in `references/animation-patterns.md`.

### AI-Generated Visuals Mode (Gemini or OpenAI)

Uses Gemini ("Nano Banana") or OpenAI (GPT Image) to create custom backgrounds, scene imagery, and visual assets that Remotion then animates. Read `image_gen.default_provider` from `projects.json` to pick the provider.

**Requirements:**
- `GEMINI_API_KEY` or `OPENAI_API_KEY` environment variable set, OR
- User provides the key when asked

**API Keys (check `.env` in DonatoSkills root or project root):**
- `GEMINI_API_KEY` — used for Nano Banana image generation AND Gemini TTS (if selected)
- `OPENAI_API_KEY` — used for OpenAI GPT Image generation
- `GROK_API_KEY` — used for Grok TTS (if selected as voiceover provider)
- `ELEVENLABS_API_KEY` — used for ElevenLabs TTS (if selected as voiceover provider)

**How it works:**

1. Based on the video concept, generate 2-5 scene images via Gemini API
2. Save them to the Remotion project's `public/` folder
3. Use them as backgrounds with Ken Burns zoom, image reveals, or overlays
4. Layer animated text, data, and transitions on top via Remotion

**Asset Generation Script:**

Create a `scripts/generate-assets.ts` in the video project:

```typescript
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface AssetRequest {
  name: string;          // filename (no extension)
  prompt: string;        // what to generate
  aspectRatio?: string;  // "16:9", "1:1", "2:3", etc.
}

async function generateAssets(requests: AssetRequest[]) {
  const outputDir = path.join(__dirname, "..", "public", "generated");
  fs.mkdirSync(outputDir, { recursive: true });

  for (const req of requests) {
    console.log(`Generating: ${req.name}...`);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: req.prompt,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: req.aspectRatio ? { aspectRatio: req.aspectRatio } : undefined,
      },
    });

    for (const part of response.candidates![0].content!.parts!) {
      if (part.inlineData) {
        const buffer = Buffer.from(part.inlineData.data!, "base64");
        const filepath = path.join(outputDir, `${req.name}.png`);
        fs.writeFileSync(filepath, buffer);
        console.log(`  Saved: ${filepath} (${(buffer.length / 1024).toFixed(0)} KB)`);
      }
    }
  }
}

// Define assets for this video
const assets: AssetRequest[] = [
  // Customize these per video
  {
    name: "scene-1-bg",
    prompt: "Description of scene 1 background...",
    aspectRatio: "2:3",
  },
];

generateAssets(assets).catch(console.error);
```

**Aspect Ratio Mapping for Nano Banana:**

| Video Platform | Video Aspect | Nano Banana Aspect |
|---------------|-------------|-------------------|
| TikTok/Reels (9:16) | 1080×1920 | `"2:3"` (closest available) |
| Twitter/LinkedIn (1:1) | 1080×1080 | `"1:1"` |
| YouTube (16:9) | 1920×1080 | `"16:9"` |

**Available Nano Banana aspect ratios:** `"1:1"`, `"2:3"`, `"3:2"`, `"4:3"`, `"16:9"`, `"21:9"`, `"1:4"`, `"4:1"`, `"1:8"`, `"8:1"`

**Gemini model choices:**
- `gemini-2.5-flash-image` — fast, good quality, best for bulk generation (recommended)
- `gemini-3.1-flash-image-preview` — newer, speed-optimized
- `gemini-3-pro-image-preview` — highest quality, slower, best for hero images

**OpenAI model choices:**
- `gpt-image-1` — highest quality, best text rendering (recommended)
- `gpt-image-1-mini` — faster, cheaper, good for draft backgrounds

**OpenAI sizes:** `1024x1024` (1:1), `1536x1024` (3:2 landscape), `1024x1536` (2:3 portrait), `auto`

See `image-gen/references/openai-image-gen.md` for full OpenAI API reference.

**Prompt tips for video backgrounds:**
- Always include: "suitable as a video background, clean composition, space for text overlay in center"
- Include mood/lighting: "cinematic, golden hour, moody, high contrast, dramatic shadows"
- Match the project's brand: "luxury, premium, dark navy and gold accents" (pull from vision/tokens)
- Be specific about style: "photorealistic", "flat illustration", "3D render", "abstract geometric"
- For Ken Burns: avoid hard edges or borders — images should have content that extends beyond the visible frame so zoom/pan doesn't reveal blank space. Add "seamless, expansive composition, no borders" to prompts.
- Keep visual consistency across scenes: use the same style keywords for all scene prompts in a video (e.g., all "dark moody cinematic" or all "bright flat illustration")
- Avoid text in generated images — Remotion handles all text overlay

**Using generated assets as scene backgrounds:**

Every scene component should use the `SceneBackground` component (see `references/animation-patterns.md` → "Scene Background (Mode Switcher)") to make background mode swappable. This is the key pattern — it lets you switch between gradient and AI-generated backgrounds per scene without rewriting component code.

```tsx
import { AbsoluteFill, staticFile } from "remotion";

// In constants.ts — define background mode per scene
export const SCENE_BACKGROUNDS = [
  { type: "ai-generated" as const, asset: "scene-1-bg", kenBurns: "zoom-in" as const, overlay: "rgba(0,0,0,0.4)" },
  { type: "ai-generated" as const, asset: "scene-2-bg", kenBurns: "pan-left" as const, overlay: "rgba(0,0,0,0.35)" },
  { type: "ai-generated" as const, asset: "scene-3-bg", kenBurns: "zoom-out" as const, overlay: "rgba(0,0,0,0.4)" },
];

// In each scene — background is the bottom layer, text content on top
<AbsoluteFill>
  <SceneBackground mode={SCENE_BACKGROUNDS[0]} />
  {/* Animated text, data, etc. rendered on top */}
</AbsoluteFill>
```

**Ken Burns direction cycling** — alternate directions across scenes for visual variety:
- 3 scenes: `zoom-in` → `pan-left` → `zoom-out`
- 4 scenes: `zoom-in` → `pan-right` → `zoom-in-left` → `zoom-out`
- Never repeat the same direction on consecutive scenes

**Overlay opacity guide** — adjust based on text density:
- Light text on busy image: `rgba(0,0,0,0.5)` (heavier overlay)
- Simple title over clean image: `rgba(0,0,0,0.25)` (lighter overlay)
- Default: `rgba(0,0,0,0.35)`

**No Ken Burns option** — if the user says "no Ken Burns" or the image is a flat graphic/illustration, omit the `kenBurns` property. The `SceneBackground` component renders it as a static full-bleed image.

### User-Provided Assets Mode

User supplies their own images/photos. Copy them to `public/` and use the same `SceneBackground` component with `type: "image"` and optional Ken Burns:

```tsx
{ type: "image", src: staticFile("user-photo.jpg"), kenBurns: "pan-left", overlay: "rgba(0,0,0,0.3)" }
```

---

## Audio-First Workflow (Voiceover)

When the user selects AI voiceover, the entire build approach changes. **Audio drives timing** — you write a script, generate narration, measure durations, then build visuals to fit.

```
                    ┌─ No voiceover ──→ VISUAL-FIRST (default)
                    │                   Platform → Content → Style → Build visuals → Render
                    │                   Scene durations are fixed by platform norms
                    │
Voiceover question ─┤
                    │
                    └─ AI voiceover ──→ AUDIO-FIRST
                                        Write script → User approves → Generate audio →
                                        Measure durations → Build visuals to fit audio → Render
                                        Scene durations are driven by the narration
```

Both paths use the same components (AnimatedText, SceneBackground, etc.) and the same project structure. The difference is what drives the timing.

### Step 1: Write the Script

Write a voiceover script for each scene. Follow these rules:

- **DON'T** just read the on-screen text aloud — that's redundant and wastes the audio channel
- **DO** add context, urgency, or personality that complements the visuals
- Keep it conversational — like a confident friend, not a narrator
- Hook-first: the first sentence needs to stop the scroll
- End with a clear, concise CTA
- Use the project's persona vocabulary (from SDD files if available)

**Pacing rules (from testing):**
- Target ~2 words per second — Gemini TTS speaks at natural pace, not rushed
- A 15-second video = ~30 words total of voiceover
- A 30-second video = ~60 words total
- Leave breathing room: not every second needs narration. Pauses are powerful.

**Show the script to the user and PAUSE for approval** before generating audio.

### Step 2: Generate Audio

The skill supports three TTS providers: **Grok** (default), **Gemini**, and **ElevenLabs**. Use whichever the user selected, or whichever API key is available. When generating scripts with voiceover, include the resilience patterns (retry, fallback, error isolation) documented below in the "Voiceover Production Rules" section.

#### Grok TTS (Default)

Create a `scripts/generate-voiceover.ts` in the video project:

```typescript
import OpenAI from "openai";
import * as fs from "node:fs";
import * as path from "node:path";

if (!process.env.GROK_API_KEY) {
  throw new Error("GROK_API_KEY is not set. Add it to your .env file or export it in your shell.");
}

// NOTE: Grok TTS is NOT OpenAI-compatible. Do NOT use the OpenAI SDK.
// Use the native Grok TTS API at https://api.x.ai/v1/tts
// Docs: https://docs.x.ai/developers/model-capabilities/audio/text-to-speech

interface SceneScript {
  name: string;       // e.g., "scene-1-hook"
  script: string;     // the voiceover text
  direction?: string; // e.g., "confident, direct" (prepended to script)
}

async function generateVoiceover(scenes: SceneScript[], voice: string = "leo") {
  const outputDir = path.join(__dirname, "..", "public", "audio");
  fs.mkdirSync(outputDir, { recursive: true });

  const manifest: Record<string, { file: string; durationSec: number }> = {};

  for (const scene of scenes) {
    console.log(`Generating: ${scene.name}...`);
    const text = scene.direction
      ? `[${scene.direction}] ${scene.script}`
      : scene.script;

    const response = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice_id: voice,
        language: "en",
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      const err = new Error(`Grok TTS error ${response.status}: ${errBody}`);
      (err as any).status = response.status;
      throw err;
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Grok TTS returns MP3 by default
    const filepath = path.join(outputDir, `${scene.name}.mp3`);
    fs.writeFileSync(filepath, audioBuffer);

    // Get duration with ffprobe
    const { execSync } = require("child_process");
    const durationStr = execSync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filepath}"`
    ).toString().trim();
    const durationSec = parseFloat(durationStr);

    manifest[scene.name] = { file: `audio/${scene.name}.mp3`, durationSec };
    console.log(`  Saved: ${filepath} (${durationSec.toFixed(1)}s)`);
  }

  // Write timing manifest for Remotion to consume
  const manifestPath = path.join(outputDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Timing manifest: ${manifestPath}`);

  return manifest;
}

// Define scenes for this video
const scenes: SceneScript[] = [
  {
    name: "scene-1-hook",
    script: "Your hook script here...",
    direction: "confident, direct",
  },
  {
    name: "scene-2-body",
    script: "Body script here...",
  },
  {
    name: "scene-3-cta",
    script: "CTA script here...",
  },
];

generateVoiceover(scenes).catch(console.error);
```

**Grok TTS voice options:** `eve` (energetic), `ara` (warm), `rex` (professional), `sal` (balanced), `leo` (authoritative)

**Grok TTS notes:**
- Max text length: 15,000 characters per request
- Output format: MP3 (streamed back directly)
- No npm dependency needed — uses native `fetch`
- API docs: https://docs.x.ai/developers/model-capabilities/audio/text-to-speech

#### Gemini TTS (Alternative)

If the user selects Gemini TTS (or only `GEMINI_API_KEY` is available), use this template instead:

```typescript
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set. Add it to your .env file or export it in your shell.");
}
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Write raw PCM data as a WAV file (24kHz, 16-bit, mono).
// DO NOT use the "wav" npm package — it doesn't reliably install across environments.
function writeWavSync(filepath: string, pcmData: Buffer, sampleRate = 24000, channels = 1, bitDepth = 16) {
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);        // PCM chunk size
  header.writeUInt16LE(1, 20);         // PCM format
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
  name: string;       // e.g., "scene-1-hook"
  script: string;     // the voiceover text
  direction?: string; // e.g., "confident, direct" (set once, omit for subsequent scenes)
}

async function generateVoiceover(scenes: SceneScript[], voice: string = "Kore") {
  const outputDir = path.join(__dirname, "..", "public", "audio");
  fs.mkdirSync(outputDir, { recursive: true });

  const manifest: Record<string, { file: string; durationSec: number }> = {};

  for (const scene of scenes) {
    console.log(`Generating: ${scene.name}...`);
    const prompt = scene.direction
      ? `Speak in a ${scene.direction} tone:\n${scene.script}`
      : scene.script;

    // DO NOT REPLACE this call with a retry wrapper — linters may rename it,
    // causing infinite recursion. If you add retry logic, bind the API method
    // to a separate variable first (see "Retry Logic" section below).
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

    // Write as WAV (24kHz, 16-bit, mono)
    const filepath = path.join(outputDir, `${scene.name}.wav`);
    writeWavSync(filepath, audioBuffer);

    // Calculate duration from PCM data
    const durationSec = audioBuffer.length / (24000 * 2); // 24kHz, 16-bit = 2 bytes/sample
    manifest[scene.name] = { file: `audio/${scene.name}.wav`, durationSec };
    console.log(`  Saved: ${filepath} (${durationSec.toFixed(1)}s)`);
  }

  // Write timing manifest for Remotion to consume
  const manifestPath = path.join(outputDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Timing manifest: ${manifestPath}`);

  return manifest;
}

// Define scenes for this video
const scenes: SceneScript[] = [
  {
    name: "scene-1-hook",
    script: "Your hook script here...",
    direction: "confident, direct",  // set voice style once on first scene
  },
  {
    name: "scene-2-body",
    script: "Body script here...",
    // no direction — voice stays consistent
  },
  {
    name: "scene-3-cta",
    script: "CTA script here...",
  },
];

generateVoiceover(scenes).catch(console.error);
```

#### ElevenLabs TTS (Premium Quality)

If the user selects ElevenLabs (or the project's `tts.default_provider` is `"elevenlabs"`), use the template in `references/elevenlabs-tts.md`. Key differences from Grok/Gemini:

- **No SDK needed** — uses `fetch()` directly against `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
- **Auth header**: `xi-api-key` (not `Authorization: Bearer`)
- **Output**: request `pcm_24000` format, then wrap in WAV header (same `writeWavSync` pattern as Gemini)
- **Voice selection**: pass `voice_id` in the URL path (not in the request body)
- **No direction prompts**: control tone via `voice_settings.stability` and `voice_settings.style` instead

```typescript
// Quick example — see references/elevenlabs-tts.md for full template
const response = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
  {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: scene.script,
      model_id: "eleven_multilingual_v2",
      output_format: "pcm_24000",
    }),
  },
);
const pcmBuffer = Buffer.from(await response.arrayBuffer());
writeWavSync(filepath, pcmBuffer, 24000);
```

See `references/elevenlabs-tts.md` for the full generate-voiceover template, voice list, and model options.

#### TTS Provider Selection Logic

When deciding which TTS provider to use:

1. **Project config** → read `tts.default_provider` from `projects.json` (most reliable)
2. **User explicitly chose** → use that provider
3. **Orchestrated mode** specifies `tts_provider` → use that
4. **Only one API key available** → use that provider automatically
5. **Multiple keys, no preference** → use project default, or ElevenLabs > Grok > Gemini (quality order)
6. **No keys available** → offer "Script only" mode

**Multi-provider rotation**: If `tts.providers` has multiple entries, the content-engine can rotate voices across videos in a campaign (e.g., ElevenLabs Adam for video 1, Grok leo for video 2). The skill picks the provider and voice from the project config unless overridden.

**Voice selection by project personality:**

*Grok voices:*

| Personality | Suggested Voices |
|------------|-----------------|
| Professional/Luxury | onyx (deep), sage (authoritative), echo (clear) |
| Energetic/Fun | nova (upbeat), shimmer (bright), alloy (versatile) |
| Warm/Friendly | coral, ballad |
| Technical/Serious | ash, fable |

*Gemini voices:*

| Personality | Suggested Voices |
|------------|-----------------|
| Professional/Luxury | Kore (firm), Charon (deep), Orus (clear) |
| Energetic/Fun | Puck (upbeat), Zephyr (bright) |
| Warm/Friendly | Aoede, Leda |
| Technical/Serious | Fenrir, Enceladus |

*ElevenLabs voices:*

| Personality | Suggested Voices |
|------------|-----------------|
| Professional/Authority | Adam (deep), Rachel (calm), Daniel (news) |
| Energetic/Fun | Jeremy (excited), Charlotte (engaging) |
| Warm/Conversational | Matilda (warm), Charlie (casual) |
| News/Credible | Alice (confident), Drew (well-rounded) |
| Calm/ASMR | Emily (meditation), Thomas (soothing) |

See `references/tts-best-practices.md` for Gemini voice details, `references/elevenlabs-tts.md` for ElevenLabs voice IDs and API details, and script writing tips.

### Voiceover Production Rules

**Per-scene audio is the default.** Always generate individual WAV files per scene (not one combined full-voiceover.wav). A single full track drifts from visual scene timings because AI-generated pacing differs from the sum of individual scene durations. Each scene gets its own `<Audio>` element inside its own `<Sequence>`, synced to the exact frame.

**Wire audio into components immediately.** After generating voiceover WAV files, update the video component's `<Audio>` elements in the same step. Do NOT leave audio commented out or referencing placeholder files — this is a common source of silent videos.

**TTS rate limits.** When generating voiceover for multiple scenes:
- Generate scenes **sequentially** (not in parallel)
- Rate limits (429s) are handled automatically by the `generateWithRetry` pattern below — no manual backoff needed
- When the content-engine orchestrates multiple videos with voiceover, generate them **one video at a time**, not in parallel
- If a provider is persistently rate-limited, the `withFallback` wrapper (see below) will try the next provider in the chain
- Gemini TTS: 10 requests/minute/model
- Grok TTS: check current rate limits at x.ai docs

**Linter/formatter recursion hazard.** If you add retry logic around `ai.models.generateContent(...)`, linters may auto-rename the inner API call to match the wrapper function name, causing infinite recursion (`RangeError: Maximum call stack size exceeded`). To prevent this:
```typescript
// --- Error classification ---
function isRetryable(e: unknown): boolean {
  const status = (e as { status?: number }).status;
  const code = (e as { code?: string }).code;
  // Retryable: 429 (rate limit), 500 (server), 503 (unavailable), network errors
  if (status && [429, 500, 503].includes(status)) return true;
  if (code && ["ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT"].includes(code)) return true;
  if (e instanceof DOMException && e.name === "AbortError") return true; // timeout
  // Non-retryable: 400 (bad request), 401/403 (auth), 402 (payment), content policy
  return false;
}

// --- Retry with backoff + timeout (canonical pattern) ---
// SAFE: bind the API method to a separate variable
const callTTS = ai.models.generateContent.bind(ai.models);
const BACKOFF_MS = [5_000, 15_000, 45_000]; // 5s, 15s, 45s
const TTS_TIMEOUT_MS = 45_000; // 45s per scene

async function generateWithRetry(
  params: Parameters<typeof ai.models.generateContent>[0],
  retries = 3,
): ReturnType<typeof ai.models.generateContent> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);
      // Pass AbortController signal if the API supports it; otherwise the
      // timeout will throw an AbortError caught by the retry loop.
      const result = await callTTS(params); // DO NOT REPLACE with generateWithRetry
      clearTimeout(timer);
      return result;
    } catch (e: unknown) {
      console.error(`  Attempt ${i + 1}/${retries} failed:`, (e as Error).message ?? e);
      if (!isRetryable(e) || i >= retries - 1) throw e;
      const delay = BACKOFF_MS[i] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
      console.log(`  Retrying in ${delay / 1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error(`generateWithRetry: all ${retries} attempts failed`);
}
```

#### Provider Fallback (`withFallback`)

When the primary TTS provider fails after all retries (or hits a non-retryable error), fall back to the next provider in the `tts.providers` array from `projects.json`. The fallback wrapper goes **around** the scene loop, not inside it.

```typescript
import * as fs from "node:fs";

// --- Provider config (read from projects.json at build time) ---
interface TTSProviderConfig {
  name: string;
  apiKeyEnv: string;
  defaultVoice: string;
  model: string;
}

const TTS_PROVIDERS: TTSProviderConfig[] = [
  // Order matches projects.json tts.providers — default_provider first
  { name: "grok",       apiKeyEnv: "GROK_API_KEY",       defaultVoice: "onyx",  model: "grok-3-fast-tts" },
  { name: "gemini",     apiKeyEnv: "GEMINI_API_KEY",     defaultVoice: "Kore",  model: "gemini-2.5-flash-preview-tts" },
  { name: "elevenlabs", apiKeyEnv: "ELEVENLABS_API_KEY", defaultVoice: "Adam",  model: "eleven_multilingual_v2" },
];

// --- Fallback wrapper ---
// generateForProvider is an async function that takes a provider config and
// generates audio for a single scene, returning the result. It should use
// generateWithRetry internally.
async function withFallback<T>(
  scene: SceneScript,
  generateForProvider: (provider: TTSProviderConfig, scene: SceneScript) => Promise<T>,
): Promise<{ result: T; provider: TTSProviderConfig }> {
  const errors: { provider: string; error: string }[] = [];

  for (const provider of TTS_PROVIDERS) {
    // Skip providers whose API key is not set
    if (!process.env[provider.apiKeyEnv]) {
      console.log(`  Skipping ${provider.name} (${provider.apiKeyEnv} not set)`);
      continue;
    }
    try {
      const result = await generateForProvider(provider, scene);
      return { result, provider };
    } catch (e: unknown) {
      const msg = (e as Error).message ?? String(e);
      errors.push({ provider: provider.name, error: msg });
      console.error(`  ${provider.name} failed: ${msg}`);
      if (TTS_PROVIDERS.indexOf(provider) < TTS_PROVIDERS.length - 1) {
        console.log(`  Falling back to next provider...`);
      }
    }
  }

  const tried = errors.map(e => `${e.provider}: ${e.error}`).join(", ");
  throw new Error(`All providers exhausted (${tried})`);
}
```

**Voice and model adaptation:** When falling back, each provider uses its own `default_voice` and `model` from the config above. All providers output 24kHz mono WAV — the `writeWavSync` step normalizes format regardless of provider.

#### Scene-Level Error Isolation

If a scene fails on **all** providers, the script continues to the next scene instead of crashing. Failed scenes are marked in the manifest so the render can handle them (silent gap or skip).

```typescript
// Inside the scene loop:
const manifest: Record<string, { file: string; durationSec: number; status: string; provider?: string; error?: string }> = {};

for (const scene of scenes) {
  // --- Idempotency: skip if already generated ---
  const outputPath = path.join(outputDir, `${scene.name}.wav`);
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    console.log(`Skipping ${scene.name} (already exists, ${fs.statSync(outputPath).size} bytes)`);
    // Re-read duration from existing file for manifest
    const existing = fs.readFileSync(outputPath);
    const sampleRate = existing.readUInt32LE(24);
    const bitsPerSample = existing.readUInt16LE(34);
    const channels = existing.readUInt16LE(22);
    const pcmSize = existing.length - 44;
    const durationSec = pcmSize / (sampleRate * (bitsPerSample / 8) * channels);
    manifest[scene.name] = { file: `audio/${scene.name}.wav`, durationSec, status: "complete" };
    continue;
  }

  try {
    const { result, provider } = await withFallback(scene, generateForProvider);
    // ... write WAV, calculate duration ...
    manifest[scene.name] = { file: `audio/${scene.name}.wav`, durationSec, status: "complete", provider: provider.name };
    console.log(`TTS_COMPLETE: ${scene.name}.wav | Provider: ${provider.name}`);
  } catch (e: unknown) {
    const msg = (e as Error).message ?? String(e);
    console.error(`TTS_FAILED: ${scene.name} | Error: ${msg} | Providers tried: ${TTS_PROVIDERS.filter(p => process.env[p.apiKeyEnv]).map(p => p.name).join(", ")}`);
    manifest[scene.name] = { file: `audio/${scene.name}.wav`, durationSec: 0, status: "failed", error: msg };
    // Continue to next scene — do NOT exit
  }
}

// Write manifest (includes failed scenes)
fs.writeFileSync(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));

// Summary
const succeeded = Object.values(manifest).filter(m => m.status === "complete").length;
const failed = Object.values(manifest).filter(m => m.status === "failed");
console.log(`\nTTS Summary: ${succeeded}/${scenes.length} scenes generated.${failed.length > 0 ? ` ${failed.length} failed: ${failed.map((_, i) => Object.keys(manifest).find(k => manifest[k].status === "failed")).join(", ")}` : ""}`);
```

**Key behaviors:**
- **Idempotency:** If `scene_01.wav` already exists and is non-empty, skip regeneration. This makes re-runs safe after partial failures.
- **Error isolation:** Scene 4 failing does not prevent scene 5 from generating. The manifest marks failed scenes with `"status": "failed"` and the error message.
- **Signals:** Each scene emits `TTS_COMPLETE: scene_01.wav | Provider: grok` or `TTS_FAILED: scene_04 | Error: ... | Providers tried: grok, gemini, elevenlabs` for the orchestrator to parse.
- **Partial success:** The script exits with code 0 even if some scenes fail. The manifest and summary tell the orchestrator what happened.

See `shared-references/provider-resilience.md` for the full pattern documentation, error classification table, and provider adaptation details.

**Always use `npx tsx --no-cache`** when running TypeScript scripts. Without `--no-cache`, tsx may use stale transpiled output that doesn't reflect your latest source changes.

### Step 3: Size Scenes to Audio

After generating audio, read the timing manifest (`public/audio/manifest.json`) and set each scene's `durationInFrames` to match. Add a small buffer (0.3s = ~9 frames) between scenes for breathing room:

```tsx
import { Audio, staticFile, Sequence } from "remotion";
import manifest from "../../public/audio/manifest.json";

const fps = 30;
const BUFFER_FRAMES = Math.ceil(0.3 * fps); // 0.3s gap between scenes

// Read actual audio durations from manifest — DO NOT hardcode durations
const scene1Frames = Math.ceil(manifest["scene-1-hook"].durationSec * fps) + BUFFER_FRAMES;
const scene2Frames = Math.ceil(manifest["scene-2-body"].durationSec * fps) + BUFFER_FRAMES;
const scene3Frames = Math.ceil(manifest["scene-3-cta"].durationSec * fps); // no buffer on final scene

// Each scene gets its OWN <Audio> element inside its <Sequence>.
// Do NOT use a single combined audio track — it drifts from visual timing.
<Sequence from={0} durationInFrames={scene1Frames}>
  <Audio src={staticFile("audio/scene-1-hook.wav")} />
  <HookScene />
</Sequence>
<Sequence from={scene1Frames} durationInFrames={scene2Frames}>
  <Audio src={staticFile("audio/scene-2-body.wav")} />
  <BodyScene />
</Sequence>
<Sequence from={scene1Frames + scene2Frames} durationInFrames={scene3Frames}>
  <Audio src={staticFile("audio/scene-3-cta.wav")} />
  <CTAScene />
</Sequence>
```

The total composition `durationInFrames` should be the sum of all scene frames. Update `constants.ts` scene timings to match these manifest-derived values — never hardcode durations that conflict with actual audio lengths.

### Script-Only Mode

If the user chose "Script only", write the script the same way and show it for approval, but skip audio generation. Note in the project README that the user should record their own audio and place WAV files in `public/audio/` following the naming convention.

---

## Platform Presets

Each platform has specific dimensions and duration norms. Use these unless the user says otherwise:

| Platform | Resolution | Aspect | FPS | Typical Duration |
|----------|-----------|--------|-----|-----------------|
| TikTok | 1080×1920 | 9:16 | 30 | 15-60s |
| Instagram Reels | 1080×1920 | 9:16 | 30 | 15-90s |
| Instagram Story | 1080×1920 | 9:16 | 30 | 5-15s |
| YouTube Shorts | 1080×1920 | 9:16 | 30 | 15-60s |
| Twitter/X | 1080×1080 | 1:1 | 30 | 5-60s |
| LinkedIn | 1080×1080 | 1:1 | 30 | 15-60s |
| Facebook Reels | 1080×1920 | 9:16 | 30 | 15-60s |
| YouTube (landscape) | 1920×1080 | 16:9 | 30 | any |

If the user doesn't specify a platform, ask. If they say "social media" generically, default to 1080×1920 (9:16) since it covers TikTok, Reels, and Shorts.

---

## Building the Video

### 1. Scaffold the Project

#### Project Location

All video projects go inside a `videos/` directory in the current working directory:

```
project-root/
├── videos/                    # All Remotion video projects live here
│   ├── tiktok-5am-reasons/
│   ├── ig-product-launch/
│   └── ...
├── src/                       # The main project's code (untouched)
└── ...
```

If `videos/` doesn't exist, create it automatically. Each video gets its own subdirectory.

#### Existing vs New

Check for an existing Remotion project (look for `remotion.config.ts` or `package.json` with `remotion` dependency inside `videos/<name>/`). If yes, add compositions. If not, create a new one.

#### New Project Setup

```bash
mkdir -p videos/<project-name> && cd videos/<project-name>
npm init -y
npm i remotion @remotion/cli @remotion/bundler react react-dom
npm i -D typescript @types/react @types/react-dom
```

If using AI-generated visuals, also install:
```bash
npm i @google/genai
```

If using AI voiceover, also install (depending on TTS provider):
```bash
# Grok TTS
npm i openai

# Gemini TTS
npm i @google/genai

# ElevenLabs TTS — no npm package needed (uses fetch)
```

File structure:

```
videos/<project-name>/
├── src/
│   ├── Root.tsx              # Register all compositions
│   ├── Video.tsx             # Main video component
│   ├── components/           # Reusable animated components
│   │   ├── AnimatedText.tsx
│   │   ├── SceneBackground.tsx  # Background mode switcher (gradient/AI/image)
│   │   ├── KenBurnsBackground.tsx # Ken Burns zoom/pan for image backgrounds
│   │   ├── Logo.tsx          # (if logo provided)
│   │   └── ...
│   └── lib/
│       └── constants.ts      # Colors, fonts, timing
├── scripts/
│   ├── generate-assets.ts    # (if using Nano Banana)
│   └── generate-voiceover.ts # (if using AI voiceover)
├── public/                   # Static assets (logos, images)
│   ├── generated/            # (AI-generated images go here)
│   └── audio/                # (AI-generated voiceover WAVs go here)
├── remotion.config.ts
├── tsconfig.json
├── package.json
└── render.sh                 # One-command render script
```

#### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "commonjs",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "moduleResolution": "node"
  },
  "include": ["src/**/*", "scripts/**/*"]
}
```

#### remotion.config.ts

```ts
import { Config } from "@remotion/cli/config";
Config.setOverwriteOutput(true);
```

#### render.sh

```bash
#!/bin/bash
set -euo pipefail

# Load env vars if .env exists (handles spaces/quotes safely)
load_env() {
  local envfile="$1"
  if [ -f "$envfile" ]; then
    set -a
    source "$envfile"
    set +a
  fi
}
load_env .env
load_env ../../.env

# Generate AI voiceover first (if applicable — audio drives timing)
# Supports both Grok TTS (GROK_API_KEY) and Gemini TTS (GEMINI_API_KEY)
if [ -f scripts/generate-voiceover.ts ] && { [ -n "${GROK_API_KEY:-}" ] || [ -n "${GEMINI_API_KEY:-}" ]; }; then
  echo "Generating AI voiceover..."
  npx tsx --no-cache scripts/generate-voiceover.ts
fi

# Generate AI assets (if applicable)
if [ -f scripts/generate-assets.ts ] && [ -n "$GEMINI_API_KEY" ]; then
  echo "Generating AI visuals..."
  npx tsx --no-cache scripts/generate-assets.ts
fi

# Render the video
npx remotion render src/index.ts <CompositionId> out/video.mp4
echo "✅ Video rendered to out/video.mp4"
```

Make it executable: `chmod +x render.sh`

#### src/index.ts (entry point)

```ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";
registerRoot(RemotionRoot);
```

### 2. Write the Compositions

This is the creative core. Read `references/animation-patterns.md` for the full pattern library.

#### Core Remotion Concepts

```tsx
import { useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, AbsoluteFill, Img, staticFile } from "remotion";
```

- **`useCurrentFrame()`** — returns the current frame number (starts at 0)
- **`useVideoConfig()`** — returns `{ width, height, fps, durationInFrames }`
- **`interpolate(frame, inputRange, outputRange, options?)`** — maps frame numbers to animation values
- **`spring({ frame, fps, config? })`** — physics-based animation (bouncy, natural)
- **`<Sequence from={frame} durationInFrames={n}>`** — show children only during a time window
- **`<Series>`** + **`<Series.Sequence>`** — auto-chain scenes back-to-back
- **`<AbsoluteFill>`** — full-screen positioned div for layering
- **`<Img src={staticFile("logo.png")} />`** — load images from `public/`

#### Root.tsx Pattern

```tsx
import { Composition } from "remotion";
import { MainVideo } from "./Video";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MainVideo"
      component={MainVideo}
      durationInFrames={450}  // 15s at 30fps
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
```

#### Animation Philosophy

Social media videos need to be **punchy and fast-moving**:

- **First 1-2 seconds**: Hook — big text, bold motion, something that stops the scroll
- **Middle**: Content delivery — stagger elements in, keep things moving, never let a frame feel static
- **Last 1-2 seconds**: CTA or payoff — logo reveal, final message

Key techniques:
- **Stagger entries** — reveal elements 5-10 frames apart
- **Use spring()** for organic bouncy motion
- **Use interpolate() with clamp** for controlled slides and fades
- **Scale + opacity together** — elements that grow 0.8→1.0 while fading in feel premium
- **Slight rotation on entry** — 5-10 degrees that resolves to 0 adds energy
- **Color transitions** — background shifts between scenes keep energy high

See `references/animation-patterns.md` for copy-paste animation recipes.

### 3. Handle Assets

**Logo**: Check project root and `public/` for existing logo files (`logo.png`, `logo.svg`, `favicon.*`). If found, mention it. If user wants it, create a `<Logo>` component.

**Images**: Copy to `public/` and use `<Img src={staticFile("filename")} />`. Always use Remotion's `<Img>` component.

**Colors**: Priority order:
1. **User-specified** — explicit color requests
2. **Design tokens** — `.specs/design-system/tokens.md` or theme files
3. **AI-inferred** — from project context
4. **Sensible defaults** — match the vibe described

Define in `src/lib/constants.ts` with source comments:

```ts
// Colors from .specs/design-system/tokens.md
export const COLORS = {
  primary: "#2D6A4F",
  secondary: "#52B788",
  background: "#0F0F0F",
  text: "#FEFAE0",
  accent: "#D4AF37",
};
```

**Fonts**: Priority order:
1. **Design tokens font** — tokens.md font family
2. **Project fonts** — `@fontsource/*` or fonts in `public/`
3. **Google Fonts** — via `@remotion/google-fonts`

```tsx
import { loadFont } from "@remotion/google-fonts/Inter";
const { fontFamily } = loadFont();
```

### 4. Preview and Render

**Preview** (opens browser):
```bash
npx remotion studio src/index.ts
```

**Render** final video:
```bash
npx remotion render src/index.ts <CompositionId> out/video.mp4
```

If render fails, check:
- Missing dependencies (run `npm i`)
- Asset files not in `public/`
- TypeScript errors (run `npx tsc --noEmit`)
- If using Nano Banana: ensure `GEMINI_API_KEY` is set and assets are generated first

---

## Identity Absorption Reference

How project context shapes the video:

| What you found | How it shapes the video |
|---------------|------------------------|
| Vision: "luxury real estate for HNW investors" | Premium feel, dark backgrounds, gold accents, authoritative copy |
| Vision: "fun fitness app for college students" | High energy, bright colors, casual language, fast cuts |
| Persona patience: Very Low | 1-2s per scene max, punchy text, no wasted frames |
| Persona patience: High | Can hold scenes 3-4s, room for subtle animations |
| Persona vocabulary: "properties" not "listings" | Use "properties" in all on-screen text |
| Tokens personality: Professional | Clean transitions, minimal bounce, restrained palette |
| Tokens personality: Bold | Big spring animations, rotation, saturated colors |

Tell the user what you absorbed: *"I read your vision, personas, and design tokens. This video will target [persona] with your brand colors and a [personality] feel."*

The project identity is a smart default, not a constraint — the user can always override.

---

## Video Types

### Text-Based (Most Common)

Kinetic typography, quote videos, listicles, announcements, countdowns. The key is **pacing and rhythm** — every 1-2 seconds, something new happens.

Patterns: words appearing one at a time, sentences sliding in, text scaling with spring physics, split-screen reveals, counter animations.

### Image/Media-Based

Photo slideshows, product showcases, before/after reveals. Use `<Img>` with Ken Burns zoom/pan via `interpolate()` on `transform: scale()`.

With Nano Banana: generate scene-specific imagery that matches the brand, then animate it.

### Data-Driven

Animated stats, chart reveals, number counters. Animate numbers with `interpolate()` + `Math.round()`. For charts, animate bar heights or SVG `stroke-dashoffset`.

---

## Common Pitfalls

- **Text too small**: Body text at least 48px, headlines 72px+. Phones are small.
- **Too much on screen**: One idea per scene. Reveal list items one at a time.
- **Animations too slow**: Entrance animations should complete in 10-15 frames (0.3-0.5s).
- **No visual hierarchy**: Use size, color, and weight contrast to guide the eye.
- **Forgetting the safe zone**: Stay within 90% of the frame for critical content.
- **Duration math wrong**: Always verify `durationInFrames` = `seconds × fps`. Don't let sequences exceed the composition duration.

---

## Multi-Platform Output

For multiple platforms, create separate compositions sharing the same components:

```tsx
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="TikTok" component={MainVideo} width={1080} height={1920} fps={30} durationInFrames={450} />
      <Composition id="Twitter" component={MainVideo} width={1080} height={1080} fps={30} durationInFrames={450} />
      <Composition id="YouTube" component={MainVideo} width={1920} height={1080} fps={30} durationInFrames={450} />
    </>
  );
};
```

Render each:
```bash
npx remotion render src/index.ts TikTok out/tiktok.mp4
npx remotion render src/index.ts Twitter out/twitter.mp4
```

With Nano Banana, generate assets at the right aspect ratio for each platform.
