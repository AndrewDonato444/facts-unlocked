---
feature: Add New Theme
domain: onboarding
source: DonatoSkills/add-new/SKILL.md
tests: []
components: []
personas: []
status: specced
created: 2026-03-18
updated: 2026-03-18
---

# Add New Theme

**Source File**: `DonatoSkills/add-new/SKILL.md`
**Config Written To**: `DonatoSkills/projects.json`

## Feature: Add New Theme

Onboards a new facts channel into the Facts Unlocked content pipeline. Designed specifically for this network — it already knows the API keys, provider stack, and analytics config. It only asks for the 5–6 things that are unique per theme.

The goal: run `/add-new`, answer a few questions, and the new channel is fully wired into the content pipeline, analytics loop, and scheduler.

---

## Scenario: Happy path — new theme fully onboarded

```
Given the user runs /add-new
When they answer all questions (theme name, platforms, Zernio accounts, pillars, tone)
Then projects.json has a new entry inheriting all shared provider config
And two scheduled tasks are created (analytics loop + content creation)
And a summary is shown confirming everything is wired up
And the user is told how to kick off the first content batch
```

## Scenario: Zernio accounts auto-discovered

```
Given the user has connected new platform accounts in Zernio already
When /add-new queries the Zernio API during setup
Then it shows only accounts NOT already assigned to an existing project
And the user picks which ones belong to this new theme
And the chosen account IDs are written to projects.json under the theme slug
```

## Scenario: Theme name drives smart defaults

```
Given the user enters a theme name (e.g. "Space Facts Unlocked")
When the command generates defaults
Then the slug is auto-generated (e.g. "space-facts-unlocked")
Then the description is pre-filled ("Bite-sized surprising facts about [topic]")
Then content pillars are suggested based on the theme topic
Then tone defaults to "rotate: curious, playful, bold, educational"
And the user can accept or override each default
```

## Scenario: Shared config inherited automatically — user never asked

```
Given an existing project (e.g. baby-facts-unlocked) in projects.json
When a new theme is added
Then TTS providers, rotation, and voice defaults are copied from the first existing project
And image gen providers, models, and rotation are copied
And Cloudinary env var references are copied
And analytics_loop defaults (scoring weights, thresholds, suppression rules) are copied
And image_cache config is copied
And the user is NOT asked about any of these
```

## Scenario: No unassigned Zernio accounts found

```
Given the user runs /add-new
When the Zernio API returns no accounts not yet in projects.json
Then the command says: "No unassigned Zernio accounts found. Connect the new platform accounts at app.zernio.com, then run /add-new again."
And the command exits cleanly without writing anything
```

## Scenario: Slug already exists in projects.json

```
Given the user enters a theme name that generates a slug already in projects.json
Then the command warns: "A project called [slug] already exists. Use a different name, or run /setup to update it."
And the command exits without overwriting anything
```

## Scenario: Scheduled tasks — optional

```
Given the user has fully configured the new theme
When asked "Set up scheduled tasks for this theme? (analytics loop + daily content)"
And the user says no
Then projects.json is written without scheduled_tasks in analytics_loop
And a reminder is shown: "You can add scheduled tasks later by running /add-new again or editing projects.json"
```

## Scenario: Single-platform theme (YouTube only)

```
Given the user picks only YouTube (no TikTok, no Instagram)
When the project entry is written
Then posting_frequency only includes youtube
And Zernio accounts only includes the youtube account
And the summary reflects the single-platform setup
```

---

## User Journey

1. User creates new social accounts in Zernio (outside this tool)
2. **User runs `/add-new` — this feature**
3. New theme appears in `projects.json`
4. Scheduled tasks fire: analytics loop every 48h, content daily
5. First batch is manually kicked off ("cold start")
6. Loop becomes self-sustaining

---

## Interactive Flow (Terminal Mockup)

```
/add-new

┌─────────────────────────────────────────────────┐
│  Facts Unlocked — Add New Theme                 │
│  (Inherits: TTS, image gen, Cloudinary,         │
│   analytics config from existing projects)      │
└─────────────────────────────────────────────────┘

Step 1 of 5 — Theme Basics
  What's the theme name?
  > Space Facts Unlocked

  Auto-generated slug: space-facts-unlocked
  Description (press Enter to accept):
  > Bite-sized surprising facts about space and the universe
  ✓

Step 2 of 5 — Platforms
  Which platforms for this theme?
  [x] TikTok
  [x] YouTube
  [ ] Instagram
  > tiktok, youtube ✓

Step 3 of 5 — Zernio Accounts
  Querying Zernio for unassigned accounts...

  Found 3 unassigned accounts:
    1. TikTok — @spacefactsunlocked
    2. YouTube — @spacefactsunlocked
    3. Instagram — @spacefactsunlocked

  Pick the accounts for this theme (e.g. 1,2):
  > 1,2 ✓

Step 4 of 5 — Content Pillars
  Suggested pillars for "Space":
    surprising-facts, did-you-know, myth-busting, space-history
  Accept or enter your own (comma-separated):
  > ✓ (accepted)

Step 5 of 5 — Tone
  Tone rotation (default: curious, playful, bold, educational):
  > ✓ (accepted)

─────────────────────────────────────────────────
  Set up scheduled tasks?
    - Analytics loop: every 48h at 8:00 PM
    - Content creation: daily at 4:00 AM
  (y/n):
  > y ✓

─────────────────────────────────────────────────
Writing to projects.json... ✓
Creating scheduled tasks... ✓

Theme added: Space Facts Unlocked (space-facts-unlocked)
  Platforms:  TikTok, YouTube
  TTS:        elevenlabs → grok → gemini (inherited)
  Image gen:  gemini → openai → grok (inherited)
  Analytics:  every 48h at 8:00 PM
  Content:    daily at 4:00 AM

Next step: create your first batch of videos (cold start — all exploratory)
  Run: "plan my content for space-facts-unlocked"
  The analytics loop will start scoring after your first posts go live.
─────────────────────────────────────────────────
```

---

## What Gets Written

### projects.json entry

Inherits the full provider stack from an existing project. Only theme-specific fields are unique:

```json
"space-facts-unlocked": {
  "name": "Space Facts Unlocked",
  "description": "Bite-sized surprising facts about space and the universe",
  "specs_path": "../.specs",
  "brand_brief": null,
  "zernio": {
    "api_key_env": "ZERNIO_API_KEY",
    "profile_id": "<queried from Zernio API>",
    "accounts": {
      "tiktok": { "id": "<from API>", "name": "SpaceFactsUnlocked", "username": "@spacefactsunlocked" },
      "youtube": { "id": "<from API>", "name": "SpaceFactsUnlocked", "username": "@spacefactsunlocked" }
    }
  },
  "cloudinary": { "<inherited>" },
  "tts": { "<inherited — same providers, voices, rotation>" },
  "image_gen": { "<inherited — same providers, models, rotation>" },
  "analytics_loop": {
    "<inherited thresholds and weights>",
    "scheduled_tasks": {
      "analytics": "analytics-loop-space-facts-unlocked",
      "content": "content-creation-space-facts-unlocked"
    }
  },
  "image_cache": { "<inherited>" },
  "defaults": {
    "tone": "rotate: curious, playful, bold, educational",
    "content_pillars": ["surprising-facts", "did-you-know", "myth-busting", "space-history"],
    "posting_frequency": {
      "tiktok": "3x/day",
      "youtube": "3x/day"
    }
  },
  "created": "2026-03-18",
  "updated": "2026-03-18"
}
```

### Scheduled tasks

Two Claude Code scheduled tasks (via `mcp__scheduled-tasks`):
- `analytics-loop-{slug}` — every 48h
- `content-creation-{slug}` — daily

---

## Edge Cases

| Situation | Behavior |
|-----------|----------|
| No unassigned Zernio accounts | Exit with instructions to connect accounts first |
| Slug already in projects.json | Warn + exit cleanly, no overwrite |
| User skips scheduled tasks | Write projects.json without task names, remind user |
| Only 1 platform selected | Only write that platform in accounts + posting_frequency |
| Theme name has special chars | Strip to lowercase alphanumeric + hyphens for slug |
| No existing projects to inherit from | Fall back to setup skill for full provider config |

---

## Learnings

_Populated after implementation._
