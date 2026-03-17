---
feature: Provider Resilience (Retry + Fallback)
domain: resilience
source:
  - image-gen/SKILL.md
  - remotion-video/SKILL.md
  - shared-references/provider-resilience.md
tests: []
components: []
personas: []
status: implemented
created: 2026-03-17
updated: 2026-03-17
---

# Provider Resilience — Retry, Fallback, and Failure Signaling

**Source Files**: `image-gen/SKILL.md`, `remotion-video/SKILL.md`
**New File**: `shared-references/provider-resilience.md`
**Contract**: `projects.json` `providers` arrays define fallback order

## Purpose

Any single provider timeout, rate limit, or outage should not kill a content batch. Today, both image-gen and TTS have zero retry logic in their generated scripts, no provider fallback, and no failure signaling. For overnight automation, this is fatal — one transient 429 stops everything.

This feature creates a shared resilience pattern that both skills embed into their generated scripts, plus failure signals for the orchestrator.

---

## Feature: Provider Resilience

### Design: Shared Reference, Not Shared Code

Since skills generate standalone scripts (TypeScript files with their own `package.json`), we can't import a shared npm module across skill boundaries. Instead:

1. **`shared-references/provider-resilience.md`** — Documents the resilience patterns (retry, fallback, timeout, signals)
2. **Each SKILL.md** embeds the pattern into its script templates — the agent copies the retry/fallback code when scaffolding

This means the resilience logic lives *inside* each generated script, not as an external dependency. The shared reference ensures consistency.

### What the `providers` Array Already Gives Us

`projects.json` already defines fallback order:

```json
"tts": { "providers": ["grok", "gemini", "elevenlabs"], "default_provider": "grok" }
"image_gen": { "providers": ["gemini", "openai"], "default_provider": "gemini" }
```

The fallback chain is: try `default_provider` first, then iterate `providers` in order, skipping the one that already failed.

---

## Scenario: Retry with exponential backoff on transient failure

```gherkin
Given a provider API call fails with a retryable error (429, 503, 500, ECONNRESET, ETIMEDOUT)
When the retry handler catches the error
Then it retries up to 3 times
And waits with exponential backoff (5s, 15s, 45s)
And logs each retry attempt with the error type and attempt number
And if all 3 retries fail, it throws a structured error with provider name and error type
```

### Retryable vs Non-Retryable Errors

| Error | Retryable? | Notes |
|-------|-----------|-------|
| HTTP 429 (rate limit) | Yes | Backoff and retry |
| HTTP 500 (server error) | Yes | Transient |
| HTTP 503 (service unavailable) | Yes | Provider maintenance |
| ECONNRESET / ETIMEDOUT | Yes | Network transient |
| HTTP 400 (bad request) | No | Our fault — fix the prompt/params |
| HTTP 401 / 403 (auth) | No | Bad API key — won't help to retry |
| Content policy rejection | No | Need different prompt |
| HTTP 402 (payment required) | No | Account issue |

---

## Scenario: Timeout enforcement on API calls

```gherkin
Given a provider API call is made
When the call has not returned after 60 seconds
Then an AbortController cancels the request
And the timeout is treated as a retryable error
And the retry handler proceeds with backoff logic
```

### Timeout Values

| Skill | Timeout | Rationale |
|-------|---------|-----------|
| Image gen | 60s | Image generation can be slow for complex prompts |
| TTS (per scene) | 45s | Single scene audio should complete quickly |

---

## Scenario: Provider fallback on exhausted retries

```gherkin
Given the primary provider fails after 3 retry attempts
And `projects.json` has additional providers in the `providers` array
When the fallback handler activates
Then it selects the next provider from the `providers` array
And verifies the provider's API key env var is set
And retries the same job with the fallback provider (fresh 3 retries)
And logs: "PRIMARY_PROVIDER failed after 3 attempts. Falling back to FALLBACK_PROVIDER"
```

### Fallback Chain Logic

```
1. Read providers[] from projects.json for this capability (tts or image_gen)
2. Start with default_provider
3. On exhausted retries:
   a. Move to next provider in providers[] (skip current)
   b. Check if API key env var exists for that provider
   c. If key exists, try that provider (full retry cycle)
   d. If key missing, skip to next
4. If all providers exhausted, emit failure signal
```

### Provider Adaptation

When falling back, the job parameters must adapt to the new provider:

**Image gen (Gemini → OpenAI)**:
- Map aspect ratio: `"1:1"` → `"1024x1024"`, `"16:9"` → `"1536x1024"`, `"2:3"` → `"1024x1536"`
- Map model: use `image_gen.openai.default_model` from projects.json

**Image gen (OpenAI → Gemini)**:
- Map size back to aspect ratio: `"1024x1024"` → `"1:1"`, etc.
- Map model: use `image_gen.gemini.default_model`

**TTS (any → any)**:
- Map voice: use each provider's `default_voice` from projects.json
- Map model: use each provider's model (Gemini uses `gemini-2.5-flash-preview-tts`, Grok uses `grok-3-fast-tts`, ElevenLabs uses `eleven_multilingual_v2`)
- Audio format: all output 24kHz mono WAV (normalize in the writeWav step)

---

## Scenario: Non-retryable error skips retries and goes to fallback

```gherkin
Given a provider returns a non-retryable error (400, 401, 403, content policy)
When the retry handler catches it
Then it does NOT retry with the same provider
And it immediately attempts provider fallback (if available)
And logs: "PROVIDER returned non-retryable error (STATUS). Attempting fallback."
```

---

## Scenario: All providers exhausted emits failure signal

```gherkin
Given all providers in the fallback chain have failed
When the last provider exhausts its retries (or returns non-retryable)
Then the script emits a failure signal:
  IMAGE_FAILED: { name, error, providers_tried: [...] }
  or TTS_FAILED: { scene, error, providers_tried: [...] }
And the script continues to the next item in the batch (does not exit)
And at the end, the summary reports how many succeeded vs failed
```

### Failure Signal Format

```
IMAGE_FAILED: carousel_slide_3 | Error: All providers exhausted (gemini: 429, openai: 503) | Providers tried: gemini, openai
IMAGE_COMPLETE: carousel_slide_3.png | Provider: openai (fallback)
```

```
TTS_FAILED: scene_04 | Error: All providers exhausted | Providers tried: grok, gemini, elevenlabs
TTS_COMPLETE: scene_04.wav | Provider: gemini (fallback)
```

---

## Scenario: Partial batch success

```gherkin
Given a batch of 7 image jobs (e.g., carousel slides)
And jobs 1-4 succeed on the primary provider
And job 5 fails on all providers
And jobs 6-7 succeed on the fallback provider
When the batch completes
Then the summary reports: "5/7 images generated (2 on fallback). 1 failed: slide_5"
And the failed job is logged with full error details
And the script exits with code 0 (partial success is not a crash)
```

---

## Scenario: Partial TTS scene failure with continued rendering

```gherkin
Given a video has 5 scenes requiring TTS
And scenes 1-3 generate successfully
And scene 4 fails on all providers
And scene 5 generates successfully
When the TTS batch completes
Then scenes 1-3 and 5 have valid WAV files
And scene 4 has no WAV file
And the manifest.json marks scene 4 as failed
And the render can proceed with a silent gap for scene 4 (or skip it)
And the summary reports: "4/5 scenes generated. 1 failed: scene_04"
```

---

## Scenario: Idempotent re-runs skip completed items

```gherkin
Given a batch was partially completed (slides 1-4 exist as PNG files)
When the script is re-run
Then it checks for existing output files before generating
And skips items that already have valid output files
And only generates the missing items (slides 5-7)
And logs: "Skipping slide_1.png (already exists, 45KB)"
```

### Idempotency Check

```typescript
const outputPath = path.join(outputDir, `${job.name}.png`);
if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
  console.log(`Skipping ${job.name} (already exists, ${fs.statSync(outputPath).size} bytes)`);
  return outputPath;
}
```

---

## Scenario: Setup warns about single-provider risk

```gherkin
Given a user runs /setup to onboard a new project
When they configure only one TTS provider (e.g., only Grok)
Then setup displays a warning:
  "⚠️ Single provider configured for TTS (grok). If this provider is
  rate-limited or experiencing downtime, your automated content pipeline
  will stop. We recommend configuring at least 2 providers for fallback."
And offers to configure additional providers
And when they configure only one image-gen provider
Then setup displays the same pattern of warning for image generation
```

---

## Scenario: Setup shows fallback chain summary

```gherkin
Given a user has configured their project with multiple providers
When setup completes the provider configuration step
Then it displays a fallback summary:
  "✅ TTS fallback chain: grok → gemini → elevenlabs (3 providers)"
  "✅ Image fallback chain: gemini → openai (2 providers)"
  "Your automated loops will survive individual provider outages."
```

---

## Implementation Plan

### 1. Create `shared-references/provider-resilience.md`

The reference doc with:
- The `withRetry(fn, options)` pattern (generic, works for any async call)
- The `withFallback(providers, jobFn, options)` pattern
- The timeout wrapper pattern
- Error classification table
- Signal format
- Provider adaptation tables (parameter mapping between providers)

### 2. Update `image-gen/SKILL.md` templates

Both Gemini and OpenAI script templates get:
- `withRetry` wrapper around the API call
- `withFallback` wrapper around the generation function
- Timeout via AbortController
- `IMAGE_FAILED` / `IMAGE_COMPLETE` signals with provider info
- Idempotency check before generating
- Batch summary at end

### 3. Update `remotion-video/SKILL.md` TTS templates

All three TTS templates (Gemini, Grok, ElevenLabs) get:
- `withRetry` wrapper around the TTS API call
- `withFallback` wrapper around the generate function
- Timeout via AbortController
- `TTS_FAILED` / `TTS_COMPLETE` signals with provider info
- Scene-level error isolation (continue on failure)
- Manifest marks failed scenes

### 4. Update `setup/SKILL.md`

During onboarding, the setup skill should:
- Explain the fallback strategy: "DonatoSkills supports multiple providers for image generation and TTS. Configuring at least 2 providers per capability ensures your automated loops survive provider outages."
- Warn when only 1 provider is configured: "⚠️ You have only one TTS provider configured. If [provider] is rate-limited or down, your content pipeline will stop. Add a second provider to enable automatic fallback."
- Show which providers are configured and which are missing API keys
- Make the `providers` array order explicit: "Fallback priority: [1st] → [2nd] → [3rd]"

### 5. Update `projects.json` docs

Document that `providers` array order = fallback priority.

---

## What NOT to Change

- Provider selection logic stays the same (projects.json → default_provider)
- Audio format stays 24kHz mono WAV
- Output paths stay the same
- The content-engine orchestration protocol stays the same
- Analytics loop is unaffected

---

## Test Plan

Since these are SKILL.md template changes (not executable scripts), testing is manual verification:

| ID | Test | Type |
|----|------|------|
| MV-PR-001 | Verify `shared-references/provider-resilience.md` documents all patterns | Manual |
| MV-PR-002 | Verify image-gen Gemini template includes retry + fallback + timeout | Manual |
| MV-PR-003 | Verify image-gen OpenAI template includes retry + fallback + timeout | Manual |
| MV-PR-004 | Verify TTS Gemini template includes retry + fallback + timeout | Manual |
| MV-PR-005 | Verify TTS Grok template includes retry + fallback + timeout | Manual |
| MV-PR-006 | Verify TTS ElevenLabs template includes retry + fallback + timeout | Manual |
| MV-PR-007 | Verify failure signals match documented format | Manual |
| MV-PR-008 | Verify provider adaptation tables cover all cross-provider mappings | Manual |
| MV-PR-009 | Verify idempotency check is in both image-gen templates | Manual |
| MV-PR-010 | Verify partial batch summary format | Manual |

---

## Learnings

_(To be filled after implementation)_
