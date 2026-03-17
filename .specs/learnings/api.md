# API & Data Learnings

Patterns for API and data handling in this codebase.

---

## Endpoints

<!-- API structure, naming conventions, versioning -->

_No learnings yet._

---

## Error Handling

<!-- Error formats, status codes, client handling -->

_No learnings yet._

---

## Data Shapes

**Cost tracking log format** (`usage.jsonl`, one JSON object per line):
```json
{ "timestamp", "provider", "model", "channel", "video_id", "unit_type", "units_used", "cost_usd", "fallback", "budget_warning", "monthly_units_running_total", "monthly_budget_remaining_pct" }
```
- `unit_type` is `"char"` for TTS, `"image"` for image gen
- `monthly_*` fields are `null` for pay-as-you-go providers (Gemini, OpenAI, Grok image)

**Rate table format** (`rates.json`):
```json
{ "provider": { "model-or-default": { "unit", "rate", "plan?", "monthly_budget?", "monthly_plan_cost?" } } }
```
- Unknown model → falls back to `"default"` key within that provider
- Unknown provider → throws loudly (forces you to add it to rates.json)

---

## Fetching Patterns

### 2026-03-17
- **Gotcha**: ElevenLabs `output_format: "pcm_24000"` actually returns MP3-encoded data despite the name. Using `writeWavSync()` to wrap those bytes as PCM produces durations 3–6x too short → audio cuts off in Remotion. Confirmed: latte-factor-myth scene durations reported as 1.5s/2s/2s/0.37s; real values were 4.6s/5.9s/5.9s/1.1s.
  - **Fix**: Write raw bytes to a temp file, re-encode with `ffmpeg -acodec pcm_s16le -ar 24000 -ac 1`, then get real duration with `ffprobe -show_entries format=duration`. Never calculate duration from byte count when ElevenLabs is the provider.

- **Gotcha**: Grok TTS is NOT OpenAI-compatible. `client.audio.speech.create()` via the OpenAI SDK with `baseURL: "https://api.x.ai/v1"` returns 403. Use `fetch("https://api.x.ai/v1/tts")` directly.
  - **Required body fields**: `text`, `voice`, `language` — omitting `language` causes a deserialization error.
  - Voices: `eve`, `ara`, `rex`, `sal`, `leo`

- **Gotcha**: Grok TTS returns 500 "Too many pings" on rapid sequential requests. Add a 2-second delay between scene calls.

- **Gotcha**: OpenAI `gpt-image-1` quality parameter values are `"low"`, `"medium"`, `"high"`, `"auto"` — not `"standard"` or `"hd"` (those are dall-e-3 values). Passing `"standard"` returns 400.

- **Pattern**: Zernio `POST /v1/posts` response shape is `{ post: { _id, status, ... } }` — the post ID is nested under `post._id`, not top-level. When a post is sent for a time already past, status comes back as `"published"` immediately.

---

## Caching & State

<!-- Server state, client state, sync patterns -->

_No learnings yet._
