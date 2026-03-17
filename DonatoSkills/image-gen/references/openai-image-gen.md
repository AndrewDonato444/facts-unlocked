# OpenAI Image Generation Reference

Quick reference for OpenAI's image generation API used by the image-gen and remotion-video skills.

## Setup

```bash
npm i openai
```

Set `OPENAI_API_KEY` environment variable.

---

## Endpoint

```
POST https://api.openai.com/v1/images/generations
Authorization: Bearer {OPENAI_API_KEY}
Content-Type: application/json
```

---

## Request Body

```json
{
  "model": "gpt-image-1",
  "prompt": "A photorealistic matcha latte in a ceramic cup on a wooden table",
  "n": 1,
  "size": "1024x1024",
  "quality": "high"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `model` | string | No | `gpt-image-1` | Model to use (see below) |
| `prompt` | string | Yes | — | Text description of the image |
| `n` | number | No | 1 | Number of images (1-4) |
| `size` | string | No | `1024x1024` | Output dimensions (see below) |
| `quality` | string | No | `auto` | `low`, `medium`, `high`, or `auto` |
| `background` | string | No | `auto` | `transparent`, `opaque`, or `auto` |
| `output_format` | string | No | `png` | `png`, `jpeg`, `webp` |

---

## Models

| Model | Quality | Speed | Best For |
|-------|---------|-------|----------|
| `gpt-image-1` | Highest | Slower (~10s) | Hero images, premium content, text in images |
| `gpt-image-1-mini` | Good | Fast (~5s) | Batch generation, drafts, backgrounds |

**Recommendation:** Use `gpt-image-1` for final assets. Use `gpt-image-1-mini` for bulk/draft generation.

**Note:** DALL-E 2 and DALL-E 3 are being deprecated May 12, 2026. Use GPT Image models for all new work.

---

## Available Sizes

| Size | Aspect Ratio | Use Case |
|------|-------------|----------|
| `1024x1024` | 1:1 | Instagram feed, Twitter, LinkedIn |
| `1536x1024` | 3:2 | Landscape, Facebook share |
| `1024x1536` | 2:3 | Portrait, Pinterest, Instagram Story |
| `auto` | varies | Model picks best fit for the prompt |

---

## Response Format

```json
{
  "created": 1234567890,
  "data": [
    {
      "b64_json": "base64_encoded_image_data..."
    }
  ]
}
```

Images are returned as base64-encoded data by default. Write to disk:

```typescript
const buffer = Buffer.from(data[0].b64_json, "base64");
fs.writeFileSync("output/image.png", buffer);
```

---

## Generation Script Template

```typescript
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

interface ImageJob {
  name: string;
  prompt: string;
  size?: "1024x1024" | "1536x1024" | "1024x1536" | "auto";
  model?: "gpt-image-1" | "gpt-image-1-mini";
  quality?: "low" | "medium" | "high" | "auto";
  n?: number;
}

async function generateImage(job: ImageJob): Promise<string[]> {
  const response = await openai.images.generate({
    model: job.model || "gpt-image-1",
    prompt: job.prompt,
    n: job.n || 1,
    size: job.size || "1024x1024",
    quality: job.quality || "high",
    response_format: "b64_json",
  });

  const outputDir = path.join(__dirname, "..", "output");
  fs.mkdirSync(outputDir, { recursive: true });

  const paths: string[] = [];
  for (let i = 0; i < response.data.length; i++) {
    const buffer = Buffer.from(response.data[i].b64_json!, "base64");
    const suffix = response.data.length > 1 ? `-${i + 1}` : "";
    const outputPath = path.join(outputDir, `${job.name}${suffix}.png`);
    fs.writeFileSync(outputPath, buffer);
    console.log(`Generated: ${outputPath} (${buffer.length} bytes)`);
    paths.push(outputPath);
  }

  return paths;
}

// Usage
const job: ImageJob = {
  name: "IMAGE_NAME",
  prompt: "PROMPT_HERE",
  size: "1024x1024",
};

generateImage(job).catch(console.error);
```

---

## Key Differences from Gemini Image Gen

| Feature | OpenAI (GPT Image) | Gemini (Nano Banana) |
|---------|-------------------|---------------------|
| Text rendering | Excellent (best-in-class) | Good (94%+, but misspells sometimes) |
| Image quality | Highest | Very good |
| Speed | Slower (~10s) | Fast (~5s) |
| Cost | ~$0.04-0.08/image | ~$0.03-0.08/image |
| Transparent backgrounds | Yes (`background: "transparent"`) | No |
| SDK | `openai` npm | `@google/genai` npm |
| Sizes | Fixed sizes + `auto` | Aspect ratios (1:1, 16:9, etc.) |
| Batch in one call | Yes (n: 1-4) | No (one per call) |
| Aspect ratio control | Via size parameter | Native aspect ratio field |

**When to use OpenAI over Gemini:**
- Text in images is critical (OpenAI has superior text rendering)
- You need transparent backgrounds
- You want multiple variations in one API call
- Premium quality is the priority

**When to use Gemini over OpenAI:**
- Speed matters (faster generation)
- You already have `GEMINI_API_KEY` for TTS
- You need fine-grained aspect ratio control
- Cost optimization on large batches

---

## Rate Limits

- Tier 1: 5 images/minute
- Tier 2+: Higher limits based on usage
- Add 3-second delay between requests for batch generation
- Use `gpt-image-1-mini` for drafts to conserve quota

---

## Platform → Size Mapping

| Platform | Post Type | Size | Notes |
|----------|-----------|------|-------|
| Instagram | Feed | `1024x1024` | Square |
| Instagram | Portrait | `1024x1536` | 2:3 |
| Twitter/X | In-feed | `1536x1024` | 3:2 landscape |
| Twitter/X | Square | `1024x1024` | 1:1 |
| LinkedIn | Share | `1536x1024` | 3:2 landscape |
| YouTube | Thumbnail | `1536x1024` | 3:2 (closest to 16:9) |
| Pinterest | Pin | `1024x1536` | 2:3 portrait |

---

## See Also

- [Nano Banana Best Practices](./nano-banana-best-practices.md) — Gemini image generation best practices, including text rendering tips, JSON-structured prompts, and social media aspect ratios.
