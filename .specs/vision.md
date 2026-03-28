# Facts Unlocked — Vision

> Build a monetized content network that produces highly consumable, informative, and viral
> short-form and long-form video across YouTube, Instagram, and TikTok — at scale, autonomously.

---

## Mission

**Get monetized. Go viral. Stay informative.**

Every feature, every pipeline optimization, every new channel exists to serve one goal:
producing content that audiences watch, share, and come back for — generating revenue
across every platform we publish to.

We measure success by: **views, watch time, shares, subscriber growth, and monetization
revenue.** Everything we build should directly move at least one of those numbers.

---

## Overview

Facts Unlocked is a portfolio of social media channels unified under the "Facts Unlocked"
brand umbrella. Most channels are **themed** (babies, food, fitness, money, etc.).
Some channels like **Viral Facts Unlocked** source their topics from trending news/social
signals instead of a fixed theme — but once a topic is selected, it flows through the
same content generation and analytics pipeline as every other channel.

Content spans **two formats**:
- **Short-form** (< 60s) — the volume play. High output, algorithm-friendly, optimized for shares and saves.
- **Long-form** (8–15 min) — the monetization play. YouTube ad revenue requires watch time; long-form is where the money is.

Content is planned, generated, published, measured, and optimized entirely by the
DonatoSkills autonomous skill chain, with minimal human intervention.

**Target audience**: Social media users who consume bite-sized, surprising facts
across lifestyle, health, finance, and culture topics.

**Core value proposition**: Scalable, autonomous content production that continuously
improves itself — every cycle of publish → measure → learn → create feeds better-
performing, more viral content into the next cycle, driving monetization growth.

---

## Monetization Strategy

| Platform | Monetization Path | Key Metric |
|----------|-------------------|------------|
| YouTube (Shorts) | YouTube Partner Program (Shorts revenue share) | Views, subscriber growth |
| YouTube (Long-form) | Ad revenue (mid-rolls, pre-rolls) | Watch time, RPM |
| Instagram (Reels) | Bonuses, brand deals, audience funnel | Reach, shares |
| TikTok | Creator Fund, brand deals, audience funnel | Views, followers |

We want to be monetized on every platform — no single platform takes priority over another.

**Monetization milestones**:
1. Hit YouTube Partner Program thresholds per channel (1K subs + 4K watch hours OR 10M Shorts views)
2. Maximize RPM through watch-time optimization on long-form
3. Scale channels to diversify revenue streams
4. Explore brand deals / sponsorship once audience is established

---

## Channel Roster

| Channel Theme | Platforms | Content Focus |
|---------------|-----------|---------------|
| Baby Facts Unlocked | YouTube, Instagram, TikTok | Pregnancy, newborns, child development |
| Food Facts Unlocked | YouTube, Instagram, TikTok | Nutrition, cooking science, food history |
| Fitness Facts Unlocked | YouTube, Instagram, TikTok | Exercise science, body mechanics, health |
| Money Facts Unlocked | YouTube, Instagram, TikTok | Personal finance, economics, wealth building |
| Viral Facts Unlocked | YouTube, TikTok | Trending topics, viral news, moment-of-now facts |
| *(expandable)* | YouTube, Instagram, TikTok | Any topic fitting the "Facts Unlocked" format |

---

## Key Areas

| Area | Purpose | Why It Matters for Monetization | Priority |
|------|---------|--------------------------------|----------|
| Content Engine | Plan calendars, batch-generate content across all channels | Volume + consistency = algorithm favor | Core |
| Video Generation (Remotion) | Short-form fact videos with TTS, images, kinetic text | The product itself — what people watch | Core |
| Long-form Pipeline | 8–15 min deep-dive videos with narration + visuals | Highest RPM content; YouTube ad revenue driver | Core |
| Trending Scanner | Find viral topics above threshold → inject into pipeline | Riding trends = outsized reach + new subscribers | Core |
| Analytics Loop | Collect → Score → Decompose winners → Generate optimized briefs | Makes every batch more viral than the last | Core |
| Image Generation | AI-generated visuals for thumbnails, carousels, scenes | Click-through rate on thumbnails drives everything | Core |
| Text Writer | Platform-adapted captions, hooks, descriptions, SEO titles | Hooks stop the scroll; SEO brings search traffic | Core |
| Social Media Scheduling | Publish to YouTube, Instagram, TikTok via Buffer / Zernio | Consistent posting schedule = algorithm trust | Core |
| Project Registry | Per-channel configuration (API keys, accounts, brand settings) | Enables scaling to N channels efficiently | Supporting |
| Setup / Onboarding | Spin up new "Facts Unlocked" channels quickly | Faster new channel launch = faster revenue diversification | Supporting |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Build System | SDD (Spec-Driven Development) via auto-sdd |
| Execution Layer | DonatoSkills skill chain (Claude Code skills) |
| Video (Short-form) | Remotion (React-based programmatic video) |
| Video (Long-form) | Remotion + extended scene system |
| Image Gen | Grok / OpenAI image models |
| TTS | Grok / ElevenLabs |
| Media Hosting | Cloudinary |
| Scheduling | Buffer (YouTube, Instagram) / Zernio (TikTok) |
| Analytics | DonatoSkills analytics-loop (5-phase self-improving cycle) |
| Orchestration | Content Engine skill + scheduled tasks |

---

## Architecture: The Viral Content Loop

```
┌──────────────────────┐     ┌─────────────────────────┐
│  THEMED CHANNELS     │     │  TRENDING SCANNER       │
│  (fixed topic)       │     │  (viral topic ≥ threshold)│
└──────────┬───────────┘     └──────────┬──────────────┘
           │                            │
           └────────────┬───────────────┘
                        ▼ topics
┌─────────────────────────────────────────────────────────────┐
│                    CONTENT ENGINE                            │
│  Calendar planning → Skill dispatch → Upload → Schedule     │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐                         │
│  │ SHORT-FORM  │  │  LONG-FORM   │                         │
│  │ (volume)    │  │  (revenue)   │                         │
│  └─────────────┘  └──────────────┘                         │
└──────────────┬──────────────────────────────────────────────┘
               │ publishes
               ▼
┌──────────────────────────┐
│   YouTube / IG / TikTok  │
│   (monetized channels)   │
└──────────────┬───────────┘
               │ metrics flow back
               ▼
┌─────────────────────────────────────────────────────────────┐
│                   ANALYTICS LOOP                             │
│  Collect → Score → Suppress losers → Decompose winners      │
│  → Generate optimized briefs → feed back to Content Engine  │
│                                                             │
│  Optimizing for: shares (4x), saves (3x), comments (2x),   │
│  likes (1x) — the signals that drive virality + reach       │
└─────────────────────────────────────────────────────────────┘
```

The analytics loop uses an exploit/explore ratio (2:1) to balance proven viral formats
with experiments. Templates that show ≥15% lift across ≥3 channels over ≥2 cycles get promoted.

---

## Design Principles

1. **Viral by default** — Every content decision optimizes for shareability, watch time, and algorithmic reach
2. **Monetization-aware** — Features are prioritized by their impact on revenue (watch time, RPM, subscriber growth)
3. **Autonomy first** — The system should run end-to-end without human intervention
4. **Self-improving** — Every analytics cycle makes the next batch of content more viral
5. **Channel-as-config** — Adding a new "Facts Unlocked" topic = adding a project entry, not writing new code
6. **Platform-native** — Content adapts to each platform's specs, algorithm preferences, and monetization rules
7. **Scalable by design** — The architecture supports N channels without linear effort growth

---

## The Virality Checklist

Every piece of content should pass this filter before publishing:

- **Hook in first 1–2 seconds** — pattern interrupt that stops the scroll
- **Curiosity gap** — makes the viewer need to know the answer
- **Shareable insight** — the viewer wants to tell someone else
- **Clean pacing** — no dead air, no filler, every second earns the next
- **Platform-optimized** — right aspect ratio, duration, caption style, hashtags
- **SEO-ready** (YouTube) — title, description, tags optimized for search discovery

---

## Out of Scope (for now)

- Live streaming
- Community management / comment replies
- Paid advertising / promotion
- Non-English languages
- Platforms beyond YouTube, Instagram, TikTok

---

## Reference

**Build layer**: auto-sdd (SDD spec-driven development framework)
**Execution layer**: DonatoSkills (autonomous content skill chain)
**Created**: 2026-03-17
**Updated**: 2026-03-20
