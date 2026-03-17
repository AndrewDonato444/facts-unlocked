---
feature: Continuous Learning Loop
domain: analytics
source: DonatoSkills/analytics-loop/scripts/research-loop.js
tests:
  - DonatoSkills/analytics-loop/scripts/__tests__/research-loop.test.js
components: []
personas: []
status: implemented
created: 2026-03-17
updated: 2026-03-17
---

# Continuous Learning Loop

**Source File**: DonatoSkills/analytics-loop/scripts/research-loop.js
**Design System**: N/A (CLI tool — no UI)
**Related**: DonatoSkills/analytics-loop/scripts/generate-briefs.js

## Feature: Weekly External Algorithm Research

Scans high-signal external sources weekly for the latest YouTube Shorts algorithm
and creator strategy insights, then outputs a structured brief that the content
engine can use to inform its next batch of content briefs.

This is the **external** complement to the internal analytics loop. The internal
loop asks "what's working in our channels?" — this loop asks "what should we be
testing next, based on what's happening in the broader creator ecosystem?"

---

### Scenario: Weekly research run (happy path)

```gherkin
Given the research loop is invoked with a valid project slug and date
When it fetches from all available sources (web search, vidIQ, Reddit)
And finds at least 3 relevant algorithm/tactic signals published in the last 7 days
Then it writes a weekly brief to analytics-loop/data/global/research/YYYY-WW/brief.json
And the brief contains: signals[], tactics[], per_channel_recommendations[], action_items[]
And it exits with code 0 and prints RESEARCH_COMPLETE
```

### Scenario: Partial source failure (graceful degradation)

```gherkin
Given one or more sources are unreachable or return no results
When the loop attempts to fetch from all sources
Then it skips the unavailable source and logs a warning
And continues with remaining sources
And writes the brief with whatever data was collected
And notes the skipped sources in brief.sources_skipped[]
And does NOT exit with an error if at least 2 sources returned data
```

### Scenario: No recent content found across all sources

```gherkin
Given all sources return content older than 7 days
When the loop scans for new algorithm/tactic signals
Then it writes a brief with signals: [], tactics: []
And includes a note: "No new signals found this week — carry forward previous week's tactics"
And exits with code 0 (not an error condition)
```

### Scenario: Cross-reference with internal analytics (integration)

```gherkin
Given a completed research brief exists for the current week
And scored-posts.json exists for the project from a recent run
When generate-briefs.js runs for the same project
Then it reads the latest research brief from analytics-loop/data/global/research/
And injects the top 1-2 tactics from the brief into the topic_guidance field
  of each brief slot's topic_guidance as "External signal: <tactic>"
And does not override the exploit/explore template variables (those come from internal data only)
```

### Scenario: Pattern archive accumulation

```gherkin
Given the research loop has run for N weeks (N >= 2)
When a tactic appears in research briefs for >= 2 consecutive weeks
Then it is added to analytics-loop/data/global/research/pattern-archive.json
With fields: tactic, first_seen, last_seen, weeks_observed, source_count
```

### Scenario: Scheduled weekly run via cron

```gherkin
Given the research loop is configured as a scheduled task
When the current day is Monday
Then it automatically runs research-loop.js for all registered projects
And writes output to the correct week-stamped directory
And logs RESEARCH_COMPLETE or RESEARCH_NO_SIGNALS to stdout
```

---

## Architecture

```
External Sources                 research-loop.js                   Output
──────────────                   ────────────────                   ──────
Web search (Claude)  ──────────▶  Phase 1: Gather       ─────────▶ raw-signals.json
                                  (filter to last 7 days)
Reddit r/NewTubers   ──────────▶  Phase 2: Extract      ─────────▶ weekly-brief.json
r/SmallYoutubers                  (hooks, retention,                (signals, tactics,
                                   algo changes)                     per-channel recs)
vidIQ blog           ──────────▶  Phase 3: Synthesize   ─────────▶ pattern-archive.json
Creator Insider                   (cross-channel                    (accumulates over time)
                                   patterns)
Robert Benjamin      ──────────▶
channel (search)
                                          │
                                          ▼ (weekly brief injected into)
                                  generate-briefs.js
                                  topic_guidance field
                                  (does NOT change template variables)
```

---

## Data Schema

### weekly-brief.json

```json
{
  "generated_at": "ISO timestamp",
  "week": "YYYY-WW",
  "date": "YYYY-MM-DD",
  "sources_fetched": ["web-search", "reddit", "vidiq"],
  "sources_skipped": [],
  "signals": [
    {
      "signal": "Short description of algorithm change or tactic",
      "source": "Robert Benjamin / vidIQ / Reddit / web",
      "confidence": "high|medium|low",
      "faceless_applicable": true,
      "raw_quote": "Optional direct quote from source"
    }
  ],
  "tactics": [
    {
      "rank": 1,
      "tactic": "Actionable instruction for content creation",
      "why": "Rationale from source",
      "source": "source name",
      "test_ideas": ["hook variant", "cta variant", "length variant"]
    }
  ],
  "per_channel_recommendations": [
    {
      "channel": "Baby Facts Unlocked",
      "current_retention_context": "from internal scored-posts if available, else null",
      "recommendations": ["specific suggestion 1", "specific suggestion 2"],
      "test_ideas": ["hook variant A", "cta change B", "length test C"]
    }
  ],
  "action_items": [
    {
      "priority": 1,
      "item": "What to test this week",
      "why": "Evidence from source"
    }
  ],
  "carry_forward_note": null
}
```

### pattern-archive.json

```json
{
  "patterns": [
    {
      "tactic": "0.5s visual + verbal hook combo",
      "first_seen": "2026-WW",
      "last_seen": "2026-WW",
      "weeks_observed": 3,
      "source_count": 5
    }
  ],
  "last_updated": "YYYY-MM-DD"
}
```

---

## File Structure

```
DonatoSkills/analytics-loop/
├── scripts/
│   └── research-loop.js          ← new script (this feature)
└── data/
    └── global/
        └── research/
            ├── pattern-archive.json   ← accumulates over time
            └── YYYY-WW/               ← one dir per week
                ├── raw-signals.json
                └── brief.json
```

---

## Integration with generate-briefs.js

`generate-briefs.js` gets a small change: before generating briefs, it reads the
most recent `research/*/brief.json` (sorted by week desc) and injects into
`topic_guidance`:

```
"External signal (week YYYY-WW): <top tactic from brief>"
```

This is additive only. Template variables (hook_type, video_length, etc.) are
never touched by external research — those stay anchored to internal analytics.

---

## Source Priority & Fallback Order

| Priority | Source | Method | Filter |
|----------|--------|--------|--------|
| 1 | Robert Benjamin (@robertbenjamin) | Web search: "site:youtube.com robertbenjamin shorts algorithm 2026" | Last 7 days |
| 2 | vidIQ blog | WebFetch vidiq.com/blog + search | "YouTube Shorts" AND "2026" |
| 3 | Creator Insider | Web search: "site:youtube.com creatorinsider shorts" | Last 7 days |
| 4 | Reddit | Web search: "site:reddit.com shorts algorithm 2026 OR hooks march" | Last 7 days, r/NewTubers r/SmallYoutubers r/PartneredYoutube |
| 5 | General web | Web search: "YouTube Shorts algorithm update March 2026" | Last 7 days |

Minimum viable: at least 2 sources must return data. Otherwise write empty brief
with `carry_forward_note`.

---

## CLI Usage

```bash
# Run manually
node research-loop.js <project-slug> [--date YYYY-MM-DD] [--week YYYY-WW]

# Signals output (for orchestration)
RESEARCH_COMPLETE
SIGNALS_FOUND: <n>
TACTICS_EXTRACTED: <n>
BRIEF_PATH: analytics-loop/data/global/research/YYYY-WW/brief.json

# Or if nothing found:
RESEARCH_NO_SIGNALS
```

---

## User Journey

1. Analytics loop runs (`run-loop.js`) → internal brief generated from channel performance
2. **Research loop runs weekly (`research-loop.js`)** → external brief from creator ecosystem
3. Content engine reads both briefs → produces videos with internally-proven format + externally-informed topics/hooks
4. Analytics loop runs next cycle → measures if external signal recommendations lifted performance
5. Pattern archive grows → signals that keep recurring get promoted to "proven" status

---

## Scope Constraints (Evaluated from Grok Proposal)

**Adopted from Grok:**
- Explore/exploit framing (aligns with existing system)
- Source priority list (Robert Benjamin #1, Reddit #4)
- Faceless-friendly filter on all extracted tactics
- Weekly cadence with date-stamped output
- Action items with ranked priority
- Pattern archive for compounding learnings over time

**Modified from Grok:**
- Output is JSON (not Markdown pages) — integrates with existing Node.js pipeline
- Research brief injects into existing `generate-briefs.js` (no separate system)
- Template variables (hook_type, video_length, etc.) are immutable from external research
  — only topic_guidance is influenced. Internal data remains the source of truth.
- No YouTube API / vidIQ API required — uses web search (avoids new API keys)
- Scope: 1 script (`research-loop.js`) + minor change to `generate-briefs.js`

**Excluded (out of scope for v1):**
- YouTube Analytics API integration (separate feature)
- vidIQ/TubeBuddy export automation (requires accounts)
- Quarterly newsletter parsing (ICYMI, Creator Science)
- Automatic per-channel retention curves (uses scored-posts.json as proxy instead)

---

## Success Metrics

- Weekly: Brief generated with ≥3 signals and ≥3 ranked tactics
- Monthly: ≥1 external tactic confirmed by internal analytics as performance lift
- Quarterly: Pattern archive contains ≥5 "proven" tactics (seen ≥3 consecutive weeks)

---

## Learnings

### 2026-03-17

- **Pattern**: Decouple external research from internal analytics — `research-loop.js` provides signals to `generate-briefs.js` via `topic_guidance` injection only. Template variables (hook_type, video_length, etc.) remain anchored to internal performance data. External signals inform *what* to say, not *how* to format it.

- **Pattern**: ISO week stamps (`YYYY-WW`) are the right key for weekly recurring data — they're human-readable, naturally sort chronologically, and avoid timezone ambiguity if computed from noon UTC.

- **Pattern**: When a script depends on external sources that may be unavailable, design for graceful degradation first: `sources_skipped[]` + `carry_forward_note` make the output always valid even with zero data. The consumer (content-engine) can then decide whether to use or skip the brief.

- **Pattern**: `getLatestResearchBrief(dir)` — sort week-stamped directories descending, return first `brief.json` found. Simple, no database needed. Works because week stamps sort lexicographically.
