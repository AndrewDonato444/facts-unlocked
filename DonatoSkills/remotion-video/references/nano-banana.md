# Nano Banana (Gemini Image Generation) Reference

Quick reference for generating images via Google's Gemini API to use as Remotion video assets.

## Setup

```bash
npm i @google/genai
```

Set `GEMINI_API_KEY` environment variable, or pass directly:

```typescript
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "your-key" });
```

## Models

| Model | ID | Use Case | Speed |
|-------|-----|----------|-------|
| Nano Banana | `gemini-2.5-flash-image` | General purpose, good default | Fast |
| Nano Banana 2 | `gemini-3.1-flash-image-preview` | Speed-optimized | Fastest |
| Nano Banana Pro | `gemini-3-pro-image-preview` | Studio quality, hero images | Slower |

**Recommendation:** Use `gemini-2.5-flash-image` for bulk scene generation (4-7s per image). Use `gemini-3-pro-image-preview` for a single hero/key visual.

## Basic Generation

```typescript
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash-image",
  contents: "Your prompt here",
  config: {
    responseModalities: ["TEXT", "IMAGE"],
    imageConfig: {
      aspectRatio: "16:9",  // optional
    },
  },
});

// Extract and save image
for (const part of response.candidates![0].content!.parts!) {
  if (part.inlineData) {
    const buffer = Buffer.from(part.inlineData.data!, "base64");
    fs.writeFileSync("output.png", buffer);
  }
}
```

## Available Aspect Ratios

`"1:1"`, `"2:3"`, `"3:2"`, `"4:3"`, `"16:9"`, `"21:9"`, `"1:4"`, `"4:1"`, `"1:8"`, `"8:1"`

### Mapping to Video Platforms

| Video Platform | Video Dimensions | Best Nano Banana Ratio |
|---------------|-----------------|----------------------|
| TikTok / Reels / Shorts | 1080×1920 (9:16) | `"2:3"` |
| Twitter / LinkedIn | 1080×1080 (1:1) | `"1:1"` |
| YouTube landscape | 1920×1080 (16:9) | `"16:9"` |
| Instagram Story | 1080×1920 (9:16) | `"2:3"` |
| Ultra-wide cinematic | 2560×1080 (21:9) | `"21:9"` |

## Prompt Patterns for Video Assets

### Scene Backgrounds

```
"[Scene description], cinematic lighting, [color palette],
suitable as a video background with space for text overlay,
[mood: moody/bright/warm/cool], professional quality"
```

### Title Cards

```
"Bold gradient background transitioning from [color1] to [color2],
with large white text reading '[TEXT]' in a clean sans-serif font,
[brand aesthetic], modern and professional"
```

### Data/Infographic Backgrounds

```
"Abstract visualization of [concept], flowing lines of [color]
on a [background color] background, resembling [brand style],
premium feel, suitable for overlaying data"
```

### Product/Scene Photography

```
"[Detailed scene description], [lighting style], photorealistic,
high quality, [mood], [composition notes]"
```

## Multi-Image Generation for Video

Generate all scene assets in sequence:

```typescript
interface SceneAsset {
  name: string;
  prompt: string;
  aspectRatio: string;
}

const scenes: SceneAsset[] = [
  { name: "hook-bg", prompt: "...", aspectRatio: "2:3" },
  { name: "scene-1-bg", prompt: "...", aspectRatio: "2:3" },
  { name: "scene-2-bg", prompt: "...", aspectRatio: "2:3" },
  { name: "cta-bg", prompt: "...", aspectRatio: "2:3" },
];

for (const scene of scenes) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: scene.prompt,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: scene.aspectRatio },
    },
  });

  for (const part of response.candidates![0].content!.parts!) {
    if (part.inlineData) {
      const buffer = Buffer.from(part.inlineData.data!, "base64");
      fs.writeFileSync(`public/generated/${scene.name}.png`, buffer);
    }
  }
}
```

## Using in Remotion Components

```tsx
import { Img, staticFile } from "remotion";

// AI-generated background with Ken Burns
const SceneWithAIBackground: React.FC<{ asset: string }> = ({ asset }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const scale = interpolate(frame, [0, durationInFrames], [1, 1.1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <Img
        src={staticFile(`generated/${asset}.png`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale})`,
        }}
      />
      {/* Dark overlay for text legibility */}
      <AbsoluteFill style={{ backgroundColor: "rgba(0,0,0,0.4)" }} />
    </AbsoluteFill>
  );
};
```

## Performance Notes

- Each image takes 4-7 seconds to generate
- A 4-scene video needs ~20-30 seconds of generation time
- Images are ~1-2 MB each (PNG)
- Generation is sequential (one at a time) — could parallelize with Promise.all but may hit rate limits
- Cache generated images in `public/generated/` — no need to regenerate on re-render
