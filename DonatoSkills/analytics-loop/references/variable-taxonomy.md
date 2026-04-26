# Variable Taxonomy — Structural Content Variables

This document defines the structural variables used to tag and decompose content for the analytics loop. These variables describe **how** a video is structured, not **what** it says.

The same taxonomy is shared between:
- **content-engine** — tags variables when creating calendar items
- **analytics-loop** — reads tags to correlate structure with performance
- **remotion-video** — maps variables to rendering parameters

See also: `shared-references/analytics-schema.md` for the shared contract.

---

## Variables

### 1. `hook_type` — Opening Hook Format

How the first 1-3 seconds grab attention.

| Value | Description | Example |
|-------|-------------|---------|
| `stat_lead` | Opens with a surprising statistic | "73% of couples who..." |
| `did_you_know` | Classic curiosity opener | "Did you know that..." |
| `most_people_dont_know` | Exclusivity/insider knowledge | "Most people don't know..." |
| `myth_bust` | Contradicts common belief | "You've been told X, but..." |
| `question` | Asks the viewer a direct question | "What would you do if..." |
| `controversy` | Provocative or polarizing claim | "This is why X is actually..." |
| `story_open` | Begins with a narrative | "In 1987, a scientist..." |

**Maps to**: Scene 1 script structure and opening text overlay in remotion-video.

**Reference**: `shared-references/hook-writing.md` for platform-specific hook best practices.

---

### 2. `video_length` — Target Duration

| Value | Description |
|-------|-------------|
| `15` | 15 seconds — ultra-short, single fact |
| `30` | 30 seconds — standard short-form |
| `45` | 45 seconds — extended with context |
| `60` | 60 seconds — full narrative arc |

**Maps to**: Composition `durationInFrames` in remotion-video.

---

### 3. `voice_pace` — Narration Speed

| Value | Description |
|-------|-------------|
| `fast` | ~180+ wpm, energetic delivery |
| `moderate` | ~140-170 wpm, conversational |
| `slow` | ~100-130 wpm, dramatic/deliberate |

**Maps to**: TTS speed parameter. For Gemini: `speechRate` field. For Grok/ElevenLabs: `speed` parameter or script word count relative to duration.

---

### 4. `text_overlay` — Caption/Text Overlay Style

| Value | Description |
|-------|-------------|
| `minimal` | Title only, minimal on-screen text |
| `full_captions` | Complete sentence captions throughout |
| `karaoke_highlight` | Word-by-word highlight synced to audio |
| `key_words_only` | Only key words/phrases pop on screen |

**Maps to**: Caption component style and text animation pattern in remotion-video.

---

### 5. `background_type` — Visual Background Approach

| Value | Description |
|-------|-------------|
| `stock_montage` | Multiple stock clips/images cycling |
| `single_static` | One background image for entire video |
| `abstract_animated` | Gradients, particles, geometric motion |
| `split_screen` | Side-by-side or picture-in-picture layout |
| `whimsical-css` | CSS-animated pastel gradients, floating bubbles, pulsing stars — no AI image generation. Default style for baby-facts-unlocked. |

**Maps to**: `visual_mode` and `SceneBackground` type in remotion-video. References `remotion-video/references/animation-patterns.md` for Ken Burns and background components.

---

### 6. `music_energy` — Background Music Intensity

| Value | Description |
|-------|-------------|
| `none` | No background music |
| `ambient` | Soft, atmospheric — doesn't compete with voice |
| `upbeat` | Energetic, rhythmic — matches fast pacing |
| `dramatic` | Cinematic, tension-building — for story content |

**Maps to**: Background audio selection and volume level in remotion-video.

---

### 7. `cta_style` — Call-to-Action Approach

| Value | Description |
|-------|-------------|
| `none` | No explicit CTA |
| `end_card` | CTA in final 2-3 seconds as end card |
| `mid_roll_prompt` | CTA appears mid-video (e.g., "Follow for part 2") |
| `pinned_comment` | CTA in pinned comment, not in video |
| `follow_cta` | "Follow for more" overlay or voiceover |

**Maps to**: Final scene configuration and caption CTA text in remotion-video.

---

## Tagging Rules

### When Creating Content (content-engine)

Every calendar item of type `video` **must** include a `variables` object with all 7 variables:

```json
{
  "id": "003",
  "type": "video",
  "variables": {
    "hook_type": "stat_lead",
    "video_length": "30",
    "voice_pace": "fast",
    "text_overlay": "karaoke_highlight",
    "background_type": "stock_montage",
    "music_energy": "upbeat",
    "cta_style": "follow_cta"
  }
}
```

For non-video types (text, image), include only the applicable variables. Omit the rest.

### When Analyzing Content (analytics-loop)

If a post was created before variable tagging existed (legacy content), the analytics-loop will attempt to infer variables by analyzing:
- Post content/caption → `hook_type`
- Video duration metadata → `video_length`
- TTS settings from calendar → `voice_pace`
- Visual mode from calendar → `background_type`

Variables that cannot be reliably inferred are tagged as `"unknown"`.

---

## Variable Interaction Notes

Some variable combinations tend to correlate. Document observed patterns here as data accumulates:

- `stat_lead` + `fast` + `karaoke_highlight` is the "fact bomb" combo — high energy, quick delivery
- `story_open` + `slow` + `full_captions` is the "narrative" combo — draws viewers in
- `controversy` + `upbeat` + `follow_cta` tends to drive follows but may attract negative comments
- `15` second videos rarely support `story_open` hooks — not enough time for narrative

---

## Adding New Variables

If a new structural variable is identified:

1. Add it to this file (`analytics-loop/references/variable-taxonomy.md`)
2. Add it to `shared-references/analytics-schema.md`
3. Update content-engine to tag it when creating calendar items
4. Update `decompose-variables.js` to read it
5. All three must stay in sync — the taxonomy is the contract.
