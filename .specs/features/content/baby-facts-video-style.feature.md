---
feature: Baby Facts Video Style
domain: content
source: DonatoSkills/content-engine/SKILL.md
tests: []
components: []
status: specced
created: 2026-04-25
updated: 2026-04-28
---

# Baby Facts Video Style

**Source File**: DonatoSkills/content-engine/SKILL.md  
**Project Config**: DonatoSkills/projects.json → baby-facts-unlocked  
**Reference Implementation**: `DonatoSkills/content-engine/calendars/facts-unlocked-2026-04-18/videos/003-twins-divergent-brains/` (canonical pattern, matches the 50+ TikTok back catalog)

## Feature: Baby Facts AI-Illustrated Whimsical Style

All baby-facts-unlocked short-form videos use **AI-generated soft whimsical illustrations** as scene backgrounds, animated with subtle Ken Burns motion (slow zoom/pan). One illustration per scene (hook/body/cta), with text and audio overlaid. This matches the brand's established TikTok aesthetic across 50+ existing videos.

**Style decision** (2026-04-28, correcting an earlier misread):
- **Primary background**: AI-generated PNG per scene via Gemini 2.5 Flash Image (or fallback to OpenAI gpt-image-1)
- **Image style prefix** (always prepended to per-scene prompts): `"soft whimsical illustration, warm pastel colors, baby-friendly aesthetic, watercolor + soft cel-shading, dreamy ethereal quality, gentle bubbles and sparkles in background, cinematic 9:16 portrait orientation, no text, seamless composition with space for centered text overlay, no borders, gentle natural lighting"`
- **Motion**: `<KenBurnsBackground asset="generated/scene-X.png" direction="zoom-in|pan-left|...">` — vary direction per scene for visual interest
- **Overlays**: HookOverlay or PhraseSyncedCaption / FullCaptionsOverlay over the image

**What NOT to use:**
- ❌ Pure CSS `WhimsicalBackground` component (programmatic gradients + vector bubbles + stars). This pattern was briefly introduced 2026-04-25 and propagated to 002, 053-057. It is **OFF-BRAND** — the back catalog never used it. Reverted 2026-04-28.
- ❌ Corporate dark `SharedBackground` orbs/grid (the shared-project default). That's for money-facts and ai-facts only.

### Scenario: New baby-facts video uses AI illustrations + Ken Burns
Given the daily-content-creation task scaffolds a baby-facts video
When it builds the Remotion source
Then it generates 3-4 AI images via Gemini (one per scene, with the brand style prefix)
And saves them to `public/generated/scene-{N}-{name}.png`
And in `Video.tsx`, each `<Sequence>` renders `<KenBurnsBackground asset="generated/scene-{N}-{name}.png" direction="..." />` followed by the appropriate overlay component
And the calendar item is tagged `variables.background_type = "ai-gen"` (or `"single_static"` if one image per scene)

### Scenario: Per-scene Ken Burns direction varies
Given a baby-facts video has 3 scenes
When KenBurnsBackground is configured per scene
Then directions are picked from `zoom-in | zoom-out | pan-left | pan-right | zoom-in-left | zoom-in-right`
And no two consecutive scenes use the same direction (avoids visual monotony)

### Scenario: Image generation respects the brand style prefix
Given a per-scene image prompt (e.g., "newborn baby with soft glowing brain wave patterns")
When sent to Gemini for generation
Then the brand style prefix is prepended verbatim
And the resulting image is saved as PNG to `public/generated/`
And the image cache (DonatoSkills/image-cache) is consulted first to avoid re-generating semantically similar images (per `project.image_cache.enabled = true`)

### Scenario: Slot ownership is enforced — 2pm ET reserved for quote pipeline
Given baby-facts-unlocked has a daily 2pm ET slot owned by the daily-quote-creation task
When any pipeline schedules a baby-facts video
Then it MUST NOT post to 2pm ET (18:00 UTC)
And valid baby-facts video slots are 9am ET (13:00 UTC) and 7pm ET (23:00 UTC) only

### Scenario: Falling back when Gemini image gen is unavailable
Given Gemini API is rate-limited or unreachable for a scene
When the pipeline attempts image generation
Then it retries once after 3 seconds
And if still failing, falls back to OpenAI (`gpt-image-1`)
And if OpenAI also fails, logs to `.specs/needs-review.md` and skips the video (does NOT silently fall back to CSS-only WhimsicalBackground)

### Scenario: Non-baby-facts channels use their own background style
Given the daily-content-creation task runs for money-facts-unlocked or ai-facts-unlocked
When the content-engine reads project defaults
Then it uses the project's own background_type (typically `abstract_animated` or `ai-gen` for tech/finance)
And does NOT apply baby-facts illustration prompts to non-baby-facts channels

## UI Mockup

```
┌─────────────────────────────┐
│  AI illustration (hook)     │  ← <KenBurnsBackground asset="..." direction="zoom-in" />
│  e.g. baby + brain waves    │    (slow zoom over a soft whimsical PNG)
│  with painted bubbles +     │
│  pastel rainbow gradient    │
│  ┌─────────────────────┐    │
│  │ HOOK TEXT OVERLAY   │    │  ← HookOverlay
│  └─────────────────────┘    │
├─────────────────────────────┤
│  AI illustration (body)     │  ← KenBurnsBackground direction="pan-left"
│  e.g. baby + glowing memory │
│  threads in pastel tones    │
│  Captions appear            │  ← PhraseSyncedCaption / FullCaptionsOverlay
├─────────────────────────────┤
│  AI illustration (cta)      │  ← KenBurnsBackground direction="zoom-in-right"
│  e.g. peaceful baby in      │
│  warm aurora glow           │
│  "Follow for more 💡"       │
└─────────────────────────────┘

The bubbles, sparkles, and pastel gradients are PAINTED INTO the AI image —
not added by code. WhimsicalBackground (CSS) is NOT used.
```

## Component References

- KenBurnsBackground: `src/components/KenBurnsBackground.tsx` — renders `<Img />` with animated transform
- HookOverlay: `src/components/HookOverlay.tsx` — staggered text reveal on hook scene
- PhraseSyncedCaption / FullCaptionsOverlay: scene-text components
- (Legacy) WhimsicalBackground: still present in some video dirs but NOT used in Video.tsx — can be left as dead code or removed at next cleanup

## Config References

- `projects.json` → `baby-facts-unlocked.defaults.background_type = "ai-gen"` (or `single_static`)
- `projects.json` → `baby-facts-unlocked.image_gen` (Gemini default, with OpenAI fallback)
- `projects.json` → `baby-facts-unlocked.image_cache` (cache prior generations to control cost)
- `projects.json` → `baby-facts-unlocked.longform.visuals.image_style_prefix` is the canonical style prefix string — shorts pipeline reuses it verbatim

## History

**2026-04-25:** `whimsical-css` introduced as a value to fix a perceived bug (CSS-only `001-baby-sleep-spindles` video) and made the brand baseline. **This was wrong** — 001 was an outlier; the back catalog uses AI illustrations.

**2026-04-27:** Doubled down by adding 7 CSS variants (blossom/meadow/dawn/dream/garden/cloud/sunset) to vary appearance. Re-rendered 002, 053-057 with the wrong style. Operator caught it after seeing the back catalog still showed AI illustrations.

**2026-04-28:** Reverted. AI-illustration + Ken Burns is restored as the brand standard. The 7 variants and `whimsical-css` value remain available in the schema but are NOT the default.
