# Analytics Schema — Shared Contract

This schema defines the data structures shared between the **content-engine** (writes variable tags) and the **analytics-loop** (reads tags and scores posts). Both skills must reference this file to stay in sync.

---

## Variable Taxonomy

Every video calendar item must include a `variables` object with these 7 structural variables:

```json
{
  "variables": {
    "hook_type": "stat_lead | did_you_know | most_people_dont_know | myth_bust | question | controversy | story_open",
    "video_length": "15 | 30 | 45 | 60",
    "voice_pace": "fast | moderate | slow",
    "text_overlay": "minimal | full_captions | karaoke_highlight | key_words_only",
    "background_type": "stock_montage | single_static | abstract_animated | split_screen | whimsical-css",
    "music_energy": "none | ambient | upbeat | dramatic",
    "cta_style": "none | end_card | mid_roll_prompt | pinned_comment | follow_cta"
  }
}
```

**Full variable definitions**: `analytics-loop/references/variable-taxonomy.md`

---

## Who Writes What

| Skill | Writes | Reads |
|-------|--------|-------|
| content-engine | `variables` on calendar items | This schema |
| analytics-loop | scored-posts.json, variable-analysis.json, briefs | Calendar items (for variable tags) |
| remotion-video | — | Template variables from briefs (maps to rendering params) |

---

## Post Performance Record

When the analytics-loop scores a post, it produces a record in this format:

```json
{
  "postId": "65f1c0a9e2b5af0012ab34cd",
  "zernioPostId": "zernio_post_abc123",
  "calendarItemId": "003",
  "platform": "tiktok",
  "channel": "Baby Facts Unlocked",
  "profileId": "prof_baby",
  "publishedAt": "2026-03-14T10:00:05Z",
  "metrics": {
    "impressions": 15420,
    "reach": 12350,
    "likes": 342,
    "comments": 28,
    "shares": 45,
    "saves": 67,
    "clicks": 189,
    "views": 8200
  },
  "score": {
    "engagementDensity": 28.7,
    "rawScore": 442,
    "components": {
      "sharesContribution": 180,
      "savesContribution": 201,
      "commentsContribution": 56,
      "likesContribution": 5
    }
  },
  "variables": {
    "hook_type": "stat_lead",
    "video_length": "30",
    "voice_pace": "fast",
    "text_overlay": "karaoke_highlight",
    "background_type": "stock_montage",
    "music_energy": "upbeat",
    "cta_style": "follow_cta"
  },
  "excluded": false
}
```

---

## Variable Analysis Output

After decomposition, the analytics-loop produces:

```json
{
  "date": "2026-03-16",
  "sample_size": 58,
  "excluded_posts": 2,
  "global_avg_engagement_density": 12.4,
  "winning_template": {
    "hook_type": "stat_lead",
    "video_length": "30",
    "voice_pace": "fast",
    "text_overlay": "karaoke_highlight",
    "background_type": "stock_montage",
    "music_energy": "upbeat",
    "cta_style": "follow_cta",
    "avg_engagement_density": 28.7,
    "confidence": "high",
    "sample_count": 12
  },
  "variable_impact": [
    {
      "variable": "hook_type",
      "values": {
        "stat_lead": { "avg_score": 24.3, "count": 18 },
        "did_you_know": { "avg_score": 15.1, "count": 14 },
        "myth_bust": { "avg_score": 11.8, "count": 12 }
      },
      "most_impactful_value": "stat_lead",
      "lift_over_average": "96%"
    }
  ],
  "per_channel_overrides": [
    {
      "channel": "Baby Facts Unlocked",
      "profile_id": "prof_baby",
      "diverges_on": ["voice_pace"],
      "optimal_override": { "voice_pace": "moderate" },
      "note": "Slower pacing outperforms fast by 34% on this channel specifically"
    }
  ]
}
```

---

## Brief Schema

Generated briefs follow this format:

```json
{
  "date": "2026-03-17",
  "channel": "Love Facts Unlocked",
  "profile_id": "prof_love",
  "briefs": [
    {
      "slot": 1,
      "type": "exploit",
      "template": {
        "hook_type": "stat_lead",
        "video_length": "30",
        "voice_pace": "fast",
        "text_overlay": "karaoke_highlight",
        "background_type": "stock_montage",
        "music_energy": "upbeat",
        "cta_style": "follow_cta"
      },
      "topic_guidance": "Use a surprising love/relationship statistic as the hook.",
      "schedule_time": "09:00"
    },
    {
      "slot": 3,
      "type": "explore",
      "template": {
        "hook_type": "stat_lead",
        "video_length": "45",
        "voice_pace": "fast",
        "text_overlay": "karaoke_highlight",
        "background_type": "stock_montage",
        "music_energy": "upbeat",
        "cta_style": "follow_cta"
      },
      "explore_variable": "video_length",
      "explore_value": "45",
      "baseline_value": "30",
      "topic_guidance": "Same content quality as exploit slots. Only the tested variable changes.",
      "schedule_time": "19:00"
    }
  ]
}
```

---

## Calendar Item Extension

The existing calendar schema (`content-engine/references/calendar-schema.md`) is extended with:

| Field | Type | Description |
|-------|------|-------------|
| `variables` | object \| null | Structural variables from the taxonomy above |
| `zernio_post_id` | string \| null | Zernio post ID (for analytics correlation) |
| `brief_id` | string \| null | ID of the analytics-loop brief that generated this item |

All fields are **optional** and backward-compatible with existing calendars.

---

## Keeping In Sync

The variable taxonomy is the contract. If a new variable is added:

1. Update `analytics-loop/references/variable-taxonomy.md` (definitions)
2. Update this file (schema)
3. Update content-engine to tag it when creating items
4. Update `analytics-loop/scripts/decompose-variables.js` to read it
