---
feature: Baby Facts Video Style
domain: content
source: DonatoSkills/content-engine/SKILL.md
tests: []
components: []
status: specced
created: 2026-04-25
updated: 2026-04-27
---

# Baby Facts Video Style

**Source File**: DonatoSkills/content-engine/SKILL.md  
**Design System**: .specs/design-system/tokens.md  
**Project Config**: DonatoSkills/projects.json → baby-facts-unlocked.defaults  
**Reference Component**: DonatoSkills/content-engine/references/whimsical-template/WhimsicalBackground.tsx

## Feature: Baby Facts Whimsical Animated Style

All baby-facts-unlocked short-form videos use the `whimsical-css` background type — CSS-animated pastel gradients, floating bubbles, and pulsing stars via the `WhimsicalBackground` Remotion component. No AI image generation is used.

**Style decision** (2026-04-25): whimsical-css is the brand baseline.
**Variant variation decision** (2026-04-27): each video must use one of 7 named variants (`blossom | meadow | dawn | dream | garden | cloud | sunset`) so consecutive videos look visually distinct. The component takes a `variant` prop pairing a 3-scene gradient palette with one of 3 shape layouts (A/B/C). Without variant rotation, every video looks identical — that's a regression and is forbidden.

### Scenario: Content engine uses whimsical-css for baby facts cold-start briefs
Given the daily-content-creation task runs for baby-facts-unlocked
And the analytics-loop brief has an empty template object (cold start)
When the content-engine reads project defaults from projects.json
Then it reads `defaults.background_type` = "whimsical-css"
And invokes remotion-video with `visual_mode: text-only`
And does NOT pass Cache Channel or Cache Tags (no AI image gen)
And tags the calendar item with `variables.background_type = "whimsical-css"`

### Scenario: Content engine uses whimsical-css for baby facts exploit briefs
Given the analytics-loop generates an exploit brief for baby-facts-unlocked
And the brief template specifies `"background_type": "whimsical-css"`
When the content-engine maps background_type to visual_mode
Then it maps `whimsical-css` → `visual_mode: text-only`
And uses the WhimsicalBackground Remotion component
And omits AI image generation entirely

### Scenario: Each baby facts video uses a distinct whimsical variant
Given the daily-content-creation task creates N baby-facts videos for a calendar
When the pipeline assigns whimsical variants
Then each video gets a different variant from the 7 available (blossom, meadow, dawn, dream, garden, cloud, sunset)
And no two consecutive videos share the same variant
And the chosen variant is recorded in used-topics.md alongside `whimsical-css/{variant}` permutation

### Scenario: Variant rotation tracks through used-topics.md
Given a baby-facts video was just produced with variant "meadow"
When the next baby-facts video is being scaffolded
Then the pipeline reads the last 3 baby-facts entries in used-topics.md
And picks a variant NOT in that recent set
And tags the new video accordingly

### Scenario: Shared-project pattern uses WhimsicalBackground for baby-facts
Given today's daily-content-creation task creates a shared-project Remotion calendar
When FactsVideo.tsx renders a video where config.project === "baby-facts-unlocked"
Then it renders WhimsicalBackground (with config.whimsicalVariant) instead of SharedBackground
And applies a strong text shadow to all white text overlays for legibility on light pastels
And does NOT use the dark "purple/green/red/blue/teal" tech palettes

### Scenario: Slot ownership is enforced — 2pm ET reserved for quote pipeline
Given baby-facts-unlocked has a daily 2pm ET slot owned by the daily-quote-creation task
When any pipeline schedules a baby-facts video
Then it MUST NOT post to 2pm ET (18:00 UTC)
And valid baby-facts video slots are 9am ET (13:00 UTC) and 7pm ET (23:00 UTC) only

### Scenario: Non-baby-facts channels are NOT defaulted to whimsical-css
Given the daily-content-creation task runs for money-facts-unlocked or ai-facts-unlocked
And those projects have no background_type set in their defaults
When the content-engine handles a cold-start brief with an empty template
Then it falls back to the schema default of "abstract_animated"
And does NOT apply whimsical-css to non-baby-facts channels

### Scenario: Analytics loop can score whimsical-css videos
Given a baby facts video was created with `background_type: "whimsical-css"` in its calendar item variables
When the analytics-loop runs decompose-variables
Then `whimsical-css` is a recognized valid value for `background_type`
And the video is included in variable impact analysis for that dimension

### Scenario: whimsical-css is in the shared analytics schema
Given the analytics-schema.md defines valid background_type values
Then "whimsical-css" is listed as a valid value
And the variable-taxonomy.md describes what whimsical-css renders

## UI Mockup

```
┌─────────────────────────────┐
│  ████ HOOK SCENE ████       │  ← WhimsicalBackground theme="hook"
│  Pastel gradient bg         │    (pink → lavender gradient)
│  Floating bubbles           │    Floating opacity circles
│  ┌─────────────────────┐    │
│  │ HOOK TEXT OVERLAY   │    │  ← HookOverlay component
│  │ (bold, centered)    │    │
│  └─────────────────────┘    │
├─────────────────────────────┤
│  ░░░ BODY SCENE ░░░         │  ← WhimsicalBackground theme="body"
│  Softer gradient bg         │    (cream → soft pink)
│  Full captions overlay      │  ← FullCaptionsOverlay
│  "Babies develop sleep..."  │
├─────────────────────────────┤
│  ··· CTA SCENE ···          │  ← WhimsicalBackground theme="cta"
│  "Did you know? 💡"         │
│  "Follow for more baby      │
│   facts."                   │
│  [ FOLLOW FOR MORE ] btn    │
└─────────────────────────────┘

No AI-generated images. CSS animation only.
```

## Component References

- WhimsicalBackground: Remotion component in each video's `src/components/WhimsicalBackground.tsx`
- HookOverlay: `src/components/HookOverlay.tsx`
- FullCaptionsOverlay: `src/components/FullCaptionsOverlay.tsx`

## Config References

- `projects.json` → `baby-facts-unlocked.defaults.background_type = "whimsical-css"`
- `shared-references/analytics-schema.md` → background_type valid values
- `analytics-loop/references/variable-taxonomy.md` → whimsical-css definition
- `content-engine/SKILL.md` → background_type → visual_mode mapping table

## Bug Fix Notes

**Regression fixed 2026-04-25:**
- `whimsical-css` was not in the analytics schema or variable taxonomy
- `projects.json` had no `background_type` default for baby-facts-unlocked
- Content-engine SKILL.md had no instruction to read `defaults.background_type`
- Result: cold-start briefs caused content-engine to pick non-whimsical background_type
- Fix: added whimsical-css to schema + taxonomy, added project default, updated SKILL.md
