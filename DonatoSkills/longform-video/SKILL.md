---
name: longform-video
description: Create long-form YouTube videos (15-25 min) for the Facts Unlocked channel network. Use this skill when the user wants to create a YouTube video, long-form content, facts compilation, educational video, or any video longer than 60 seconds. Also trigger when the user mentions "longform", "long form", "YouTube video", "compilation video", "facts video", or "chapter video". This skill handles the full pipeline: script generation, image orchestration (cache-first), TTS narration, and Remotion rendering at 1920x1080 (16:9 landscape).
---

# Long-Form Video Creator

Create 15-25 minute YouTube videos for the Facts Unlocked channel network. Produces chapter-structured facts compilation videos with AI-generated narration, Ken Burns visuals, and YouTube-ready metadata.

## How This Works

You generate a chapter-structured script from a topic/theme, resolve background images (cache-first), generate TTS narration per scene, and render the full video via Remotion at 1920x1080 (16:9 landscape). The output is a ready-to-upload `.mp4` with YouTube metadata (title, description with chapter timestamps, tags).

**This is NOT short-form.** Everything here is 16:9 horizontal, multi-chapter, and audio-first. If the user wants a TikTok, Reel, or YouTube Short, use the `remotion-video` skill instead.

---

## Orchestrated Mode

When invoked by the `content-engine` skill, the prompt will contain **"ORCHESTRATED MODE"** and all required parameters. In this case:

1. **Skip the interactive question flow entirely** — all decisions are already made
2. **Confirm the plan in one line** — e.g., "Building 20-min baby facts compilation: 'How Babies Experience Their First Year'..."
3. **Proceed directly to the pipeline**
4. **Output a structured summary when done:**
   ```
   VIDEO_COMPLETE
   asset_path: longform-video/output/baby-facts-unlocked/lf-001-baby-first-year/video.mp4
   metadata_path: longform-video/output/baby-facts-unlocked/lf-001-baby-first-year/metadata.json
   duration: 1182s (19:42)
   dimensions: 1920x1080
   chapters: 4
   images_generated: 6
   images_cached: 12
   tts_provider: elevenlabs
   tts_cost: $4.80
   total_cost: $5.04
   ```

**Signal protocol** (for drift checking):
```
FEATURE_BUILT: longform-video
SPEC_FILE: .specs/features/video-generation/long-form-youtube.feature.md
SOURCE_FILES: longform-video/SKILL.md, longform-video/prompts/facts-compilation.md
```

If any required parameter is missing, fall back to the interactive flow for that parameter only.

---

## Project Registry (Multi-Project Support)

**Before building any video**, resolve which project/brand this is for.

### Step 0: Resolve Active Project

1. **Read `projects.json`** from the DonatoSkills root directory (`~/DonatoSkills/projects.json`)
2. **Resolve the active project** using the same priority as other skills:
   - **CWD match** → auto-select
   - **Orchestrated** → content-engine passed `project_id`
   - **Explicit** → user said "for [project name]"
   - **Single project** → use it automatically
   - **Ask** → "Which channel is this video for?"

3. **Verify longform is enabled**: Check `project.longform.enabled === true`. If no `longform` config exists, tell the user: "Long-form isn't configured for [project]. Add a `longform` block to projects.json first."

4. **Load the longform config** — voice, visuals, chapters, scheduling, and script settings all come from the project's `longform` block.

See `shared-references/project-registry.md` for the full resolution logic.

---

## Shared References

Before building any video, read these shared references:

1. **`shared-references/hook-writing.md`** — Hook patterns for the video's opening (adapted for long-form intro)
2. **`shared-references/platform-specs.md`** — YouTube long-form specs (16:9, 1920x1080, max 12 hours)
3. **`shared-references/provider-resilience.md`** — Retry/fallback patterns for TTS and image gen providers
4. **`longform-video/prompts/facts-compilation.md`** — The script generation prompt template

---

## Interactive Question Flow

Walk the user through these questions conversationally. Skip any already answered by context or project config.

### Step 1: Absorb Project Identity (silent — no questions)

Read the active project's `longform` config. This pre-fills:
- Voice provider + voice ID
- Target length
- Chapter count range
- Visual style prefix
- Caption and ambient settings
- Script tone

### Step 2: Ask Questions

#### Always Ask:
1. **Topic/Theme** — "What's the topic for this video? (e.g., 'How Babies Learn Language', '10 Facts About Baby Sleep')"
   - If the content-engine provided a brief, use the brief's theme directly
   - If the user gives a vague topic, suggest 2-3 specific theme angles

#### Ask If Not in Config:
2. **Chapter Count** — "How many chapters? (default: [config value], range: [min]-[max])"
3. **Target Length** — "How long? (default: [config value] minutes)"

#### Optional:
4. **Voice Override** — "Want to use a different voice than [config voice]?"
5. **Specific Facts** — "Any specific facts you want included? Or should I research and select?"
6. **Dry Run** — "Want a dry run first? (generates script + image plan, estimates cost, no API calls)"

### Step 3: Confirm & Build

> "Here's what I'll create:
> - **Channel**: Baby Facts Unlocked (YouTube, 16:9 landscape)
> - **Topic**: How Babies Experience Their First Year
> - **Duration**: ~20 minutes (4 chapters × 5 min)
> - **Voice**: ElevenLabs Matilda (warm, calm narration)
> - **Visuals**: Ken Burns on AI-generated illustrations (cache-first)
> - **Captions**: Disabled
>
> Ready to build?"

Then execute the pipeline.

---

## Pipeline

### Step 1: SCRIPT — Generate Chapter-Structured Narrative

Read the prompt template at `longform-video/prompts/facts-compilation.md` and generate the script.

**Inputs:**
- Topic/theme (from user or brief)
- Channel config (tone, chapter count, word count target)
- Used topics registry (`content-engine/used-topics.md`) — avoid re-covering
- Analytics insights (from latest long-form brief, if available)

**Process:**
1. Research 8-12 facts related to the theme (or use facts from the brief)
2. Cluster facts into chapter sub-themes
3. Write the full script following the prompt template structure
4. Generate YouTube metadata (title, description with chapter timestamps, tags)

**Output:** `script.json`

```json
{
  "title": "10 Surprising Facts About How Babies Learn Language",
  "description": "From recognizing mom's voice in the womb to babbling in their native accent...",
  "tags": ["baby facts", "child development", "baby language", "parenting"],
  "chapters": [
    {
      "chapter_id": "intro",
      "title": "Introduction",
      "scenes": [
        {
          "scene_id": "hook_01",
          "narration": "Here's something that might surprise you. Before a baby ever says their first word...",
          "image_hint": "newborn baby looking up at parent, soft warm lighting, whimsical illustration",
          "image_tags": ["newborn", "baby", "parent", "looking", "warm", "soft"],
          "estimated_words": 75
        }
      ]
    },
    {
      "chapter_id": "chapter_1",
      "title": "Hearing Before Birth",
      "scenes": [
        {
          "scene_id": "ch1_fact1",
          "narration": "Babies can hear their mother's voice from inside the womb...",
          "image_hint": "pregnant woman speaking softly, warm pastel colors, baby-friendly illustration",
          "image_tags": ["pregnant", "mother", "speaking", "womb", "warm", "pastel"],
          "estimated_words": 180
        },
        {
          "scene_id": "ch1_fact2",
          "narration": "And here's where it gets really fascinating...",
          "image_hint": "baby recognizing voice, neural connections illustration, soft whimsical",
          "image_tags": ["baby", "voice", "recognition", "neural", "brain", "soft"],
          "estimated_words": 160
        }
      ]
    }
  ],
  "outro": {
    "scenes": [
      {
        "scene_id": "outro_01",
        "narration": "From hearing mom's voice in the womb to babbling in their native accent...",
        "image_hint": "happy baby and parent together, warm sunset colors, joyful illustration",
        "image_tags": ["baby", "parent", "happy", "together", "warm", "joyful"],
        "estimated_words": 75
      }
    ]
  },
  "metadata": {
    "total_estimated_words": 2800,
    "total_scenes": 18,
    "chapter_timestamps": [
      "0:00 Introduction",
      "0:30 Hearing Before Birth",
      "5:15 First Words",
      "10:30 Babbling and Accent",
      "15:45 Language Explosion"
    ]
  },
  "testing_vectors": {
    "intro_style": "fact_hook",
    "chapter_count": 4,
    "narration_pace": "moderate",
    "theme_type": "single_topic",
    "visual_density": "moderate"
  }
}
```

**Show the script to the user and PAUSE for approval** (unless orchestrated mode).

---

### Step 2: IMAGES — Resolve Visuals (Cache-First)

For each scene in the script:

1. **Extract tags** from `image_tags` (already in script.json)
2. **Query image cache**: `cache.query(tags, channel)` — Jaccard similarity ≥ 0.4
3. **Cache hit** → use cached image, increment `use_count`, update `last_used`
4. **Cache miss** → generate via image-gen skill:
   - Provider: from `project.image_gen.default_provider`
   - Prompt: `project.longform.visuals.image_style_prefix` + scene's `image_hint`
   - **Aspect ratio: 16:9 landscape** (NOT 9:16 — this is long-form YouTube)
   - Nano Banana aspect param: `"16:9"`
   - OpenAI size: `"1536x1024"` (closest to 16:9)
5. **Add to cache**: `cache.addImage({sourcePath, prompt, tags, aspectRatio: "16:9", provider, model})`
   - `used_in[]` tracks which long-form video used this image

**Output:** Image manifest mapping `scene_id → image_path`

```json
{
  "hook_01": { "path": "images/a1b2c3d4.png", "source": "cache", "cache_score": 0.72 },
  "ch1_fact1": { "path": "images/e5f6g7h8.png", "source": "generated", "provider": "gemini" },
  "ch1_fact2": { "path": "images/i9j0k1l2.png", "source": "cache", "cache_score": 0.58 }
}
```

**Cache report:**
```
Images: 18 total | 12 cached (67%) | 6 generated
Cost: $0.24 (6 × $0.04 Gemini) | Saved: $0.48 from cache
```

---

### Step 3: VOICEOVER — Generate TTS (Audio-First)

For each scene, in order (sequential to avoid rate limits):

1. **Read voice config** from `project.longform.voice`
2. **Call TTS provider**: `generateTTS(narration_text, voiceConfig) → { wavPath, durationSec }`
   - **ElevenLabs**: Use voice_id, model, stability, similarity_boost, speed from config
   - **Grok**: Use Grok TTS API with voice from config
   - **Kokoro** (future, stubbed): Same interface, local generation
   - **Fallback order**: Follows `project.tts.providers` array (default: ElevenLabs → Grok → Gemini)
3. **Save WAV/MP3** to output directory
4. **Measure duration** from audio file (ffprobe or PCM length)
5. **Run Whisper** for word-level timestamps (only if `longform.captions.enabled`)

**Output:** Audio manifest

```json
{
  "scenes": [
    {
      "scene_id": "hook_01",
      "audio_file": "audio/hook_01.wav",
      "duration_seconds": 12.4,
      "duration_frames": 372
    },
    {
      "scene_id": "ch1_fact1",
      "audio_file": "audio/ch1_fact1.wav",
      "duration_seconds": 28.6,
      "duration_frames": 858
    }
  ],
  "total_duration_seconds": 1182.3,
  "total_duration_frames": 35469,
  "chapter_markers": [
    { "chapter": "intro", "start_seconds": 0, "label": "Introduction" },
    { "chapter": "chapter_1", "start_seconds": 15.9, "label": "Hearing Before Birth" }
  ],
  "tts_provider": "elevenlabs",
  "tts_cost_estimate": 4.80
}
```

**Audio-visual sync rules:**
- Scene visual duration = audio duration + 0.5s padding (configurable)
- Ken Burns zoom speed adapts to scene length
- Crossfade transitions overlap scene boundaries (don't extend total duration)
- Chapter title cards: fixed 3-second duration (no audio)
- No dead air — if a scene needs visual-only time (e.g., a beauty shot between chapters), author it as a `silent_scene` in the script with a fixed duration:
  ```json
  { "scene_id": "ch1_break", "type": "silent_scene", "duration_seconds": 2.5, "image_hint": "..." }
  ```

---

### Step 4: RENDER — Remotion Builds the Video

**⚠️ MUST render at 1920x1080 (16:9 landscape). NOT 1080x1920.**

Composition structure:
```
LongFormVideo (root) — 1920x1080, 30fps
├── IntroSequence
│   ├── HookScene (first fact as attention grab)
│   └── TitleCard ("10 Facts About...")
├── ChapterSequence × N
│   ├── ChapterTitle (fade in, 3s fixed duration)
│   ├── FactScene × 2-3 per chapter
│   │   ├── BackgroundImage (Ken Burns zoom/pan, duration from audio manifest)
│   │   ├── Audio (TTS narration for this scene)
│   │   └── Captions (optional, whisper-synced)
│   └── TransitionOverlay (crossfade 1.5s, overlapping scenes)
├── OutroSequence
│   ├── RecapCard (key takeaways)
│   └── CTACard (subscribe + comment prompt)
└── AmbientAudioTrack (optional, low volume throughout)
```

**Ken Burns per scene:**
- Duration: equals scene audio duration (from manifest)
- Zoom range: from `project.longform.visuals.ken_burns_zoom_range`
- Direction: cycle `zoom-in → pan-right → zoom-in-left → zoom-out` across scenes
- Slower zoom on longer scenes, faster on shorter (natural pacing)

**Render command:**
```bash
npx remotion render LongFormVideo --output output/{channel}/{slug}/video.mp4
```

**Estimated render time:** 15-45 minutes for a 20-min video at 30fps (36,000 frames).

---

### Step 5: METADATA — Generate YouTube-Ready Package

Output `metadata.json`:

```json
{
  "title": "10 Surprising Facts About How Babies Learn Language",
  "description": "From recognizing mom's voice in the womb to babbling in their native accent, babies are language experts from day one.\n\n⏱️ Chapters:\n0:00 Introduction\n0:30 Hearing Before Birth\n5:15 First Words\n10:30 Babbling and Accent\n15:45 Language Explosion\n\n🔔 Subscribe for more baby facts: @BabyFactsUnlocked\n\n#babyfacts #childdevelopment #parenting #babydevelopment",
  "tags": ["baby facts", "child development", "baby language", "parenting", "baby development"],
  "chapter_markers": [...],
  "thumbnail_prompt": "Cute illustrated baby with speech bubbles, warm pastel colors, text: '10 LANGUAGE FACTS', 16:9 YouTube thumbnail style",
  "category": "Education",
  "privacy": "public"
}
```

---

### Step 6: COST REPORT

```
=== COST REPORT ===
TTS (ElevenLabs, 16,200 chars): $4.80
Images (6 generated × $0.04): $0.24
Images (12 cached): $0.00
Whisper (captions disabled): $0.00
Remotion render: $0.00 (local)
─────────────────────────
Total: $5.04
Cache hit rate: 67%

Logged to cost-tracker.
```

---

## Dry-Run Mode

When invoked with `--dry-run`:

1. Generate the script (Step 1) — **no API calls yet**
2. Run cache query simulation (Step 2 lookup only, no generation)
3. Estimate TTS cost from character count
4. Output the plan:

```
=== DRY RUN ===
Script: 2,780 words across 4 chapters (18 scenes)
Images: 18 needed | ~11 cache hits (estimated) | ~7 to generate
TTS: ~16,200 chars → $4.80 (ElevenLabs) or $1.20 (Grok)
Total estimated: $5.08 (ElevenLabs) or $1.48 (Grok)

Proceed with generation? (y/n)
```

---

## Output Structure

```
longform-video/output/{channel-slug}/{video-slug}/
├── script.json          # Chapter-structured script + metadata
├── images/              # Scene background images (cached or generated)
│   ├── hook_01.png
│   ├── ch1_fact1.png
│   └── ...
├── audio/               # Per-scene TTS audio files
│   ├── hook_01.wav
│   ├── ch1_fact1.wav
│   ├── ...
│   └── manifest.json    # Audio manifest with durations + chapter markers
├── video.mp4            # Final rendered video (1920x1080, 16:9)
├── metadata.json        # YouTube title, description, tags, chapters
└── cost-report.json     # Per-video cost breakdown
```

---

## Testing Vector Logging

Every generated video logs its testing vectors in `metadata.json` under `testing_vectors`. These are consumed by the analytics loop for variable decomposition:

```json
{
  "testing_vectors": {
    "voice": "elevenlabs:Matilda",
    "video_length_min": 20,
    "intro_style": "fact_hook",
    "chapter_count": 4,
    "narration_pace": "moderate",
    "visual_density": "moderate",
    "ambient_music": "none",
    "caption_style": "none",
    "theme_type": "single_topic",
    "publish_time": "2026-03-19T10:00:00-04:00",
    "publish_day": "wednesday"
  }
}
```

The analytics loop reads these when scoring and decomposing long-form performance.

---

## Error Handling

- **TTS rate limit**: Sequential scene generation with 1s delay between calls. If rate limited, wait and retry (max 3 retries per scene).
- **Image gen failure**: Fall back to next provider in rotation. If all fail, use a solid gradient placeholder and log the failure.
- **Cache miss on all scenes**: Expected for first video. Generate all, seed the cache. Subsequent videos benefit.
- **Render failure**: Remotion errors are usually missing assets or composition bugs. Check that all audio/image paths in the manifest resolve to real files.
- **Partial completion**: Each step writes its output before proceeding. If the pipeline fails at Step 4, Steps 1-3 outputs are preserved and can be resumed.
