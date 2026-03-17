# Future Idea: AI Voiceover via Gemini TTS

## Concept

Optional step in the video creation workflow that adds AI-generated voiceover narration. The voiceover script is written first, audio is generated, and the video timing is driven by the audio — not the other way around.

## Why Audio-First

The default flow (pick platform → pick visuals → fill in content) risks shallow, decorative videos. Audio-first flips this:

1. **What's the MESSAGE?** — the real creative work happens here
2. **Write the script** — forces clarity of thought, prevents "focused hallucination"
3. **Generate audio** — locks the pacing and total duration
4. **Design visuals to match** — visuals serve the story, not the other way around
5. **Render** — everything synced

This mirrors professional video editing: audio drives the cut.

## Script Writing Philosophy

- **DON'T** just read the on-screen text aloud (redundant, wastes the audio channel)
- **DO** add context, urgency, or personality that complements the visuals
- Keep it conversational — like a confident friend, not a narrator
- Hook-first: the first sentence needs to stop the scroll
- End with a clear, concise CTA
- Use the project's persona vocabulary (from SDD)

## Pacing Rules (from testing)

- **Target: ~2 words per second** — Gemini TTS speaks at natural pace, not rushed
- Social media tolerates slightly faster delivery but not breathless
- A 15-second video = ~30 words total of voiceover
- A 30-second video = ~60 words total
- Leave breathing room: not every second needs narration. Pauses are powerful.

## Test Results (2026-03-14)

Tested with the sizzle reel (5 scenes, Kore voice):

| Scene | Script | Words | Audio Duration | Gen Time |
|-------|--------|-------|---------------|----------|
| Hook | "Every agent in your market is pulling the same comps..." | 21 | 7.2s | 4.4s |
| Problem | "Generic market reports don't impress..." | 12 | 5.7s | 3.5s |
| Product | "Six point five billion in luxury transactions..." | 22 | 12.3s | 6.1s |
| Difference | "Deep market analysis. Buyer persona intelligence..." | 15 | 10.3s | 5.5s |
| CTA | "Modern Signal Advisory. Your market intelligence edge." | 7 | 4.7s | 3.0s |

**Key finding:** Scripts were written at ~5 words/sec but Gemini speaks at ~2 words/sec. The audio-first approach solves this — generate audio, then size scenes to match.

## Gemini TTS API Reference

**Models:**
- `gemini-2.5-flash-preview-tts` — fast, good for bulk scene generation
- `gemini-2.5-pro-preview-tts` — higher quality, better for hero narration

**30 Available Voices:**
Zephyr, Puck (upbeat), Charon (deep), Kore (firm), Fenrir, Leda, Orus, Aoede, Callirrhoe, Autonoe, Enceladus, Iapetus, Umbriel, Algieba, Despina, Erinome, Algenib, Rasalgethi, Laomedeia, Achernar, Alnilam, Schedar, Gacrux, Pulcherrima, Achird, Zubenelgenubi, Vindemiatrix, Sadachbia, Sadaltager, Sulafat

**Voice selection by project personality:**
| Personality | Suggested Voices |
|------------|-----------------|
| Professional/Luxury | Kore (firm), Charon (deep), Orus (clear) |
| Energetic/Fun | Puck (upbeat), Zephyr (bright) |
| Warm/Friendly | Aoede, Leda |
| Technical/Serious | Fenrir, Enceladus |

**Multi-speaker:** Up to 2 speakers per generation (good for dialogue or interview format)

**Output format:** Raw PCM → WAV (24kHz, 16-bit, mono) via `writeWavSync()` helper (do NOT use the `wav` npm package)

**SDK:** Same `@google/genai` package used for Nano Banana (no additional dependencies needed for audio)

## Code Example

```typescript
import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Write raw PCM data as a WAV file (24kHz, 16-bit, mono).
// DO NOT use the "wav" npm package — it doesn't reliably install.
function writeWavSync(filepath: string, pcmData: Buffer, sampleRate = 24000, channels = 1, bitDepth = 16) {
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  fs.writeFileSync(filepath, Buffer.concat([header, pcmData]));
}

// Generate voiceover for one scene
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash-preview-tts",
  contents: [{ parts: [{ text: "Say in a confident tone: Your script here" }] }],
  config: {
    responseModalities: ["AUDIO"],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: "Kore" },
      },
    },
  },
});

const data = response.candidates[0].content.parts[0].inlineData.data;
const audioBuffer = Buffer.from(data, "base64");
writeWavSync("output.wav", audioBuffer);
```

## Using in Remotion

```tsx
import { Audio, staticFile, Sequence } from "remotion";

// Audio synced to scene — duration matches the audio file length
<Sequence from={0} durationInFrames={sceneDurationFromAudio}>
  <Audio src={staticFile("audio/scene-1.wav")} />
  <HookScene />
</Sequence>
```

## Proposed Question Flow Addition

> **Voiceover** — Want a voiceover narration?
> - `a` **No voiceover** — video only (default)
> - `b` **AI voiceover** — I'll write a script, you approve it, then I generate audio and build the video around it
> - `c` **Script only** — I'll write the voiceover script but you record it yourself

When `b` is selected, the workflow becomes:
1. Write script → show to user for approval (PAUSE)
2. User approves/edits → generate audio
3. Measure audio durations → set scene timing
4. Generate visuals (Nano Banana) → build Remotion project
5. Render with synced audio

## Forked Workflow

The voiceover question creates a fork — two completely different build approaches:

```
                    ┌─ No voiceover ──→ VISUAL-FIRST (current approach)
                    │                   Platform → Content → Style → Build visuals → Render
                    │                   Scene durations are fixed by platform norms
                    │
Voiceover question ─┤
                    │
                    └─ AI voiceover ──→ AUDIO-FIRST (new approach)
                                        Write script → User approves → Generate audio →
                                        Measure durations → Build visuals to fit audio → Render
                                        Scene durations are driven by the narration
```

Both paths use the same components (AnimatedText, SceneBackground, etc.) and the same
project structure. The difference is what drives the timing.

## Status

✅ Integrated into SKILL.md (2026-03-14) — question flow, audio-first workflow, generate-voiceover.ts script, timing manifest, Remotion Audio sync, voice selection table, and render.sh hook.
