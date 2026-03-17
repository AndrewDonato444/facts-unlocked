# DonatoSkills — Vision

## Overview

DonatoSkills is a modular, self-improving social media automation engine built as a collection of Claude Code skills. It enables anyone to plug into an existing project and fully automate their content creation, scheduling, analysis, and iteration cycle — from idea to published post to performance-driven improvement — across video, image, and text formats.

The system is designed so that a single user (or autonomous agent) can produce a week's worth of multi-platform content in one session, schedule it, measure performance, and use those insights to improve the next batch — a closed self-improving loop.

## Target Users

| User | Use Case |
|------|----------|
| Solo creators / founders | Automate personal brand content without a team |
| Agencies / freelancers | Run multi-client content pipelines from one repo |
| Developers building AI products | Plug skills into their own automation workflows |
| Anyone with a Claude Code setup | Drop in the repo, connect APIs, start posting |

## Value Proposition

1. **Zero-to-scheduled in one conversation** — describe a topic, get videos/images/text created and queued
2. **Provider choice** — swap between providers per capability (Buffer or Late, Gemini or OpenAI, Gemini TTS or xAI)
3. **Multi-project by default** — `projects.json` routes content to the right brand, channels, and tone
4. **Self-improving loop** — analytics feed back into content strategy, hooks, and pillar weighting
5. **Modular skills** — use one skill standalone or let content-engine orchestrate the full pipeline
6. **Shared content intelligence** — hook formulas, platform specs, caption structures, and content pillars are centralized references that every skill draws from

## Key Areas

| Area | Purpose | Priority |
|------|---------|----------|
| Content Engine (Orchestrator) | Plans calendars, chains skills, schedules everything | P0 — Core |
| Remotion Video | Creates 15-60s animated videos with TTS voiceover | P0 — Core |
| Image Generation | AI-generated quote cards, graphics, product shots | P0 — Core |
| Text Writer | Platform-optimized posts (tweets, threads, LinkedIn, etc.) | P0 — Core |
| Social Media Scheduler | Scheduling and publishing via Buffer or Late | P0 — Core |
| Analytics Loop | Pull performance data, score posts, generate improved briefs | P0 — Core |
| Multi-Project Registry | Brand routing, per-project config, multi-client support | P0 — Core |
| Shared References | Hook writing, platform specs, caption structure, content pillars | P1 — Knowledge Base |
| Setup / Onboarding | Guided project onboarding, account connection, API key config | P2 — Quality of Life |

## Tech Stack

| Layer | Technology | Alternative |
|-------|-----------|-------------|
| Skill Runtime | Claude Code CLI (skills as markdown prompts) | — |
| Video Rendering | Remotion (React-based programmatic video) | — |
| Voice / TTS | Gemini TTS | xAI |
| Image Generation | Gemini (Nano Banana) | OpenAI |
| Text Generation | Claude (native, no external API) | — |
| Social Scheduling | Buffer (GraphQL API) | Late (REST API) |
| Analytics | Late Dev analytics API + Claude scoring | — |
| Media Hosting | Cloudinary (public URLs for scheduling APIs) | — |
| Multi-Project Config | `projects.json` (local JSON registry) | — |

## Architecture

```
┌──────────────────────────────────────────────────┐
│                 content-engine                    │
│        (orchestrator — plans + chains)            │
└────┬──────────┬──────────┬──────────┬────────────┘
     │          │          │          │
     ▼          ▼          ▼          ▼
┌─────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐
│ remotion │ │ image  │ │  text   │ │  social  │
│ -video   │ │ -gen   │ │ -writer │ │ -media   │
│          │ │        │ │         │ │          │
│ TTS:     │ │ Model: │ │         │ │ API:     │
│ Gemini / │ │ Gemini │ │         │ │ Buffer / │
│ xAI      │ │ OpenAI │ │         │ │ Late     │
└────┬─────┘ └───┬────┘ └────┬────┘ └─────┬────┘
     │           │           │             │
     ▼           ▼           ▼             ▼
  .mp4 files  .png files  posts.md    Scheduling API
     │           │                        ▲
     └───────────┴── Cloudinary ──────────┘
                                          │
                              ┌────────────┘
                              ▼
                    ┌──────────────────┐
                    │  analytics-loop  │
                    │  Pull metrics →  │
                    │  Score posts →   │
                    │  Generate briefs │
                    └────────┬─────────┘
                             │
                             ▼
                    Improved next batch

Shared References (read by all skills):
  hook-writing | platform-specs | caption-writing | content-pillars | analytics-schema
```

## The Self-Improving Loop

```
Plan content → Create assets → Schedule posts → Measure performance
     ▲                                                    │
     └────────── analytics-loop refines strategy ◄────────┘
```

1. **Content-engine** plans a batch based on pillars, past performance, and brand context
2. **Skills** create videos, images, and text (choosing provider per project config)
3. **Social-media** schedules everything via Buffer or Late
4. **Analytics-loop** pulls engagement data, scores each post, decomposes what worked
5. **Generate briefs** — top-performing patterns feed into the next content batch
6. **Next batch is better than the last** — automatically

## Design Principles

1. **Plug-and-play** — clone the repo, set API keys, start creating content
2. **Each skill stands alone** — any skill works independently; the engine is optional
3. **Provider-agnostic** — swap image gen, TTS, or scheduling providers via project config
4. **Shared knowledge, not duplicated logic** — content intelligence lives in shared references
5. **Multi-brand from day one** — `projects.json` routes to the right brand/channels/tone
6. **Self-improving** — analytics close the loop between posting and planning
7. **Convention over configuration** — output paths, signal formats, and orchestration contracts are standardized

## Out of Scope

- **Not a social media management UI** — CLI/agent-first, not a dashboard
- **Not a CMS** — content is generated and scheduled, not stored long-term
- **Not a Buffer/Late replacement** — those handle posting; this handles everything upstream and downstream
- **Not platform-specific** — skills are platform-aware but not locked to any one platform

---

_This file is created by `/vision` and serves as the north star for `/build-next` decisions._
_Update with `/vision --update` to reflect what's been built and learned._
