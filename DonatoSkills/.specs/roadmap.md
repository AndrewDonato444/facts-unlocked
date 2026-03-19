# Build Roadmap

> Ordered list of features to implement. Each feature should be completable within a single agent context window.
> Updated by `/roadmap`, `/clone-app`, `/roadmap-triage`, and `/build-next`.

## Implementation Rules

**Every feature in this roadmap must be implemented with real data, real API calls, and real database operations.** No exceptions.

- **No mock data** — never use hardcoded arrays, fake JSON, or placeholder content to simulate functionality. If a feature needs data, it reads from the database or calls a real API.
- **No fake API endpoints** — every endpoint must do real work. No routes that return static JSON.
- **No placeholder UI** — components must be wired to real data sources. If the data isn't available yet, show a proper empty state, not fake data.
- **No "demo mode"** — features either work end-to-end or they aren't done. A feature is only ✅ when a real user can use it with their real data.
- **Real validation** — forms validate against real constraints, not just "is this field filled in?"
- **Real error handling** — API failures, empty results, rate limits, and edge cases must be handled, not ignored.
- **Test against real flows** — when verifying a feature, use the app as a user would. Trigger real API calls, see real results.

---

## Progress

<!-- Auto-updated summary -->

| Status | Count |
|--------|-------|
| ✅ Completed | 10 |
| 🔄 In Progress | 0 |
| ⬜ Pending | 2 |
| ⏸️ Blocked | 0 |

**Last updated**: 2026-03-19

---

## Phase 1: Foundation

> Core infrastructure and authentication. Must be built first.

| # | Feature | Source | Jira | Complexity | Deps | Status |
|---|---------|--------|------|------------|------|--------|
| <!-- 1 --> | <!-- Auth: User signup --> | <!-- clone-app --> | <!-- PROJ-101 --> | <!-- M --> | <!-- - --> | <!-- ⬜ --> |

---

## Phase 2: Core Features

> Primary user-facing functionality.

| # | Feature | Source | Jira | Complexity | Deps | Status |
|---|---------|--------|------|------------|------|--------|
| <!-- 10 --> | <!-- Dashboard --> | <!-- clone-app --> | <!-- PROJ-110 --> | <!-- L --> | <!-- 1,2 --> | <!-- ⬜ --> |

---

## Phase 3: Analytics Loop Enhancement

> Filling in algorithm stubs identified during code review audit.

| # | Feature | Source | Jira | Complexity | Deps | Status |
|---|---------|--------|------|------------|------|--------|
| 20 | Analytics: Variable inference from post content | code-review S8 | - | M | - | ✅ |
| 21 | Analytics: Per-channel overrides (requires 3+ cycles) | code-review S9 | - | M | 20 | ✅ |
| 22 | Analytics: Pairwise combination tracking | code-review S10 | - | S | - | ✅ |

---

## Phase 4: Long-Form YouTube Content

> Long-form video generation (15-25 min) for YouTube, starting with Baby Facts Unlocked.

| # | Feature | Source | Jira | Complexity | Deps | Status |
|---|---------|--------|------|------------|------|--------|
| 30 | Longform: Skill scaffold + script generation | spec | - | M | - | ✅ |
| 31 | Longform: Image orchestration + cache integration | spec | - | M | 30 | ✅ |
| 32 | Longform: TTS pipeline (ElevenLabs/Grok multi-scene) | spec | - | M | 30 | ✅ |
| 33 | Longform: Remotion composition (Ken Burns + chapters) | spec | - | L | 31, 32 | ✅ |
| 34 | Longform: Content engine + analytics integration (Zernio YouTube daily views) | spec | - | M | 33 | ✅ |
| 35 | Longform: Testing vectors + publish time optimization | spec | - | S | 34 | ✅ |
| 36 | Longform: Dry-run + cost optimization | spec | - | S | 35 | ✅ |
| 37 | Longform: YouTube Data API retention curves (Phase 5b) | spec | - | M | 34 | ⬜ |
| 38 | Longform: Local TTS via Kokoro-82M (Apple Silicon, stubbed) | spec | - | M | 32 | ⬜ |

---

## Ad-hoc Requests

> Features added from Slack/Jira that don't fit a phase. Processed after current phase.

| # | Feature | Source | Jira | Complexity | Deps | Status |
|---|---------|--------|------|------------|------|--------|
| <!-- 100 --> | <!-- Export to CSV --> | <!-- jira:PROJ-456 --> | <!-- PROJ-456 --> | <!-- S --> | <!-- 10 --> | <!-- ⬜ --> |

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ⬜ | Pending - not started |
| 🔄 | In Progress - currently being built |
| ✅ | Completed - PR merged |
| ⏸️ | Blocked - waiting on dependency or decision |
| ❌ | Cancelled - no longer needed |

## Complexity Legend

| Symbol | Meaning | Typical Scope |
|--------|---------|---------------|
| S | Small | Single component, few files |
| M | Medium | Multiple components, moderate logic |
| L | Large | Full feature, many files, complex logic |

---

## Notes

<!-- Any important context for the roadmap -->

---

_This file is the single source of truth for `/build-next`. Features are picked in order, respecting dependencies._
_Create with `/roadmap create`, add features with `/roadmap add`, restructure with `/roadmap reprioritize`._
