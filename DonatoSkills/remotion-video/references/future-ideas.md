# Future Ideas

## 1. Image-to-Video Mode

User drops an image (or points to a file path) → skill builds a video around it.

**How it would work:**
- Analyze the mood, colors, composition, and subject matter of the image
- Use it as the hero visual (background, reveal, or centerpiece)
- Build the Remotion project around it with animated text, data, transitions
- Can generate additional complementary scenes via Nano Banana that match the image's vibe

**Question to add to the flow:**

> **How should I use this image?**
> - `a` **Hero background** — it's the main visual, I'll animate text on top
> - `b` **Style reference** — match this vibe but generate new visuals via Nano Banana
> - `c` **One of several scenes** — use it alongside AI-generated scenes
> - `d` **Something else** — tell me

**Nano Banana integration:** Gemini supports image-to-image editing, so the skill could:
- Take the user's image and generate variations ("make this a twilight version", "add gold overlay")
- Create matching scene backgrounds in the same style
- Feed the edited versions into Remotion as a multi-scene video

## 2. Audio-First Workflow (Tested & Validated)

**Status: Tested, ready to integrate into SKILL.md**

Script-first approach where the voiceover drives everything:

```
1. What's the MESSAGE?        ← the real creative work
2. Write the script           ← forces clarity
3. Generate audio (Gemini TTS) ← locks the pacing
4. Design visuals to match    ← now visuals serve the story
5. Render
```

### Key Learnings from Testing

- **Visuals should illustrate the story, not narrate it.** VO says "nobody cared" while you *see* big numbers deflate. Don't put the same words on screen that the voice is saying.
- **Minimal TTS direction.** Set voice style once ("confident, warm") — don't micro-manage every line. Punctuation drives pacing (ellipses for pauses, periods for finality).
- **~2 words/sec pacing** for social media — keeps it punchy
- **Contractions sound natural** — "your data's" not "your data is"
- **0.4s breathing room** between scenes prevents audio overlap
- **Voice selection matters** — tested 11 voices, Leda (warm/smooth) was best for luxury/professional content. Charon over-acted with direction prompts.

### Voice Question to Add

> **Voice** — Pick a voice for the narration:
> - `a` **Leda** — warm, smooth (luxury, lifestyle)
> - `b` **Kore** — firm, authoritative (finance, corporate)
> - `c` **Orus** — crisp, direct (news, business)
> - `d` **Puck** — upbeat, energetic (startup, youth)
> - `e` **Zephyr** — bright, clear (tech, modern)
> - `f` Listen to all samples first
> - Or describe what you want: "British male", "confident female"

### TTS Best Practices

See `references/tts-best-practices.md` for the full guide.

## 3. Gemini TTS Integration (API Reference)

**Model:** `gemini-2.5-flash-preview-tts`
**SDK:** `@google/genai` (same as Nano Banana)
**30 voices available** — see tts-best-practices.md for guide
**Output:** PCM audio → WAV (24kHz, 16-bit, mono)
**Multi-speaker:** Up to 2 speakers per generation

## 4. Multi-Platform Auto-Adaptation

When generating for multiple platforms, auto-adapt:
- Aspect ratios (9:16, 1:1, 16:9)
- Nano Banana image generation at matching aspect ratios
- Text size scaling (larger for square, smaller for landscape)
- Duration norms per platform
