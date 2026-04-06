---
name: content-engine
description: Plan and execute a full content calendar across social media platforms. Use this skill when the user wants to create a content strategy, build a content calendar, batch-create posts/videos/images, or automate their social media. Trigger when the user says "content calendar", "content plan", "plan my content", "run my social media", "create a week of content", "batch schedule", "content engine", "autonomous content", "go make content", or wants to plan and produce multiple pieces of content at scale.
---

# Content Engine

Plan, create, and schedule a full content calendar across social media platforms. This skill orchestrates other skills (video creation, image generation, etc.) and handles the end-to-end pipeline from brand analysis to scheduled posts.

## How This Works

You are the orchestrator. You do NOT create content directly. Instead, you:

1. **Analyze** the brand/product to understand what content to create
2. **Plan** a content calendar with specific posts, platforms, and timing
3. **Invoke** creation skills (remotion-video, image-gen, etc.) in orchestrated mode
4. **Upload** created assets to Cloudinary for public URLs
5. **Schedule** everything through Buffer or Zernio via the social-media skill

The user tells you about their brand and goals. You build and execute the plan.

---

## Project Registry (Multi-Project Support)

**Before doing anything else**, read the project registry to determine which project/brand you're creating content for.

### Step 0: Resolve Active Project

1. **Read `projects.json`** from the DonatoSkills root directory (`~/DonatoSkills/projects.json`)
2. **Read `shared-references/project-registry.md`** for the full resolution logic
3. **Resolve the active project** using this priority:
   - **CWD match** — Current directory is inside a project's `specs_path` → auto-select (most common — zero friction)
   - **Explicit** — User said "for [project name]" → match against project names/slugs
   - **Single project** — Only one project in registry → use it automatically
   - **Ask** — Multiple projects, can't auto-detect → "Which project is this for? I see: [list]"

4. **Once resolved, use the project's configuration for EVERYTHING:**
   - **Buffer API key**: `process.env[project.buffer.api_key_env]`
   - **Channels**: Only plan content for channels in the project's `buffer.channels`
   - **Cloudinary**: Use `project.cloudinary.*_env` for media upload credentials
   - **Brand context**: Read from `project.specs_path` or `project.brand_brief`
   - **Defaults**: Pre-fill tone, pillars, and frequency from `project.defaults`

5. **Include `project_id`** in every `calendar.json` and pass it to all orchestrated skill invocations

### Why This Matters for Content-Engine

As the orchestrator, you set the project context for all downstream skills. When you invoke remotion-video, image-gen, text-writer, or social-media in orchestrated mode, **include the project_id** so those skills load the correct brand context and API keys without asking.

---

## Prerequisites

### Required API Keys

All keys should be in the project `.env` / `.env.local` file. The **env var names come from the active project's configuration** in `projects.json`:

| Key (default) | Service | Purpose | Project Config Field |
|-----|---------|---------|---------------------|
| `BUFFER_API_KEY` | Buffer | Social media scheduling (GraphQL) | `buffer.api_key_env` |
| `ZERNIO_API_KEY` | Zernio | Social media scheduling (REST) | `zernio.api_key_env` |
| `GROK_API_KEY` | Grok (xAI) | Video voiceover TTS (default provider) | `tts.grok.api_key_env` |
| `GEMINI_API_KEY` | Google Gemini | Image generation (default) + Gemini TTS (alternative) | `tts.gemini.api_key_env` / `image_gen.gemini.api_key_env` |
| `OPENAI_API_KEY` | OpenAI | Image generation (alternative) | `image_gen.openai.api_key_env` |
| `ELEVENLABS_API_KEY` | ElevenLabs | Premium TTS provider (optional) | `tts.elevenlabs.api_key_env` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary | Media hosting | `cloudinary.cloud_name_env` |
| `CLOUDINARY_API_KEY` | Cloudinary | Media hosting | `cloudinary.api_key_env` |
| `CLOUDINARY_API_SECRET` | Cloudinary | Media hosting | `cloudinary.api_secret_env` |

Only one scheduling backend is required (Buffer OR Zernio). If both are configured, the social-media skill prefers Zernio by default.

If any key is missing, tell the user which ones are needed and how to get them. Reference the project name so they know which account to configure.

### Channels / Accounts

**Buffer**: The project registry (`projects.json`) contains channel IDs in `buffer.channels`. Use those directly. Only query Buffer to verify or discover channels.

**Zernio**: The project registry contains account IDs in `zernio.accounts`. If empty, query `GET https://zernio.com/api/v1/accounts` and offer to save to `projects.json`.

---

## Interactive Question Flow

### Step 1: Absorb Context (silent — no questions)

Before asking the user anything, silently read whatever project context exists. **The active project (resolved in Step 0) provides the starting point for all context.**

**From the active project (`projects.json`):**

1. **`project.defaults`** -- Pre-filled tone, content pillars, and posting frequency. These are your starting defaults — the user can override.
2. **`project.buffer.channels`** -- Which platforms/channels to plan for. Don't ask "where should I post?" if the project already defines channels.
3. **`project.brand_brief`** -- If set, read this for brand analysis (skip the brand analysis step).

**Brand & Audience (from project's specs_path):**

4. **`.specs/vision.md`** -- What the product is, who it's for, its personality and positioning. This shapes the *content and tone* of all posts.

5. **`.specs/personas/*.md`** -- Who the target users are. Personas contain vocabulary, patience level, and frustrations.

6. **`.specs/design-system/tokens.md`** -- Brand colors, typography, visual style. These inform video styles, image aesthetics, and overall visual consistency.

**Non-SDD projects (no specs_path):**
- Read `README.md`, landing page copy, or any product description
- Check for brand guidelines, style guides, or marketing docs

**Always check:**

7. **Existing calendars** -- check `content-engine/calendars/` for active campaigns belonging to this project (match by `project_id` in calendar.json)
8. **Previous conversation** -- if the user just described their product, you already know it

**Use everything you find** to pre-fill answers to the questions below. The more you absorb silently, the fewer questions you need to ask. If the project registry + vision + personas give you brand, audience, tone, channels, and content pillars, you may only need to ask about timeframe, frequency, and mode.

### Step 2: Ask Questions

Group these conversationally. Skip what you already know.

1. **Brand/Product** -- Skip if the active project has a `brand_brief` or `specs_path` — you already know the brand. Otherwise: "What's the brand or product? (URL, description, or should I read your project?)"
   - If given a URL, analyze the landing page for: value prop, target audience, tone, visual style, key features
   - If given a description, extract the same
   - If the project has `.specs/vision.md`, read it

2. **Channels** -- Read from the active project's `buffer.channels`. If channels exist: "I see [project name] has [X, Y, Z] set up. Want to post to all of them, or a subset?" If no channels in the registry: query Buffer and ask the user to pick channels, then offer to save them to `projects.json`.

3. **Timeframe** -- "How far out should I plan? (1 week, 2 weeks, 1 month)"

4. **Frequency** -- "How often per platform? (e.g., daily on Twitter, 3x/week on Instagram)"

5. **Content Mix** -- "What types of content? Options:
   - **Videos** (short-form reels, explainers, product demos)
   - **Images** (graphics, quotes, product shots) -- *coming soon*
   - **Text posts** (threads, hot takes, tips)
   - **Mix of everything** (I'll balance it)"

6. **Content Pillars** -- "What themes should I rotate through? Common ones:
   - Product/feature highlights
   - Educational/tips
   - Behind the scenes
   - Social proof/testimonials
   - Entertainment/personality
   - Industry trends
   Or tell me your own."

7. **Tone** -- "What's the vibe? (professional, casual, funny, provocative, inspirational)"

8. **Mode** -- "How do you want to run this?
   - **Interactive** -- I'll show you each piece and get approval
   - **Autonomous** -- I'll create and schedule everything, you review after
   - **Plan only** -- just generate the calendar, don't create anything yet"

### Step 2b: Check for Analytics Briefs (before generating calendar)

Before generating a calendar from scratch, check if the analytics-loop has produced briefs:

```
analytics-loop/data/{project}/{date}/briefs/all-briefs.json
```

Check today's date and yesterday's date. If a briefs file exists:

> "I found analytics-generated briefs from [date] with [N] optimized content suggestions. These are based on engagement data from your recent posts. Want to use brief-driven mode, or plan from scratch?"

**If brief-driven mode is selected**, skip to the Brief-Driven Mode section below.

### Step 2c: Dedup Check (required)

Before generating any calendar, **read `content-engine/used-topics.md`** and check all existing topics for the relevant channel(s). Never generate content for a topic that already has a video. After the calendar is finalized and content created, **append new topics** to `used-topics.md`.

### Step 3: Generate Calendar

After gathering answers, generate the content calendar and show it:

```
Content Calendar: [Brand Name] -- [Timeframe]

| # | Date       | Platform   | Type  | Pillar      | Concept                              | Status  |
|---|------------|------------|-------|-------------|--------------------------------------|---------|
| 1 | 2026-03-17 | Twitter/X  | Video | Product     | 15s product demo with voiceover      | Pending |
| 2 | 2026-03-17 | Instagram  | Video | Product     | Same demo adapted for Reels (9:16)   | Pending |
| 3 | 2026-03-18 | Twitter/X  | Text  | Education   | Thread: 5 tips for [topic]           | Pending |
| 4 | 2026-03-19 | Instagram  | Video | Personality | Funny take on [trend]                | Pending |
| 5 | 2026-03-19 | LinkedIn   | Text  | Thought     | Lessons learned from building [X]    | Pending |
```

Ask: "Here's the content calendar. Want to adjust anything, or should I start creating?"

---

## Content Calendar Persistence

Calendars are stored as JSON in `content-engine/calendars/<campaign-slug>/calendar.json`.

**Always include `project_id`** in the calendar JSON so calendars are scoped to projects. This enables per-project analytics, resume, and history.

See `references/calendar-schema.md` for the full schema.

**Status lifecycle per item:**
```
pending → creating → created → uploading → uploaded → scheduling → scheduled → posted
                                                                              → failed (at any step)
```

After generating the calendar, write it to `calendar.json`. Update status after each step. This enables:
- **Resume from failure** -- if execution stops, pick up where you left off
- **Progress tracking** -- show the user what's done and what's left
- **History** -- past calendars live in their own directories

Also generate a human-readable `calendar.md` from the JSON after each update.

---

## Execution Pipeline

For each calendar item, run this pipeline:

### 1. Create Content

Determine which skill to invoke based on the item's `type`:

| Content Type | Skill | Orchestrated Invocation |
|-------------|-------|------------------------|
| `video` | `remotion-video` | Invoke with all params pre-specified (platform, content, style, duration, voiceover). The skill will skip its interactive Q&A and build directly. |
| `image` | `image-gen` | Invoke with concept, platform, style, text overlay. The skill will skip its interactive Q&A and generate directly. |
| `text` | `text-writer` | Invoke with platform, topic, tone, format. The skill will skip its interactive Q&A and write directly. Saves to `text-posts/<campaign-slug>/posts.md`. |

**Invoking a creation skill in orchestrated mode:**

**Before creating any content**, read these shared references:

1. **`shared-references/hook-writing.md`** — Hook best practices per platform
2. **`shared-references/platform-specs.md`** — Dimensions, durations, character limits, file size limits per platform. Use this to set correct params when invoking creation skills.
3. **`shared-references/caption-writing.md`** — Caption structure formulas, CTA patterns, hashtag strategies per platform. Use this when writing captions for scheduled posts.
4. **`shared-references/content-pillars.md`** — Pillar frameworks, rotation strategies, and cadence recommendations. Use this when generating the content calendar to ensure proper pillar distribution and posting frequency.
5. **`shared-references/analytics-schema.md`** — Full taxonomy of template variables and valid values for video content. Use this when tagging calendar items with `variables` and when mapping brief-driven template variables to creation skill params.

When invoking `remotion-video`, provide ALL of these in your prompt so it skips questions:
- Platform and dimensions
- Content/message (what the video says)
- Visual mode: text-only | ai-generated | user-provided
- Visual style (colors, vibe, animation style)
- Duration
- Voiceover: yes/no, and if yes: the script, TTS provider (grok, gemini, or elevenlabs), and voice name
- Output path
- **Cache params** (when visual mode is ai-generated): `cache_channel` and `cache_tags`

Example orchestrated invocation:
> "Use the remotion-video skill to create a video. ORCHESTRATED MODE -- all parameters provided, skip questions and build directly.
> - Project: [project_id from projects.json]
> - Platform: Twitter/X (1080x1080, 30fps)
> - Message: [the concept from the calendar]
> - Visual Mode: text-only *(or "ai-generated" for Nano Banana scene images)*
> - Style: [brand style]
> - Duration: 15 seconds
> - Voiceover: AI voiceover, TTS Provider: grok, Voice: alloy, Script: [the script]
> - Cache Channel: [project_id, e.g. "baby-facts-unlocked"] *(only for ai-generated visual mode)*
> - Cache Tags: [semantic tags from the visual concept, e.g. "baby", "sleeping", "nursery"] *(only for ai-generated visual mode)*
> - Output: [absolute-path]/content-engine/calendars/[campaign-slug]/videos/001-[name]/"

When invoking `image-gen`, provide ALL of these:
- Concept (what the image shows)
- Platform and dimensions
- Style (photorealistic, flat, abstract, etc.)
- Text overlay (if any, with exact text and font style)
- Output path
- **Cache params** (for background images): `cache_channel` and `cache_tags`

Example orchestrated invocation:
> "Use the image-gen skill to create an image. ORCHESTRATED MODE -- all parameters provided, skip questions and generate directly.
> - Project: [project_id from projects.json]
> - Concept: [the concept from the calendar]
> - Platform: Instagram (1080x1080, 1:1)
> - Style: [brand style]
> - Text: '[hook text]' in bold white sans-serif, centered
> - Cache Channel: [project_id, e.g. "baby-facts-unlocked"]
> - Cache Tags: [semantic tags derived from concept, e.g. "baby", "sleeping", "nursery", "peaceful"]
> - Output: [absolute-path]/content-engine/calendars/[campaign-slug]/images/[item-id]-[name]/"

When invoking `text-writer`, provide ALL of these:
- Platform
- Topic/message
- Tone
- Format (single post, thread, hot take)
- Job name (campaign slug)

Example orchestrated invocation:
> "Use the text-writer skill to write a post. ORCHESTRATED MODE -- all parameters provided, skip questions and write directly.
> - Project: [project_id from projects.json]
> - Platform: Twitter/X
> - Topic: [the concept from the calendar]
> - Tone: [brand tone]
> - Format: single post
> - Job: [campaign-slug]"

Update calendar item status to `creating` before, `created` after (with `asset_path`).

### 2. Upload to R2

After content is created locally, upload to Cloudflare R2:

```bash
# Upload video and capture the public URL
ASSET_URL=$(node DonatoSkills/content-engine/scripts/r2-upload.js path/to/video.mp4)
```

The script auto-generates a destination key (`videos/<YYYY-MM-DD>/<basename>`) if none is provided.
Supply an explicit key for predictable URLs:

```bash
ASSET_URL=$(node DonatoSkills/content-engine/scripts/r2-upload.js \
  path/to/video.mp4 \
  videos/2026-04-06/001-fetal-heartbeat-starts.mp4)
```

Update calendar item `asset_url` with the returned URL and set status to `uploaded`.

See `references/r2-upload.md` for full usage, env vars, and examples.

### 2.5. Disk Cleanup (required after every upload)

**Immediately after a successful upload**, delete the local MP4/image to prevent disk accumulation across multiple videos:

```bash
# Confirm upload succeeded (non-empty URL), then delete
if [ -n "$ASSET_URL" ]; then
  rm path/to/video.mp4
  # Also purge Remotion's Chrome Headless Shell cache
  rm -rf /var/folders/*/*/T/remotion* 2>/dev/null || true
fi
```

**Why this matters**: Each rendered MP4 is ~20–80MB. Remotion downloads a ~150MB Chrome binary on first render and caches it in `/tmp`. Without cleanup, 9 videos fill the available sandbox disk (~2.6GB free) and block subsequent renders.

**Rules**:
- Never delete before confirming upload (non-empty `ASSET_URL`)
- Delete only the rendered output (`out/video.mp4`), not the project source files
- The Remotion Chrome cache purge is safe — it re-downloads on next render if needed

### 3. Schedule via Buffer or Zernio

Use whichever scheduling backend the active project is configured for. If both `buffer` and `zernio` are configured, prefer Zernio.

**Buffer (GraphQL):**

```graphql
mutation {
  createPost(input: {
    channelId: "CHANNEL_ID"
    text: "Caption with #hashtags"
    schedulingType: automatic
    mode: customScheduled
    dueAt: "2026-03-17T14:00:00Z"
    assets: {
      videos: [{ url: "https://res.cloudinary.com/..." }]
    }
    aiAssisted: true
    source: "content-engine-skill"
  }) {
    ... on CreatePostPayload {
      post { id status scheduledAt }
    }
    ... on MutationError { message }
  }
}
```

**Important**: Use inline variables for mutations (not the `variables` JSON field). Buffer returns `Bad Request` with parameterized mutation variables.

**Zernio (REST):**

```bash
curl -s -X POST https://zernio.com/api/v1/posts \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Caption with #hashtags",
    "platforms": [{ "platform": "twitter", "accountId": "ACCOUNT_ID" }],
    "scheduledFor": "2026-03-17T14:00:00Z",
    "timezone": "America/New_York",
    "mediaItems": [{ "url": "https://res.cloudinary.com/...", "type": "video" }]
  }'
```

**Zernio advantages**: Multi-platform in one request via `platforms[]`, per-platform captions via `customContent`, and dry-run validation via `POST /v1/validate/validate-post`.

Update calendar item status to `scheduled` with `buffer_post_id` or `zernio_post_id`.

**CRITICAL — One API call per calendar item.** Each calendar item produces exactly ONE `POST /v1/posts` call to Zernio (or one Buffer mutation). Do NOT make a separate API call for the `concept` field — `concept` is an internal planning description, not post content. The `content` field in the Zernio API body must always be the full `caption` from the calendar item (hook + body + hashtags). Never post the `concept` or a truncated version of the caption as a separate scheduled post.

### 4. Log & Continue

After each item is processed, update `calendar.json` and regenerate `calendar.md`. Show a brief progress line:

> Item 3/12: Twitter text post scheduled for Mar 18 at 2pm EST

Then move to the next item.

### 5. Image Cache Report (end of batch)

After all items are processed, if any images were generated or served from cache, print a cache report. Track hits and misses during the run, then use `generateCacheReport()`:

```javascript
const { generateCacheReport } = require("../image-cache/scripts/image-cache");

// Accumulate during the run:
// stats[channel] = { generated: N, cached: N, cacheSize: N }
const report = generateCacheReport(stats);
console.log(report);
```

Example output:
```
IMAGE CACHE REPORT:
  baby-facts-unlocked: 6 generated, 3 cached → 33% cache hit rate
  money-facts-unlocked: 3 generated, 0 cached → 0% cache hit rate
  Total API calls saved: 3 (25% reduction)
  Cache size: baby=47 images, money=12 images
```

Include this in the autonomous mode final summary alongside the existing "Created: X videos, Y text posts" stats.

---

## Brief-Driven Mode (Analytics Loop Integration)

When the analytics-loop skill has generated briefs, the content-engine can operate in **brief-driven mode** — using data-driven templates instead of planning from scratch.

### How It Works

1. **Check for briefs** at `analytics-loop/data/{project}/{date}/briefs/all-briefs.json`
2. **Read the briefs file** — each brief specifies a channel, template variables, slot type (exploit/explore), and topic guidance
3. **Generate calendar items** from briefs:
   - Set `variables` on each item from the brief's `template` object
   - Set `brief_id` linking back to the source brief
   - Use `topic_guidance` from the brief to inform the content concept
   - Use `schedule_time` from the brief (or fall back to project defaults)
4. **Pass template variables to creation skills**:
   - When invoking `remotion-video` in orchestrated mode, include the template variables so the video matches the winning format
   - Map `hook_type` → script structure, `video_length` → duration, `voice_pace` → TTS speed, etc.
5. **Tag every post** with its variable combination in the calendar JSON — this closes the loop for future scoring

### Orchestrated Invocation with Template Variables

When invoking remotion-video from a brief:

```
Use the remotion-video skill to create a video. ORCHESTRATED MODE — all parameters provided.

- Project: [project_id from projects.json]
- Platform: TikTok (1080x1920, 30fps)
- Message: [concept from brief's topic_guidance]
- Visual Mode: [mapped from background_type]
- Style: [brand style]
- Duration: [from video_length variable] seconds
- Voiceover: AI voiceover, TTS Provider: [project default], Voice: [project default]
- Voice Pace: [from voice_pace variable]
- Hook Type: [from hook_type variable — structure the opening accordingly]
- Text Overlay Style: [from text_overlay variable]
- Music Energy: [from music_energy variable]
- CTA Style: [from cta_style variable]
- Cache Channel: [project_id] *(when Visual Mode is ai-generated)*
- Cache Tags: [semantic tags from the visual concept]
- Output: videos/[campaign-slug]/item-[NNN]/
```

### When No Briefs Exist

Fall back to the standard calendar-from-scratch flow (Steps 1-3 of the Interactive Question Flow).

### Variable Tagging (All Modes)

**Even when not using brief-driven mode**, the content-engine should tag calendar items with `variables` when creating video content. This ensures the analytics-loop can score and decompose all content, not just brief-driven content.

When generating a calendar item of type `video`, include:

```json
{
  "variables": {
    "hook_type": "stat_lead",
    "video_length": "30",
    "voice_pace": "fast",
    "text_overlay": "full_captions",
    "background_type": "abstract_animated",
    "music_energy": "upbeat",
    "cta_style": "follow_cta"
  }
}
```

The variable values should match the structural choices made when planning the content. See `shared-references/analytics-schema.md` for the full taxonomy and valid values.

---

## Skill Registry

Available content creation skills and their interfaces:

| Skill | Produces | Required Params | Optional Params |
|-------|----------|-----------------|-----------------|
| `remotion-video` | `.mp4` video | platform, message, visual_mode, style, duration | voiceover (script + voice), tts_provider (grok/gemini/elevenlabs), music, template variables |
| `image-gen` | `.png` image | concept, platform, style | text overlay, provider (gemini/openai), model (gemini: flash/pro, openai: gpt-image-1/gpt-image-1-mini), quantity, cache_channel, cache_tags |
| `text-writer` | Text post (saved to file) | platform, topic, tone | format, CTA, hashtags |
| `social-media` | Scheduled post | channel_id, text, timing | assets, hashtags, metadata |
| `analytics-loop` | `briefs.json` | project_id | date_range, platform_filter |

See `references/skill-registry.md` for detailed interface specs.

When a new skill is added to the project, add it to this table and create an entry in `references/skill-registry.md`.

---

## Caption Generation

When creating captions for scheduled posts, follow these rules:

### Structure
1. **Hook** -- first line grabs attention (question, bold claim, surprising stat)
2. **Body** -- deliver the value (scannable, not a wall of text)
3. **CTA** -- tell them what to do

### Platform Adaptation
Adapt captions per platform -- don't copy-paste:

| Platform | Tone | Max Length | Hashtags |
|----------|------|-----------|----------|
| Twitter/X | witty, concise | 280 chars | 1-2 |
| Instagram | polished, aspirational | 2200 chars (hook in first 125) | 5-15 |
| TikTok | raw, casual, funny | 300 chars | 3-5 |
| LinkedIn | professional, insightful | 1248 chars (practical limit for media posts; 3000 theoretical) | 3-5 |
| Threads | personal, conversational | 500 chars | 0-2 |
| Bluesky | casual, techy | 300 chars | 0-1 |

**Caption length validation**: Before scheduling any post, verify the caption length against the platform's practical limit. If a caption exceeds the limit, auto-trim while preserving the hook and CTA, or flag for manual review. LinkedIn's 1248-character limit for posts with media is especially easy to exceed.

### Cross-Platform Repurposing
One piece of content becomes multiple platform-optimized posts:
- Same video, different caption per platform
- Pull the best quote as a standalone text post
- Longer breakdown for LinkedIn, punchy hook for Twitter

---

## Autonomous Mode

When the user says "just run" or chooses autonomous mode:

1. Generate the full calendar
2. Get **one upfront approval** of the calendar
3. Process every item end-to-end without further prompts
4. Log progress to `content-engine/calendars/<slug>/run.log`
5. Show a final summary when done:

```
Content Engine Run Complete

Created: 8 videos, 4 text posts
Uploaded: 8 assets to Cloudinary
Scheduled: 12 posts across 3 platforms
Failed: 0

Next scheduled post: Mar 17 at 9am EST (Twitter/X)
```

### Error Handling in Autonomous Mode
- If a creation skill fails, log the error, mark the item as `failed`, and continue to the next item
- If Cloudinary upload fails, retry once, then mark as `failed` and continue
- If Buffer scheduling fails, log the error with the mutation response, mark as `failed`, continue
- At the end, report all failures so the user can address them

---

## Orchestration Rules (Learned from Production)

### Use Absolute Paths for All Asset Outputs

When invoking creation skills, always use **fully resolved absolute paths** for output directories. Do NOT use relative paths — they cause assets to be created inside wrong directories (e.g., a video project nested inside another video project).

**Canonical paths:**
- Videos: `<project-root>/content-engine/calendars/<campaign-slug>/videos/<item-id>-<name>/`
- Images: `<project-root>/content-engine/calendars/<campaign-slug>/images/<item-id>-<name>/`
- Text: `<project-root>/content-engine/calendars/<campaign-slug>/text-posts/posts.md`

Store `asset_path` in `calendar.json` relative to the campaign directory so downstream scripts (upload, scheduling) know exactly where to find files.

### Sequential Voiceover Generation

When multiple videos in a calendar need AI voiceover, create them **one at a time** (not in parallel). Both Grok and Gemini TTS have rate limits. Running 3+ videos with voiceover in parallel will hit 429 errors. Default TTS provider is Grok (`GROK_API_KEY`); fall back to Gemini if only `GEMINI_API_KEY` is available.

### Environment Variable Loading

Scripts that call external APIs (Gemini, Cloudinary) need env vars exported to subprocesses. `source .env` does NOT export to subprocesses. Use this pattern:

```bash
# In shell scripts — set -a makes all variables auto-export (handles spaces/quotes safely)
set -a
source /path/to/.env
set +a
```

```typescript
// In TypeScript scripts — requires `npm i dotenv` in the project
import { config } from "dotenv";
config({ path: "/path/to/.env" });
```

Or ensure `render.sh` / generation scripts use `npx tsx --no-cache` with env vars already exported.

### Auto-Prompt for Missing Projects

When resolving the active project from `projects.json` and the project is NOT found:
1. Do NOT silently fail or skip project resolution
2. Tell the user: "I don't see [project name] in the project registry. Want me to add it? I'll need: Buffer channel IDs, Cloudinary credentials, and brand context."
3. Offer to query Buffer for available channels and auto-create the registry entry
4. After gathering config, write the entry to `projects.json` and continue

### Always Use `npx tsx --no-cache`

All `npx tsx` invocations must use the `--no-cache` flag. Without it, tsx may serve stale transpiled output that doesn't reflect the latest source changes, causing bugs that are invisible in the source code.

---

## Recurring Mode (Scheduled Tasks)

For ongoing content creation, use Claude Code's scheduled tasks:

1. User says "run my content every week"
2. Generate the first week's calendar and execute it
3. Create a scheduled task:

```
Task: Weekly content creation for [Brand]
Schedule: Every Monday at 9am
Prompt: |
  You are the content engine for [Brand].
  Read the campaign at content-engine/calendars/[slug]/calendar.json.
  Check Buffer for which posts from last week went out successfully.
  Generate next week's calendar items based on the brand brief and content pillars.
  Create all content, upload to Cloudinary, and schedule through Buffer.
  Update calendar.json with results.

  Brand: [inline brand brief]
  Channels: [channel IDs and names]
  Content pillars: [pillars]
  Frequency: [per-platform frequency]
  Tone: [tone/style]
```

This spawns a fresh Claude session each week that reads existing state, plans new content, and executes.

---

## Resume from Failure

If execution was interrupted or items failed:

1. Read `content-engine/calendars/<slug>/calendar.json`
2. Find items with status other than `scheduled` or `posted`
3. Resume from where each item left off:
   - `pending` or `creating` → start creation
   - `created` → upload to Cloudinary
   - `uploaded` or `uploading` → schedule via Buffer
   - `failed` → retry from the failed step
4. Show: "Resuming calendar: 5/12 items already scheduled, picking up from item 6."

---

## Brand Analysis

When analyzing a brand/product (from URL, description, or project context), extract:

1. **Value proposition** -- what does it do, who is it for
2. **Target audience** -- demographics, interests, pain points
3. **Tone of voice** -- how does the brand speak (casual, professional, edgy, warm)
4. **Visual identity** -- colors, style, imagery preferences
5. **Key messages** -- what should content consistently reinforce
6. **Competitors** -- who else is in this space (informs differentiation)
7. **Content opportunities** -- what topics/angles will resonate with the audience

Store this as `content-engine/calendars/<slug>/brand-brief.md` for reference during creation.

See `references/brand-analysis.md` for detailed analysis methodology.
