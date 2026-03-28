---
name: trending-scanner
description: Scan for trending topics and inject them into the content pipeline. Use when running daily content creation to add timely, viral topic signals to video briefs.
---

# Trending Scanner

Injects trending topic signals into the daily content creation pipeline. Sits between
brief loading and script writing in the content engine.

## How This Works

1. **Pull** trending topics from Scrapingdog Google Trends API (1 call, all channels)
2. **Filter** through no-fly list (politics, tragedy, etc.)
3. **Route** trends to channels — themed channels claim keyword matches first, Viral Facts gets everything else
4. **Enrich** each matched trend with web search context (why it's trending, tone signal)
5. **Inject** enriched context into brief topic_guidance
6. **Fact-check** (optional, Grok) — reviews trend-matched scripts before rendering

## Prerequisites

```
SCRAPINGDOG_API_KEY=your_key    # Required — Google Trends API
GROK_API_KEY=your_key           # Optional — for fact-check gate
```

## Modes

| Mode | Channel Type | Behavior |
|------|-------------|----------|
| `supplementary` | Themed (Baby, Money, etc.) | Match trends against content_pillars. Max 1 trending slot/day. Explore slots untouched. |
| `primary` | Viral Facts | All exploit slots are trend-sourced. No pillar matching. Explore slots untouched. |

## Orchestrated Mode

When invoked from content-engine, pass:

```
- briefs: loaded briefs object
- channels: array of channel configs from projects.json (with trending section)
- recently_used: array of trend titles used in the past 24h (for dedup)
```

Returns modified briefs with enriched topic_guidance + trend_match tags for calendar.

## Configuration (projects.json)

Each project gets a `trending` section:

```json
{
  "trending": {
    "enabled": true,
    "mode": "supplementary",
    "api_key_env": "SCRAPINGDOG_API_KEY",
    "geo": "US",
    "language": "en",
    "min_volume": 50000,
    "strong_match_threshold": 8,
    "moderate_match_threshold": 5,
    "max_trending_slots_per_channel": 1,
    "pillar_spike_detection": true,
    "no_fly_list": ["politics", "religious_controversy", "active_tragedy"],
    "fact_check": { "enabled": false }
  }
}
```

## No-Fly List

Hard blocks topics by category before scoring. Default categories:
- **politics** — elections, parties, political figures
- **religious_controversy** — sectarian disputes
- **active_tragedy** — mass casualty events

Custom terms can be added per channel.

## Fact-Check Gate

Optional post-script review by a truth-seeking model (Grok). Enabled per channel:

```json
"fact_check": { "enabled": true, "model": "grok" }
```

Flow: Script → Grok review → PASS (render) or FAIL (correct + retry once) or FAIL (fall back to static pillar).
