---
feature: Trending Topic Injection
domain: trending
source: DonatoSkills/trending-scanner/scripts/trending-scanner.js
tests:
  - DonatoSkills/trending-scanner/scripts/__tests__/trending-scanner.test.js
components: []
design_refs: []
personas: []
status: implemented
created: 2026-03-20
updated: 2026-03-20
---

# Trending Topic Injection

**Source File**: `DonatoSkills/trending-scanner/index.js` (planned)
**Config**: `DonatoSkills/projects.json` (trending section per project)
**API**: Scrapingdog Google Trends (Trending Now + Interest Over Time)

## Feature: Trending Topic Injection

Injects trending topic signals into the daily content creation pipeline. Sits between
brief loading (Step 1) and video script writing (Step 2) in the content engine.

Two operating modes:

- **Supplementary** (themed channels like Baby Facts): matches trends against the
  channel's `content_pillars`. At most 1 exploit slot per day gets a trending topic.
  Explore slots are never trend-influenced (keeps variable isolation clean).
- **Primary** (Viral Facts Unlocked): all exploit slots are trend-sourced. The channel
  has no fixed pillars — trends ARE the content source.

The trending injection only changes WHAT fact to find (the topic). It never overrides
the template variables (hook_type, video_length, etc.) — those come from the analytics
loop and are data-driven.

---

### Scenario: Pull trending topics from Scrapingdog

```gherkin
Given the content engine has loaded today's briefs
And SCRAPINGDOG_API_KEY is configured in .env
When the trending scanner runs
Then it calls Scrapingdog Trending Now (GET /google_trends/trending_now)
  with geo=US, hours=24, language=en
And filters to active trends with search_volume >= min_volume (default 50K)
And filters OUT any trend matching the channel's no_fly_list (checked before scoring)
And returns a list of trending topics with title, volume, increase_percentage, and related_terms
```

### Scenario: Match trends to a themed channel (supplementary mode)

```gherkin
Given the trending scanner has pulled today's trends
And a themed channel has trending.mode = "supplementary"
And the channel has content_pillars defined in projects.json
When matching trends to the channel
Then for each trend, score against the channel's pillars:
  | Match Type     | Condition                                          | Points |
  | Exact keyword  | trend title or breakdown term appears in pillars    | +10    |
  | Volume bonus   | search_volume > 500K                               | +3     |
  | Volume bonus   | search_volume > 1M                                 | +5     |
  | Freshness      | increase_percentage > 2000                          | +3     |
And a trend MUST have at least one keyword match to qualify (volume/freshness alone cannot claim)
And trends with keyword match scoring >= strong_match_threshold (default 8) are "strong matches"
And trends with keyword match scoring >= moderate_match_threshold (default 5) are "moderate matches"
And trends below moderate threshold or without keyword match are ignored
```

### Scenario: Trend routing — themed channels claim first, Viral Facts gets the rest

```gherkin
Given the trending scanner has pulled today's trends
And there are both themed channels (supplementary) and Viral Facts (primary)
When routing trends to channels
Then FIRST score all trends against themed channels' pillars
And any trend that is a strong match (>= 8) for a themed channel is claimed by that channel
And claimed trends are removed from the pool available to Viral Facts
Then Viral Facts receives all remaining unclaimed trends
And ranks them by (search_volume * increase_percentage) descending
And selects top N where N = number of exploit slots for the day
```

### Scenario: Match trends for Viral Facts (primary mode — after routing)

```gherkin
Given the trending scanner has pulled today's trends
And themed channels have already claimed their strong matches
And the channel has trending.mode = "primary"
When matching remaining trends to Viral Facts
Then skip pillar matching entirely (Viral Facts has no fixed pillars)
And rank unclaimed trends by (search_volume * increase_percentage) descending
And use min_volume threshold from config (can be lower than themed channels, e.g. 20K)
And select top N trends where N = number of exploit slots for the day
And if no unclaimed trends meet the threshold, use the highest-volume available trend
```

### Scenario: All trends claimed by themed channels

```gherkin
Given the trending scanner found 3 qualifying trends
And all 3 are strong matches for themed channels
When routing trends
Then Viral Facts has no unclaimed trends in the pool
And Viral Facts falls back to a general web search for "trending topics today"
  to find trends that don't match any themed channel's pillars
```

### Scenario: Inject strong match into topic_guidance (supplementary)

```gherkin
Given a themed channel has a strong trend match (score >= 8)
When modifying today's briefs
Then the first exploit slot's topic_guidance gets prepended with:
  "TRENDING TOPIC: [title] is trending with [volume] searches.
   Prioritize a fact related to: [suggested_angle].
   This is the highest-priority topic for today."
And the second exploit slot's topic_guidance is unchanged
And the explore slot's topic_guidance is unchanged
And only the highest-scoring strong match is used (max 1 per channel per day)
```

### Scenario: Inject moderate match into topic_guidance (supplementary)

```gherkin
Given a themed channel has only moderate trend matches (score 5-7)
And no strong matches
When modifying today's briefs
Then all exploit slots get appended with:
  "TRENDING CONTEXT: [title] is moderately trending.
   If naturally relevant to your chosen fact, angle toward this topic.
   Do not force it."
And explore slots are unchanged
```

### Scenario: Inject trends for Viral Facts (primary mode)

```gherkin
Given Viral Facts Unlocked has trending.mode = "primary"
And the scanner found 3 qualifying trends
And today's briefs have 2 exploit slots and 1 explore slot
When modifying today's briefs
Then exploit slot 1 gets topic_guidance replaced with trend #1 (highest ranked)
Then exploit slot 2 gets topic_guidance replaced with trend #2
And the explore slot's topic_guidance is unchanged (still tests structural variables)
And each slot's suggested_angle is generated from the trend's related_terms
```

### Scenario: No matching trends found

```gherkin
Given the trending scanner ran successfully
And no trends scored above the moderate threshold for a channel
When modifying today's briefs
Then all topic_guidance fields remain unchanged
And the channel falls back to its static content pillars as normal
```

### Scenario: Scrapingdog API failure

```gherkin
Given the content engine has loaded today's briefs
When the trending scanner call to Scrapingdog fails (timeout, 4xx, 5xx)
Then log the error with response details
And proceed with the content pipeline unchanged (no topic modifications)
And the daily run is NOT blocked by trending scanner failure
```

### Scenario: Trending disabled for a channel

```gherkin
Given a channel has trending.enabled = false in projects.json
When the content engine runs for that channel
Then the trending scanner is skipped entirely for that channel
And topic_guidance is used as-is from the briefs
```

### Scenario: Optional pillar spike detection

```gherkin
Given a themed channel has trending.pillar_spike_detection = true
When the trending scanner runs
Then it also calls Scrapingdog Interest Over Time (GET /google_trends)
  with query = up to 5 content_pillars, date = "now 7-d", geo = US
And if any pillar jumped from below 30 to above 70 in the past 48 hours
Then that pillar is flagged as "spiking"
And the spiking pillar is boosted in topic_guidance even if not in global Trending Now
```

### Scenario: Calendar tagging for trend-matched content

```gherkin
Given a video's topic was influenced by a trending match
When the calendar item is created
Then the calendar JSON includes a trend_match object:
  | Field         | Value                              |
  | trend_title   | the matched trend's title          |
  | match_score   | the numeric score                  |
  | search_volume | the trend's search volume          |
  | match_type    | "strong" or "moderate" or "primary"|
And non-trend-matched videos have no trend_match field
```

### Scenario: No-fly list blocks unwanted topics

```gherkin
Given a channel has a no_fly_list in projects.json:
  | Category              | Example blocked terms                          |
  | politics              | election, democrat, republican, congress, trump |
  | religious_controversy | blasphemy, religious war, sect                  |
  | active_tragedy        | mass shooting, terrorist attack                |
  | custom                | (any terms the operator adds)                  |
When a trending topic's title or related_terms match any no-fly term
Then that trend is dropped before scoring
And it does not appear in matches for any channel with that no-fly rule
And the drop is logged: "Filtered trend '[title]' — matched no-fly: [category]"
```

### Scenario: Context enrichment via web search

```gherkin
Given a trend has been matched to a channel (strong, moderate, or primary)
When preparing the topic_guidance injection
Then perform a web search for the trend title (e.g. "Chuck Norris" + "trending")
And extract:
  | Field          | Purpose                                              |
  | why_trending   | 1-2 sentence summary of WHY this is trending now     |
  | event_type     | death, achievement, scandal, meme, legislation, science, pop_culture, other |
  | tone_signal    | respectful, celebratory, playful, neutral, cautionary |
  | safety_flag    | true if the context reveals the topic is actually sensitive despite passing the no-fly list |
And if safety_flag = true, drop the trend and log the reason
And include why_trending and tone_signal in the topic_guidance passed to the script writer
```

### Scenario: Tone signal shapes script and caption writing

```gherkin
Given a trend has context enrichment with tone_signal = "respectful"
  (e.g. a celebrity death)
When the topic_guidance is injected into the brief
Then the guidance includes:
  "TONE: respectful. Acknowledge the event. Frame facts as a tribute or legacy,
   not as clickbait. Avoid exclamation marks and sensationalist hooks."
And the script writer uses this tone to shape the hook, narration, and caption

Given a trend has tone_signal = "playful" (e.g. a viral meme)
Then the guidance includes:
  "TONE: playful. Lean into the fun. Hooks can be punchy and surprising."

Given a trend has tone_signal = "neutral" (e.g. a scientific discovery)
Then the guidance includes:
  "TONE: neutral. Straightforward facts. Let the information speak for itself."
```

### Scenario: Fact-check gate on trend-matched content

```gherkin
Given a video script was written for a trend-matched topic
And the channel has fact_check.enabled = true in projects.json
When the script is ready but BEFORE rendering
Then send the script + source context to a truth-seeking model (Grok)
  with the prompt:
  "Here is a video script about [trending topic].
   Here is the source context from web search.
   Check for: factual errors, misleading framing, unverifiable claims,
   outdated information, or claims presented as fact that are actually disputed.
   Respond with PASS or FAIL + specific corrections."
And if PASS → proceed to render as normal
And if FAIL → apply Grok's corrections to the script, then re-check (max 1 retry)
And if FAIL after retry → drop this trend slot, fall back to static pillar topic
And log the fact-check result (pass/fail, corrections applied) for analytics
```

### Scenario: Fact-check gate skipped for non-trending content

```gherkin
Given a video was NOT influenced by a trending topic
When the script is ready for rendering
Then the fact-check gate is skipped (no extra LLM call)
And the pipeline proceeds as normal
```

### Scenario: Fact-check gate disabled

```gherkin
Given a channel has fact_check.enabled = false in projects.json
When a trend-matched script is ready for rendering
Then the fact-check gate is skipped
And the pipeline proceeds as normal
```

### Scenario: Dedup — don't repeat a trending topic

```gherkin
Given a trend was used as a strong match for a channel yesterday
And that trend is still in today's Trending Now results
When matching trends to the same channel
Then that trend's score is reduced by 5 points (recency penalty)
And if the penalized score drops below the threshold, skip it
And prefer fresh trends over repeated ones
```

---

## Pipeline Integration Point

```
Task 2: Daily Content Creation

  Step 1:   Load today's briefs              ← unchanged
  Step 1.5: Pull trending topics             ← NEW (1 Scrapingdog call)
  Step 1.6: Filter through no-fly list      ← NEW (hard block on unwanted categories)
  Step 1.7: Match trends to channels         ← NEW (per-channel scoring)
  Step 1.8: Context enrichment (web search)  ← NEW (why is it trending? tone? safe?)
  Step 1.9: Modify topic_guidance in briefs  ← NEW (enriched with context + tone signal)
  Step 2:   Create videos (now trend-aware)  ← unchanged (reads modified topic_guidance)
  Step 2.5: Fact-check gate (Grok)          ← NEW (trend-matched scripts only, pass/fail)
  Step 3:   Render and upload                ← unchanged
  Step 4:   Schedule via Zernio              ← unchanged
  Step 5:   Tag the calendar                 ← add trend_match metadata
```

---

## Configuration (projects.json)

Per-project trending config added to each project entry:

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
    "fact_check": {
      "enabled": false
    }
  }
}
```

For Viral Facts Unlocked:

```json
{
  "trending": {
    "enabled": true,
    "mode": "primary",
    "api_key_env": "SCRAPINGDOG_API_KEY",
    "geo": "US",
    "language": "en",
    "min_volume": 20000,
    "pillar_spike_detection": false,
    "no_fly_list": ["politics", "religious_controversy", "active_tragedy"],
    "fact_check": {
      "enabled": true,
      "model": "grok"
    }
  }
}
```

---

## API Cost

| Call | Credits | Frequency |
|------|---------|-----------|
| Trending Now (1 call, all channels) | 5 | Daily |
| Pillar Spike Detection (per channel) | 5 each | Daily, optional |
| **Total (5 themed channels + 1 viral)** | **30** | **Daily** |

---

## What This Does NOT Change

- Template variables (hook_type, video_length, etc.) — those come from analytics loop
- Explore slot topics — those test structural changes, not topic changes
- Brief structure — topic_guidance is appended/prepended, never replaced (except primary mode)
- Analytics scoring model — unchanged
- Scheduling — unchanged

---

## User Journey

1. Analytics loop generates briefs with topic_guidance (existing)
2. **Content engine loads briefs → trending scanner enriches topic_guidance → videos created**
3. Videos scheduled and posted as usual (existing)
4. Analytics loop scores posts, correlates trend_match metadata with performance (future)

---

## Open Questions

- [ ] What's the right min_volume for Viral Facts primary mode? (proposed: 20K)
- [ ] Should we add LLM-based semantic matching (score += 5) for themed channels, or is exact keyword matching sufficient for v1?
- [ ] Should pillar spike detection be on by default or opt-in?
- [ ] How long should the recency penalty last for repeated trends? (proposed: 24 hours)
- [ ] No-fly list: stored in projects.json per channel, or a shared global list in a separate file?
- [ ] Should no-fly terms support regex/wildcards, or exact substring matching only?
- [ ] Web search provider for context enrichment — Scrapingdog web search, or a different API?
- [ ] Fact-check gate: enabled by default for primary mode only, or all trending content?
- [ ] Should fact-check failures be reported somewhere (Slack, daily briefing) for visibility?

## Learnings

<!-- This section grows over time via /compound -->
