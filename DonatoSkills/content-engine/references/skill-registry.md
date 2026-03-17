# Skill Registry -- Detailed Interfaces

This file documents the interface for each content creation skill the content-engine can orchestrate.

## Project Context in Orchestrated Mode

**All orchestrated invocations should include `project_id`** so downstream skills load the correct brand context and API keys without asking the user.

Add this line to every orchestrated invocation template:
```
- Project: [project_id from projects.json]
```

The downstream skill will:
1. Read `projects.json` and find the matching project
2. Load brand context from `specs_path` or `brand_brief`
3. Use the project's API keys and channel IDs
4. Apply project defaults for tone, pillars, etc.

---

## remotion-video

**Produces**: `.mp4` video file
**Skill location**: `/remotion-video/SKILL.md`
**Output location**: `videos/<campaign-slug>/item-<NNN>/out/video.mp4` (standalone) or `content-engine/calendars/<campaign-slug>/videos/<item-id>/out/video.mp4` (orchestrated)

### Required Parameters (for orchestrated mode)

| Parameter | Description | Example |
|-----------|-------------|---------|
| platform | Target platform + dimensions | "Twitter/X (1080x1080, 30fps)" |
| message | What the video communicates | "5 reasons to try ZenBrew matcha" |
| style | Visual style and vibe | "minimal, dark background, green accents, pop-in animations" |
| duration | Target length in seconds | "15 seconds" |

### Optional Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| voiceover | AI voiceover with script | "AI voiceover, script: 'Tired of jittery coffee?...'" |
| tts_provider | TTS provider to use | "grok" (default), "gemini", "elevenlabs" |
| voice | TTS voice name | Grok: "alloy", "onyx", "nova"; Gemini: "Kore", "Puck"; ElevenLabs: "Adam", "Rachel" |
| visual_mode | How visuals are created | "text-only", "ai-generated", "user-provided" |
| music | Background music | Not yet supported |
| output_path | Custom output directory | "videos/zenbrew-launch/item-001/" |

### Orchestrated Invocation Template

```
Use the remotion-video skill to create a video. ORCHESTRATED MODE -- all parameters provided, skip questions and build directly.

- Project: [project_id from projects.json]
- Platform: [platform] ([width]x[height], [fps]fps)
- Message: [what the video says/shows]
- Visual Mode: [text-only / ai-generated / user-provided]
- Style: [visual style description]
- Duration: [N] seconds
- Voiceover: [AI voiceover with script / none]
- TTS Provider: [grok / gemini / elevenlabs] (default: read from project tts.default_provider)
- Voice: [voice name if voiceover]
- Output: videos/[campaign-slug]/item-[NNN]/
```

### Output

After rendering, the skill produces:
- `out/video.mp4` -- the rendered video
- Audio files in `public/audio/` (if voiceover)
- `public/audio/manifest.json` (audio timing metadata)

---

## social-media

**Produces**: Scheduled post (via Buffer or Zernio)
**Skill location**: `/social-media/SKILL.md`

### Required Parameters (for orchestrated mode)

| Parameter | Description | Example |
|-----------|-------------|---------|
| channel_id / account_id | Buffer channel ID or Zernio account ID | "67d5f3a..." or "acc_xyz" |
| text | Post caption with hashtags | "Vibe coding is the future #coding #ai" |
| timing | When to post | "2026-03-17T14:00:00Z" or "queue" or "now" |

### Optional Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| asset_url | Cloudinary URL for media | "https://res.cloudinary.com/..." |
| asset_type | Type of media | "video", "image" |
| platform_metadata | Platform-specific options | `{ instagram: { postType: "reel" } }` |
| scheduler | Force a specific backend | "buffer" or "zernio" (default: auto from project config) |
| platform | Platform name (required for Zernio) | "twitter", "instagram" |

### Orchestrated Invocation Template

**For Buffer:**
```
Use the social-media skill to schedule a post. ORCHESTRATED MODE -- all parameters provided, skip questions and schedule directly.

- Project: [project_id from projects.json]
- Channel: [channel_id] ([platform name])
- Caption: [full caption with hashtags]
- Timing: [ISO datetime / "queue" / "now"]
- Media: [Cloudinary URL] (video/image)
- Platform metadata: [if applicable]
```

**For Zernio:**
```
Use the social-media skill to schedule a post. ORCHESTRATED MODE -- all parameters provided, skip questions and schedule directly.

- Project: [project_id from projects.json]
- Scheduler: zernio
- Account: [account_id] ([platform name])
- Platform: [twitter / instagram / linkedin / etc.]
- Caption: [full caption with hashtags]
- Timing: [ISO datetime / "queue" / "now"]
- Media: [Cloudinary URL] (video/image)
```

### Output

After scheduling, returns:
- Scheduler used (buffer or zernio)
- Post ID (`buffer_post_id` or `zernio_post_id`)
- Scheduled time
- Post status

---

## image-gen

**Produces**: `.png` image file
**Skill location**: `/image-gen/SKILL.md`
**Output location**: `images/<job-name>/output/<image-name>.png`

### Required Parameters (for orchestrated mode)

| Parameter | Description | Example |
|-----------|-------------|---------|
| concept | What the image shows | "Matcha latte in a cozy setting" |
| platform | Target platform + dimensions | "Instagram (1080x1080, 1:1)" |
| style | Visual style | "photorealistic, warm tones" |

### Optional Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| text_overlay | Text on the image (keep under 25 chars) | "'Dream Big' in bold white sans-serif, centered" |
| provider | Image generation provider | "gemini" (default) or "openai" — read from project image_gen.default_provider |
| model | Model name | Gemini: "gemini-2.5-flash-image" (default) / "gemini-3-pro-image-preview"; OpenAI: "gpt-image-1" (default) / "gpt-image-1-mini" |
| quantity | Number of variations | 1 (default), up to 4 |
| output_path | Custom output directory | "images/zenbrew-march/" |

### Orchestrated Invocation Template

```
Use the image-gen skill to create an image. ORCHESTRATED MODE -- all parameters provided, skip questions and generate directly.

- Project: [project_id from projects.json]
- Provider: [gemini / openai] (read from project image_gen.default_provider)
- Concept: [what the image shows]
- Platform: [platform] ([width]x[height], [ratio])
- Style: [visual style description]
- Text: [exact text in quotes, font style, placement] (or "none")
- Output: images/[campaign-slug]/
```

### Output

After generation, the skill produces:
- `output/<image-name>.png` — the generated image
- Generation script at `scripts/generate-image.ts` (reusable for regeneration)

---

## text-writer

**Produces**: Text post saved to markdown file
**Skill location**: `/text-writer/SKILL.md`
**Output location**: `text-posts/<job-name>/posts.md`

### Required Parameters (for orchestrated mode)

| Parameter | Description | Example |
|-----------|-------------|---------|
| platform | Target platform | "Twitter/X" |
| topic | What the post is about | "Why vibe coding changes everything" |
| tone | Writing style | "funny, casual" |

### Optional Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| format | Post structure | "single post", "thread", "hot take", "tips" |
| cta | Call to action | "follow", "comment", "none" |
| hashtags | Include hashtags | "yes, 1-2" or "none" |
| job_name | Output folder name | "zenbrew-march" |

### Orchestrated Invocation Template

```
Use the text-writer skill to write a post. ORCHESTRATED MODE -- all parameters provided, skip questions and write directly.

- Project: [project_id from projects.json]
- Platform: [platform]
- Topic: [what the post is about]
- Tone: [writing style]
- Format: [single post / thread / hot take / tips]
- Job: [campaign-slug]
```

### Output

After writing, the skill:
- Appends the post to `text-posts/<job-name>/posts.md`
- All posts for a campaign are in ONE file (not scattered)
- Each post has metadata (platform, date, status)

---

## analytics-loop

**Produces**: `briefs.json` (JSON file of optimized content briefs)
**Skill location**: `/analytics-loop/SKILL.md`
**Output location**: `analytics-loop/data/<project>/<date>/briefs/all-briefs.json`

### Required Parameters (for orchestrated mode)

| Parameter | Description | Example |
|-----------|-------------|---------|
| project_id | Project slug from projects.json | "donatos-deals" |

### Optional Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| date_range | Analytics collection period | "last_48h" (default), "last_72h", "2026-03-10 to 2026-03-16" |
| platform_filter | Limit to one platform | "all" (default), "tiktok", "youtube", "instagram" |

### Orchestrated Invocation Template

```
Use the analytics-loop skill to analyze post performance and generate briefs. ORCHESTRATED MODE — all parameters provided.

- Project: [project_id]
- Date range: [last_48h / last_72h / YYYY-MM-DD to YYYY-MM-DD]
- Platform filter: [all / tiktok / youtube / instagram / ...]
```

### Output

After completing all 4 phases, the skill produces:
- `raw-analytics.json` — raw Zernio analytics data
- `scored-posts.json` — posts ranked by engagement density
- `variable-analysis.json` — structural variable decomposition with winning template
- `briefs/all-briefs.json` — optimized briefs (2 exploit + 1 explore per channel)

### Output Signals

```
ANALYTICS_COMPLETE
POSTS_ANALYZED: {count}
BRIEFS_GENERATED: analytics-loop/data/{project}/{date}/briefs/all-briefs.json
```

The content-engine reads the `BRIEFS_GENERATED` path to enter brief-driven mode.
