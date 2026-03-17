# Future Idea: Image-to-Video Workflow

## Concept

User provides an image (drops in chat or gives a file path) and the skill creates a video built around that image.

## Two Modes

### 1. Image as Hero Visual

User's image becomes the centerpiece of the video:
- Analyze the mood, colors, composition, and subject matter
- Use as background with Ken Burns zoom, reveal animation, or centerpiece
- Build Remotion project around it with animated text, data, transitions
- Optionally generate additional complementary scenes via Nano Banana that match the image's vibe

### 2. Image as Style Reference

User's image sets the aesthetic direction:
- Nano Banana generates new images that match the vibe/style/palette
- Use Gemini's image editing to create variations (different lighting, overlays, crops)
- Feed all generated images into Remotion as a multi-scene video
- Original image may or may not appear in the final video

## Question Flow Addition

When user drops an image alongside a video request, add this question:

> **How should I use this image?**
> - `a` **Hero background** — it's the main visual, I'll animate text on top
> - `b` **Style reference** — match this vibe but generate new visuals via Nano Banana
> - `c` **One of several scenes** — use it alongside AI-generated scenes
> - `d` **Something else** — tell me

## Technical Notes

- Gemini API supports image-to-image editing (send base64 image + text prompt)
- Can extract dominant colors from the image to override/supplement design tokens
- Remotion's `<Img>` component handles any image format
- Could use Nano Banana to generate "matching" scenes: send original image as reference + prompt for variations
- Image editing example:
  ```typescript
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [
      { text: "Create a twilight version of this scene with warm amber tones" },
      { inlineData: { mimeType: "image/png", data: base64Image } },
    ],
    config: { responseModalities: ["TEXT", "IMAGE"] },
  });
  ```

## Status

💡 Idea — not yet implemented in SKILL.md
