---
name: setup
description: Set up a new project in DonatoSkills. Use this skill when the user wants to onboard a new brand, connect social accounts, configure API keys, or initialize their content pipeline. Trigger when the user says "set up", "new project", "onboard", "connect accounts", "configure", "get started", "initialize", or "/setup".
---

# Project Setup Wizard

Interactive onboarding for new projects in DonatoSkills. Walks the user through selecting tools, connecting accounts, and configuring their content pipeline.

## When to Use

- First time using DonatoSkills
- Adding a new brand/client
- Reconnecting or changing scheduling backends
- Adding a new platform account to an existing project

---

## Setup Flow

### Step 1: Project Basics

Ask:
1. **Project name** — "What's the brand or project name?"
2. **Description** — "One line about this brand/audience?"
3. **Brand context** — "Do you have a brand brief, vision doc, or specs directory? (path or 'none')"

Generate a slug from the project name (lowercase, hyphens, no special chars).

### Step 2: Scheduling Backend

Present the options:

> "Which scheduling tool(s) do you want to use?
>
> 1. **Buffer** — GraphQL API, solid scheduling, queue management
> 2. **Zernio** — REST API, multi-platform posts in one call, post validation, 14+ platforms
> 3. **Both** — I'll default to Zernio but you can use Buffer anytime
>
> (If you're not sure, Zernio is the newer option with more platforms)"

Based on selection, proceed to the relevant setup steps.

### Step 3a: Buffer Setup (if selected)

1. **Check for API key:**
   ```bash
   # Check .env and .env.local for BUFFER_API_KEY (or project-specific name)
   ```
   - If found: "Found Buffer API key. Let me verify it works..."
   - If missing: "I need a Buffer API key. Get one from https://publish.buffer.com/settings/api and paste it here."

2. **Save the key** to `.env` (or `.env.local` if the user prefers):
   ```
   BUFFER_API_KEY=<their key>
   ```
   For multi-account setups, use a project-specific name: `BUFFER_API_KEY_<SLUG>=<key>`

3. **Discover channels:**
   ```bash
   # Get org ID
   curl -s -X POST https://api.buffer.com \
     -H "Authorization: Bearer $BUFFER_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"query": "{ account { organizations { id } } }"}'

   # List channels
   curl -s -X POST https://api.buffer.com \
     -H "Authorization: Bearer $BUFFER_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"query": "query($input: ChannelsInput!) { channels(input: $input) { id service name metadata { ... on TwitterMetadata { twitterUsername } ... on InstagramMetadata { instagramAccountType } ... on TikTokMetadata { tiktokUsername } ... on LinkedInMetadata { linkedinAccountType } ... on YouTubeMetadata { youtubeChannelTitle } ... on ThreadsMetadata { threadsUsername } ... on BlueskyMetadata { blueskyUsername } } } }", "variables": {"input": {"organizationId": "ORG_ID"}}}'
   ```

4. **Show available channels** and let the user pick which belong to this project:
   > "I found these connected channels in Buffer:
   > 1. Twitter/X — @donatosdeals
   > 2. Instagram — donatosdeals
   > 3. LinkedIn — Donato's Deals
   >
   > Which ones should I use for this project? (all, or list numbers)"

5. **Record** selected channels in `projects.json` under `buffer.channels`.

### Step 3b: Zernio Setup (if selected)

1. **Check for API key:**
   ```bash
   # Check .env and .env.local for ZERNIO_API_KEY (or project-specific name)
   ```
   - If found: "Found Zernio API key. Let me verify it works..."
   - If missing: "I need a Zernio API key. Get one from https://app.zernio.com/settings/api (starts with `sk_`) and paste it here."

2. **Save the key** to `.env.local`:
   ```
   ZERNIO_API_KEY=<their key>
   ```

3. **Discover accounts:**
   ```bash
   curl -s https://zernio.com/api/v1/accounts \
     -H "Authorization: Bearer $ZERNIO_API_KEY"
   ```

4. **Show available accounts** and let the user pick:
   > "I found these connected accounts in Zernio:
   > 1. TikTok — @babyfactsunlocked
   > 2. Twitter/X — @donatosdeals
   >
   > Which ones should I use for this project? (all, or list numbers)"

5. **Get profile ID** (needed for queue scheduling):
   ```bash
   curl -s https://zernio.com/api/v1/profiles \
     -H "Authorization: Bearer $ZERNIO_API_KEY"
   ```

6. **Record** selected accounts in `projects.json` under `zernio.accounts` and `zernio.profile_id`.

### Step 4: TTS Provider Setup

Present the options:

> "Which TTS provider(s) do you want for AI voiceover? You can pick multiple and rotate between them.
>
> 1. **ElevenLabs** — Gold standard voice quality, 45+ premade voices, custom voice cloning *(credit-based pricing)*
> 2. **Grok (xAI)** — Great quality, 10 voices, fast generation *(per-request pricing)*
> 3. **Gemini** — Good quality, 30 voices, same key as image generation *(per-request pricing)*
> 4. **Multiple** — Use more than one for voice variety across videos
> 5. **None / later** — Skip TTS for now, just text-only videos"

For each selected provider:

**ElevenLabs:**
1. Check `.env` / `.env.local` for `ELEVENLABS_API_KEY`
2. If missing: "Get your ElevenLabs API key from https://elevenlabs.io/settings/api-keys and paste it here."
3. Save to `.env.local`
4. **Pick default voice**: "Which voice style? I recommend:
   - **Adam** (deep, authoritative) — great for narration
   - **Rachel** (calm, polished) — professional feel
   - **Jeremy** (excited, energetic) — upbeat content
   - **Matilda** (warm, friendly) — conversational
   - Or tell me a vibe and I'll suggest one"
5. Record `elevenlabs.api_key_env`, `elevenlabs.default_voice_id`, `elevenlabs.default_voice_name`, `elevenlabs.model_id`

**Grok:**
1. Check for `GROK_API_KEY`
2. If missing: "Get your Grok API key from https://console.x.ai and paste it here."
3. Save to `.env.local`
4. **Pick default voice** from: alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer
5. Record `grok.api_key_env`, `grok.default_voice`

**Gemini:**
1. Check for `GEMINI_API_KEY` (may already be set for image gen)
2. If missing: "Get your Gemini API key from https://aistudio.google.com/apikey and paste it here."
3. **Pick default voice** from: Kore, Puck, Charon, Fenrir, Aoede, etc.
4. Record `gemini.api_key_env`, `gemini.default_voice`

Set `default_provider` to the user's first choice (or whichever they said is primary). Set `providers` array to all selected providers in preference order.

> **Provider Fallback**: DonatoSkills supports automatic provider fallback. If your primary provider is rate-limited or down, the system automatically tries the next provider in your fallback chain. The `providers` array order in `projects.json` defines the fallback priority. See `shared-references/provider-resilience.md` for full details.

**Single-provider warning:** If only 1 TTS provider was configured, display:

```
⚠️ Single provider configured for TTS ({provider}). If this provider is rate-limited or experiencing downtime, your automated content pipeline will stop. We recommend configuring at least 2 providers for fallback.
```

Then offer: "Would you like to add a second TTS provider now for resilience?"

### Step 5: Image Generation Setup

> "Which image generation provider(s) do you want for AI backgrounds and images?
>
> 1. **Gemini (Nano Banana)** — fast, good quality, same key as Gemini TTS *(recommended)*
> 2. **OpenAI (GPT Image)** — best text rendering, transparent backgrounds, premium quality
> 3. **Both** — I'll default to Gemini but you can use OpenAI for text-heavy or premium images
> 4. **None / later** — Videos will use gradient backgrounds only"

For each selected provider:

**Gemini:**
1. Check for `GEMINI_API_KEY` (may already be set from TTS step)
2. If missing: "Get your Gemini API key from https://aistudio.google.com/apikey and paste it here."
3. Ask about default model:
   - **Flash** (`gemini-2.5-flash-image`) — fast, good for batch generation (recommended)
   - **Pro** (`gemini-3-pro-image-preview`) — highest quality, slower, best for hero images
4. Record `image_gen.gemini.api_key_env`, `image_gen.gemini.default_model`

**OpenAI:**
1. Check for `OPENAI_API_KEY`
2. If missing: "Get your OpenAI API key from https://platform.openai.com/api-keys and paste it here."
3. Save to `.env.local`
4. Ask about default model:
   - **GPT Image 1** (`gpt-image-1`) — highest quality, best text rendering (recommended)
   - **GPT Image 1 Mini** (`gpt-image-1-mini`) — faster, cheaper, good for drafts/batches
5. Record `image_gen.openai.api_key_env`, `image_gen.openai.default_model`

Set `default_provider` to the user's first choice. Set `provider` and `api_key_env` and `default_model` to match the default provider (for backward compatibility). If both are selected, add `providers` array.

**Single-provider warning:** If only 1 image-gen provider was configured, display:

```
⚠️ Single provider configured for image generation ({provider}). If this provider is rate-limited or experiencing downtime, your automated content pipeline will stop. We recommend configuring at least 2 providers for fallback.
```

Then offer: "Would you like to add a second image generation provider now for resilience?"

### Step 5b: Provider Fallback Summary

After both TTS and image-gen providers are configured, display a fallback chain summary. For each capability, show the chain with a checkmark or warning depending on provider count.

**Multi-provider example:**

```
✅ TTS fallback chain: grok → gemini → elevenlabs (3 providers)
✅ Image fallback chain: gemini → openai (2 providers)
Your automated loops will survive individual provider outages.
```

**Mixed example (single TTS provider, multiple image-gen):**

```
⚠️ TTS: grok only (no fallback — add gemini or elevenlabs for resilience)
✅ Image fallback chain: gemini → openai (2 providers)
```

**Both single-provider:**

```
⚠️ TTS: elevenlabs only (no fallback — add grok or gemini for resilience)
⚠️ Image generation: gemini only (no fallback — add openai for resilience)
Consider adding fallback providers before running overnight automation.
```

The chain order shown matches the `providers` array order in `projects.json`, which is the fallback priority. See `shared-references/provider-resilience.md` for full resilience documentation.

### Step 6: Cloudinary Setup

1. **Check for existing Cloudinary credentials** in `.env`:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

2. If found: "Found Cloudinary credentials. Want to use the same account for this project, or a different one?"

3. If missing: "I need Cloudinary credentials for media hosting. Get them from https://console.cloudinary.com/settings — you need cloud name, API key, and API secret."

4. **Record** env var names in `projects.json` under `cloudinary`.

### Step 7: Content Defaults

Ask:
1. **Tone** — "What's the brand voice? (casual, professional, funny, provocative, etc.)"
2. **Content pillars** — "What themes do you rotate through? Common ones: product, education, personality, social proof, entertainment, industry trends"
3. **Posting frequency** — "How often per platform? (e.g., daily on Twitter, 3x/week on TikTok)"

### Step 8: Analytics Loop (Optional)

If the user selected Zernio in Step 3 (analytics require Zernio), offer analytics loop setup:

> "Do you want to set up the **analytics loop**? It automatically scores your posts, finds what's working, and generates optimized briefs for your next content batch.
>
> 1. **Yes** — set up daily analytics + brief generation
> 2. **Not now** — I'll skip it (you can add it later with `/setup`)"

If yes:

1. **Check for Analytics add-on:**
   ```bash
   # Test analytics endpoint — 402 means the add-on isn't active
   curl -s -o /dev/null -w "%{http_code}" \
     "https://zernio.com/api/v1/analytics?profile_id=PROFILE_ID&limit=1" \
     -H "Authorization: Bearer $ZERNIO_API_KEY"
   ```
   - If 200: "Analytics API is active. Let's configure the loop."
   - If 402: "The Zernio Analytics add-on isn't active on your account. Enable it at https://app.zernio.com/settings/billing, then run `/setup` again to add the analytics loop."
   - If 402, skip the rest of this step.

2. **Configure defaults** (or accept defaults):
   > "Quick config for your analytics loop (press Enter for defaults):
   > - **Collection window**: How many hours after posting before scoring? (default: 48)
   > - **Min impressions**: Ignore posts below this threshold? (default: 500)
   > - **Exploit/explore ratio**: How many 'repeat winner' vs 'test new variable' briefs? (default: 2:1)"

3. **Set up scheduled tasks:**

   The analytics loop and content-engine run on **different cadences**:
   - **Analytics loop**: Every 48 hours (evening) — scores posts that have had time to accumulate engagement, generates 2 days of briefs per run
   - **Content creation**: Daily (morning) — reads the latest briefs and creates that day's videos

   > "The analytics loop needs two scheduled tasks to run autonomously:
   >
   > **Task 1 — Analytics Loop** (every 48 hours, evening)
   > Pulls analytics, scores posts, checks suppressions, decomposes winning patterns, generates 2 days of briefs.
   > What time? (default: 8:00 PM)
   >
   > **Task 2 — Content Creation** (daily, morning)
   > Reads today's briefs and creates/schedules videos.
   > What time? (default: 4:00 AM)
   >
   > The analytics task generates briefs for 2 days ahead, so the daily content task always has something to read — even on off-days."

   Create **two** Claude Code scheduled tasks:

   **Task 1 — Analytics Loop:**
   - **Task name**: `analytics-loop-{project-slug}`
   - **Schedule**: Every 48 hours at user-selected time (default 20:00)
   - **Command**:
     ```
     Run the analytics loop for {project-slug}:
     node analytics-loop/scripts/run-loop.js {project-slug}
     Then summarize the results — how many posts scored, what the winning template looks like, what got suppressed, and what briefs were generated for the next 2 days.
     ```

   **Task 2 — Content Creation:**
   - **Task name**: `content-creation-{project-slug}`
   - **Schedule**: Daily at user-selected time (default 04:00)
   - **Command**:
     ```
     Run the content engine in brief-driven mode for {project-slug}.
     Check analytics-loop/data/{project-slug}/ for the most recent briefs.
     Read today's briefs and create videos for all channels.
     Upload to Cloudinary and schedule via Zernio.
     ```

   Confirm: "Two scheduled tasks created:
   - Analytics loop runs every 48h at {time1} — scores posts + generates briefs
   - Content creation runs daily at {time2} — reads briefs + creates videos
   The system is now self-sustaining."

   > **Kickoff guidance**: "To start the cycle, manually create your first batch of videos (cold start — all exploratory). Set the analytics loop to fire 48 hours after that batch publishes. The daily content task starts the morning after the first analytics run completes."

4. **Record** analytics loop config in `projects.json` under `analytics_loop`:
   ```json
   "analytics_loop": {
     "enabled": true,
     "collection_window_hours": 48,
     "min_impressions": 500,
     "exploit_explore_ratio": [2, 1],
     "scoring_weights": { "shares": 4, "saves": 3, "comments": 2, "likes": 1 },
     "scheduled_tasks": {
       "analytics": "analytics-loop-{project-slug}",
       "content": "content-creation-{project-slug}"
     },
     "template_promotion": {
       "min_lift": 0.15,
       "min_channels": 5,
       "min_cycles": 2,
       "min_sample": 10
     }
   }
   ```

   > **Small-scale note**: If the user has fewer than 10 channels, suggest lowering `template_promotion.min_channels` to 3 and `min_impressions` to 200. These are just config values — the scripts read them from projects.json.

### Step 9: Write Configuration

After gathering all info, write the project entry to `projects.json`:

```json
{
  "project-slug": {
    "name": "Project Name",
    "description": "One line about this brand",
    "specs_path": null,
    "brand_brief": null,
    "buffer": {
      "api_key_env": "BUFFER_API_KEY",
      "organization_id": "org_123",
      "channels": {
        "twitter": { "id": "ch_abc", "name": "display", "username": "@handle" }
      }
    },
    "zernio": {
      "api_key_env": "ZERNIO_API_KEY",
      "profile_id": "prof_123",
      "accounts": {
        "tiktok": { "id": "acc_xyz", "name": "display", "username": "@handle" }
      }
    },
    "cloudinary": {
      "cloud_name_env": "CLOUDINARY_CLOUD_NAME",
      "api_key_env": "CLOUDINARY_API_KEY",
      "api_secret_env": "CLOUDINARY_API_SECRET"
    },
    "tts": {
      "providers": ["elevenlabs", "grok"],
      "default_provider": "elevenlabs",
      "elevenlabs": {
        "api_key_env": "ELEVENLABS_API_KEY",
        "default_voice_id": "pNInz6obpgDQGcFmaJgB",
        "default_voice_name": "Adam",
        "model_id": "eleven_multilingual_v2"
      },
      "grok": {
        "api_key_env": "GROK_API_KEY",
        "default_voice": "onyx"
      }
    },
    "image_gen": {
      "providers": ["gemini", "openai"],
      "default_provider": "gemini",
      "provider": "gemini",
      "api_key_env": "GEMINI_API_KEY",
      "default_model": "gemini-2.5-flash-image",
      "openai": {
        "api_key_env": "OPENAI_API_KEY",
        "default_model": "gpt-image-1"
      }
    },
    "analytics_loop": {
      "enabled": true,
      "collection_window_hours": 48,
      "min_impressions": 500,
      "exploit_explore_ratio": [2, 1],
      "scoring_weights": { "shares": 4, "saves": 3, "comments": 2, "likes": 1 },
      "scheduled_tasks": {
        "analytics": "analytics-loop-project-slug",
        "content": "content-creation-project-slug"
      },
      "template_promotion": {
        "min_lift": 0.15, "min_channels": 5, "min_cycles": 2, "min_sample": 10
      }
    },
    "defaults": {
      "tone": "casual, funny",
      "content_pillars": ["product", "education", "personality"],
      "posting_frequency": {
        "twitter": "daily",
        "tiktok": "3x/week"
      }
    },
    "created": "2026-03-16",
    "updated": "2026-03-16"
  }
}
```

If this is the only project, also set `"default_project": "project-slug"`.

### Step 10: Verify & Summary

Run a quick health check:

1. **Buffer** (if configured): query account info to confirm key works
2. **Zernio** (if configured): list accounts to confirm key works
3. **Cloudinary** (if configured): try a test signature to confirm credentials

Show a summary:

```
Project setup complete: [Project Name]

Scheduling:
  Buffer:   connected (3 channels: Twitter, Instagram, LinkedIn)
  Zernio: connected (1 account: TikTok)

Voice (TTS):
  ElevenLabs: connected (default: Adam)
  Grok:       connected (default: onyx)

Image generation:
  Gemini:  connected (model: gemini-2.5-flash-image)
  OpenAI:  connected (model: gpt-image-1)

Media hosting:
  Cloudinary: connected (cloud: dk74vmp31)

Analytics loop:
  Analytics task: every 48h at 8:00 PM (analytics-loop-project-slug)
  Content task:   daily at 4:00 AM (content-creation-project-slug)
  Ratio:          2 exploit : 1 explore
  Threshold:      500 min impressions

Defaults:
  Tone: casual, funny
  Pillars: product, education, personality
  Frequency: Twitter daily, TikTok 3x/week

Next steps:
  - "plan my content" → content calendar (will use analytics briefs if available)
  - "make me a video" → video creation
  - "post this" → schedule a post
  - Analytics briefs will appear in analytics-loop/data/<project>/<date>/briefs/
```

---

## Updating an Existing Project

If the user runs `/setup` and a project already exists:

1. Read `projects.json` and show current config
2. Ask: "Want to update [Project Name] or add a new project?"
3. If updating, show current settings and ask what to change:
   - "Add Zernio?" / "Add Buffer?"
   - "Connect new accounts?"
   - "Change defaults?"
4. Only modify the fields that changed

---

## Adding Accounts to Existing Project

If the user says "connect my TikTok" or "add Instagram":

1. Determine which backend has that platform
2. Query the backend for connected accounts
3. Find the matching platform account
4. Add it to `projects.json` under the right backend
5. Confirm: "Added TikTok @handle to [project name] via Zernio"

---

## Environment Variable Conventions

| Pattern | When |
|---------|------|
| `BUFFER_API_KEY` | Single Buffer account (most common) |
| `BUFFER_API_KEY_<SLUG>` | Multiple Buffer accounts |
| `ZERNIO_API_KEY` | Single Zernio account (most common) |
| `ZERNIO_API_KEY_<SLUG>` | Multiple Zernio accounts |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS |
| `GROK_API_KEY` | Grok/xAI TTS |
| `GEMINI_API_KEY` | Gemini TTS + image generation |
| `OPENAI_API_KEY` | OpenAI image generation |
| `CLOUDINARY_*` | Usually shared across all projects |

Keys go in `.env` or `.env.local` (both are gitignored via `.env.*` pattern in `.gitignore`).

---

## Error Recovery

| Problem | Action |
|---------|--------|
| Invalid Buffer key | "That key didn't work (got UNAUTHORIZED). Double-check at publish.buffer.com/settings/api" |
| Invalid Zernio key | "That key didn't work (got 401). Double-check at app.zernio.com/settings/api — keys start with `sk_`" |
| Invalid ElevenLabs key | "That key didn't work (got 401). Double-check at elevenlabs.io/settings/api-keys" |
| Invalid Grok key | "That key didn't work. Double-check at console.x.ai" |
| Invalid OpenAI key | "That key didn't work (got 401). Double-check at platform.openai.com/api-keys" |
| No channels/accounts found | "No connected accounts found. Connect platforms at [Buffer web app / Zernio web app] first, then run setup again" |
| `projects.json` doesn't exist | Create it with the schema header and the new project |
| Project slug already exists | "A project called [slug] already exists. Want to update it or use a different name?" |
