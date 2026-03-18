---
name: add-new
description: "Onboard a new facts theme into the Facts Unlocked content pipeline. Asks only what's unique per theme (name, platforms, Zernio accounts, pillars, tone). Inherits all shared config (TTS, image gen, Cloudinary, analytics) from existing projects automatically. Use when the user wants to add a new channel, topic, or facts theme to the network."
---

# Add New Theme

Onboard a new facts channel into the Facts Unlocked content pipeline. You only need to ask 5 things — everything else is inherited from existing projects.

---

## Before You Start

Read `DonatoSkills/projects.json`. You need:
1. The list of **existing project slugs** (to check for collisions and to inherit config)
2. The **first existing project** — you'll clone its `tts`, `image_gen`, `cloudinary`, `analytics_loop`, and `image_cache` blocks exactly
3. All **existing Zernio account IDs** across all projects (so you can filter them out when showing available accounts)

If `projects.json` doesn't exist yet, stop and tell the user to run `/setup` first to configure the base project.

---

## Step 1 — Theme Name

Ask:
> "What's the theme name?"

Examples: `Space Facts Unlocked`, `History Facts Unlocked`, `Sports Facts Unlocked`

From their answer:
- **Slug**: lowercase, hyphens, strip special chars. `Space Facts Unlocked` → `space-facts-unlocked`
- **Display name**: as entered, title-cased
- **Description**: pre-fill as `"Bite-sized surprising facts about [topic]"` where topic is inferred from the name

Show the slug and description:
> "Slug: `space-facts-unlocked`
> Description (press Enter to accept): Bite-sized surprising facts about space and the universe"

Let them edit the description. Accept Enter to keep the pre-fill.

**Collision check**: If the slug already exists in `projects.json`, stop immediately:
> "A project called `space-facts-unlocked` already exists. Use a different name, or run `/setup` to update it."

---

## Step 2 — Platforms

Ask:
> "Which platforms for this theme?
>
> 1. TikTok
> 2. YouTube
> 3. Instagram
> 4. All three (default)
>
> Enter numbers or 'all':"

Accept comma-separated numbers or "all". Default to all three if they just press Enter.

---

## Step 3 — Zernio Accounts

Tell the user what you're doing:
> "Querying Zernio for available accounts..."

Make this API call to discover all connected accounts on their Zernio profile:

```bash
curl -s https://zernio.com/api/v1/accounts \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

Also get the profile ID for this new project:
```bash
curl -s https://zernio.com/api/v1/profiles \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

From the accounts response, **filter out any account IDs already used in existing projects** (read all `zernio.accounts.*.id` values from `projects.json`). Show only the unassigned ones — filtered to the platforms selected in Step 2.

Display:
```
Found X unassigned accounts:
  1. TikTok    — @spacefactsunlocked  (id: abc123)
  2. YouTube   — @spacefactsunlocked  (id: def456)
  3. Instagram — @spacefactsunlocked  (id: ghi789)

Pick the accounts for this theme (e.g. 1,2 or 'all'):
```

If **no unassigned accounts** match the selected platforms, stop:
> "No unassigned Zernio accounts found for the selected platforms. Connect the new accounts at app.zernio.com, then run `/add-new` again."

If the API returns a **401 or 403**, stop:
> "Zernio API key issue — check that ZERNIO_API_KEY is set in DonatoSkills/.env.local"

If the API returns a **402**, stop:
> "Zernio Analytics add-on required. Enable it at app.zernio.com/settings/billing."

Record: selected account objects (id, name, username, platform) + the profile_id from the profiles endpoint.

---

## Step 4 — Content Pillars

Generate 4 suggested pillars based on the theme topic. Use the theme name to infer the topic and suggest relevant pillars. All themes share the base pillars `surprising-facts` and `did-you-know`. The other two should be topic-specific.

Examples:
- Space → `surprising-facts, did-you-know, myth-busting, space-history`
- History → `surprising-facts, did-you-know, myth-busting, forgotten-events`
- Sports → `surprising-facts, did-you-know, myth-busting, record-breakers`
- Food → `surprising-facts, did-you-know, myth-busting, food-science`
- Animals → `surprising-facts, did-you-know, myth-busting, evolution-facts`

Ask:
> "Content pillars (press Enter to accept, or enter your own comma-separated list):
> surprising-facts, did-you-know, myth-busting, [topic-pillar]"

---

## Step 5 — Tone

Ask:
> "Tone rotation (press Enter to accept default):
> curious, playful, bold, educational"

Almost everyone accepts the default. Let them override if needed.

---

## Step 6 — Scheduled Tasks

Ask:
> "Set up scheduled tasks for this theme?
>
> - Analytics loop: every 48h at 8:00 PM — scores posts, generates briefs
> - Content creation: daily at 4:00 AM — reads briefs, creates and schedules videos
>
> (y/n, default: y):"

If yes, create **two** Claude Code scheduled tasks using the scheduled-tasks MCP tool:

**Task 1 — Analytics Loop:**
- Name: `analytics-loop-{slug}`
- Schedule: `0 20 */2 * *` (every 2 days at 8 PM)
- Prompt:
  ```
  ORCHESTRATED MODE — analytics-loop
  - Project: {slug}
  - Date range: last_48h
  - Platform filter: all

  Run the analytics loop for {slug}:
    node DonatoSkills/analytics-loop/scripts/run-loop.js {slug}
  Then summarize the results — how many posts scored, what the winning template looks like, what got suppressed, and what briefs were generated.
  ```

**Task 2 — Content Creation:**
- Name: `content-creation-{slug}`
- Schedule: `0 4 * * *` (daily at 4 AM)
- Prompt:
  ```
  ORCHESTRATED MODE — content-engine
  - Project: {slug}
  - Mode: brief-driven

  Run the content engine for {slug}.
  Check DonatoSkills/analytics-loop/data/{slug}/ for today's briefs.
  Read the briefs and create videos for all configured channels.
  Upload to Cloudinary and schedule via Zernio.
  ```

If no, skip task creation and note it in the summary.

---

## Step 7 — Write to projects.json

Read the current `projects.json`. Find the **first existing project** (e.g., `baby-facts-unlocked`) and clone its `tts`, `image_gen`, `cloudinary`, `analytics_loop`, and `image_cache` blocks verbatim.

Build the new project entry:

```json
"{slug}": {
  "name": "{Display Name}",
  "description": "{description}",
  "specs_path": "../.specs",
  "brand_brief": null,
  "zernio": {
    "api_key_env": "ZERNIO_API_KEY",
    "profile_id": "{profile_id from Step 3}",
    "accounts": {
      "{platform}": {
        "id": "{account id from Step 3}",
        "name": "{account name}",
        "username": "@{username}"
      }
    }
  },
  "cloudinary": {cloned from existing project},
  "tts": {cloned from existing project},
  "image_gen": {cloned from existing project},
  "analytics_loop": {
    {cloned from existing project — all thresholds, weights, suppression rules},
    "scheduled_tasks": {
      "analytics": "analytics-loop-{slug}",
      "content": "content-creation-{slug}"
    }
  },
  "image_cache": {cloned from existing project},
  "defaults": {
    "tone": "rotate: {tone values from Step 5}",
    "content_pillars": [{pillars from Step 4}],
    "posting_frequency": {
      "{platform}": "3x/day"
    }
  },
  "created": "{today YYYY-MM-DD}",
  "updated": "{today YYYY-MM-DD}"
}
```

If scheduled tasks were skipped (user said no in Step 6), omit the `scheduled_tasks` key from `analytics_loop`.

Add the entry into the `projects` object in `projects.json`. Do **not** change `default_project`.

Write the updated `projects.json` back to disk.

---

## Step 8 — Summary

Print a clean summary:

```
Theme added: {Display Name} ({slug})
────────────────────────────────────────────
  Platforms:   TikTok, YouTube          (or whichever were selected)
  Accounts:    @handle (TikTok), @handle (YouTube)
  Pillars:     surprising-facts, did-you-know, myth-busting, [topic]
  Tone:        curious, playful, bold, educational

  Inherited from existing projects:
  TTS:         elevenlabs → grok → gemini (rotate: on)
  Image gen:   gemini → openai → grok (rotate: on)
  Analytics:   48h window, 2:1 exploit/explore

  Scheduled tasks:
  Analytics:   analytics-loop-{slug} (every 48h at 8 PM)
  Content:     content-creation-{slug} (daily at 4 AM)
  — OR —
  Scheduled tasks: not configured (add later by editing projects.json or re-running /add-new)

Next step: create your first batch of videos (cold start — all exploratory)
  Say: "plan my content for {slug}"
  The analytics loop will start scoring after your first posts go live.
────────────────────────────────────────────
```

---

## Edge Case Handling

| Situation | Response |
|-----------|----------|
| Slug already in projects.json | Warn + exit, no write |
| No unassigned Zernio accounts | Exit with instructions to connect accounts first |
| Zernio API 401/403 | Check ZERNIO_API_KEY in .env.local |
| Zernio API 402 | Enable Analytics add-on at app.zernio.com/settings/billing |
| No existing projects to inherit from | Tell user to run /setup first |
| User picks platforms but no matching unassigned accounts for those platforms | Show accounts for other platforms and ask if they want to assign those instead, or exit |
| Theme name is just a topic (e.g. "Space") | Expand to "{Topic} Facts Unlocked", confirm with user |
| Scheduled tasks MCP unavailable | Skip task creation, note in summary, give manual instructions |
