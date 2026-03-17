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

<!-- How to call APIs, retry logic, loading states -->

_No learnings yet._

---

## Caching & State

<!-- Server state, client state, sync patterns -->

_No learnings yet._
