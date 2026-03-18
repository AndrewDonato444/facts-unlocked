---
feature: Whisper-Synced Captions
domain: video-generation
source:
  - remotion-video/SKILL.md
  - remotion-video/references/animation-patterns.md
tests:
  - remotion-video/__tests__/whisper-captions.test.js
components:
  - PhraseSyncedCaption
personas: []
status: implemented
created: 2026-03-18
updated: 2026-03-18
---

# Whisper-Synced Captions

**Source Files**: `remotion-video/SKILL.md`, `remotion-video/references/animation-patterns.md`
**Depends On**: Audio manifest (`public/audio/manifest.json`)

## Problem

The current caption system is broken: TTS audio and on-screen text are completely decoupled. The agent hardcodes text into React components and guesses timing with `framesPerWord` math (8 frames ≈ 0.27s per word). This creates a painful mismatch — captions either front-run or lag behind the narrator, especially on longer sentences. The karaoke word-by-word drip is also too slow for short-form content.

## Solution

Run Whisper on every TTS-generated WAV file to extract word-level timestamps. Write those timestamps into the existing audio manifest. Add a new Remotion caption component that reads the manifest and displays phrases synced to the actual audio.

This is provider-agnostic — works identically with Grok, Gemini, and ElevenLabs TTS output.

---

## Feature: Word-Level Timestamp Extraction

### Scenario: Extract word timestamps from TTS audio via Whisper

```gherkin
Given a TTS audio file has been generated at public/audio/{scene-name}.wav
When the Whisper post-processing step runs
Then it transcribes the audio using whisper (base or small model)
And it extracts word-level timestamps as an array:
  [{ "word": "Your", "start": 0.0, "end": 0.28 },
   { "word": "baby", "start": 0.30, "end": 0.62 },
   { "word": "already", "start": 0.65, "end": 1.01 }, ...]
And it writes the timestamps into the audio manifest under a "words" key
```

### Scenario: Enriched manifest format

```gherkin
Given TTS and Whisper have both run for all scenes
Then the manifest at public/audio/manifest.json contains:
  {
    "scene-1-hook": {
      "file": "audio/scene-1-hook.wav",
      "durationSec": 4.2,
      "status": "complete",
      "provider": "grok",
      "words": [
        { "word": "Your", "start": 0.0, "end": 0.28 },
        { "word": "baby", "start": 0.30, "end": 0.62 },
        ...
      ]
    }
  }
And the existing manifest fields (file, durationSec, status, provider) are preserved
And scenes with status "failed" are skipped (no Whisper run)
```

### Scenario: Whisper runs after TTS, before Remotion render

```gherkin
Given the video build pipeline runs in order:
  1. TTS generates audio → writes manifest with durations
  2. Whisper enriches manifest with word timestamps
  3. Remotion reads enriched manifest → renders video with synced captions
When the Whisper step fails (e.g., model not installed)
Then it logs a warning: "Whisper unavailable — falling back to even-spaced captions"
And the manifest is left unchanged (no words array)
And Remotion falls back to the current framesPerWord timing
```

---

## Feature: Phrase-Synced Caption Component

### Scenario: Display current phrase synced to audio

```gherkin
Given the manifest contains word-level timestamps for a scene
And the scene text is "Your baby already has unique fingerprints at just three months in the womb"
When Remotion renders frame 15 (0.5s into the scene at 30fps)
Then the caption component groups words into phrases of 4-6 words
And displays the phrase that is currently being spoken:
  phrase 1 (0.0s-1.2s): "Your baby already has"
  phrase 2 (1.2s-2.5s): "unique fingerprints at just"
  phrase 3 (2.5s-3.8s): "three months in the womb"
And each phrase appears with a quick scale-in animation (not word-by-word drip)
And the previous phrase disappears when the next one appears
```

### Scenario: Phrase grouping algorithm

```gherkin
Given word timestamps for a scene
When the caption component groups words into phrases
Then it targets 4-6 words per phrase
And it breaks on natural punctuation (periods, commas, dashes) when possible
And it never breaks in the middle of a number or compound word
And the phrase boundary is set at the "start" timestamp of the first word in the next phrase
```

### Scenario: Active word highlight (optional enhancement)

```gherkin
Given a phrase is currently displayed with 5 words
When the narrator speaks word 3
Then word 3 is highlighted (brighter color or slight scale-up)
And words 1-2 are dimmed slightly (already spoken)
And words 4-5 are at normal brightness (upcoming)
And the highlight moves smoothly from word to word based on timestamps
```

### Scenario: Fallback when no word timestamps exist

```gherkin
Given the manifest does NOT contain a "words" array for a scene
When the caption component renders
Then it falls back to even-spaced phrase timing:
  total_duration / num_phrases = time_per_phrase
And logs: "No word timestamps — using even-spaced fallback"
And the visual output is still phrase-at-a-time (not word-by-word karaoke)
```

---

## Feature: Caption Styling

### Scenario: Default caption style matches viral short-form

```gherkin
Given a caption phrase is displayed
Then it uses:
  | property | value |
  | fontSize | 64-72px (readable on mobile) |
  | fontWeight | 800-900 (extra bold) |
  | color | white with dark text shadow |
  | textShadow | 0 2px 8px rgba(0,0,0,0.8) |
  | position | center of frame, vertically offset ~60% from top |
  | textAlign | center |
  | maxWidth | 90% of frame width (prevents edge overflow) |
  | textTransform | uppercase (optional, configurable) |
And the text is legible over any background (dark shadow ensures contrast)
```

### Scenario: Caption animation on phrase change

```gherkin
Given phrase 1 is currently displayed
When the timestamp crosses into phrase 2
Then phrase 1 fades out (5 frames, opacity 1→0)
And phrase 2 scales in from 0.85→1.0 with spring physics (8 frames)
And the transition feels snappy, not sluggish
```

---

## Implementation Plan

### 1. Whisper Integration Script

Add a `scripts/whisper-timestamps.ts` template to `remotion-video/SKILL.md` that:
- Reads the existing manifest
- For each scene with status "complete", runs Whisper on the WAV file
- Extracts word-level timestamps
- Writes enriched manifest back

**Whisper options:**
- **Local**: `openai-whisper` Python package (free, runs on CPU, ~30s for a 30s clip with base model)
- **API**: OpenAI Whisper API endpoint (fast, costs ~$0.006/minute, returns word timestamps with `timestamp_granularities[]=word`)

Recommend: **OpenAI Whisper API** — already have the key, no Python dependency, fast, returns word-level timestamps natively.

### 2. New Caption Component

Add `PhraseSyncedCaption` to `animation-patterns.md`:
- Reads word timestamps from manifest (passed as prop)
- Groups into phrases
- Displays current phrase based on `useCurrentFrame()`
- Spring scale-in animation on phrase change
- Optional active word highlight

### 3. Update SKILL.md Pipeline

Insert Whisper step between TTS and Remotion render:
```
TTS (any provider) → WAV files + manifest
  ↓
Whisper → enriched manifest with word timestamps
  ↓
Remotion → renders with PhraseSyncedCaption component
```

### 4. Deprecate WordByWord as Default

- Keep `WordByWord` in animation-patterns.md for hooks (3-5 word punchy lines)
- Change SKILL.md to use `PhraseSyncedCaption` as the default for body text
- Agent instructions: "For body text with voiceover, always use PhraseSyncedCaption with manifest word timestamps"

---

## What NOT to Change

- TTS provider selection (stays the same — Grok/Gemini/ElevenLabs)
- Audio format (24kHz mono WAV)
- Manifest structure (additive — just adding "words" key)
- Scene sequencing logic in Remotion
- Ken Burns, image gen, or any visual pipeline
- The existing animation patterns (they stay available)

---

## Learnings

1. **Phrase grouping needs punctuation look-ahead** — naive max-word breaks ignore natural sentence structure. Looking 1-2 words ahead for punctuation produces much better phrase boundaries.
2. **OpenAI Whisper API > local Whisper** — returns word-level timestamps natively via `timestamp_granularities[]=word`, no Python dependency, ~$0.006/min.
3. **Fallback is critical** — if Whisper fails, even-spaced phrase timing is still vastly better than word-by-word karaoke. Always degrade gracefully.
4. **None of the 3 TTS providers return word timestamps** — ElevenLabs has a dedicated endpoint but Grok and Gemini don't. Whisper as a post-processing step is the only provider-agnostic solution.
