# Long-Form Video — Next Iteration (2026-03-20)

Branch: `long-form-content-creation` (unmerged, iterating)

## What's Working

- Full pipeline: script JSON → TTS (Grok/ElevenLabs) → images (Grok Aurora) → composition → Remotion MP4
- First video rendered: Baby Facts 3.3 min, 1920x1080, $0.48 cost
- 42 unit tests + 3 integration tests passing
- Image cache ready to reduce costs on repeated themes

---

## Tomorrow's Hit List

### 1. More Scenes Per Video
Current: ~7 scenes for 3+ min = each image holds ~30s (too long, feels static).
Target: 2-3 images per minute minimum → 15-20 scenes for a 5-min video.

- [ ] Update `facts-compilation.md` prompt to generate more granular scenes
- [ ] Split long narration blocks into shorter 10-15s segments with distinct image_hints
- [ ] Consider "B-roll" scenes — supplementary visuals between main fact narration
- [ ] Test: does the image cache meaningfully reduce cost at 15-20 scenes per video?

### 2. Script Writer & Storytelling
The narration quality drives retention. Need to level up the storytelling.

- [ ] Review `prompts/facts-compilation.md` — how does it structure the narrative arc?
- [ ] Add storytelling techniques: open loops, callbacks, emotional beats, cliffhangers between chapters
- [ ] Hook optimization: test different intro_styles (cold_open, did_you_know, myth_buster, shock_stat)
- [ ] Pacing variation: some facts need buildup, others hit better as quick punches
- [ ] Chapter transitions: "But here's where it gets really interesting..." connective tissue
- [ ] Consider audience retention curve shape — front-load the most compelling fact?

### 3. Editing & Transitions — Beyond Remotion?
Current: Remotion renders Ken Burns + crossfades. Works but limited.

- [ ] **CapCut API** — investigate programmatic access
  - CapCut has a developer API? Or is it desktop-only?
  - Pros: professional transitions, effects library, text animations, auto-captions
  - Cons: may not have headless/API rendering
- [ ] **FFmpeg pipeline** — could skip Remotion entirely
  - More control over encoding, filters, transitions
  - Zoompan filter for Ken Burns, xfade for transitions
  - Lighter weight, no browser rendering overhead
  - Could render on server without Chrome headless
- [ ] **Shotstack API** — cloud video rendering
  - JSON-to-video API, similar to our composition.json concept
  - Pay per render, but no local compute needed
- [ ] **Creatomate** — another JSON-to-video cloud API
  - Template-based, good for consistent branding
- [ ] **Keep Remotion but enhance it**
  - Add text overlays (fact callouts, key stats)
  - Animated captions synced to TTS
  - More transition types (wipe, slide, zoom-through)
  - Background ambient music layer
- [ ] Decision: which approach gives best quality/cost/automation tradeoff?

### 4. Automated Generation Scheduling
Need to slot long-form generation into the existing task schedule.

- [ ] Audit current scheduled tasks — what's running and when?
- [ ] Identify quiet windows (no short-form generation, no analytics pulls)
- [ ] Long-form pipeline takes ~5-10 min (TTS + image gen + render)
  - TTS: ~1-2 min (7 API calls sequential)
  - Image gen: ~2-3 min (7 API calls sequential, could parallelize)
  - Render: ~6-8 min (Remotion, CPU-bound)
- [ ] Design the automation flow:
  1. Script generation (Claude/Grok writes the script JSON)
  2. Pipeline run (TTS + images + composition)
  3. Render (Remotion or alternative)
  4. Quality check (manual review? automated thumbnail gen?)
  5. Upload to YouTube (via YouTube Data API)
- [ ] Frequency: 2-4x/week — which days/times?
- [ ] Error handling: what if API fails mid-pipeline? Resume capability?
- [ ] Cost budgeting: ~$0.50/video × 4/week = $8/month (very cheap)

---

## Parking Lot (not tomorrow, but soon)

- [ ] Feature #37: YouTube Data API retention curves (real analytics feedback loop)
- [ ] Feature #38: Local TTS via Kokoro-82M ($0 TTS cost)
- [ ] Thumbnail generation (Grok Aurora or Canva API)
- [ ] A/B testing thumbnails + titles
- [ ] Multi-channel support (other Facts Unlocked themes beyond Baby Facts)
