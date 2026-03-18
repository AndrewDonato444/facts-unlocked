---
feature: HeyGen Avatar Video Provider
domain: video-generation
source:
  - scripts/test-heygen.js
  - content-engine/calendars/heygen-poc-001/heygen-batch.json
  - shared-references/provider-resilience.md
tests: []
components: []
personas: []
status: specced
created: 2026-03-18
updated: 2026-03-18
---

# HeyGen Avatar Video Provider

**Source Files**: `scripts/test-heygen.js`, `content-engine/calendars/heygen-poc-001/`
**API Reference**: Memory file `reference_heygen_api.md`
**Provider Pattern**: `shared-references/provider-resilience.md`

## Purpose

HeyGen generates UGC-style avatar talking-head videos via API. Unlike the standard pipeline (TTS + image gen + Remotion), HeyGen produces a complete video (avatar lip-syncing to script with background visuals). It's a self-contained provider — no ElevenLabs, no Grok, no Gemini image gen, no Remotion render needed.

This is an **alternative video format** for A/B testing against the standard pipeline, not a replacement.

---

## Feature: HeyGen Video Generation

### Three API Paths

| Path | Endpoint | Speed | Quality | Control |
|------|----------|-------|---------|---------|
| **Standard v2** | `POST /v2/video/generate` | ~2-3 min | Good | High (pick avatar + voice + background) |
| **Template** | `POST /v2/template/{id}/generate` | ~2-3 min | Good | Medium (fill template variables) |
| **Video Agent** | `POST /v1/video_agent/generate` | ~10-15 min | Excellent | Low (prompt-driven, non-deterministic) |

**Recommended for pipeline**: Standard v2 (fast, deterministic, controllable).

---

### Scenario: Generate a standard avatar video

```gherkin
Given a video manifest with fact_text and channel theme
When the HeyGen provider is selected
Then it picks an avatar_id from the approved avatar pool for that channel
And it picks a voice_id that gender-matches the avatar
And it calls POST /v2/video/generate with:
  | field | value |
  | video_inputs[0].character.type | avatar |
  | video_inputs[0].character.avatar_id | {selected avatar} |
  | video_inputs[0].character.avatar_style | normal |
  | video_inputs[0].voice.type | text |
  | video_inputs[0].voice.voice_id | {selected voice} |
  | video_inputs[0].voice.input_text | {fact script} |
  | video_inputs[0].background.type | color |
  | video_inputs[0].background.value | #0a1628 |
  | dimension.width | 1080 |
  | dimension.height | 1920 |
And it receives a video_id for status polling
```

### Scenario: Poll for video completion

```gherkin
Given a video_id from the generate call
When the provider polls GET /v1/video_status.get?video_id={id}
Then it polls every 30 seconds
And it has a maximum timeout of 5 minutes (standard) or 20 minutes (video agent)
And when status is "completed" it returns the video_url
And when status is "failed" it triggers the retry/fallback chain
```

### Scenario: Gender-match avatar and voice

```gherkin
Given an avatar is selected with gender "female"
When selecting a voice
Then only voices with gender "female" are eligible
And the voice must have language "en" or "English"
And if no matching voice is found, the provider falls back to a default female English voice
```

### Scenario: Avatar and voice rotation for testing

```gherkin
Given the pipeline is configured for variable testing
When generating videos across a batch
Then it rotates through the approved avatar pool (not the same avatar every time)
And it rotates through the approved voice pool (gender-matched)
And each video's metadata records:
  | field | example |
  | avatar_id | Daisy-inskirt-20220818 |
  | voice_id | 1bd001e7e50f421d891986aad5158bc8 |
  | voice_name | Sara |
  | duration_sec | 24 |
  | format | ugc-avatar |
  | provider | heygen |
And this metadata is passed as tags when scheduling via Zernio
```

---

## API Reference

### Authentication
```
Header: X-Api-Key: {HEYGEN_API_KEY}
```

### Generate Video (Standard v2)
```
POST https://api.heygen.com/v2/video/generate
Content-Type: application/json

{
  "video_inputs": [{
    "character": {
      "type": "avatar",
      "avatar_id": "Daisy-inskirt-20220818",
      "avatar_style": "normal"
    },
    "voice": {
      "type": "text",
      "voice_id": "1bd001e7e50f421d891986aad5158bc8",
      "input_text": "Your script here..."
    },
    "background": {
      "type": "color",
      "value": "#0a1628"
    }
  }],
  "dimension": { "width": 1080, "height": 1920 }
}

Response: { "data": { "video_id": "..." } }
```

### Poll Video Status
```
GET https://api.heygen.com/v1/video_status.get?video_id={video_id}

Response: {
  "data": {
    "status": "completed",
    "video_url": "https://...",
    "duration": 24.5,
    "gif_url": "https://...",
    "thumbnail_url": "https://..."
  }
}
```

### List Avatars
```
GET https://api.heygen.com/v2/avatars

Returns ~1,287 avatars with: avatar_id, avatar_name, gender, preview_image_url
```

### List Voices
```
GET https://api.heygen.com/v2/voices

Returns voices with: voice_id, name, language, gender, preview_audio
```

---

## Provider Integration Points

### Where HeyGen fits in projects.json

```json
"video_gen": {
  "providers": ["pipeline", "heygen"],
  "default_provider": "pipeline",
  "heygen": {
    "api_key_env": "HEYGEN_API_KEY",
    "default_background": "#0a1628",
    "poll_interval_ms": 30000,
    "timeout_ms": 300000,
    "avatar_pool": [],
    "voice_pool": []
  }
}
```

HeyGen is NOT a drop-in replacement for TTS or image gen — it replaces the **entire video pipeline** (TTS + images + Remotion) with a single API call.

### Pipeline selection logic

```
content-engine decides format:
  if format === "ugc-avatar":
    → HeyGen provider (script in, MP4 out)
  else:
    → Standard pipeline (TTS → images → Remotion → MP4 out)
```

### Resilience

Follows the same pattern as other providers (`shared-references/provider-resilience.md`):
- Retry: 3 attempts with exponential backoff (30s, 90s, 270s — longer because HeyGen is slow)
- Fallback: If HeyGen fails, fall back to standard pipeline for that video
- Timeout: 5 minutes for standard v2, 20 minutes for video agent
- Error classification: Same rules (429/500/503 retryable, 400/401/403 not)

---

## POC Results (2026-03-18)

### What we tested
- Generated 15 videos (5 baby, 5 money, 5 AI) via standard v2 API
- Uploaded to Cloudinary, scheduled via Zernio across Mar 19-23
- Tagged with `heygen`, `avatar-test`, `format:ugc` for analytics comparison

### Timing
- Standard v2: ~2-3 minutes per video
- Video Agent: ~10-15 minutes per video (but higher quality)
- Batch of 5 (parallel): ~3-5 minutes total

### Quality observations
- Video Agent output was excellent (creative backgrounds, good pacing)
- Standard v2 with solid background is functional but visually flat
- Caption sync issues: HeyGen's built-in captions front-ran the audio
- Voice-avatar mismatch: One video had white avatar with thick Indian accent

### Key learnings
1. **Gender-match is mandatory** — must filter voices by avatar gender
2. **Batch parallel is the way** — submit all, then poll all
3. **Standard v2 for pipeline** — predictable, fast enough at 2-3 min
4. **Video Agent for hero content** — too slow for daily pipeline, great for occasional premium content
5. **HeyGen replaces the whole pipeline** — not just TTS, not just images, the whole thing
6. **Green screen doesn't work** — videos got stuck at 0% processing, use solid color background instead

### Videos generated

| Channel | Video | Duration | Avatar | Voice |
|---------|-------|----------|--------|-------|
| baby | fingerprints | 24s | varied | varied |
| baby | language-sounds | 26s | varied | varied |
| baby | sleep-dreams | 28s | varied | varied |
| baby | strength | 22s | varied | varied |
| baby | taste-womb | 24s | varied | varied |
| money | atm-fees | 25s | varied | varied |
| money | credit-score-myth | 29s | varied | varied |
| money | dollar-bill-lifespan | 22s | varied | varied |
| money | penny-cost | 21s | varied | varied |
| money | subscription-creep | 21s | varied | varied |
| ai | art-speed | 19s | varied | varied |
| ai | code-generation | 35s | varied | varied |
| ai | deepfake-detection | 28s | varied | varied |
| ai | gpt-training-cost | 20s | varied | varied |
| ai | reads-faster | 25s | varied | varied |

### Scheduling

All 15 scheduled on Zernio (Mar 19-23), one per channel per day, rotating across TikTok/YouTube/Instagram. Analytics tags applied for format comparison.

---

## Implementation Plan (when ready to wire in)

### 1. Add HeyGen config to projects.json
Add `video_gen` section with avatar/voice pools and HeyGen settings.

### 2. Create heygen-provider script template
A standalone TypeScript script that:
- Accepts a manifest (fact text, channel, theme)
- Selects avatar + voice (gender-matched, rotated)
- Calls v2/video/generate
- Polls for completion
- Downloads MP4
- Returns path to completed video

### 3. Update content-engine orchestration
Add format selection: when `format: ugc-avatar` is set for a video slot, route to HeyGen provider instead of the TTS → image → Remotion pipeline.

### 4. Update Zernio scheduling
Tag HeyGen videos with provider metadata for analytics comparison.

### 5. Analytics comparison
After 2 weeks of data, compare HeyGen UGC format vs standard pipeline on:
- View count
- Watch time / retention
- Engagement rate (likes, comments, shares)
- Cost per video

---

## Learnings

_(To be filled after analytics data comes in from the 15 scheduled test videos)_
