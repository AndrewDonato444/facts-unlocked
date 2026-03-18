# TTS Best Practices (Grok, Gemini & ElevenLabs)

## Script Writing

### DO
- Write the script as natural speech — contractions, short sentences, conversational
- Use punctuation for pacing: commas for short pauses, ellipses for longer ones, line breaks for emphasis
- Set voice style ONCE at the top (e.g., "confident, direct") — don't micro-manage every line
- Use bracket modifiers sparingly for non-speech: `[sigh]`, `[laughing]`, `[uhm]`
- Keep sentences short and simple — long complex ones sound robotic
- Test with default delivery first, then add modifiers only where needed

### DON'T
- Don't over-describe emotion — "conspiratorial, like sharing a secret" will make it whisper
- Don't use prose direction — "say this like you're letting someone in on a secret" → bad
- Don't use regional idioms or ambiguous words TTS might mispronounce
- Don't overload with style modifiers — stick to key moments
- Don't fight the voice — pick the right voice upfront, then let it be natural

## Direction Prompts

### Bad (over-directed)
```
Say in a conspiratorial, like sharing a secret, emphasis on 'distribution' — the reveal tone:
It's not the data. Your intelligence is better than theirs. It's the distribution.
```

### Good (minimal direction, script does the work)
```
Speak in a confident, direct tone:
It's not the data. Your intelligence is better than theirs...
it's the distribution.
```

### Punctuation as Direction
- Comma = short breath pause
- Ellipsis = longer pause, builds tension
- Period = full stop, lets the line land
- Line break = emphasis shift
- Em dash = abrupt pivot

## Voice Selection Guide

### Grok TTS Voices (5 voices — NOT OpenAI-compatible)

**Endpoint**: `POST https://api.x.ai/v1/tts` (NOT `/v1/audio/speech`)
**Body**: `{ "text": "...", "voice_id": "rex", "language": "en" }`
**Output**: MP3 by default. Re-encode to PCM WAV for Remotion.
**Do NOT use the OpenAI SDK** — use `fetch()` directly.

| Voice | Character | Good For |
|-------|-----------|----------|
| eve | Energetic, default | General purpose, upbeat content |
| ara | Warm, approachable | Lifestyle, storytelling, community |
| rex | Confident, professional | Authority, business, facts |
| sal | Smooth, balanced | Versatile, clean delivery |
| leo | Authoritative, deep | Professional, luxury, finance |

### Gemini TTS Voices (Alternative Provider)

| Voice | Character | Good For |
|-------|-----------|----------|
| Kore | Firm, authoritative | Professional, luxury, finance |
| Puck | Upbeat, energetic | Fitness, startup, youth |
| Zephyr | Bright, clear | Clean, modern, tech |
| Charon | Deep, resonant | Drama, storytelling (can over-act) |
| Fenrir | Strong, grounded | Authority, confidence |
| Orus | Crisp, direct | News, business, no-nonsense |
| Leda | Warm, smooth | Lifestyle, hospitality |
| Aoede | Melodic, pleasant | Friendly, approachable |

*Gemini has 30 voices total — generate samples with `scripts/test-voices.ts`*

### ElevenLabs Voices (Premium Provider)

| Voice | Character | Good For |
|-------|-----------|----------|
| Adam | Deep, warm | Professional narration, authority |
| Antoni | Friendly, conversational | Explainers, casual content |
| Arnold | Strong, confident | Bold statements, calls to action |
| Bella | Warm, engaging | Lifestyle, storytelling |
| Domi | Energetic, dynamic | High-energy, startup content |
| Elli | Youthful, bright | Tech, modern, playful |
| Josh | Clear, steady | Business, clean delivery |
| Rachel | Polished, professional | Corporate, polished content |
| Sam | Neutral, versatile | General purpose, safe default |

*ElevenLabs offers custom voice cloning and fine-tuned stability/similarity controls. See `references/elevenlabs-tts.md` for full API reference and voice settings.*

## Multi-Scene Strategy

1. Set voice style once in the first scene's prompt
2. For subsequent scenes, just send the script text — the voice stays consistent
3. Don't change direction between scenes unless the tone genuinely shifts
4. Use punctuation and word choice to carry emotion, not direction prompts

## Audio-First Workflow

```
1. Write the script (natural speech, short sentences)
2. Read it out loud — if it sounds weird spoken, rewrite
3. Generate audio with minimal direction
4. Measure durations → timing manifest
5. Build visuals to match audio pacing
```

The script IS the creative work. Visuals illustrate the story the script tells.
