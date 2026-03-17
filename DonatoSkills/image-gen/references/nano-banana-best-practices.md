# Nano Banana Best Practices

Advanced best practices for calling Nano Banana (Gemini Image Generation) via API, with special focus on text rendering and social media optimization.

---

## API Call Best Practices

| Practice | Description |
|----------|-------------|
| **Secure API keys** | Store in environment variables or secret managers. Never hardcode. Use `GEMINI_API_KEY` env var. |
| **Use official SDK** | `@google/genai` for Node.js. Handles auth, retries, and encoding automatically. |
| **Structure requests** | Always specify `prompt`, `aspectRatio`, and `responseModalities: ["TEXT", "IMAGE"]`. Set timeouts (30-60s). |
| **Error handling** | Catch rate limits (10 req/min), timeouts, and safety blocks. Use exponential backoff for retries. |
| **Cost optimization** | Start with low-res previews (512px) for testing. Use `gemini-2.5-flash-image` for drafts, Pro for finals. ~$0.04 per 1MP image. |

---

## Text Rendering Best Practices

Nano Banana has 94%+ accuracy in text rendering. Follow these rules for best results:

### The Two-Step Method

**Step 1**: Specify text separately — "Generate an image with the text 'Dream Big' in bold sans-serif"
**Step 2**: Combine with full scene — "Inspirational card with the text 'Dream Big' in bold white sans-serif on gradient background"

This isolates text rendering from scene composition, boosting accuracy.

### The 25-Character Rule

- Keep text under 25 characters
- Use double quotes around exact phrases
- Specify font style, color, size, and placement
- Example: `White text 'Sale Now' in Arial, centered with shadow`

### Font Recommendations

| Font Style | Accuracy | Best For |
|-----------|----------|----------|
| Bold sans-serif | Highest | Headlines, CTAs, quote cards |
| Clean serif | High | Professional, editorial |
| Handwritten/script | Lower | Avoid for critical text |
| Cursive | Lowest | Do not use |

### For Text Longer Than 25 Characters

Generate the image WITHOUT text, then add text overlay in post-processing (e.g., using HTML/CSS canvas or a design tool). This avoids:
- Broken letters
- Misspellings
- Distorted characters

---

## JSON-Structured Prompts

For consistent, high-quality outputs, structure prompts as JSON then flatten:

```json
{
  "subject": "Woman holding product",
  "setting": "Modern kitchen, natural light",
  "style": "Photorealistic",
  "lighting": "Soft diffused, from left",
  "composition": "Medium shot, rule of thirds",
  "colors": "Warm neutrals, pop of green",
  "text": "'Buy Now' in bold white sans-serif, bottom right",
  "negative": "No blur, no distortion, no watermark"
}
```

**Flatten to**: "Medium shot photorealistic image of a woman holding a product in a modern kitchen with natural light, soft diffused lighting from left, warm neutral tones with a pop of green, rule of thirds composition. Bold white sans-serif text reading 'Buy Now' in bottom right. No blur, no distortion, no watermark."

---

## Reference Image Fusion

Upload 1-14 reference images for style matching:

- Product photos for consistent branding
- Pinterest mood boards for aesthetic direction
- Competitor visuals for differentiation

Prompt: "Edit [image] to add text 'Limited Edition' in neon font, maintaining the existing color palette and mood"

---

## Social Media Optimization

### Aspect Ratios by Platform

| Platform | Post Type | Ratio | Dimensions |
|----------|-----------|-------|------------|
| Instagram feed | Square | 1:1 | 1080x1080 |
| Instagram feed | Portrait | 2:3 | 1080x1350 |
| Instagram Story | Vertical | 2:3 | 1080x1920 |
| Twitter/X | Card | 16:9 | 1200x675 |
| LinkedIn | Share | 16:9 | 1200x627 |
| Facebook | Share | 16:9 | 1200x630 |
| YouTube | Thumbnail | 16:9 | 1280x720 |
| Pinterest | Pin | 2:3 | 1000x1500 |

### Templates for Batch Generation

Create reusable prompt templates for consistent brand output:
- Same color palette across all images
- Same font style and placement
- Same lighting and mood
- Only vary the subject/text per image

### A/B Testing

Generate 2-4 variations quickly for testing:
- Vary ONE element per variation (color, composition, text placement)
- Use `gemini-2.5-flash-image` for speed (~5s per image)
- Test before committing to a full batch

---

## Text Misspelling in Generated Images

**Gemini frequently misspells text embedded in generated images.** This is a known limitation — even with correct text in the prompt, the output may contain:
- Swapped letters: "mo" instead of "to"
- Dropped letters: "aready" instead of "already"
- Phonetic substitutions: "rel" instead of "real"
- Extra or missing spaces

### Mitigation Strategies

| Strategy | Effort | Reliability |
|----------|--------|-------------|
| Spell out words letter-by-letter in prompt ("A-L-R-E-A-D-Y") | Low | Medium |
| Add "CRITICAL SPELLING: Double-check every word" to prompt | Low | Low-Medium |
| Generate 2-3 variants, pick the one with correct spelling | Medium | Medium-High |
| Generate image WITHOUT text, add text programmatically | High | Guaranteed |
| Human review step before publishing | Medium | High |

**Recommended approach for production**: Generate the image without text, then overlay text using ImageMagick, HTML canvas, or the `sharp` library. This guarantees accuracy and gives you full control over typography.

For quick/draft use, generate with text but always visually verify before publishing.

---

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Mixing too many elements | Divide prompt: shape, color, text separately |
| Vague descriptions | Be specific: "golden hour side lighting" not "nice lighting" |
| Negative framing | Say "empty street" not "street with no cars" |
| Too much text | Keep under 25 chars or add text in post-processing |
| Inconsistent batch style | Use JSON template with only subject/text varying |
| Ignoring rate limits | Add 2s delay between requests, exponential backoff on 429 |
| **Text misspelled in output** | Generate image without text, add text programmatically |

---

## See Also

- [OpenAI Image Generation Reference](./openai-image-gen.md) — alternate provider with superior text rendering and transparent background support. Includes a side-by-side comparison table.
