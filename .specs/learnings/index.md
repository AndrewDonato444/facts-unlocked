# Learnings Index

Cross-cutting patterns learned in this codebase. Updated via `/compound`.

## Quick Reference

| Category | File | Summary |
|----------|------|---------|
| Testing | [testing.md](./testing.md) | Mocking, assertions, test patterns |
| Performance | [performance.md](./performance.md) | Optimization, lazy loading, caching |
| Security | [security.md](./security.md) | Auth, cookies, validation |
| API & Data | [api.md](./api.md) | Endpoints, data handling, errors |
| Design System | [design.md](./design.md) | Tokens, components, accessibility |
| General | [general.md](./general.md) | Other patterns |

---

## Recent Learnings

<!-- /compound adds recent learnings here - newest first -->

- **2026-03-17** — TTS audio pipeline: ElevenLabs `pcm_24000` returns MP3-in-WAV; Grok TTS uses its own `/v1/tts` endpoint (not OpenAI SDK); always re-encode with ffmpeg + ffprobe for duration. See [api.md](./api.md#fetching-patterns).
- **2026-03-17** — Remotion tooling: broken local `@remotion/cli` dist can be bypassed by invoking another project's binary directly; `cp -r` nesting gotcha; render.sh path depth must be counted carefully. See [general.md](./general.md#tooling).
- **2026-03-17** — Image Cache: Per-channel file-based caching with Jaccard similarity matching, LRU eviction, and reuse limits. See [performance.md](./performance.md#caching) and feature spec.

---

## How This Works

1. **Feature-specific learnings** → Go in the spec file's `## Learnings` section
2. **Cross-cutting learnings** → Go in category files below
3. **General patterns** → Go in `general.md`

The `/compound` command analyzes your session and routes learnings to the right place.
