# Facts Unlocked — Vision

> A fully automated, self-improving content network that publishes "Facts Unlocked"
> short-form video and image content across YouTube, Instagram, and TikTok.

---

## Overview

Facts Unlocked is a portfolio of social media channels unified under the "Facts Unlocked"
brand umbrella. Most channels are **themed** (babies, food, fitness, money, etc.).
Some channels like **Viral Facts Unlocked** source their topics from trending news/social
signals instead of a fixed theme — but once a topic is selected, it flows through the
same standard short-form content generation and analytics pipeline as every other channel.

Content is planned, generated, published, measured, and optimized entirely by the
DonatoSkills autonomous skill chain, with minimal human intervention.

**Target users**: Social media audiences interested in bite-sized, surprising facts
across lifestyle, health, finance, and culture topics.

**Core value proposition**: Scalable, autonomous content production that continuously
improves itself — every cycle of publish → measure → learn → create feeds better-
performing content into the next cycle.

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

| Area | Purpose | Priority |
|------|---------|----------|
| Trending Scanner | Find viral topics above threshold → feed into standard content pipeline | Core |
| Content Engine | Plan calendars, batch-generate content across all channels | Core |
| Video Generation (Remotion) | Create short-form fact videos with TTS, images, kinetic text | Core |
| Image Generation | AI-generated visuals for thumbnails, carousels, quote cards | Core |
| Social Media Scheduling | Publish to YouTube, Instagram, TikTok via Buffer / Zernio | Core |
| Analytics Loop | Collect metrics → score → decompose winners → generate optimized briefs | Core |
| Text Writer | Platform-adapted captions, hooks, descriptions | Core |
| Project Registry | Per-channel configuration (API keys, accounts, brand settings) | Supporting |
| Setup / Onboarding | Spin up new "Facts Unlocked" channels quickly | Supporting |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Build System | SDD (Spec-Driven Development) via auto-sdd |
| Execution Layer | DonatoSkills skill chain (Claude Code skills) |
| Video | Remotion (React-based programmatic video) |
| Image Gen | Gemini / OpenAI image models |
| TTS | Grok / Gemini / ElevenLabs |
| Media Hosting | Cloudinary |
| Scheduling | Buffer (YouTube, Instagram) / Zernio (TikTok) |
| Analytics | DonatoSkills analytics-loop (5-phase self-improving cycle) |
| Orchestration | Content Engine skill + scheduled tasks |

---

## Architecture: The Autonomous Loop

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
└──────────────┬──────────────────────────────────────────────┘
               │ publishes
               ▼
┌──────────────────────────┐
│   YouTube / IG / TikTok  │
└──────────────┬───────────┘
               │ metrics flow back
               ▼
┌─────────────────────────────────────────────────────────────┐
│                   ANALYTICS LOOP                             │
│  Collect → Score → Suppress losers → Decompose winners      │
│  → Generate optimized briefs → feed back to Content Engine  │
└─────────────────────────────────────────────────────────────┘
```

The analytics loop uses a weighted scoring system (shares 4x, saves 3x, comments 2x,
likes 1x) and an exploit/explore ratio (2:1) to balance proven formats with experiments.
Templates that show ≥15% lift across ≥3 channels over ≥2 cycles get promoted.

---

## Design Principles

1. **Autonomy first** — The system should run end-to-end without human intervention
2. **Self-improving** — Every analytics cycle makes the next batch of content better
3. **Channel-as-config** — Adding a new "Facts Unlocked" topic = adding a project entry, not writing new code
4. **Platform-native** — Content adapts to each platform's specs (aspect ratio, duration, caption style)
5. **Scalable by design** — The architecture supports N channels without linear effort growth

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
