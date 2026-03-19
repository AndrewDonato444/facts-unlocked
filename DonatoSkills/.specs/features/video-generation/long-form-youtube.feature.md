---
feature: Long-Form YouTube Video Generation
domain: video-generation
source: DonatoSkills/longform-video/SKILL.md
tests:
  - longform-video/scripts/__tests__/resolve-images.test.js
  - longform-video/scripts/__tests__/generate-tts.test.js
  - longform-video/scripts/__tests__/build-composition.test.js
  - longform-video/scripts/__tests__/dry-run.test.js
  - analytics-loop/scripts/__tests__/score-longform.test.js
  - analytics-loop/scripts/__tests__/decompose-longform.test.js
  - analytics-loop/scripts/__tests__/testing-vectors.test.js
components:
  - longform-video/SKILL.md
  - longform-video/prompts/facts-compilation.md
  - longform-video/scripts/resolve-images.js
  - longform-video/scripts/generate-tts.js
  - longform-video/scripts/build-composition.js
  - analytics-loop/scripts/score-longform.js
  - analytics-loop/scripts/decompose-longform.js
  - analytics-loop/scripts/testing-vectors.js
  - longform-video/scripts/dry-run.js
personas: []
status: tested
created: 2026-03-19
updated: 2026-03-19
---

# Long-Form YouTube Video Generation

**Source**: Extension of `remotion-video` skill + new `longform-video` skill
**Design System**: .specs/design-system/tokens.md
**Depends On**: remotion-video, image-gen (cache), content-engine, analytics-loop

## Problem

The Facts Unlocked channel network produces 3 short-form videos/day per channel (TikTok, YouTube Shorts, Instagram Reels). YouTube channels that mix long-form + short-form content reach monetization faster (YouTube Partner Program requires 4,000 watch hours — long-form accumulates this 10-50x faster than Shorts).

Baby Facts Unlocked is the pilot channel. The goal is 2-4 long-form YouTube videos per week (15-25 minutes each), reusing the existing tool stack and image cache to keep marginal cost low.

## Format: Facts Compilation

The most natural long-form format for Facts Unlocked channels is a **facts compilation** — the same "surprising facts" format scaled up with narrative threading:

```
[Hook: 30s] Attention-grabbing opening fact + "In this video, we'll explore X incredible facts about..."
[Chapter 1: 3-5 min] 2-3 related facts, narrated with context and transitions
[Chapter 2: 3-5 min] 2-3 related facts, different sub-theme
[Chapter 3: 3-5 min] 2-3 related facts
[Chapter 4: 3-5 min] 2-3 related facts (optional — depends on target length)
[Outro: 30s] Recap + CTA (subscribe, comment which fact surprised you most)
```

Each chapter has:
- Narrated script (~500-700 words per chapter)
- 3-5 background images with Ken Burns zoom/pan (from cache or generated)
- Smooth crossfade transitions between images
- Optional ambient background music (low volume, looping)
- Optional captions (configurable per channel)

Total: ~2,500-3,500 words of narration, 15-25 images, 15-25 minutes.

**Future formats** (not MVP): bedtime stories, deep-dive explainers, countdowns, "day in the life" compilations. These are config-driven variations of the same pipeline.

---

## Scenarios

### Scenario: Generate a long-form baby facts video
Given the user invokes the longform-video skill for baby-facts-unlocked
And the channel config exists in projects.json
When the skill generates a script with 4 chapters and 10 facts
Then each chapter has 500-700 words of narration
And 15-20 background images are resolved (cache-first, generate on miss)
And ElevenLabs TTS generates audio for each scene sequentially
And Remotion renders a 16:9 landscape video at 1920x1080
And the output includes: video.mp4, metadata.json (title, description, chapters, tags)
And the total cost is logged via cost-tracker

### Scenario: Image cache reduces cost on subsequent videos
Given baby-facts-unlocked has 50+ images in its cache
When a new long-form video is generated with 18 image slots
Then at least 10 images are served from cache (>55% hit rate)
And only 8 or fewer new images are generated
And the cache report shows the cost savings

### Scenario: Content engine schedules a long-form video
Given a content calendar includes a long-form video item
When the content-engine processes it in orchestrated mode
Then it invokes the longform-video skill with all parameters
And the output video is uploaded to Cloudinary
And the video is scheduled to YouTube via Zernio
And YouTube metadata (title, description, chapters, tags) is included

### Scenario: Analytics track long-form separately from shorts
Given a long-form video is published and tracked by Zernio
When the analytics-loop collects performance data after 7 days
Then the video is scored using the long-form formula (retention × 3 + watch_hours × 2 + comments × 2 + subscribers × 4 + likes × 1)
And long-form scores are stored in `longform-scored.json` (not mixed with short-form)
And long-form variables are decomposed separately (chapter_count, intro_style, visual_density, etc.)
And the analytics brief generates 2 exploit + 1 explore recommendations for next week's long-form videos

### Scenario: Analytics adapt future long-form content
Given 6+ long-form videos have been scored across 3+ weeks
When the analytics-loop decomposes long-form variables
Then it identifies which chapter_count, intro_style, and narration_pace produce highest retention
And the winning long-form template is used for exploit briefs
And one explore brief tests an untried variable combination
And suppressed long-form values (e.g., "cold_open" with 30% below avg retention) are excluded from exploit slots

### Scenario: Channel config controls video personality
Given a channel config specifies tone, voice, visual style, and caption preferences
When a long-form video is generated for that channel
Then the script tone matches the config (e.g., "soothing, educational" for baby facts)
And the TTS voice matches the config (e.g., ElevenLabs "Matilda" for warm narration)
And Ken Burns speed/zoom matches the config
And captions are enabled/disabled per config

### Scenario: Script writer generates chapter-structured narrative from theme
Given a long-form brief specifies theme "How Babies Experience Their First Year"
And the channel config defines tone as "warm, curious, gentle, educational"
And the word count target is 2800 words across 4 chapters
When the script writer generates a script
Then the output contains a hook (30s, ~75 words) with a curiosity-gap opening fact
And each chapter has 500-700 words with fact → context → transition flow
And transitions between facts use conversational bridges (not abrupt topic changes)
And the outro includes a recap and subscribe CTA
And no facts from `used-topics.md` are repeated without different thematic framing
And the script's language reads naturally when spoken aloud (contractions, short sentences, rhetorical questions)

### Scenario: Content engine self-generates long-form topics
Given baby-facts-unlocked has 50+ facts in its fact pool
And 2+ long-form videos have been published and scored
When the content engine generates next week's long-form briefs
Then it produces 2 exploit briefs (themes similar to highest-performing videos)
And 1 explore brief (untried theme cluster)
And each brief includes: theme title, 8-12 fact references, intro_style, chapter_count
And no brief has >70% fact overlap with a previously published long-form video
And theme titles are YouTube-search-optimized (under 60 chars, keyword-rich)

### Scenario: Audio duration drives scene timing (no front-running)
Given a script with 18 scenes has been generated
And TTS audio has been produced for each scene (varying 8-30 seconds each)
When the Remotion composition is assembled
Then each scene's visual duration equals its audio duration + 0.5s padding
And Ken Burns zoom speed adapts to scene length (slower zoom on longer scenes)
And crossfade transitions overlap scene boundaries (not extend total duration)
And chapter title cards use fixed 3-second duration (no audio)
And the total video duration equals sum of scene durations minus transition overlaps plus intro/outro
And no scene has visual time where narration has already finished (no dead air)

### Scenario: Dry-run estimates cost before generating
Given the user wants to preview cost before committing
When they run the skill with `--dry-run`
Then it generates the script and image plan without calling APIs
And outputs estimated cost breakdown: TTS ($X), images ($Y), total ($Z)
And shows which images would be cache hits vs new generations

---

## Architecture: New Skill vs Extension

**Decision: New `longform-video` skill** (not an extension of `remotion-video`).

Rationale:
- Short-form and long-form have fundamentally different workflows (multi-chapter scripting, 15+ scene TTS, chapter markers, YouTube metadata)
- The existing `remotion-video` skill is already 1000+ lines and optimized for 15-60s videos
- A separate skill can invoke shared modules (whisper-captions, TTS generation, image cache) without bloating the short-form flow
- The content-engine already supports routing by content type — `longform-video` becomes a new entry in the skill registry

**Shared modules** (reused from existing skills):
- `image-cache/scripts/image-cache.js` — tag-based image caching
- `remotion-video/lib/whisper-captions.js` — phrase grouping and frame-based lookup
- `shared-references/hook-writing.md` — hook patterns
- `shared-references/provider-resilience.md` — retry/fallback patterns
- TTS generation patterns from `remotion-video` (ElevenLabs, Grok, Gemini templates)
- Cost tracker: `cost-tracker/log-usage.js`

---

## Voice Selection

Voice is a critical parameter for long-form content — especially for kids/baby channels where the narrator's tone directly affects whether parents keep playing the video. Voice config is per-channel, absorbed from `projects.json`.

**Baby Facts (kids content):** Female narrator, calm, soft, soothing. ElevenLabs recommended voices:
- `Matilda` (`XrExE9yKIg1WjnnlVkGX`) — Warm, audiobook feel
- `Emily` (`LcfcDJNUP1GQjkzn1xUU`) — Calm, ASMR-like
- `Rachel` (`21m00Tcm4TlvDq8ikWAM`) — Calm, polished narration

**Money Facts (authority content):** Male narrator, confident, clear. ElevenLabs:
- `Adam` (`pNInz6obpgDQGcFmaJgB`) — Deep, authoritative
- `Daniel` (`onwK4e9ZLuTAKqWW03F9`) — News presenter depth

**AI Facts (tech content):** Either gender, energetic but clear. ElevenLabs:
- `Charlotte` (`XB0fDUnXU5powFXDhCwa`) — Engaging, charismatic
- `Jeremy` (`bVMeCyTHy58xNoL34h3p`) — Excited, high energy

The `longform.voice` block in `projects.json` controls provider, voice_id, stability, speed, and fallback. The content-engine passes this through when invoking the skill in orchestrated mode.

---

## Per-Channel Config (extends projects.json)

Add a `longform` block to each project that opts in:

```json
{
  "baby-facts-unlocked": {
    "longform": {
      "enabled": true,
      "platform": "youtube",
      "format": "facts_compilation",
      "target_length_min": 18,
      "target_length_max": 25,
      "chapters": {
        "min": 3,
        "max": 5,
        "facts_per_chapter": [2, 3]
      },
      "script": {
        "tone": "warm, curious, gentle, educational",
        "word_count_target": 2800,
        "prompt_template": "longform-video/prompts/facts-compilation.md"
      },
      "voice": {
        "provider": "elevenlabs",
        "voice_id": "XrExE9yKIg1WjnnlVkGX",
        "voice_name": "Matilda",
        "model": "eleven_multilingual_v2",
        "stability": 0.7,
        "similarity_boost": 0.8,
        "speed": 0.95
      },
      "visuals": {
        "resolution": "1920x1080",
        "aspect_ratio": "16:9",
        "fps": 30,
        "ken_burns_duration_sec": 10,
        "ken_burns_zoom_range": [1.0, 1.12],
        "transition": "crossfade",
        "transition_duration_sec": 1.5,
        "image_style_prefix": "soft whimsical illustration, warm pastel colors, baby-friendly, 16:9 landscape, no text, seamless expansive composition"
      },
      "captions": {
        "enabled": false,
        "style": "none"
      },
      "audio": {
        "ambient_track": null,
        "ambient_volume": 0.08,
        "scene_padding_sec": 0.5,
        "chapter_title_duration_sec": 3
      },
      "analytics": {
        "collection_window_days": 7,
        "min_views_to_score": 50,
        "scoring_weights": {
          "avg_retention_pct": 3,
          "watch_hours": 2,
          "comments": 2,
          "subscribers_gained": 4,
          "likes": 1
        },
        "exploit_explore_ratio": [2, 1],
        "exploit_explore_cadence": "weekly"
      },
      "output": {
        "folder": "longform-video/output/baby-facts-unlocked/"
      },
      "frequency": "3x/week",
      "scheduling": {
        "days": ["monday", "wednesday", "friday"],
        "time": "10:00",
        "timezone": "America/New_York"
      }
    }
  }
}
```

---

## Pipeline (End-to-End)

```
Invocation (skill or content-engine)
  │
  ▼
Step 0: Load channel config from projects.json
  │
  ▼
Step 1: SCRIPT — Claude generates chapter-structured narrative
  │  Input: topic/theme + channel config (tone, facts_per_chapter, word_count)
  │  Output: script.json with chapters[], each containing scenes[] with narration text
  │  Also: YouTube metadata (title, description, chapter timestamps, tags)
  │
  ▼
Step 2: IMAGES — Resolve visuals for each scene (cache-first)
  │  For each scene:
  │    1. Extract semantic tags from narration text (keyword filtering, lowercased, deduped)
  │    2. Query image cache: cache.query(tags, channel) — Jaccard similarity ≥ 0.4
  │    3. Cache hit → use cached image (increment use_count, update last_used)
  │    4. Cache miss → generate via Gemini/OpenAI with:
  │       - Channel style prefix (e.g., "soft whimsical illustration, warm pastel...")
  │       - Aspect ratio: 16:9 landscape (NOT 9:16 — long-form is horizontal)
  │    5. Add new images to cache: cache.addImage({sourcePath, prompt, tags, aspectRatio: "16:9", provider, model})
  │       - Tags persisted in cache-index.json for future Jaccard matching
  │       - used_in[] tracks which long-form video ID used this image
  │  Output: image manifest mapping scene → image path
  │  Note: 15-25 images/video at 3x/week = 45-75 cache queries/week.
  │        Consider raising max_cache_size from 150 to 300 for long-form channels.
  │
  ▼
Step 3: VOICEOVER — Generate TTS for each scene (sequential)
  │  For each scene (in order, sequential to avoid rate limits):
  │    1. Call TTS provider (from channel config)
  │    2. Save WAV file
  │    3. Measure duration from PCM data
  │    4. Run Whisper for word-level timestamps (if captions enabled)
  │  Output: audio manifest with per-scene durations + optional word timestamps
  │
  ▼
Step 4: RENDER — Remotion builds the full video
  │  Composition structure:
  │    - Intro sequence (hook scene)
  │    - Chapter sequences (Ken Burns images + audio + optional captions)
  │    - Transitions (crossfade between scenes)
  │    - Outro sequence (CTA + subscribe)
  │  Config: resolution, fps, Ken Burns params, caption style from channel config
  │  ⚠️  MUST render at 1920x1080 (16:9 landscape) — NOT 1080x1920 (9:16 portrait)
  │     Short-form = 9:16 vertical. Long-form YouTube = 16:9 horizontal.
  │     This affects: Remotion composition dimensions, image generation prompts,
  │     Ken Burns viewport, caption positioning, and thumbnail aspect ratio.
  │  Output: video.mp4
  │
  ▼
Step 5: METADATA — Generate YouTube-ready metadata
  │  Output: metadata.json with:
  │    - title (SEO-optimized)
  │    - description (with chapter timestamps)
  │    - tags
  │    - thumbnail prompt (for separate image-gen invocation)
  │
  ▼
Step 6: COST REPORT — Log per-video cost breakdown
     - TTS: $X (chars × rate)
     - Images: $Y (generated) + $0 (cached)
     - Total: $Z
     - Cache hit rate: N%
```

---

## Cost Analysis

### Per-Video Cost Estimate (Baby Facts, ElevenLabs)

| Component | First Video | After Cache Seed (50+ images) |
|-----------|-------------|-------------------------------|
| TTS (ElevenLabs, ~16K chars) | ~$5.00 | ~$5.00 |
| Images (18 × $0.04 Gemini) | ~$0.72 | ~$0.16 (4 new, 14 cached) |
| Whisper (if captions) | ~$0.10 | ~$0.10 |
| Remotion render | $0 (local) | $0 (local) |
| **Total** | **~$5.82** | **~$5.26** |

### Weekly Cost (3x/week)

| Scenario | Weekly | Monthly |
|----------|--------|---------|
| ElevenLabs (premium) | ~$15.78 | ~$63 |
| Grok TTS (cheaper) | ~$3-5 | ~$12-20 |
| Mixed (ElevenLabs 1x + Grok 2x) | ~$8-10 | ~$32-40 |

**Key insight:** TTS dominates cost, not images. The image cache strategy works great, but the real cost lever is TTS provider choice. Consider:
- ElevenLabs for "hero" videos (best quality)
- Grok or Gemini for regular cadence videos (good enough, much cheaper)
- Rotate providers via existing `tts.rotate` config
- **Local TTS (Phase 7)**: Kokoro-82M on Apple Silicon = $0/video. If quality passes, this eliminates the biggest cost line entirely. Monthly savings: $63 → $0.

### Grok's <$1/video Claim

This is **unrealistic for any provider with decent narration quality** at 2800 words. Even Grok TTS at the cheapest tier won't hit $1 for 16K+ characters of audio. The honest target is **$3-6/video** depending on provider, which is still very reasonable for YouTube monetization potential.

---

## Content Engine Integration

### New Calendar Item Type

```json
{
  "type": "longform-video",
  "skill": "longform-video",
  "platform": "youtube",
  "duration": 1200,
  "concept": "10 Surprising Facts About How Babies Learn Language",
  "chapters": 4,
  "variables": {
    "content_format": "longform",
    "video_length": "1200",
    "hook_type": "did_you_know",
    "voice_provider": "elevenlabs",
    "background_type": "ken_burns_illustrated",
    "caption_style": "none"
  }
}
```

### Analytics Variable Extensions

New values for existing taxonomy:

| Variable | New Value | Description |
|----------|-----------|-------------|
| `content_format` | `longform` | (new variable) Distinguishes from short-form |
| `video_length` | `900`, `1200`, `1500` | 15/20/25 min in seconds |
| `background_type` | `ken_burns_illustrated` | Ken Burns on AI-generated illustrations |
| `hook_type` | `compilation_tease` | "In this video, we'll explore X facts about..." |

---

## Long-Form Analytics Strategy

Long-form YouTube content must be scored against its own criteria, separate from short-form. The same test → analyze → adapt loop applies, but the success signals are fundamentally different.

### Why Separate Scoring

Short-form engagement density (`shares × 4 + saves × 3 + comments × 2 + likes × 1 / impressions × 1000`) optimizes for scroll-stopping virality. Long-form YouTube optimizes for **watch time and retention** — YouTube's algorithm rewards minutes watched, not like ratios.

A long-form video with 500 views and 80% average retention is far more valuable than one with 5,000 views and 15% retention — the first generates 4x more watch hours per view.

### Long-Form Scoring Formula

```
longform_score = avg_retention_pct × 3 + watch_hours × 2 + comments × 2 + likes × 1 + subscribers_gained × 4
```

| Metric | Weight | Rationale |
|--------|--------|-----------|
| avg_retention_pct | ×3 | Core YouTube algorithm signal. High retention = algorithm promotes the video. A 20-min video with 60% retention means 12 min avg watch time. |
| watch_hours | ×2 | Direct path to monetization (4,000 hrs for YPP). Also reflects total value delivered. |
| comments | ×2 | Signals depth of engagement. Long-form viewers who comment are highly invested. |
| subscribers_gained | ×4 | Highest value action. A subscriber from a long-form video has high lifetime value. |
| likes | ×1 | Baseline signal, same as short-form. |

**Normalize by views** (not impressions) because YouTube long-form distribution works differently — a video may surface in search/suggested for months.

### Long-Form Variables (for Decomposition)

New structural variables specific to long-form, tracked alongside the shared variables:

| Variable | Values | What It Tests |
|----------|--------|---------------|
| `chapter_count` | `3`, `4`, `5` | Do more chapters (shorter, faster-paced) or fewer (deeper dives) perform better? |
| `video_duration` | `15`, `18`, `20`, `25` | Sweet spot for watch time vs completion rate |
| `intro_style` | `fact_hook`, `story_open`, `question`, `cold_open` | What opening keeps viewers past the first 30 seconds |
| `narration_voice` | voice ID | Does voice choice affect retention? |
| `narration_pace` | `slow`, `moderate`, `steady` | Pacing for long-form (different range than short-form) |
| `visual_density` | `sparse` (10 imgs), `moderate` (18 imgs), `dense` (25+ imgs) | More frequent visual changes vs letting images breathe |
| `ambient_music` | `none`, `soft`, `moderate` | Does background music improve retention? |
| `caption_style` | `none`, `full`, `key_words` | Caption impact on watch time |
| `theme_type` | `mixed_facts`, `single_topic`, `countdown`, `story_arc` | Content structure that holds attention longest |

### Collection Window

Long-form YouTube videos have a much longer performance curve than short-form:

| Content Type | Collection Window | Rationale |
|-------------|-------------------|-----------|
| Short-form (TikTok, Reels, Shorts) | 48 hours | Engagement front-loaded, algorithm decides fast |
| Long-form YouTube | **7-14 days** | YouTube suggests videos over days/weeks. Retention data stabilizes after ~72 hours but views accumulate over 7-14 days. |

The analytics loop should score long-form videos **7 days after publish** minimum. Configure via:

```json
{
  "analytics_loop": {
    "longform_collection_window_days": 7,
    "longform_min_views": 50,
    "longform_scoring_weights": {
      "avg_retention_pct": 3,
      "watch_hours": 2,
      "comments": 2,
      "subscribers_gained": 4,
      "likes": 1
    }
  }
}
```

### Brief Generation for Long-Form

The exploit/explore strategy applies to long-form too, but at a different cadence:

- **Short-form**: 2 exploit + 1 explore per 2-day brief cycle (high volume, fast iteration)
- **Long-form**: 2 exploit + 1 explore per **week** (lower volume, each video is a bigger investment)

Briefs for long-form include:
- Recommended topic/theme
- Chapter structure (count, theme per chapter)
- Intro style
- Visual density
- Narration pace and voice
- Caption and ambient music settings

### Data Separation

Long-form analytics data lives alongside short-form but is clearly separated:

```
analytics-loop/data/{project}/{date}/
├── raw-analytics.json          (short-form, existing)
├── scored-posts.json           (short-form, existing)
├── variable-analysis.json      (short-form, existing)
├── longform-raw-analytics.json (long-form, new)
├── longform-scored.json        (long-form, new)
├── longform-variable-analysis.json (long-form, new)
└── briefs/
    ├── all-briefs.json         (short-form, existing)
    └── longform-briefs.json    (long-form, new)
```

### Zernio Data Requirements (Verified 2026-03-19)

**Source**: [docs.zernio.com/platforms/youtube](https://docs.zernio.com/platforms/youtube)

Zernio provides a YouTube-specific endpoint: `GET /v1/analytics/get-youtube-daily-views` with daily breakdowns. Data has a **2-3 day delay** (fine for our 7-day collection window).

| Metric | Zernio? | Endpoint | Notes |
|--------|---------|----------|-------|
| `views` | **Yes** | `/v1/analytics` + daily views | Standard |
| `likes` | **Yes** | `/v1/analytics` + daily views | Standard |
| `comments` | **Yes** | `/v1/analytics` + daily views | Standard |
| `shares` | **Yes** | Daily views only | Not in general endpoint |
| `watch_time` | **Yes** | `/v1/analytics/get-youtube-daily-views` | Daily watch time provided |
| `subscriber_changes` | **Yes** | `/v1/analytics/get-youtube-daily-views` | Daily subscriber delta |
| `avg_retention_pct` | **No** | — | Not available from Zernio |
| Retention curves | **No** | — | Not available from Zernio |
| CTR (thumbnail → view) | **No** | — | Not available from Zernio |
| Shorts vs long-form split | **No** | — | Not available from Zernio |

### Retention: Calculated, Not Direct

Zernio provides watch time but NOT retention percentage. We **calculate estimated retention** from available data:

```
estimated_retention_pct = (watch_time_minutes / (views × video_duration_minutes)) × 100
```

Example: A 20-min video with 500 views and 5,000 watch minutes → `5000 / (500 × 20) × 100 = 50%` estimated retention.

**Limitation**: This gives average retention but NOT the retention curve shape. We can't see *where* viewers drop off (chapter transitions? intro? midpoint?). For testing vector analysis, this means:
- We CAN score overall video quality (retention estimate + watch hours + subscribers)
- We CANNOT identify specific failure points within a video (requires YouTube Data API)

### Phase 5b: YouTube Data API (Enhancement)

For deep retention curve analysis, add YouTube Data API integration as a Phase 5b enhancement:
- `GET /youtube/analytics/v2/reports` with `metrics=averageViewDuration,averageViewPercentage,annotationClickThroughRate`
- Provides second-by-second retention curves for testing vector analysis
- Requires YouTube OAuth + channel owner authorization
- **Not a launch blocker** — estimated retention from Zernio is sufficient for scoring and basic exploit/explore

---

## Script Writer

Long-form narration requires a fundamentally different writing approach from short-form hooks. A hook's job is to stop the scroll in under 5 words. A long-form script's job is to hold attention for 15-25 minutes with narrative arc, pacing, and emotional rhythm.

### How It Differs from Hook Writing

| Dimension | Hook (short-form) | Script (long-form) |
|-----------|-------------------|---------------------|
| **Goal** | Stop the scroll in 3-5 seconds | Hold attention for 15-25 minutes |
| **Length** | 5-15 words | 2,500-3,500 words |
| **Structure** | Single punch | Chapter arc with intro → build → payoff |
| **Pacing** | Immediate impact | Breathing room — build curiosity, then deliver |
| **Transitions** | None (single take) | Smooth bridges between facts/chapters ("But here's where it gets even more interesting...") |
| **Tone** | Punchy, urgent, scroll-stopping | Conversational, warm, sustained curiosity |
| **Repetition** | Never (too short) | Strategic callbacks ("Remember that bone fact from earlier?") |
| **CTA** | Implicit (watch/swipe) | Explicit mid-roll + outro ("If you're enjoying this, hit subscribe") |

### Script Structure

The script writer generates a `script.json` following this narrative structure:

```
HOOK (30s, ~75 words)
├── Opening fact — the single most surprising fact, delivered as a curiosity gap
├── Context line — "and that's just the beginning"
└── Promise — "In this video, we'll explore [N] incredible facts about [theme]"

CHAPTER 1 (3-5 min, ~500-700 words)
├── Chapter intro — bridge from hook to first sub-theme
├── Fact A — full narration with context, "why it matters"
├── Transition — connector sentence
├── Fact B — narration with comparison or anecdote
├── (Optional) Fact C — if chapter has 3 facts
└── Chapter close — mini-summary or teaser for next chapter

CHAPTER 2-4 (same structure, different sub-theme each)

OUTRO (30s, ~75 words)
├── Recap — "From [first fact] to [last fact], babies are incredible"
├── Engagement CTA — "Which fact surprised you most? Let us know in the comments"
└── Subscribe CTA — "Subscribe so you don't miss our next deep dive"
```

### Writing Rules

1. **Absorb the theme** — The script writer receives the video's theme/topic from the content engine brief. Every fact, transition, and analogy should reinforce the theme. A video about "How Babies Learn Language" should frame bone facts through the lens of physical readiness for speech, not as standalone trivia.

2. **Natural spoken cadence** — Write for the ear, not the eye. Short sentences. Contractions. Rhetorical questions. Pauses via em-dashes. Avoid academic sentence structures that sound robotic when narrated.

3. **Fact density pacing** — Never stack facts back-to-back without breathing room. Pattern: Fact → Context → "Why this matters" → Transition → Next fact. Each fact gets ~150-200 words of narration (the fact itself is 1-2 sentences; the rest is context and color).

4. **Emotional arc per chapter** — Each chapter should have a mini arc: curiosity (opener) → understanding (context) → wonder (payoff). The best long-form videos make viewers feel something, not just learn something.

5. **Strategic repetition** — Reference earlier facts to create cohesion. "Remember how we said babies are born with 300 bones? Here's why that number drops to 206..." This rewards viewers who watched from the start and reinforces retention.

6. **Avoid narrator fatigue** — Vary sentence length. Mix questions with statements. Include occasional humor or "wow" moments to reset attention. A 20-minute monotone kills retention.

7. **Scene-aware writing** — Each narration block maps to a visual scene. Write with the image in mind: "Picture a newborn's tiny hand..." gives the visual team (image gen) a clear direction. Avoid abstract statements that have no visual representation.

### Script Writer Prompt Template

The script writer prompt lives at `longform-video/prompts/facts-compilation.md` and receives:

| Input | Source |
|-------|--------|
| `theme` | Content engine brief or user input |
| `tone` | Channel config (`script.tone`) |
| `chapter_count` | Channel config or brief |
| `facts_per_chapter` | Channel config |
| `word_count_target` | Channel config |
| `channel_context` | Channel name, audience description |
| `used_topics` | From `used-topics.md` — topics to avoid re-covering |
| `analytics_insights` | From latest long-form brief (if available) — what's working |

Output: `script.json` with chapters, scenes, narration text, image hints, and YouTube metadata.

### Success Metrics for Scripts

Scripts are indirectly measured through video performance, but the script writer should optimize for:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Intro retention | >70% still watching at 30s | YouTube analytics (avg % viewed at 30s) |
| Mid-video retention | >50% at halfway point | YouTube retention curve |
| Chapter transition drops | <10% drop between chapters | Retention curve valleys |
| Comment engagement | References specific facts | Qualitative — are comments about the content? |
| Rewatch signals | Avg view duration > video length × 0.6 | Views × retention |

---

## Long-Form Topic Generation

Short-form topics are single facts ("Babies are born with ~300 bones"). Long-form topics are **thematic groupings** that bundle 8-12 related facts into a cohesive narrative.

### Topic Structure Difference

| Dimension | Short-Form Topic | Long-Form Topic |
|-----------|-----------------|-----------------|
| **Scope** | Single fact | Theme grouping 8-12 related facts |
| **Example** | "Newborns cry without tears" | "10 Surprising Facts About How Babies Develop in Their First Year" |
| **Selection** | Any surprising standalone fact | Facts that connect under a shared theme |
| **Dedup** | Exact topic + permutation match | Individual facts can appear in multiple long-form videos under different themes |
| **Reuse** | Same fact, different permutation | Same facts allowed if different thematic framing |

### Topic Generation Strategy

The content engine generates long-form topics using a different approach than short-form:

**Step 1: Theme Identification**
- Analyze the channel's fact pool (all known facts for the channel's domain)
- Cluster facts by natural sub-themes (e.g., "senses", "physical development", "reflexes", "brain growth")
- Generate theme titles that are YouTube-search-friendly and curiosity-driven

**Step 2: Fact Selection per Theme**
- Select 8-12 facts that connect under the theme
- Include a mix of: 2-3 "wow" facts (highly surprising), 3-4 "context" facts (build understanding), 2-3 "emotional" facts (create connection)
- Ensure at least 1-2 facts are not already used in short-form (fresh content as a hook)
- Order facts for narrative flow, not just surprise value

**Step 3: Title + Hook Crafting**
- Generate YouTube-optimized title (keyword-rich, curiosity-driven, under 60 chars)
- Generate thumbnail concept alongside the title
- Title patterns that work for compilations:
  - "X [Surprising/Mind-Blowing/Incredible] Facts About [Topic]"
  - "Everything You Didn't Know About [Topic]"
  - "Why [Common Belief] Is Wrong — [N] Facts That Prove It"
  - "[Topic]: What Science Actually Says"

### Topic Registry (extends used-topics.md)

Long-form topics are tracked separately in `used-topics.md` with a `## Long-Form` section per channel:

```markdown
## Baby Facts Unlocked — Long-Form

| # | Slug | Theme | Facts Included | Permutation | Platform | Status |
|---|------|-------|----------------|-------------|----------|--------|
| LF-001 | baby-first-year | 10 Facts About Baby Development in Year One | 001,002,005,008,010,011,013,015 | fact_hook / 20min / moderate / no_captions / ken_burns | YouTube | published |
| LF-002 | baby-senses | How Babies Experience the World (Their 5 Senses) | 002,010,016,017 + 4 new | story_open / 18min / slow / no_captions / ken_burns | YouTube | scheduled |
```

Key differences from short-form tracking:
- **Facts Included** column references short-form topic numbers (e.g., `001,002,005`) — facts CAN appear in multiple long-form videos
- **Permutation** uses long-form variables (intro_style, duration, narration_pace, caption_style, visual_style)
- **Status** includes `draft`, `scheduled`, `published`, `scored`

### Fact Pool Management

Individual facts used in short-form are also the building blocks for long-form. The fact pool needs to grow beyond what's in `used-topics.md`:

- Short-form creates ~3 topics/day → builds the fact pool organically
- Long-form consumes 8-12 facts per video → needs a deeper pool
- The content engine should proactively research and add facts to the pool, tagged by sub-theme, even before they're used in any video
- Target: 50+ facts per channel in the pool before launching regular long-form cadence

### Exploit/Explore for Topic Generation

Apply the same strategy as short-form briefs:

- **Exploit (2/week)**: Use themes similar to highest-performing long-form videos. If "baby senses" videos retain well, produce more sensory-themed compilations.
- **Explore (1/week)**: Test an untried theme cluster. If the channel has never done a "baby reflexes" compilation, try it.

### Dedup Rules for Long-Form

1. **Never reuse the same theme + fact set** — if LF-001 covers "baby development year one" with facts 001,002,005,008,010,011,013,015, you cannot create another video with the same title and >70% fact overlap
2. **Individual facts CAN reappear** — fact 002 (newborn vision) can appear in both "baby senses" and "baby development" compilations, because the framing and surrounding context differ
3. **Theme titles must be distinct** — no two long-form videos should have titles that a viewer would confuse
4. **Re-covering a theme requires a different angle** — "Baby Senses" can be revisited as "How Babies See Color for the First Time" (narrower focus, different facts)

---

## Audio-Visual Sync (Audio-First Workflow)

Long-form videos must never have the narrator's voice front-running ahead of the visual scene, or scenes lingering silently after narration ends. The solution is an **audio-first workflow** where TTS audio duration drives scene timing.

### The Problem

In a naive approach:
1. Generate script → assign each scene a fixed duration (e.g., 10 seconds)
2. Generate TTS audio → actual duration varies (8-14 seconds per scene)
3. Result: audio and visuals are out of sync. Narrator talks about "baby vision" while the screen still shows the previous "baby bones" image.

### Audio-First Timing Rules

The existing short-form `remotion-video` skill already uses audio-first timing (TTS generates WAV → WAV duration determines scene length). Long-form extends this to multi-chapter compositions:

**Rule 1: Audio duration is the source of truth for scene length**
```
scene.duration_frames = Math.ceil(audio.duration_seconds * fps) + padding_frames
```
Each scene's visual duration = its TTS audio duration + configurable padding (default: 0.5s for breathing room between scenes).

**Rule 2: Ken Burns timing derives from audio duration**
```
ken_burns.duration = scene.duration_frames  // zoom/pan spans the full scene
ken_burns.start_scale = config.ken_burns_zoom_range[0]  // e.g., 1.0
ken_burns.end_scale = config.ken_burns_zoom_range[1]    // e.g., 1.12
```
The Ken Burns zoom/pan interpolates smoothly across the scene's audio-derived duration. Shorter scenes get faster zooms; longer scenes get slower, more cinematic zooms. This is natural — it means the visual movement paces itself to the narration.

**Rule 3: Crossfade transitions overlap, not extend**
```
transition.duration = config.transition_duration_sec * fps  // e.g., 1.5s
// Transition OVERLAPS the end of scene N and start of scene N+1
// Total video duration = sum(scene.durations) - sum(transitions) + intro + outro
```
Transitions don't add dead time. They overlap the tail end of one scene with the head of the next, so the video flows without gaps or narration pauses.

**Rule 4: Chapter titles have fixed duration, not audio-derived**
```
chapter_title.duration = config.chapter_title_duration_sec * fps  // e.g., 3 seconds
// Chapter titles are visual-only (no narration), so they use fixed timing
```

**Rule 5: Silence gaps are intentional, not accidental**
If a scene needs a moment of visual-only time (e.g., a beauty shot between chapters), it's explicitly authored in the script as a `silent_scene` with a fixed duration, not an artifact of audio/visual mismatch.

### Audio Manifest Structure

The TTS pipeline (Step 3) produces an audio manifest that drives the Remotion composition:

```json
{
  "scenes": [
    {
      "scene_id": "hook_01",
      "chapter": "intro",
      "audio_file": "hook_01.wav",
      "duration_seconds": 12.4,
      "duration_frames": 372,
      "word_timestamps": [...],
      "image_file": "hook_01.png"
    },
    {
      "scene_id": "ch1_fact1",
      "chapter": "chapter_1",
      "audio_file": "ch1_fact1.wav",
      "duration_seconds": 28.6,
      "duration_frames": 858,
      "word_timestamps": [...],
      "image_file": "ch1_fact1.png"
    }
  ],
  "total_duration_seconds": 1182.3,
  "total_duration_frames": 35469,
  "chapter_markers": [
    { "chapter": "intro", "start_seconds": 0, "label": "Introduction" },
    { "chapter": "chapter_1", "start_seconds": 15.9, "label": "How Babies See" },
    { "chapter": "chapter_2", "start_seconds": 312.4, "label": "The Sound of Mom" }
  ]
}
```

### How This Applies to Long-Form (vs Short-Form)

| Aspect | Short-Form (existing) | Long-Form (new) |
|--------|----------------------|-----------------|
| **Scene count** | 1-4 scenes | 15-25 scenes |
| **Audio concat** | Single audio file | Per-scene WAV files, concatenated at render |
| **Ken Burns** | Single zoom across video | Per-scene zoom, reset between scenes |
| **Transitions** | Cut or simple fade | Crossfade with overlap (1-1.5s) |
| **Chapter markers** | N/A | Required — YouTube chapter timestamps from manifest |
| **Captions** | Always (platform requirement) | Optional (configurable per channel) |
| **Silence** | Never | Intentional chapter breaks (2-3s visual-only) |

### Why No Captions Makes Sync Easier

Andrew noted this correctly — long-form baby content likely runs without captions (parents play it as ambient/educational content). Without captions, there's no need for word-level frame sync. The audio manifest only needs scene-level durations, not `word_timestamps`. This simplifies the Remotion composition significantly:

- No `whisper-captions.js` phrase grouping needed
- No per-word frame calculations
- Scene timing is purely: "play this audio over this Ken Burns image for this many frames"
- If captions are enabled for a channel, the existing `whisper-captions.js` module handles it unchanged

---

## Testing Strategy & Vectors

At 3 videos/week, every video must teach us something. We can't A/B test at scale like short-form — we isolate variables deliberately and read signal from the metrics Zernio provides.

### Testing Vector Tiers

**Tier 1 — Test first (weeks 1-3), highest impact on retention:**

| Variable | Values to Test | Why First | Signal |
|----------|---------------|-----------|--------|
| `voice` | Matilda vs Emily vs Rachel (ElevenLabs) | Wrong voice = immediate bounce. Most visceral viewer reaction. | Estimated retention %, watch time per view |
| `video_length` | 15 vs 20 vs 25 min | Directly determines watch hours. Shorter may complete better; longer accumulates more minutes. | Watch time, estimated retention |
| `intro_style` | `fact_hook` vs `story_open` vs `question` vs `cold_open` | The 30-second cliff is the biggest drop point. | Estimated retention (high retention = intro worked) |

**Isolation protocol for Tier 1**: Change ONE variable per video. First 3 videos test 3 voices (same script length, same intro style). Next 3 test 3 lengths (same voice, same intro style). Next 3-4 test intro styles.

**Tier 2 — Test once Tier 1 stabilizes (weeks 4-6):**

| Variable | Values to Test | Signal |
|----------|---------------|--------|
| `publish_time` | Morning (8am) vs midday (12pm) vs evening (7pm) | Views in first 48h, total views at 7 days |
| `publish_day` | Mon/Wed/Fri vs Tue/Thu/Sat | Same — tests day-of-week effect |
| `chapter_count` | 3 deep vs 4 balanced vs 5 quick | Watch time, estimated retention |
| `theme_type` | `mixed_facts` vs `single_topic` | Estimated retention, comments (depth of engagement) |
| `narration_pace` | `slow` vs `moderate` | Watch time per view |

**Tier 3 — Fine-tuning (weeks 7+):**

| Variable | Values to Test | Signal |
|----------|---------------|--------|
| `visual_density` | `sparse` (10 imgs) vs `moderate` (18) vs `dense` (25+) | Estimated retention |
| `ambient_music` | `none` vs `soft` vs `moderate` | Estimated retention, likes ratio |
| `caption_style` | `none` vs `full` vs `key_words` | Watch time (do captions help or hurt?) |

### Signal Evaluation (What Zernio Gives Us)

| Signal | Source | What It Tells You | How to Read It |
|--------|--------|-------------------|----------------|
| Estimated retention % | Calculated: `watch_time / (views × duration)` | Overall holding power | >50% = strong, <30% = problem |
| Watch hours | Zernio daily views endpoint | Value to YouTube algorithm + YPP progress | Higher = better, compare across lengths |
| Subscriber changes | Zernio daily views endpoint | Did this video convert viewers to subscribers? | Positive delta in days after publish |
| Comments | Zernio | Depth of engagement — are people thinking about the content? | Look for content references, not just emoji |
| Views at 7 days | Zernio | Distribution reach — is YouTube promoting this? | Compare to impressions for implicit CTR |
| Likes/views ratio | Calculated | Viewer satisfaction | >4% good, >8% excellent for niche content |

### Publish Time as a Testable Variable

Publish time is tested passively alongside other variables:
- Log publish timestamp in video metadata
- After 10+ videos, correlate publish hour/day with first-48h view velocity
- Zernio may offer best-time suggestions for some platforms, but our own data is more reliable for this niche

### When to Promote a Variable Value

A variable value is promoted to "exploit" status when:
1. Tested in 3+ videos
2. Estimated retention is 15%+ above the channel's average
3. Watch hours per view is above median
4. No conflicting signal from subscriber changes

A variable value is **suppressed** when:
1. Tested in 3+ videos
2. Estimated retention is 20%+ below average
3. OR subscriber changes are consistently negative after publish

### Phase 5b Signal (Future Enhancement)

When YouTube Data API is added, the testing vectors gain:
- **Retention curve shape** — see exactly where viewers drop (chapter transitions? specific facts? pacing issues?)
- **CTR** — thumbnail + title effectiveness (currently invisible)
- **Traffic source** — search vs suggested vs browse (which topics does YouTube promote?)

This upgrades testing from "did the video work overall?" to "what specific moment lost/held viewers?"

---

## Remotion Composition Structure

```
LongFormVideo (root)
├── IntroSequence
│   ├── HookScene (first fact as attention grab)
│   └── TitleCard ("10 Facts About...")
├── ChapterSequence × N
│   ├── ChapterTitle (fade in chapter name)
│   ├── FactScene × 2-3 per chapter
│   │   ├── BackgroundImage (Ken Burns zoom/pan)
│   │   ├── Audio (TTS narration for this fact)
│   │   └── Captions (optional, whisper-synced)
│   └── TransitionOverlay (crossfade to next)
├── OutroSequence
│   ├── RecapCard (key takeaways)
│   └── CTACard (subscribe + comment prompt)
└── AmbientAudioTrack (optional, low volume throughout)
```

**Rendering concern:** A 20-min video at 30fps = 36,000 frames. Remotion renders these locally. Estimated render time: 15-45 minutes depending on machine. This is fine for 3x/week but rules out real-time iteration. The `--dry-run` flag is important for previewing before committing to a full render.

---

## Implementation Phases

### Phase 1: Skill Scaffold + Script Generation
- Create `longform-video/SKILL.md` with orchestrated + interactive modes
- Add `longform` config block to `projects.json` (baby-facts-unlocked first)
- Script generation: Claude writes chapter-structured narrative from topic + config
- Output: `script.json` with chapters, scenes, narration text, metadata
- **Test**: Generate 3 scripts, review quality and structure

### Phase 2: Image Orchestration + Cache Integration
- Wire up image-cache for long-form (same module, more queries per video)
- Generate scene-level semantic tags from narration text
- Batch image resolution: cache lookup → generate misses → write to cache
- **Test**: Generate image plan for a script, verify cache hits on second run

### Phase 3: TTS Pipeline (Multi-Scene)
- Adapt existing TTS patterns for 15-25 sequential scene generation
- ElevenLabs primary, Grok/Gemini fallback (Kokoro stubbed — see Phase 7)
- TTS provider interface: `generateTTS(text, voiceConfig) → { wavPath, durationSec }`
  - ElevenLabs and Grok implement this now
  - Kokoro implements the same interface later (swap-in, no pipeline changes)
- Audio manifest with per-scene durations
- Whisper integration for captions (when enabled)
- **Test**: Generate full audio for one video, verify manifest accuracy

### Phase 4: Remotion Long-Form Composition
- New Remotion project template for long-form
- Ken Burns component (configurable zoom, pan, duration)
- Chapter sequence with transitions
- Audio-synced scene timing from manifest
- Optional caption overlay (reuse whisper-captions.js)
- **Test**: Render one full 18-minute video end-to-end

### Phase 5: Content Engine + Analytics Integration
- Add `longform-video` to skill registry and calendar schema
- Content engine can plan + execute long-form items
- Integrate Zernio YouTube daily views endpoint (`GET /v1/analytics/get-youtube-daily-views`) for:
  - Watch time (daily breakdown)
  - Subscriber changes (daily delta)
  - Views, likes, comments, shares
- Calculate estimated retention: `watch_time / (views × video_duration)`
- Long-form scoring with Zernio-available data (no YouTube Data API dependency)
- Analytics variable extensions for long-form tagging
- Testing vector tracking: log all Tier 1-3 variables per video in metadata
- Cost tracking per video
- Scheduling via Zernio to YouTube
- **Test**: Full pipeline — plan → create → upload → schedule → verify in Zernio → pull analytics after 7 days → score

### Phase 5b: YouTube Data API (Enhancement, Not Launch Blocker)
- Add YouTube Data API for retention curves and CTR
- Requires YouTube OAuth + channel owner authorization
- Enables second-by-second retention analysis for testing vector deep-dives
- Identify specific drop-off points (chapter transitions, pacing, intro)
- **Test**: Pull retention curve for a published video, correlate drops with script structure

### Phase 6: Dry-Run + Cost Optimization
- `--dry-run` flag: generates script + image plan without API calls
- Cost estimation before committing
- Provider rotation for cost management (ElevenLabs hero / Grok regular)
- Cache seeding strategy (generate 50 base images upfront per channel)
- **Test**: Dry-run 5 videos, compare estimated vs actual cost

### Phase 7: Local TTS via Kokoro-82M (Stubbed)
- **Status: STUBBED** — TTS provider interface defined in Phase 3, Kokoro implements it later
- The TTS pipeline uses a provider-agnostic interface (`generateTTS(text, voiceConfig) → { wavPath, durationSec }`). Kokoro slots in as a new provider behind this interface with zero pipeline changes.
- Test Kokoro-82M (hexgrad/Kokoro-82M) on Apple Silicon main machine
- 82M params, runs on Mac M-series via MPS, Apache 2.0 license
- Top female English voices: `af_heart` (A), `af_bella` (A-), `af_nicole` (B-), `bf_emma` (B-)
- Requires Python 3.10+ and PyTorch 2.4+ (Apple Silicon only — not Intel Mac)
- If quality passes ear test: replace ElevenLabs as default, keep ElevenLabs for hero videos
- Potential savings: $63/month → $0/month for TTS
- Voice test scaffolded at `longform-video/tts-test/` — run on Apple Silicon machine
- Also evaluate Kokoro VoiceDesign variant for custom "soothing female narrator" voice
- **Test**: Compare Kokoro vs ElevenLabs on same baby facts script, blind listen test

---

## Open Questions

1. **Ambient music**: Do you have royalty-free ambient tracks to use, or should we generate/source them? (YouTube Content ID is aggressive)
2. **Thumbnail**: Generate via image-gen as a separate step, or derive from a video frame?
3. **YouTube upload**: Direct via YouTube Data API, or through Zernio's scheduling? (Zernio may handle YouTube uploads — need to verify)
4. **Render machine**: The Intel Mac here can't run local TTS (PyTorch 2.4+ needs Apple Silicon). For Remotion rendering of 20-min videos, is the Apple Silicon main machine the primary build machine?
5. **Baby Facts voice**: The current short-form uses ElevenLabs "Adam" (deep narration). For long-form baby content, "Matilda" (warm) or "Emily" (calm/ASMR) would be better. Test voice samples on main machine.
6. ~~**Zernio YouTube analytics**~~ — **RESOLVED**: Zernio provides watch time + subscriber changes via `/v1/analytics/get-youtube-daily-views` (2-3 day delay). Retention is calculated from watch time. Retention curves require YouTube Data API (Phase 5b, not a launch blocker).
7. **Long-form analytics cadence**: Score long-form videos 7 days after publish (vs 48hrs for short-form). Should the analytics-loop run both in the same invocation, or separate scheduled tasks?
8. **Fact pool bootstrapping**: The content engine needs 50+ facts per channel before reliable long-form topic generation. Should we batch-research facts upfront, or let short-form production build the pool organically over weeks?
9. **Mid-roll CTA placement**: The script writer includes a subscribe CTA in the outro. Should there also be a mid-roll CTA (e.g., at the Chapter 2→3 transition), and does the analytics loop track whether mid-roll CTAs affect retention?

---

## User Journey

1. Short-form content engine runs daily (existing, unchanged)
2. **3x/week, long-form skill generates a 20-min baby facts video**
3. Video is uploaded to Cloudinary and scheduled to YouTube via Zernio
4. Analytics loop tracks long-form performance separately
5. Over time, analytics inform which topics/formats perform best in long-form
6. Expand to Money Facts and AI Facts channels once pipeline is proven
