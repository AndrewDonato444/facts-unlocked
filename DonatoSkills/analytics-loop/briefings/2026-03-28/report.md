# Daily Briefing Report — 2026-03-28

**Run Date**: 2026-03-28
**Schedule Date**: 2026-03-29
**Mode**: Brief-driven (cold start — explore only)
**Status**: ✅ Complete

---

## Summary

| Metric | Value |
|--------|-------|
| Videos created | 9 |
| Projects processed | 3 (baby, money, ai) |
| Brief type | explore (cold start) |
| Winning templates used | 0 (no analytics data yet) |
| Hook types used | 7 distinct variants |
| Duplicate permutations | 0 |
| Total TTS cost | $0.0379 |
| Total image-gen cost | $0.1800 |
| Total run cost | $0.2179 |

---

## Brief Source

No analytics data available yet (all projects in cold start). Using 2026-03-27 briefs (dated for 2026-03-28 delivery) — all 3 slots per project are `explore` type with instruction to maximize variable diversity.

No `2026-03-28` brief directory found in `analytics-loop/data/{project}/` — analytics loop last ran on 2026-03-27. Next analytics run expected ~2026-03-29.

---

## Videos Scheduled

### Baby Facts Unlocked
| # | Slug | Hook | Voice | Overlay | Scheduled |
|---|------|------|-------|---------|-----------|
| 001 | newborn-salt-blind | question | Puck | karaoke | 2026-03-29 09:00 EST |
| 002 | baby-eye-color-melanin | did_you_know | Aoede | full_captions | 2026-03-29 14:00 EST |
| 003 | baby-immune-at-birth | most_people_dont_know | Kore | keywords | 2026-03-29 19:00 EST |

### Money Facts Unlocked
| # | Slug | Hook | Voice | Overlay | Scheduled |
|---|------|------|-------|---------|-----------|
| 004 | gold-standard-1971 | controversy | Charon | karaoke | 2026-03-29 09:00 EST |
| 005 | student-loan-nondischargeable | myth_bust | Kore | full_captions | 2026-03-29 14:00 EST |
| 006 | index-fund-outperformance | stat_lead | Aoede | karaoke | 2026-03-29 19:00 EST |

### AI Facts Unlocked
| # | Slug | Hook | Voice | Overlay | Scheduled |
|---|------|------|-------|---------|-----------|
| 007 | ai-water-usage | controversy | Puck | full_captions | 2026-03-29 09:00 EST |
| 008 | ai-fda-approved-imaging | what_if | Charon | keywords | 2026-03-29 14:00 EST |
| 009 | ai-bias-documented | stat_lead | Kore | full_captions | 2026-03-29 19:00 EST |

---

## Variable Diversity (Cold Start Optimization)

| Variable | Values Used | Coverage |
|----------|-------------|----------|
| hook_type | question, did_you_know, most_people_dont_know, controversy (×2), myth_bust, stat_lead (×2), what_if | 7 of 8 types |
| voice | Puck (×2), Aoede (×2), Kore (×3), Charon (×2) | All 4 voices |
| text_overlay | karaoke (×3), full_captions (×4), keywords (×2) | All 3 types |
| voice_pace | fast (×4), moderate (×5) | Both paces |
| music_energy | energetic (×2), gentle, subtle, tense (×3), driving, cinematic | 6 of 7 types |

---

## Topic Deduplication

All 9 topics verified against `used-topics.md` (Baby #043-045, Money #034-036, AI #024-026). No duplicates.

**Baby registry now at**: 045 topics
**Money registry now at**: 036 topics
**AI registry now at**: 026 topics

---

## Cost Breakdown

| Project | TTS chars | TTS cost | Images | Image cost | Total |
|---------|-----------|----------|--------|------------|-------|
| baby-facts-unlocked | 1,737 | $0.0125 | 15 | $0.0600 | $0.0725 |
| money-facts-unlocked | 1,798 | $0.0129 | 15 | $0.0600 | $0.0729 |
| ai-facts-unlocked | 1,748 | $0.0125 | 15 | $0.0600 | $0.0725 |
| **Total** | **5,283** | **$0.0379** | **45** | **$0.1800** | **$0.2179** |

---

## Next Steps

- Analytics loop will pull engagement data on 2026-03-29 videos after 48hrs
- First performance data available ~2026-03-31
- Current run: pure explore — all 9 videos are new permutation experiments
- Watch for hook_type signal: question vs did_you_know vs stat_lead performance spread
