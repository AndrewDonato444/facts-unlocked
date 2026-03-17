# General Learnings

Patterns that don't fit other categories.

---

## Code Style

<!-- Conventions, naming, organization -->

_No learnings yet._

---

## Git Workflow

<!-- Branching, commits, PRs -->

_No learnings yet._

---

## Tooling

<!-- Build tools, linting, formatting -->

### Remotion SceneBackground expects images in `public/generated/` (2026-03-17)

**Problem**: The `SceneBackground` component uses `staticFile(`generated/${mode.asset}.png`)` for `ai-generated` type backgrounds. Placing images anywhere else (e.g. `public/images/`) causes "source image cannot be decoded" errors at render time.

**Fix**: Always place AI-generated background images in `public/generated/{asset-name}.png` where `{asset-name}` matches the `asset` field in `SCENE_BACKGROUNDS` constants. The content engine should standardize on this path.

### Buffer GraphQL API schema quirks (2026-03-17)

**Problem**: Buffer's GraphQL schema doesn't match their documentation well. `TikTokMetadata` and `YouTubeMetadata` types don't exist in the schema. Posts are queried via top-level `posts` query with `PostsFiltersInput`, not via channel sub-queries. Post status enum uses `scheduled` not `pending`.

**Fix**: Use GraphQL introspection (`__type`) to discover the actual schema before building queries. Key queries:
- `posts(input: { organizationId, filter: { status: scheduled } })` for queued posts
- `channels(input: { organizationId })` for connected accounts (returns `id`, `service`, `name` only — no platform-specific metadata via fragment)

---

## Debugging

<!-- Common issues, debugging techniques -->

### TTS audio files must be proper PCM WAV before Remotion render (2026-03-17)

**Problem**: ElevenLabs (and potentially other TTS providers) return MP3 data with a `.wav` extension. When ffprobe reads these, the container reports a shorter duration than the actual decoded audio. Remotion then uses the wrong duration, causing scenes to cut out mid-speech with seconds of dead air.

**Detection**: `ffprobe -show_entries stream=codec_name` shows `mp3` instead of `pcm_s16le` for .wav files. The "Header missing" warning is another signal.

**Fix**: After downloading TTS audio, always re-encode before using in Remotion:
```bash
ffmpeg -y -i input.wav -acodec pcm_s16le -ar 44100 -ac 1 output.wav
```
Then re-probe for the actual duration and use that in the manifest/composition.

**Rule**: The content engine should validate and re-encode all TTS audio as PCM WAV before writing the manifest. Never trust the duration from the raw TTS download — always probe after re-encode.

### Video scene timing must be audio-driven, not hardcoded (2026-03-17)

**Problem**: Hardcoding scene durations to pad to a target length (e.g., 30s) creates dead air when audio is shorter than the scene.

**Fix**: Scene frames = `ceil(audioDuration * FPS) + visualPadFrames` where visual pad is ~1s for breathing room. Total video length is the sum of scenes, not a fixed target. Short-form content (TikTok/Shorts) performs better at natural length anyway.

---

## Other

<!-- Miscellaneous patterns -->

_No learnings yet._
