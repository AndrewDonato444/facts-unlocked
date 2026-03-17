# Scoring Model — Engagement Density

This document defines the scoring formula used by the analytics-loop skill to rank post performance.

---

## The Formula

```
engagement_density = (shares × 4 + saves × 3 + comments × 2 + likes × 1) / impressions × 1000
```

The formula produces a **per-thousand-impressions** score that measures how efficiently a post converts attention into meaningful engagement.

---

## Weight Rationale

| Metric | Weight | Rationale |
|--------|--------|-----------|
| shares | ×4 | Directly generates new impressions. A share is free distribution. Strongest signal of content worth spreading. |
| saves | ×3 | Indicates lasting value. For fact-based content, a save means the fact was interesting enough to bookmark. Second strongest signal. |
| comments | ×2 | Signals content provoked a reaction. On faceless fact channels, comments are often low-effort (tags, "wow"), so weighted below saves. |
| likes | ×1 | Lowest-effort engagement. Noisiest signal. Baseline weight only. |

**Why normalize by impressions?** Dividing by impressions prevents videos that happened to get broader algorithmic distribution from automatically winning. The goal is to find content that converts attention into action most efficiently — not content that the algorithm happened to push.

---

## Minimum Threshold

**Posts with fewer than 500 impressions are excluded.**

Below this threshold, the data is too noisy to be meaningful — the platform likely didn't distribute the post widely enough for the engagement signal to be reliable. This prevents failed distributions from polluting the scoring.

For new channels with small audiences, lower to **200 impressions** via project config:

```json
{
  "analytics_loop": {
    "min_impressions": 200
  }
}
```

---

## Score Breakdown

Each scored post includes a component breakdown for debugging and analysis:

```json
{
  "score": {
    "engagementDensity": 28.7,
    "rawScore": 442,
    "components": {
      "sharesContribution": 180,
      "savesContribution": 201,
      "commentsContribution": 56,
      "likesContribution": 5
    }
  }
}
```

This reveals which metric is driving the score. A post with high `sharesContribution` is going viral; a post with high `savesContribution` has lasting reference value.

---

## Cross-Channel Aggregation

After scoring every post individually, aggregate at multiple levels:

### Per-Channel Metrics
- Top performer per channel
- Average engagement density per channel
- Score distribution (median, p75, p90)

### Global Metrics
- Global top performer (across all channels)
- Global average engagement density
- Channels ranked by average score

### Trend Metrics (requires 2+ scoring cycles)
- Score delta vs. previous cycle per channel
- Score delta vs. previous cycle globally
- Improving vs. declining channels

---

## Score Interpretation

| Range | Label | Meaning |
|-------|-------|---------|
| 0–5 | Low | Below average conversion. Content reached people but didn't compel action. |
| 5–15 | Average | Baseline for most content. Functional but not exceptional. |
| 15–30 | High | Strong engagement. This content is resonating with the audience. |
| 30+ | Exceptional | Viral-tier conversion. Study this content's structure closely. |

These ranges are approximate and vary by platform, niche, and audience size. Use them as starting guides, then calibrate based on your own data.

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| 0 impressions | Exclude (would cause division by zero) |
| Exactly 500 impressions | Include (threshold is "fewer than 500") |
| All-zero engagement | Score = 0.00, included in dataset |
| Post younger than 48 hours | Exclude from scoring (platforms haven't finished distributing) |
| Missing metrics (e.g., saves not reported) | Treat as 0 for that metric |

---

## Tuning Weights

Scoring weights can be overridden per project in `projects.json`:

```json
{
  "analytics_loop": {
    "scoring_weights": {
      "shares": 4,
      "saves": 3,
      "comments": 2,
      "likes": 1
    }
  }
}
```

When to adjust:
- **Increase comment weight** for channels where comments drive algorithm visibility (YouTube)
- **Decrease save weight** for platforms that don't report saves (Twitter/X)
- **Increase share weight** for growth-focused campaigns where reach matters most
