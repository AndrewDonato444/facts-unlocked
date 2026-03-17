# ElevenLabs TTS Reference

Quick reference for ElevenLabs Text-to-Speech API used by the remotion-video skill.

## Setup

```bash
# No SDK required — uses fetch/curl directly (REST API)
# Or optionally: npm i elevenlabs
```

Set `ELEVENLABS_API_KEY` environment variable.

---

## Endpoint

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
Authorization: xi-api-key {ELEVENLABS_API_KEY}
Content-Type: application/json
```

Response: binary audio file (application/octet-stream).

---

## Request Body

```json
{
  "text": "Your script here",
  "model_id": "eleven_multilingual_v2",
  "output_format": "pcm_24000",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0.0,
    "speed": 1.0,
    "use_speaker_boost": true
  }
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `text` | string | Yes | — | Text to convert to speech |
| `model_id` | string | No | `eleven_multilingual_v2` | TTS model |
| `output_format` | string | No | `mp3_44100_128` | Audio format (see below) |
| `voice_settings.stability` | number | No | 0.5 | 0-1, higher = more consistent |
| `voice_settings.similarity_boost` | number | No | 0.75 | 0-1, higher = closer to original voice |
| `voice_settings.style` | number | No | 0.0 | 0-1, style exaggeration |
| `voice_settings.speed` | number | No | 1.0 | 0.7-1.2, speaking speed |

---

## Models

| Model ID | Quality | Speed | Best For |
|----------|---------|-------|----------|
| `eleven_multilingual_v2` | Highest | Slower | Hero videos, premium content |
| `eleven_turbo_v2_5` | Good | Fast | Bulk generation, drafts |
| `eleven_turbo_v2` | Good | Fast | English-only, low latency |
| `eleven_monolingual_v1` | Legacy | Fast | Simple English narration |

**Recommendation:** Use `eleven_multilingual_v2` for final renders (best quality). Use `eleven_turbo_v2_5` when generating multiple videos in a batch.

---

## Output Formats for Remotion

Use **PCM** for Remotion (raw audio, easy to measure duration):

| Format | Sample Rate | Use Case |
|--------|-------------|----------|
| `pcm_24000` | 24kHz | Best match for Gemini/Grok WAV output |
| `pcm_44100` | 44.1kHz | Higher quality |
| `pcm_16000` | 16kHz | Smaller files |

Or use **WAV** (PCM with header, ready to use):

| Format | Sample Rate |
|--------|-------------|
| `wav_24000` | 24kHz |
| `wav_44100` | 44.1kHz |

**For Remotion video projects, use `wav_44100` or `wav_24000`.** These can be used directly with `<Audio src={staticFile("audio/scene-1.wav")} />` — no conversion needed.

---

## Premade Voices

Curated voices available to all ElevenLabs users. Use `voice_id` in the API URL.

### Recommended for Social Media Videos

| Personality | Voice | ID | Gender | Why |
|------------|-------|-----|--------|-----|
| Professional/Authority | Adam | `pNInz6obpgDQGcFmaJgB` | Male | Deep, narration-ready |
| Professional/Authority | Rachel | `21m00Tcm4TlvDq8ikWAM` | Female | Calm, polished |
| Energetic/Fun | Jeremy | `bVMeCyTHy58xNoL34h3p` | Male | Excited, high energy |
| Energetic/Fun | Charlotte | `XB0fDUnXU5powFXDhCwa` | Female | Engaging, charismatic |
| Warm/Conversational | Matilda | `XrExE9yKIg1WjnnlVkGX` | Female | Warm, audiobook feel |
| Warm/Conversational | Charlie | `IKne3meq5aSn9XLyUdCD` | Male | Casual, approachable |
| News/Credible | Daniel | `onwK4e9ZLuTAKqWW03F9` | Male | Deep, news presenter |
| News/Credible | Alice | `Xb7hH8MSUJpSbSDYk0k2` | Female | Confident, clear |
| Calm/ASMR | Emily | `LcfcDJNUP1GQjkzn1xUU` | Female | Meditation, calm |
| Calm/ASMR | Thomas | `GBv7mTt0atIp3Br8iCZE` | Male | Calm, soothing |

### Full Premade Voice List

| Voice | ID | Gender | Style |
|-------|-----|--------|-------|
| Adam | `pNInz6obpgDQGcFmaJgB` | M | Deep narration |
| Alice | `Xb7hH8MSUJpSbSDYk0k2` | F | Confident news |
| Antoni | `ErXwobaYiN019PkySvjV` | M | Well-rounded |
| Arnold | `VR6AewLTigWG4xSOukaG` | M | Crisp |
| Bill | `pqHfZKP75CvOlQylNhV4` | M | Strong documentary |
| Brian | `nPczCjzI2devNBz1zQrb` | M | Deep narration |
| Callum | `N2lVS1w4EtoT3dr4eOWO` | M | Hoarse |
| Charlie | `IKne3meq5aSn9XLyUdCD` | M | Casual conversational |
| Charlotte | `XB0fDUnXU5powFXDhCwa` | F | Seductive/engaging |
| Chris | `iP95p4xoKVk53GoZ742B` | M | Casual |
| Daniel | `onwK4e9ZLuTAKqWW03F9` | M | Deep news |
| Dorothy | `ThT5KcBeYPX3keUQqHPh` | F | Pleasant |
| Drew | `29vD33N1CtxCmqQRPOHJ` | M | Well-rounded news |
| Emily | `LcfcDJNUP1GQjkzn1xUU` | F | Calm |
| Freya | `jsCqWAovK2LkecY7zXl4` | F | Neutral |
| George | `JBFqnCBsd6RMkjVDRZzb` | M | Raspy |
| Jeremy | `bVMeCyTHy58xNoL34h3p` | M | Excited |
| Josh | `TxGEqnHWrfWFTfGW9XjX` | M | Deep |
| Lily | `pFZP5JQG7iQjIQuC4Bku` | F | Raspy |
| Matilda | `XrExE9yKIg1WjnnlVkGX` | F | Warm |
| Rachel | `21m00Tcm4TlvDq8ikWAM` | F | Calm narration |
| Sam | `yoZ06aMxZJJ28mfd3POQ` | M | Raspy |
| Sarah | `EXAVITQu4vr4xnSDxMaL` | F | Soft news |

(See full list of 45+ voices via `GET https://api.elevenlabs.io/v1/voices`)

---

## Generate Voiceover Script Template

```typescript
import * as fs from "node:fs";
import * as path from "node:path";

if (!process.env.ELEVENLABS_API_KEY) {
  throw new Error("ELEVENLABS_API_KEY is not set.");
}

// Write raw PCM data as a WAV file.
function writeWavSync(filepath: string, pcmData: Buffer, sampleRate = 24000, channels = 1, bitDepth = 16) {
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  fs.writeFileSync(filepath, Buffer.concat([header, pcmData]));
}

interface SceneScript {
  name: string;
  script: string;
}

async function generateVoiceover(
  scenes: SceneScript[],
  voiceId: string = "pNInz6obpgDQGcFmaJgB", // Adam (deep narration)
  modelId: string = "eleven_multilingual_v2",
) {
  const outputDir = path.join(__dirname, "..", "public", "audio");
  fs.mkdirSync(outputDir, { recursive: true });

  const manifest: Record<string, { file: string; durationSec: number }> = {};
  const sampleRate = 24000;

  for (const scene of scenes) {
    console.log(`Generating: ${scene.name}...`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: scene.script,
          model_id: modelId,
          output_format: `pcm_${sampleRate}`,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const pcmBuffer = Buffer.from(arrayBuffer);

    // Write as WAV (PCM response needs a header)
    const filepath = path.join(outputDir, `${scene.name}.wav`);
    writeWavSync(filepath, pcmBuffer, sampleRate);

    // Calculate duration from PCM data
    const durationSec = pcmBuffer.length / (sampleRate * 2); // 16-bit = 2 bytes/sample
    manifest[scene.name] = { file: `audio/${scene.name}.wav`, durationSec };
    console.log(`  Saved: ${filepath} (${durationSec.toFixed(1)}s)`);
  }

  const manifestPath = path.join(outputDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Timing manifest: ${manifestPath}`);

  return manifest;
}

// Define scenes for this video
const scenes: SceneScript[] = [
  { name: "scene-1-hook", script: "Your hook script here..." },
  { name: "scene-2-body", script: "Body script here..." },
  { name: "scene-3-cta", script: "CTA script here..." },
];

generateVoiceover(scenes).catch(console.error);
```

---

## Rate Limits

- Free tier: ~10,000 characters/month
- Paid tiers vary (Starter: 30k, Creator: 100k, Pro: 500k+)
- No strict per-minute rate limit like Gemini, but be mindful of character quotas
- Generate scenes sequentially to avoid hitting concurrent request limits

---

## Key Differences from Grok/Gemini TTS

| Feature | ElevenLabs | Grok | Gemini |
|---------|-----------|------|--------|
| Voice quality | Highest (gold standard) | Very good | Good |
| Voice variety | 45+ premade + custom clones | 10 preset | 30 preset |
| Custom voice cloning | Yes | No | No |
| Pricing | Credit-based (paid) | Per-request | Per-request |
| Output format | WAV/MP3/PCM/Opus | WAV | Raw PCM |
| Direction prompts | Via voice_settings | `[tone]` prefix | Prompt prefix |
| Speed control | `voice_settings.speed` | No | No |
| SDK needed | No (REST) | `openai` npm | `@google/genai` npm |
