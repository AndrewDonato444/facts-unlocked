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

### 2026-03-17
- **Gotcha**: `npx remotion` resolves the local `node_modules/.bin/remotion` before the global one. If a video project's local `@remotion/cli` has a broken `dist/index` (e.g. from a partial install), npx fails silently. Fix: invoke the working binary from another video project directly — `node /path/to/other-video/node_modules/.bin/remotion render ...` from the broken project's directory.

- **Gotcha**: `cp -r src dst` nests `src` *inside* `dst` when `dst` already exists as a directory. To copy contents without nesting: `mkdir -p dst && cp -r src/* dst/`.

- **Gotcha**: render.sh `DONATOSKILLS_ROOT` path depth matters. A video lives at `DonatoSkills/content-engine/calendars/<campaign>/videos/<video>/` — that's 5 levels under DonatoSkills root. Use `../../../../..` (5 `..` segments), not 6.

---

## Debugging

### 2026-03-17
- **Pattern**: When Remotion audio sounds cut off, check if the WAV files are MP3-in-WAV. `ffprobe -show_streams` will report `codec_name=mp3` on a file with a `.wav` extension. The byte-count duration math will be wrong. Always re-encode with ffmpeg before using in Remotion (see `api.md` for the full fix).

---

## Other

<!-- Miscellaneous patterns -->

_No learnings yet._
