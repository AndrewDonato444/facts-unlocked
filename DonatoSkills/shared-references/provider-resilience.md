# Provider Resilience — Retry, Fallback, and Failure Signaling

> Shared reference for image-gen and remotion-video skills. When scaffolding generation scripts, embed these patterns directly — there is no shared npm module across skill boundaries.

---

## Overview

Any single provider timeout, rate limit, or outage should not kill a content batch. Both image-gen and TTS scripts run in overnight automation where a transient 429 or 503 would otherwise stop everything. This document defines the resilience patterns that both skills must embed into their generated scripts: exponential backoff retry, provider fallback using the `providers` array from `projects.json`, timeout enforcement via AbortController, failure signaling for the orchestrator, and idempotency checks for safe re-runs.

---

## Table of Contents

1. [Error Classification Table](#error-classification-table)
2. [withRetry Pattern](#withretry-pattern)
3. [withFallback Pattern](#withfallback-pattern)
4. [Timeout Wrapper](#timeout-wrapper)
5. [Provider Adaptation Tables](#provider-adaptation-tables)
6. [Failure Signals](#failure-signals)
7. [Idempotency Check](#idempotency-check)
8. [Batch Summary](#batch-summary)
9. [projects.json Contract](#projectsjson-contract)

---

## Error Classification Table

| Error | Retryable? | Action |
|-------|-----------|--------|
| HTTP 429 (rate limit) | Yes | Backoff and retry |
| HTTP 500 (server error) | Yes | Backoff and retry |
| HTTP 503 (service unavailable) | Yes | Backoff and retry |
| ECONNRESET | Yes | Backoff and retry |
| ETIMEDOUT | Yes | Backoff and retry |
| AbortController timeout | Yes | Backoff and retry |
| HTTP 400 (bad request) | No | Skip retries, attempt fallback — our params are wrong |
| HTTP 401 (unauthorized) | No | Skip retries, attempt fallback — bad API key |
| HTTP 403 (forbidden) | No | Skip retries, attempt fallback — bad API key |
| HTTP 402 (payment required) | No | Skip retries, attempt fallback — account billing issue |
| Content policy rejection | No | Skip retries, attempt fallback — need different prompt |

### Classifying Errors in Code

```typescript
function isRetryable(error: unknown): boolean {
  if (error instanceof Error && error.name === "AbortError") return true;

  const status = (error as any)?.status ?? (error as any)?.response?.status;
  if (status && [429, 500, 503].includes(status)) return true;

  const code = (error as any)?.code;
  if (code && ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "UND_ERR_CONNECT_TIMEOUT"].includes(code)) return true;

  return false;
}
```

---

## withRetry Pattern

Generic exponential backoff retry. Works for any async function — image gen, TTS, or anything else.

- **Max attempts**: 3
- **Backoff schedule**: 5s, 15s, 45s (base 5s, multiplier 3x)
- **Non-retryable errors**: thrown immediately without retry

```typescript
interface RetryOptions {
  maxAttempts?: number;       // Default: 3
  baseDelayMs?: number;       // Default: 5000
  backoffMultiplier?: number; // Default: 3
  label?: string;             // For logging, e.g. "gemini/image"
}

async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 5000,
    backoffMultiplier = 3,
    label = "api-call",
  } = opts;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryable(error)) {
        console.error(`[${label}] Non-retryable error on attempt ${attempt}: ${(error as Error).message}`);
        throw error;
      }

      if (attempt === maxAttempts) {
        console.error(`[${label}] Failed after ${maxAttempts} attempts: ${(error as Error).message}`);
        throw error;
      }

      const delayMs = baseDelayMs * Math.pow(backoffMultiplier, attempt - 1);
      console.warn(`[${label}] Attempt ${attempt}/${maxAttempts} failed (${(error as Error).message}). Retrying in ${delayMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError; // Unreachable, but satisfies TypeScript
}
```

---

## withFallback Pattern

Iterates the `providers[]` array from `projects.json`. Each provider gets a full `withRetry` cycle before moving to the next.

```typescript
interface FallbackOptions {
  /** "image_gen" or "tts" — key in the project config */
  capability: "image_gen" | "tts";
  /** The providers array from projects.json, e.g. ["gemini", "openai"] */
  providers: string[];
  /** Provider configs keyed by provider name */
  providerConfigs: Record<string, { api_key_env: string; [key: string]: any }>;
  /** Label for logging */
  label?: string;
}

interface FallbackResult<T> {
  result: T;
  provider: string;
  wasFallback: boolean;
}

async function withFallback<T>(
  jobFn: (provider: string, config: Record<string, any>) => Promise<T>,
  opts: FallbackOptions
): Promise<FallbackResult<T>> {
  const { providers, providerConfigs, label = "job" } = opts;
  const errors: { provider: string; error: string }[] = [];

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const config = providerConfigs[provider];

    // Check that API key env var is set
    const apiKey = process.env[config.api_key_env];
    if (!apiKey) {
      console.warn(`[${label}] Skipping ${provider} — ${config.api_key_env} not set`);
      errors.push({ provider, error: `${config.api_key_env} not set` });
      continue;
    }

    try {
      const result = await withRetry(
        () => jobFn(provider, config),
        { label: `${label}/${provider}` }
      );
      return { result, provider, wasFallback: i > 0 };
    } catch (error) {
      const msg = (error as Error).message ?? String(error);
      const status = (error as any)?.status ?? "unknown";
      console.error(`[${label}] ${provider} failed after retries: ${msg}`);
      errors.push({ provider, error: `${status}: ${msg}` });

      if (i < providers.length - 1) {
        console.log(`[${label}] ${provider} failed after 3 attempts. Falling back to ${providers[i + 1]}`);
      }
    }
  }

  // All providers exhausted
  const providersTried = errors.map((e) => e.provider).join(", ");
  const errorSummary = errors.map((e) => `${e.provider}: ${e.error}`).join("; ");
  throw new Error(`All providers exhausted (${errorSummary}) | Providers tried: ${providersTried}`);
}
```

---

## Timeout Wrapper

Wraps any async API call with an AbortController timeout. The timeout error is retryable.

| Capability | Timeout |
|-----------|---------|
| Image generation | 60 seconds |
| TTS (per scene) | 45 seconds |

```typescript
function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fn(controller.signal).finally(() => clearTimeout(timer));
}
```

### Usage with withRetry

The `fn` passed to `withRetry` should wrap the API call with `withTimeout`:

```typescript
// Image generation — 60s timeout
await withRetry(
  () => withTimeout(
    (signal) => generateImage(prompt, { signal }),
    60_000
  ),
  { label: "gemini/image" }
);

// TTS — 45s timeout
await withRetry(
  () => withTimeout(
    (signal) => generateTTS(text, { signal }),
    45_000
  ),
  { label: "grok/tts" }
);
```

### Passing the signal to fetch

Most provider SDKs accept an AbortSignal. For raw `fetch`:

```typescript
const response = await fetch(url, {
  method: "POST",
  headers: { "Authorization": `Bearer ${apiKey}` },
  body: JSON.stringify(payload),
  signal,  // <-- from withTimeout
});
```

---

## Provider Adaptation Tables

When falling back between providers, job parameters must be adapted.

### Image Generation: Aspect Ratio / Size Mapping

| Gemini Aspect Ratio | OpenAI Size | Notes |
|---------------------|-------------|-------|
| `"1:1"` | `"1024x1024"` | Square |
| `"16:9"` | `"1536x1024"` | Landscape |
| `"9:16"` | `"1024x1536"` | Portrait |
| `"2:3"` | `"1024x1536"` | Portrait (closest match) |
| `"3:2"` | `"1536x1024"` | Landscape (closest match) |
| `"4:3"` | `"1536x1024"` | Landscape (closest match) |
| `"3:4"` | `"1024x1536"` | Portrait (closest match) |

```typescript
const GEMINI_TO_OPENAI_SIZE: Record<string, string> = {
  "1:1":  "1024x1024",
  "16:9": "1536x1024",
  "9:16": "1024x1536",
  "2:3":  "1024x1536",
  "3:2":  "1536x1024",
  "4:3":  "1536x1024",
  "3:4":  "1024x1536",
};

const OPENAI_SIZE_TO_GEMINI: Record<string, string> = {
  "1024x1024": "1:1",
  "1536x1024": "16:9",
  "1024x1536": "9:16",
};
```

### Image Generation: Model Mapping

Read from `projects.json` — do not hardcode:

```typescript
// Gemini model: project.image_gen.gemini.default_model (e.g. "gemini-2.5-flash-image")
// OpenAI model: project.image_gen.openai.default_model (e.g. "gpt-image-1")
```

### TTS: Voice Mapping

Each provider has its own voice name. When falling back, use the `default_voice` from `projects.json` for the target provider:

| Provider | Voice Source | Example |
|----------|-------------|---------|
| Grok | `project.tts.grok.default_voice` | `"onyx"` |
| Gemini | `project.tts.gemini.default_voice` | `"Kore"` |
| ElevenLabs | `project.tts.elevenlabs.default_voice` (or `default_voice_name`) | `"Adam"` |

```typescript
function getVoiceForProvider(provider: string, ttsConfig: any): string {
  const providerConfig = ttsConfig[provider];
  return providerConfig.default_voice
    ?? providerConfig.default_voice_name
    ?? "default";
}
```

### TTS: Model Mapping

| Provider | Model Source | Example |
|----------|-------------|---------|
| Grok | Hardcoded | `"grok-3-fast-tts"` |
| Gemini | Hardcoded | `"gemini-2.5-flash-preview-tts"` |
| ElevenLabs | `project.tts.elevenlabs.model_id` | `"eleven_multilingual_v2"` |

### TTS: Audio Format Normalization

All providers output **24kHz mono WAV**. Normalize in the `writeWav` step regardless of provider.

---

## Failure Signals

Scripts must emit structured signals so the orchestrator can track outcomes.

### Image Generation

```
IMAGE_COMPLETE: carousel_slide_1.png | Provider: gemini
IMAGE_COMPLETE: carousel_slide_2.png | Provider: openai (fallback)
IMAGE_FAILED: carousel_slide_3 | Error: All providers exhausted (gemini: 429, openai: 503) | Providers tried: gemini, openai
```

### TTS

```
TTS_COMPLETE: scene_01.wav | Provider: grok
TTS_COMPLETE: scene_02.wav | Provider: gemini (fallback)
TTS_FAILED: scene_04 | Error: All providers exhausted | Providers tried: grok, gemini, elevenlabs
```

### Emitting Signals in Code

```typescript
function emitSignal(
  type: "IMAGE_COMPLETE" | "IMAGE_FAILED" | "TTS_COMPLETE" | "TTS_FAILED",
  name: string,
  details: { provider?: string; wasFallback?: boolean; error?: string; providersTried?: string[] }
) {
  const { provider, wasFallback, error, providersTried } = details;

  if (type.endsWith("_COMPLETE")) {
    const fallbackTag = wasFallback ? " (fallback)" : "";
    console.log(`${type}: ${name} | Provider: ${provider}${fallbackTag}`);
  } else {
    const tried = providersTried?.join(", ") ?? "unknown";
    console.log(`${type}: ${name} | Error: ${error} | Providers tried: ${tried}`);
  }
}
```

---

## Idempotency Check

Before generating any item, check if the output file already exists. This makes re-runs safe and efficient — only missing items are generated.

```typescript
import * as fs from "fs";
import * as path from "path";

function alreadyExists(outputDir: string, fileName: string): boolean {
  const outputPath = path.join(outputDir, fileName);
  if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
    const sizeKB = Math.round(fs.statSync(outputPath).size / 1024);
    console.log(`Skipping ${fileName} (already exists, ${sizeKB}KB)`);
    return true;
  }
  return false;
}
```

### Usage

```typescript
for (const job of jobs) {
  const fileName = `${job.name}.png`;
  if (alreadyExists(outputDir, fileName)) continue;

  // Generate the image...
}
```

---

## Batch Summary

After processing all items in a batch, report the outcome. The script should exit with code 0 even on partial failure — partial success is not a crash.

```typescript
interface BatchResult {
  succeeded: number;
  failed: number;
  onFallback: number;
  skipped: number;
  failures: { name: string; error: string }[];
}

function printBatchSummary(type: "images" | "scenes", result: BatchResult) {
  const total = result.succeeded + result.failed;
  const parts: string[] = [];

  parts.push(`${result.succeeded}/${total} ${type} generated`);
  if (result.onFallback > 0) parts.push(`${result.onFallback} on fallback`);
  if (result.skipped > 0) parts.push(`${result.skipped} skipped (already existed)`);

  console.log(`\nBatch summary: ${parts.join(". ")}.`);

  if (result.failed > 0) {
    console.log(`${result.failed} failed: ${result.failures.map((f) => f.name).join(", ")}`);
    for (const f of result.failures) {
      console.error(`  ${f.name}: ${f.error}`);
    }
  }
}
```

### Tracking Results

```typescript
const batch: BatchResult = { succeeded: 0, failed: 0, onFallback: 0, skipped: 0, failures: [] };

for (const job of jobs) {
  if (alreadyExists(outputDir, `${job.name}.png`)) {
    batch.skipped++;
    continue;
  }

  try {
    const { provider, wasFallback } = await withFallback(
      (provider, config) => generateImage(job, provider, config),
      { capability: "image_gen", providers, providerConfigs, label: job.name }
    );
    emitSignal("IMAGE_COMPLETE", `${job.name}.png`, { provider, wasFallback });
    batch.succeeded++;
    if (wasFallback) batch.onFallback++;
  } catch (error) {
    emitSignal("IMAGE_FAILED", job.name, {
      error: (error as Error).message,
      providersTried: providers,
    });
    batch.failed++;
    batch.failures.push({ name: job.name, error: (error as Error).message });
  }
}

printBatchSummary("images", batch);
```

---

## projects.json Contract

The `providers` array in `projects.json` defines **fallback priority**. The order of the array is the order providers are attempted.

### Image Generation

```json
"image_gen": {
  "providers": ["gemini", "openai"],
  "default_provider": "gemini",
  "gemini": { "api_key_env": "GEMINI_API_KEY", "default_model": "gemini-2.5-flash-image" },
  "openai": { "api_key_env": "OPENAI_API_KEY", "default_model": "gpt-image-1" }
}
```

- `providers[0]` is tried first (primary)
- `providers[1]` is the fallback
- `default_provider` should match `providers[0]` — it is the starting point

### TTS

```json
"tts": {
  "providers": ["grok", "gemini", "elevenlabs"],
  "default_provider": "grok",
  "grok": { "api_key_env": "GROK_API_KEY", "default_voice": "onyx" },
  "gemini": { "api_key_env": "GEMINI_API_KEY", "default_voice": "Kore" },
  "elevenlabs": { "api_key_env": "ELEVENLABS_API_KEY", "default_voice": "Adam" }
}
```

- Fallback chain: grok -> gemini -> elevenlabs
- Each provider entry must include `api_key_env` and a voice/model config
- If a provider's API key env var is not set, that provider is skipped during fallback

### Rules

1. **Array order = fallback priority.** First entry is primary, subsequent entries are fallbacks.
2. **`default_provider` must exist in the `providers` array.**
3. **Each provider in the array must have a config block** with at least `api_key_env`.
4. **Missing API key = skip.** If `process.env[api_key_env]` is empty, the provider is skipped silently during fallback.
5. **Single-provider arrays work** but offer no fallback protection. Setup warns about this.