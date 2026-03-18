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

- **2026-03-17** [api] Grok TTS requires `language` field — omitting it causes deserialization error
- **2026-03-17** [api] Gemini image model is `gemini-2.5-flash-image` — older names 404
- **2026-03-18** [api] Zernio PUT works on pending posts to reschedule; published posts are immutable (delete + recreate)
- **2026-03-17** [general] Remotion backgrounds must be in `public/generated/` for ai-generated type
- **2026-03-17** [general] Buffer GraphQL schema doesn't match docs — use introspection
- **2026-03-17** [general] TTS files are often MP3-in-WAV — always re-encode to PCM before Remotion
- **2026-03-17** [general] Scene timing must be audio-driven, not hardcoded to target duration

---

## How This Works

1. **Feature-specific learnings** → Go in the spec file's `## Learnings` section
2. **Cross-cutting learnings** → Go in category files below
3. **General patterns** → Go in `general.md`

The `/compound` command analyzes your session and routes learnings to the right place.
