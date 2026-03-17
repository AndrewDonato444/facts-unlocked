---
name: image-gen
description: Generate images for social media using AI (Nano Banana / Gemini). Use this skill when the user wants to create an image, graphic, social media visual, quote card, product shot, thumbnail, infographic, carousel slide, OG image, or any static visual content. Also trigger when the user says "make me an image", "create a graphic", "generate a visual", "quote card", "carousel", "thumbnail", or wants AI-generated images for social posts.
---

# Image Generator

Generate social media images using Google's Nano Banana (Gemini) or OpenAI's GPT Image API. This skill creates platform-optimized visuals — quote cards, product shots, thumbnails, infographics, carousel slides, and more.

## How This Works

You craft the perfect prompt, call the configured image generation API (Gemini or OpenAI, based on the project's `image_gen.default_provider`), and save it locally. The user gets the image file and can review, tweak the prompt, or regenerate. Images are stored in an `images/` directory within the project, organized by job.

**For text on images**: Nano Banana has 94%+ accuracy in text rendering. Use the two-step method — isolate text specification from scene description — for best results.

---

## Orchestrated Mode

When invoked by the `content-engine` skill (or any orchestrator), the prompt will contain **"ORCHESTRATED MODE"** and all required parameters (concept, dimensions, style, output path). In this case:

1. **Skip the interactive question flow entirely** — all decisions are already made
2. **Confirm in one line** — e.g., "Generating 1080x1080 quote card for Instagram..."
3. **Generate the image directly**
4. **Output a structured summary when done:**
   ```
   IMAGE_COMPLETE
   asset_path: images/zenbrew-march/quote-card-001.png
   dimensions: 1080x1080
   aspect_ratio: 1:1
   ```

If any required parameter is missing, fall back to the interactive question flow for that parameter only.

---

## Project Registry (Multi-Project Support)

**Before generating any image**, resolve which project/brand this is for.

### Step 0: Resolve Active Project

1. **Read `projects.json`** from the DonatoSkills root directory (`~/DonatoSkills/projects.json`)
2. **Resolve the active project:**
   - **CWD match** — Current directory is inside a project's `specs_path` → auto-select (most common — zero friction)
   - **Orchestrated** — Content-engine passed `project_id` → use directly
   - **Explicit** — User said "for [project name]" → match against project names/slugs
   - **Single project** — Only one project in registry → use it automatically
   - **Ask** — Multiple projects, can't auto-detect → "Which project is this image for?"

3. **Use the project's brand context:**
   - If `specs_path` is set → read vision.md, personas, and design tokens from there
   - If `brand_brief` is set → read that for tone, audience, and visual style
   - Apply brand colors and visual identity to image generation prompts

See `shared-references/project-registry.md` for the full resolution logic.

---

## Prerequisites

### API Key (at least one required)

**Gemini (default):** Set `GEMINI_API_KEY` in `.env`. Get one from [Google AI Studio](https://aistudio.google.com/).

**OpenAI:** Set `OPENAI_API_KEY` in `.env`. Get one from [platform.openai.com/api-keys](https://platform.openai.com/api-keys).

If neither key is found, tell the user:
> "I need an image generation API key. You can use Gemini (aistudio.google.com) or OpenAI (platform.openai.com/api-keys) — want me to walk you through it?"

### Provider Selection

Read from `projects.json` → `image_gen.default_provider` (or `image_gen.provider` for backward compatibility). If both are configured, the user can override per-request:
- "use OpenAI for this one" → switch provider for this generation
- "use Gemini" → switch back

**When to suggest OpenAI over Gemini:**
- Text in images is critical (OpenAI has superior text rendering)
- Transparent backgrounds needed
- Premium quality is the priority

**When to suggest Gemini over OpenAI:**
- Speed matters (faster generation)
- Already have `GEMINI_API_KEY` for TTS
- Fine-grained aspect ratio control needed
- Cost optimization on large batches

### Node.js Dependencies

```bash
# For Gemini
npm i @google/genai

# For OpenAI
npm i openai
```

---

## Interactive Question Flow

### Step 1: Absorb Context (silent — no questions)

Before asking the user anything, silently read whatever project context exists. **The active project (resolved in Step 0) determines where to find brand context.**

**From the active project (`projects.json`):**
- If `specs_path` is set → read SDD files from there
- If `brand_brief` is set → read that for brand context
- Apply `defaults.tone` as starting default for style questions

**Brand & Audience (from project's specs_path):**

1. **`.specs/vision.md`** — What the product is, who it's for, its personality and positioning. This shapes the visual style and messaging.

2. **`.specs/personas/*.md`** — Who the target users are. Informs what visuals resonate.

3. **`.specs/design-system/tokens.md`** — Brand colors, typography, visual style. These DIRECTLY inform image generation — colors, fonts, mood.

**Non-SDD projects (no specs_path):**
- Read `README.md`, landing page copy, or any product description
- Check for brand guidelines, style guides, or marketing docs

**Always check:**

4. **`shared-references/hook-writing.md`** — If the image includes text, the text should follow hook best practices for the target platform.
5. **`shared-references/platform-specs.md`** — Image dimensions, aspect ratios, file size limits, and supported formats per platform. Use this to set the correct output dimensions.
6. **`shared-references/caption-writing.md`** — Caption formulas per platform. When the image will be posted with a caption, the text overlay and caption should complement each other.
7. **`shared-references/content-pillars.md`** — Content pillar frameworks. When creating images as part of a content strategy, align the visual to the appropriate pillar.
8. **`shared-references/provider-resilience.md`** — Retry, fallback, and timeout patterns for provider API calls. Read this when scaffolding generation scripts to ensure resilience is included. _(If this file does not yet exist, the patterns are documented inline in the Generation Script templates below.)_
9. **Previous conversation** — if the user just described what they want, you already know it.

**Use everything you find** to pre-fill answers below.

### Step 2: Ask Questions

Group these conversationally. Skip what you already know.

1. **What's the image for?** — "What do you need? (quote card, product shot, thumbnail, infographic, carousel, background, meme, ad creative)"

2. **Platform** — "Which platform? This determines the dimensions."
   - Instagram feed: 1080x1080 (1:1) or 1080x1350 (4:5)
   - Instagram Story/Reels cover: 1080x1920 (9:16)
   - Twitter/X: 1200x675 (16:9) or 1080x1080 (1:1)
   - LinkedIn: 1200x627 (1.91:1) or 1080x1080 (1:1)
   - Facebook: 1200x630 (1.91:1) or 1080x1080 (1:1)
   - YouTube thumbnail: 1280x720 (16:9)
   - Pinterest: 1000x1500 (2:3)
   - OG image: 1200x630 (1.91:1)

3. **Concept** — "Describe the visual. What should it look like?"
   - Encourage specificity: mood, colors, composition, lighting
   - If they're vague, offer options based on brand context

4. **Text overlay?** — "Any text on the image? (quote, headline, CTA, logo text)"
   - If yes: "What's the exact text? Keep it under 25 characters for best results."
   - Ask about font style preference (bold, clean, handwritten, serif)

5. **Style** — "What visual style?
   - **Photorealistic** — looks like a real photo
   - **Flat/graphic** — clean illustration, solid colors
   - **Abstract** — shapes, gradients, artistic
   - **Minimal** — lots of whitespace, simple
   - **Bold/vibrant** — high contrast, saturated colors
   - **Moody/dark** — dark tones, dramatic lighting"

6. **Quantity** — "How many variations? (1 is default, up to 4 for A/B testing)"

7. **Job name** — "What should I call this batch? (e.g., 'product-launch', 'weekly-quotes')"

### Step 3: Confirm & Generate

Show the prompt you'll send before generating:

> **Generation plan:**
> - **Type**: Quote card
> - **Platform**: Instagram (1080x1080, 1:1)
> - **Concept**: Matcha latte in a cozy setting with morning light
> - **Text**: "Dream Big" in bold white sans-serif, centered
> - **Style**: Photorealistic, warm tones
> - **Provider**: Gemini (gemini-2.5-flash-image)
>
> Look good? I'll generate it.

Wait for confirmation before calling the API.

---

## API Reference

### Gemini (Nano Banana) Models

| Model | ID | Use Case | Speed | Cost |
|-------|-----|----------|-------|------|
| Nano Banana | `gemini-2.5-flash-image` | General purpose, good default | Fast (~5s) | ~$0.04/image |
| Nano Banana 2 | `gemini-3.1-flash-image-preview` | Speed-optimized | Fastest (~3s) | ~$0.03/image |
| Nano Banana Pro | `gemini-3-pro-image-preview` | Studio quality, hero images | Slower (~10s) | ~$0.08/image |

**Default**: Use `gemini-2.5-flash-image` for most images. Use Pro for hero visuals or high-stakes creatives.

### OpenAI (GPT Image) Models

| Model | ID | Use Case | Speed | Cost |
|-------|-----|----------|-------|------|
| GPT Image 1 | `gpt-image-1` | Highest quality, best text rendering | Slower (~10s) | ~$0.04-0.08/image |
| GPT Image 1 Mini | `gpt-image-1-mini` | Fast drafts, batch generation | Fast (~5s) | ~$0.02-0.04/image |

**Default**: Use `gpt-image-1` for final assets. Use `gpt-image-1-mini` for drafts/batches.

See `image-gen/references/openai-image-gen.md` for full OpenAI API reference.

### Generation Script (Gemini)

Create a `generate-image.ts` script in the job directory:

```typescript
import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// --- Resilience: Error classification ---
const RETRYABLE_CODES = new Set([429, 500, 503]);
const NON_RETRYABLE_CODES = new Set([400, 401, 402, 403]);

function isRetryable(err: any): boolean {
  if (err.name === "AbortError") return true;
  if (err.code === "ECONNRESET" || err.code === "ETIMEDOUT") return true;
  const status = err.status ?? err.statusCode ?? err.response?.status;
  if (status && RETRYABLE_CODES.has(status)) return true;
  if (status && NON_RETRYABLE_CODES.has(status)) return false;
  if (err.message?.includes("content policy")) return false;
  return true; // unknown errors default to retryable
}

// --- Resilience: Retry with exponential backoff ---
async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 3, baseDelay = 5000, label = "" } = {}
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err.status ?? err.statusCode ?? err.response?.status ?? "unknown";
      if (!isRetryable(err) || attempt === retries) {
        throw Object.assign(err, { _provider: "gemini", _attempts: attempt });
      }
      const delay = baseDelay * Math.pow(3, attempt - 1); // 5s, 15s, 45s
      console.log(`[Retry ${attempt}/${retries}] ${label} — ${err.message ?? status} — waiting ${delay / 1000}s`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("withRetry: unreachable");
}

// --- Resilience: Timeout via AbortController ---
const TIMEOUT_MS = 60_000;

interface ImageJob {
  name: string;
  prompt: string;
  aspectRatio: string;
  model?: string;
}

async function generateImage(job: ImageJob): Promise<string> {
  const outputDir = path.join(__dirname, "..", "output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // --- Resilience: Idempotency check ---
  const outputPath = path.join(outputDir, `${job.name}.png`);
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    console.log(`Skipping ${job.name} (already exists, ${fs.statSync(outputPath).size} bytes)`);
    return outputPath;
  }

  const model = job.model || "gemini-2.5-flash-image";

  const result = await withRetry(
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const response = await ai.models.generateContent({
          model,
          contents: job.prompt,
          config: {
            responseModalities: ["TEXT", "IMAGE"],
            imageConfig: {
              aspectRatio: job.aspectRatio,
            },
            abortSignal: controller.signal,
          },
        });
        return response;
      } finally {
        clearTimeout(timeout);
      }
    },
    { retries: 3, label: job.name }
  );

  for (const part of result.candidates![0].content!.parts!) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data!, "base64");
      fs.writeFileSync(outputPath, buffer);
      console.log(`Generated: ${outputPath} (${buffer.length} bytes)`);
      console.log("IMAGE_COMPLETE: " + outputPath + " | Provider: gemini");
      return outputPath;
    }
  }

  throw new Error("No image data in response");
}

// Usage
const job: ImageJob = {
  name: "IMAGE_NAME",
  prompt: "PROMPT_HERE",
  aspectRatio: "1:1",
};

generateImage(job)
  .catch((err) => {
    const providers = err._provider ? [err._provider] : ["gemini"];
    console.log("IMAGE_FAILED: " + job.name + " | Error: " + (err.message || String(err)) + " | Providers tried: " + providers.join(", "));
    process.exitCode = 1;
  });
```

### Generation Script (OpenAI)

```typescript
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// --- Resilience: Error classification ---
const RETRYABLE_CODES = new Set([429, 500, 503]);
const NON_RETRYABLE_CODES = new Set([400, 401, 402, 403]);

function isRetryable(err: any): boolean {
  if (err.name === "AbortError") return true;
  if (err.code === "ECONNRESET" || err.code === "ETIMEDOUT") return true;
  const status = err.status ?? err.statusCode ?? err.response?.status;
  if (status && RETRYABLE_CODES.has(status)) return true;
  if (status && NON_RETRYABLE_CODES.has(status)) return false;
  if (err.message?.includes("content policy")) return false;
  return true; // unknown errors default to retryable
}

// --- Resilience: Retry with exponential backoff ---
async function withRetry<T>(
  fn: () => Promise<T>,
  { retries = 3, baseDelay = 5000, label = "" } = {}
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err.status ?? err.statusCode ?? err.response?.status ?? "unknown";
      if (!isRetryable(err) || attempt === retries) {
        throw Object.assign(err, { _provider: "openai", _attempts: attempt });
      }
      const delay = baseDelay * Math.pow(3, attempt - 1); // 5s, 15s, 45s
      console.log(`[Retry ${attempt}/${retries}] ${label} — ${err.message ?? status} — waiting ${delay / 1000}s`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("withRetry: unreachable");
}

// --- Resilience: Timeout via AbortController ---
const TIMEOUT_MS = 60_000;

interface ImageJob {
  name: string;
  prompt: string;
  size?: "1024x1024" | "1536x1024" | "1024x1536" | "auto";
  model?: "gpt-image-1" | "gpt-image-1-mini";
  quality?: "low" | "medium" | "high" | "auto";
  background?: "transparent" | "opaque" | "auto";
}

async function generateImage(job: ImageJob): Promise<string> {
  const outputDir = path.join(__dirname, "..", "output");
  fs.mkdirSync(outputDir, { recursive: true });

  // --- Resilience: Idempotency check ---
  const outputPath = path.join(outputDir, `${job.name}.png`);
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    console.log(`Skipping ${job.name} (already exists, ${fs.statSync(outputPath).size} bytes)`);
    return outputPath;
  }

  const result = await withRetry(
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const response = await openai.images.generate({
          model: job.model || "gpt-image-1",
          prompt: job.prompt,
          n: 1,
          size: job.size || "1024x1024",
          quality: job.quality || "high",
          background: job.background || "auto",
          response_format: "b64_json",
        });
        return response;
      } finally {
        clearTimeout(timeout);
      }
    },
    { retries: 3, label: job.name }
  );

  const buffer = Buffer.from(result.data[0].b64_json!, "base64");
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated: ${outputPath} (${buffer.length} bytes)`);
  console.log("IMAGE_COMPLETE: " + outputPath + " | Provider: openai");
  return outputPath;
}

// Usage
const job: ImageJob = {
  name: "IMAGE_NAME",
  prompt: "PROMPT_HERE",
  size: "1024x1024",
};

generateImage(job)
  .catch((err) => {
    const providers = err._provider ? [err._provider] : ["openai"];
    console.log("IMAGE_FAILED: " + job.name + " | Error: " + (err.message || String(err)) + " | Providers tried: " + providers.join(", "));
    process.exitCode = 1;
  });
```

**Which script to scaffold?** Read `image_gen.default_provider` from `projects.json`. If `"openai"`, scaffold the OpenAI script. If `"gemini"` (or not set), scaffold the Gemini script. Include the `openai` or `@google/genai` dependency in `package.json` accordingly.

### Provider Fallback

When scaffolding a generation script, read `image_gen.providers` from `projects.json` to determine whether to include fallback logic:

**Single provider** (e.g., `"providers": ["gemini"]`): Scaffold that provider's script template as shown above. The `withRetry` handles transient errors, but there is no fallback — if retries are exhausted, the job fails.

**Two providers** (e.g., `"providers": ["gemini", "openai"]`): Scaffold the `default_provider` script template, then add a `withFallback` function that tries the other provider when the primary exhausts retries or returns a non-retryable error. Both providers need their npm dependency in `package.json`.

Add this fallback function to the generated script when 2 providers are configured:

```typescript
// --- Resilience: Provider fallback ---
// Adaptation table: Gemini aspect ratios <-> OpenAI sizes
const GEMINI_TO_OPENAI_SIZE: Record<string, string> = {
  "1:1": "1024x1024",
  "16:9": "1536x1024",
  "2:3": "1024x1536",
  "3:2": "1536x1024",
  "4:3": "1024x1024",  // closest match
  "21:9": "1536x1024", // closest match
};

const OPENAI_SIZE_TO_GEMINI: Record<string, string> = {
  "1024x1024": "1:1",
  "1536x1024": "16:9",
  "1024x1536": "2:3",
  "auto": "1:1",
};

async function generateImageWithFallback(job: ImageJob): Promise<string> {
  const outputDir = path.join(__dirname, "..", "output");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${job.name}.png`);

  // Idempotency check
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    console.log(`Skipping ${job.name} (already exists, ${fs.statSync(outputPath).size} bytes)`);
    return outputPath;
  }

  const providersTried: string[] = [];
  const errors: string[] = [];

  // Try primary provider
  try {
    providersTried.push("PRIMARY_PROVIDER");
    return await generateImage(job); // uses the primary provider template
  } catch (primaryErr: any) {
    const errMsg = primaryErr.message || String(primaryErr);
    errors.push(`PRIMARY_PROVIDER: ${errMsg}`);
    console.log(`PRIMARY_PROVIDER failed after ${primaryErr._attempts || "?"} attempts. Falling back to FALLBACK_PROVIDER`);
  }

  // Try fallback provider
  try {
    providersTried.push("FALLBACK_PROVIDER");
    // Adapt parameters for the fallback provider
    // (agent fills in the correct adaptation based on primary/fallback direction)
    const fallbackResult = await generateImageFallback(job, outputPath);
    console.log("IMAGE_COMPLETE: " + outputPath + " | Provider: FALLBACK_PROVIDER (fallback)");
    return fallbackResult;
  } catch (fallbackErr: any) {
    const errMsg = fallbackErr.message || String(fallbackErr);
    errors.push(`FALLBACK_PROVIDER: ${errMsg}`);
  }

  // All providers exhausted
  const errorSummary = errors.join("; ");
  console.log("IMAGE_FAILED: " + job.name + " | Error: All providers exhausted (" + errorSummary + ") | Providers tried: " + providersTried.join(", "));
  throw new Error(`All providers exhausted for ${job.name}`);
}
```

The agent must replace `PRIMARY_PROVIDER` and `FALLBACK_PROVIDER` with the actual provider names from `projects.json`, and implement `generateImageFallback()` using the other provider's API with the parameter adaptation table above.

#### Provider Adaptation Table

When falling back between providers, adapt job parameters:

| Direction | Aspect Ratio / Size | Model |
|-----------|-------------------|-------|
| Gemini -> OpenAI | `"1:1"` -> `"1024x1024"`, `"16:9"` -> `"1536x1024"`, `"2:3"` -> `"1024x1536"` | Use `image_gen.openai.default_model` from projects.json |
| OpenAI -> Gemini | `"1024x1024"` -> `"1:1"`, `"1536x1024"` -> `"16:9"`, `"1024x1536"` -> `"2:3"` | Use `image_gen.gemini.default_model` from projects.json |

### Signal Output

Both templates emit structured signals for the orchestrator:

**On success:**
```
IMAGE_COMPLETE: images/job-name/output/slide-01.png | Provider: gemini
IMAGE_COMPLETE: images/job-name/output/slide-02.png | Provider: openai (fallback)
```

**On failure (all providers exhausted):**
```
IMAGE_FAILED: slide-03 | Error: All providers exhausted (gemini: 429, openai: 503) | Providers tried: gemini, openai
```

These signals are already embedded in the templates above. The orchestrator (content-engine) can parse them to track which images succeeded, which failed, and which provider served each.

### Available Aspect Ratios

| Ratio | Use Case |
|-------|----------|
| `"1:1"` | Instagram feed, Twitter, LinkedIn, Facebook |
| `"2:3"` | Pinterest, Instagram Story (closest to 9:16) |
| `"3:2"` | Landscape photos |
| `"4:3"` | Standard photo |
| `"16:9"` | YouTube thumbnails, Twitter cards, LinkedIn headers |
| `"21:9"` | Ultra-wide banners |

### Platform → Aspect Ratio Mapping

| Platform | Post Type | Aspect Ratio | Dimensions |
|----------|-----------|-------------|------------|
| Instagram | Feed | `"1:1"` | 1080x1080 |
| Instagram | Portrait | `"2:3"` | 1080x1350 |
| Instagram | Story/Reel cover | `"2:3"` | 1080x1920 |
| Twitter/X | In-feed image | `"16:9"` | 1200x675 |
| Twitter/X | Square | `"1:1"` | 1080x1080 |
| LinkedIn | Article/share | `"16:9"` | 1200x627 |
| Facebook | Share | `"16:9"` | 1200x630 |
| YouTube | Thumbnail | `"16:9"` | 1280x720 |
| Pinterest | Pin | `"2:3"` | 1000x1500 |

> **OpenAI note**: OpenAI only supports `1024x1024`, `1536x1024`, `1024x1536`, and `auto`. When using OpenAI, map to the closest supported size (e.g., 16:9 → `1536x1024`, portrait → `1024x1536`, square → `1024x1024`). The Gemini aspect ratios above (`"1:1"`, `"16:9"`, etc.) do not apply to OpenAI.

---

## Prompt Engineering

### Core Principles

1. **Positive framing** — describe what you WANT, not what you don't want ("empty street" not "no cars")
2. **Be specific** — mood, lighting, camera angle, color palette, composition
3. **Use negative prompts sparingly** — only "no blur, no distortion, no watermark"
4. **Two-step for text** — isolate text specification from scene description

### Prompt Structure

Use JSON-structured thinking when building prompts:

```json
{
  "subject": "Matcha latte in ceramic cup",
  "setting": "Cozy cafe window, morning light",
  "style": "Photorealistic, warm tones",
  "lighting": "Soft golden hour, side lighting",
  "composition": "Close-up, shallow depth of field",
  "colors": "Warm greens, cream, wood tones",
  "text": "'Dream Big' in bold white sans-serif, top center",
  "negative": "No blur, no distortion, no watermark"
}
```

Then flatten into a natural prompt:
> "Close-up photorealistic shot of a matcha latte in a ceramic cup on a wooden table by a cafe window, soft golden hour side lighting, warm greens and cream tones, shallow depth of field. Bold white sans-serif text reading 'Dream Big' centered at top. No blur, no distortion, no watermark."

### Text on Images (Two-Step Method)

For best text rendering accuracy:

**Step 1** — Specify text separately in the prompt:
> "Generate an image with the text 'Dream Big' rendered in bold white sans-serif font"

**Step 2** — Combine with the full scene:
> "Inspirational quote card with the text 'Dream Big' in bold white sans-serif font, centered, on a gradient background transitioning from deep teal to midnight blue, modern and clean"

**Text rules:**
- Keep text under 25 characters for best accuracy
- Use double quotes around the exact text in the prompt
- Specify font style, color, size, and placement
- Avoid cursive/script fonts — sans-serif renders most reliably
- For longer text, consider generating the image WITHOUT text and adding text overlay in post-processing

**CRITICAL: Gemini frequently misspells text in generated images.** Common errors include swapped letters ("mo" for "to"), dropped letters ("aready" for "already"), and phonetic substitutions ("rel" for "real"). To mitigate:
1. **Spell out short common words letter-by-letter** in the prompt when embedded in longer text (e.g., "T-O" not "to", "A-L-R-E-A-D-Y" not "already")
2. **Add "CRITICAL SPELLING: Double-check every word is spelled correctly"** to every prompt that includes text in the image
3. **Generate 2-3 variants** and visually inspect each for spelling errors before using
4. **Add a human review step** specifically for text-in-image accuracy before uploading/scheduling
5. **For guaranteed accuracy**: generate the image WITHOUT text, then add text programmatically (HTML canvas, ImageMagick, sharp, etc.) as a post-processing step. This is the recommended approach for any text longer than 3 words.

### Prompt Templates by Content Type

#### Quote Card
```
"Inspirational quote card with the text '[TEXT]' in [font style] [color] font,
[placement], on a [background description], [mood], modern and professional,
suitable for [platform]. No blur, no distortion."
```

#### Product Shot
```
"[Product description], [setting/background], [lighting style], photorealistic,
high quality, [mood], [composition], [brand colors]. No blur, no watermark."
```

#### Thumbnail
```
"YouTube thumbnail style image, [subject/scene], bold and eye-catching,
high contrast, [text if any], [color scheme], professional quality.
No blur, no distortion."
```

#### Abstract/Background
```
"Abstract [concept] visualization, flowing [shapes/lines] in [colors],
on a [background], [mood/feel], premium and modern, suitable for
text overlay. No blur, no distortion."
```

#### Infographic Background
```
"Clean [style] background for an infographic about [topic],
[color palette], with space for text and data overlays,
professional and modern. No blur, no watermark."
```

---

## File Storage

### Directory Structure

All generated images live in an `images/` directory in the project root:

```
images/
├── product-launch/
│   ├── package.json
│   ├── scripts/
│   │   └── generate-image.ts
│   └── output/
│       ├── hero-shot.png
│       ├── quote-card-001.png
│       └── quote-card-002.png
├── weekly-quotes/
│   ├── package.json
│   ├── scripts/
│   │   └── generate-image.ts
│   └── output/
│       ├── monday-quote.png
│       └── wednesday-quote.png
└── zenbrew-march/              ← orchestrator campaign
    ├── package.json
    ├── scripts/
    │   └── generate-image.ts
    └── output/
        ├── item-003-quote.png
        └── item-007-product.png
```

**Key rules:**
- **One job folder per invocation** (standalone) or per campaign (orchestrated)
- Each job gets its own `package.json` + `scripts/generate-image.ts`
- Generated images go in `output/`
- If `images/` doesn't exist, create it
- Descriptive filenames: `hero-shot.png`, `quote-card-001.png`, not `image1.png`

### Scaffolding a Job

When creating a new image job:

1. Create `images/<job-name>/`
2. Create `package.json` with the correct dependency:
   - Gemini: `@google/genai`
   - OpenAI: `openai`
3. Create `scripts/generate-image.ts` with the generation logic (use the template matching the active provider)
4. Run `npm install`
5. Run `npx tsx scripts/generate-image.ts`
6. Images appear in `output/`

---

## Batch Generation

For multiple images in one job (e.g., a week of quote cards):

```typescript
const jobs: ImageJob[] = [
  {
    name: "monday-quote",
    prompt: "Quote card with text 'Start Strong' in bold white...",
    aspectRatio: "1:1",
  },
  {
    name: "wednesday-tip",
    prompt: "Clean infographic background with text '3 Tips'...",
    aspectRatio: "1:1",
  },
  // ...
];

for (const job of jobs) {
  await generateImage(job);
  // Brief pause to avoid rate limits
  await new Promise((r) => setTimeout(r, 2000));
}
```

**Gemini rate limits**: ~10 requests/minute. Add a 2-second delay between generations. For large batches (10+), use exponential backoff on 429 errors.

### OpenAI Batch Example

```typescript
const jobs: { name: string; prompt: string; size?: string }[] = [
  {
    name: "quote-card-monday",
    prompt: "Minimalist quote card with text 'Start Strong'...",
    size: "1024x1024",
  },
  {
    name: "tip-infographic",
    prompt: "Clean infographic background with text '3 Tips'...",
    size: "1536x1024",
  },
];

for (const job of jobs) {
  await generateImage(job);
  // OpenAI Tier 1: ~5 images/minute. Use 3-second delay.
  await new Promise((r) => setTimeout(r, 3000));
}
```

**OpenAI rate limits**: ~5 images/minute (Tier 1). Add a 3-second delay between generations.

### Batch Handling with Partial-Success

For overnight automation and orchestrated batches, use this pattern instead of the simple `for` loop above. It runs all jobs, tracks successes and failures, and reports a summary — a single failed job does not crash the batch.

```typescript
interface BatchResult {
  name: string;
  status: "success" | "failed";
  provider?: string;
  outputPath?: string;
  error?: string;
}

async function runBatch(jobs: ImageJob[]): Promise<void> {
  const results: BatchResult[] = [];
  let fallbackCount = 0;

  for (const job of jobs) {
    try {
      // Use generateImageWithFallback if 2 providers are configured,
      // or generateImage if only 1 provider is available.
      const outputPath = await generateImageWithFallback(job);
      results.push({ name: job.name, status: "success", outputPath });
    } catch (err: any) {
      results.push({ name: job.name, status: "failed", error: err.message });
    }
    // Rate limit pause between jobs
    await new Promise((r) => setTimeout(r, 2000));
  }

  // --- Batch summary ---
  const succeeded = results.filter((r) => r.status === "success");
  const failed = results.filter((r) => r.status === "failed");

  console.log("\n=== BATCH SUMMARY ===");
  console.log(`${succeeded.length}/${results.length} images generated.` +
    (fallbackCount > 0 ? ` (${fallbackCount} on fallback).` : "") +
    (failed.length > 0 ? ` ${failed.length} failed: ${failed.map((f) => f.name).join(", ")}` : ""));

  for (const f of failed) {
    console.log(`  FAILED: ${f.name} — ${f.error}`);
  }

  // Exit code 0 even on partial success (orchestrator reads signals)
  process.exitCode = 0;
}
```

**Key behaviors:**
- Each job is isolated — a failure in job 3 does not prevent jobs 4-7 from running
- Idempotency means you can re-run the script and it skips already-completed jobs
- The batch summary prints at the end so the orchestrator (or human) can see what happened
- Exit code is 0 for partial success — the orchestrator parses `IMAGE_FAILED` signals to decide what to do

---

## Variations and A/B Testing

When generating variations:
1. Keep the core concept the same
2. Vary ONE element per variation (color, composition, text placement)
3. Name files clearly: `hero-v1.png`, `hero-v2.png`, `hero-v3.png`
4. Show all variations to the user and let them pick

---

## Image Types for Social Media

| Type | Best For | Text? | Example |
|------|----------|-------|---------|
| **Quote card** | Instagram, LinkedIn, Facebook | Yes — the quote IS the image | Motivational quote on gradient bg |
| **Product shot** | Instagram, Facebook ads | Maybe — product name/price | Stylized product photography |
| **Thumbnail** | YouTube, blog OG images | Yes — title text | Eye-catching preview image |
| **Infographic** | LinkedIn, Pinterest, carousel | Yes — data + labels | Stats, tips, or process visualization |
| **Meme/humor** | Twitter, Instagram, Facebook | Yes — setup/punchline | Relatable humor with text |
| **Abstract/mood** | Any — as background for text posts | No — pure visual | Gradient, texture, or pattern |
| **Behind-the-scenes** | Instagram, TikTok, LinkedIn | No | Workspace, process, team |
| **Carousel slide** | Instagram, LinkedIn | Yes — headline per slide | Multi-image swipeable content |

---

## Carousel Generation

For Instagram or LinkedIn carousels:

1. Plan the carousel: hook slide → content slides → CTA slide
2. Generate each slide as a separate image with consistent style
3. Number the files: `slide-01-hook.png`, `slide-02-tip1.png`, etc.
4. Keep visual consistency: same color palette, font style, layout pattern across all slides
5. The hook slide follows `shared-references/hook-writing.md` — it must make them swipe

```typescript
const carousel: ImageJob[] = [
  { name: "slide-01-hook", prompt: "Bold text 'Stop Doing This' on dark bg...", aspectRatio: "1:1" },
  { name: "slide-02-tip1", prompt: "Clean card with text 'Tip 1: ...' ...", aspectRatio: "1:1" },
  { name: "slide-03-tip2", prompt: "Clean card with text 'Tip 2: ...' ...", aspectRatio: "1:1" },
  { name: "slide-04-cta", prompt: "Card with text 'Follow for more' ...", aspectRatio: "1:1" },
];
```

---

## Performance Notes

- Each image: 3-10 seconds depending on model
- File size: ~1-2 MB per PNG
- Start with low-res previews for testing, then regenerate at full quality
- Cache everything in `output/` — no need to regenerate unless the prompt changes
- For cost optimization:
  - Gemini: use `gemini-2.5-flash-image` for drafts, `gemini-3-pro-image-preview` for finals
  - OpenAI: use `gpt-image-1-mini` for drafts, `gpt-image-1` for finals
