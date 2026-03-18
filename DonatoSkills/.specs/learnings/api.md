# API & Data Learnings

Patterns for API and data handling in this codebase.

---

## Endpoints

<!-- API structure, naming conventions, versioning -->

### Grok TTS requires `language` field (2026-03-17)

**Problem**: POST `/v1/tts` returns `Failed to deserialize the JSON body: missing field 'language'` if you omit it.

**Fix**: Always include `"language": "en"` in the request body. The field is required even though the docs don't emphasize it.

```json
{ "text": "...", "voice": "rex", "language": "en", "response_format": "wav" }
```

### Gemini image generation model name is `gemini-2.5-flash-image` (2026-03-17)

**Problem**: Older model names (`gemini-2.0-flash-exp`, `gemini-2.0-flash-exp-image-generation`) return 404. The model names change frequently.

**Fix**: Use `gemini-2.5-flash-image` for fast image gen, `gemini-3-pro-image-preview` for highest quality. Always hit the `/v1beta/models` list endpoint first if unsure — models rotate.

**Request format**: Must include `"responseModalities": ["TEXT", "IMAGE"]` in `generationConfig`.

### Zernio API: PATCH returns 405, PUT works on pending posts only (2026-03-17, updated 2026-03-18)

**Problem**: `PATCH /api/v1/posts/{id}` returns HTTP 405 Method Not Allowed.

**PUT behavior**:
- `PUT /api/v1/posts/{id}` with `{ "scheduledFor": "..." }` works on **pending** posts — returns the updated post object.
- `PUT` on an already-**published** post returns `{"error":"Published posts can only have their recycling config updated"}`.

**Fix**: To reschedule a pending post, use PUT. To reschedule a published post, delete and recreate (or accept it can't be changed).

---

## Error Handling

<!-- Error formats, status codes, client handling -->

_No learnings yet._

---

## Data Shapes

<!-- Common data structures, transformations -->

_No learnings yet._

---

## Fetching Patterns

<!-- How to call APIs, retry logic, loading states -->

_No learnings yet._

---

## Caching & State

<!-- Server state, client state, sync patterns -->

_No learnings yet._
