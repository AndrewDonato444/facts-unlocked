# Facts Compilation — Script Generation Prompt

This template is used by the `longform-video` skill to generate chapter-structured narration scripts for facts compilation videos.

---

## System Context

You are writing a narration script for a long-form YouTube video. The video is a facts compilation — a series of surprising, educational facts grouped into chapters under a unifying theme. The narration will be read by a TTS voice (not a human), so write for natural spoken delivery.

**Channel**: {{channel_name}}
**Audience**: {{audience_context}}
**Tone**: {{tone}} (from channel config)

---

## Inputs

| Parameter | Source | Example |
|-----------|--------|---------|
| `theme` | Content engine brief or user | "How Babies Experience Their First Year" |
| `tone` | `project.longform.script.tone` | "warm, curious, gentle, educational" |
| `chapter_count` | Config or brief | 4 |
| `facts_per_chapter` | Config range | [2, 3] |
| `word_count_target` | Config | 2800 |
| `used_topics` | `content-engine/used-topics.md` | List of already-used facts to avoid verbatim repeats |
| `analytics_insights` | Latest long-form brief (if any) | "story_open intros retain 18% better than cold_open" |
| `voice_name` | Config | "Matilda" |

---

## Script Structure

Generate the script following this exact structure:

### HOOK (30 seconds, ~75 words)

The hook is the single most important part. If viewers leave in the first 30 seconds, nothing else matters.

**Pattern:**
1. **Opening fact** — The single most surprising fact from the entire video. Don't save your best for later. Deliver it as a curiosity gap: state the surprising claim but hold back the explanation.
2. **Context line** — One sentence that broadens the scope: "And that's just the beginning..." or "But that's not even the most surprising part..."
3. **Promise** — Tell the viewer what they'll get: "In this video, we'll explore [N] incredible facts about [theme]."

**Rules:**
- First sentence must be speakable in under 5 seconds
- Use "you" language — "Here's something that might surprise you"
- Never start with "Welcome to..." or "Hey guys..." or "In today's video..."
- The hook fact MUST also appear in its full context later in a chapter (don't just tease and forget)

### CHAPTERS (3-5 chapters, 500-700 words each)

Each chapter covers a sub-theme with 2-3 related facts.

**Per-chapter structure:**
```
Chapter Intro (1-2 sentences)
└── Bridge from previous chapter or establish the sub-theme

Fact A (~150-200 words)
├── The fact itself (1-2 sentences, surprising claim)
├── Context: Why this is true / how it works (3-4 sentences)
├── "Why it matters" or relatable comparison (1-2 sentences)
└── Transition sentence to Fact B

Fact B (~150-200 words)
├── Same structure as Fact A
└── Transition to Fact C or chapter close

(Optional) Fact C (~150-200 words)
└── Same structure

Chapter Close (1-2 sentences)
└── Mini-summary or teaser for next chapter
```

**Chapter-level rules:**
- Each chapter has a distinct sub-theme (don't repeat the same angle)
- Order chapters for narrative build: start accessible, end mind-blowing
- Transitions between chapters should feel natural, not abrupt: "Speaking of how babies hear, did you know they can also..."
- Each chapter should be satisfying on its own (viewer might skip around via chapters)

### OUTRO (30 seconds, ~75 words)

**Pattern:**
1. **Recap** — One sentence tying the journey together: "From [first chapter theme] to [last chapter theme], [channel subject] are truly incredible."
2. **Engagement CTA** — "Which fact surprised you most? Let us know in the comments."
3. **Subscribe CTA** — "If you enjoyed this, hit subscribe — we post new deep dives every week."

---

## Writing Rules

### Write for the Ear
- Use contractions (it's, don't, here's, that's)
- Short sentences. Average 12-15 words.
- Rhetorical questions break up monologue: "But why does this happen?"
- Em-dashes for natural pauses: "And here's the thing — it happens automatically."
- Avoid parenthetical asides (they're confusing when spoken)
- Never use bullet points or numbered lists in narration (this isn't a blog post)

### Fact Density Pacing
- NEVER stack two facts back-to-back without a breathing sentence
- Pattern: Surprising claim → Explain → Relate → Transition → Next claim
- Each fact gets ~150-200 words (the claim is 1-2 sentences; the rest is context)
- The context is what makes it a video, not a listicle

### Emotional Arc
- Each chapter: curiosity (opener) → understanding (context) → wonder (payoff)
- Overall video: accessible facts early → mind-blowing facts late
- Include at least one "wow" moment per chapter
- End each chapter on a high note (not a trailing explanation)

### Scene-Aware Writing
Each narration block maps to ONE visual scene. Write with the image in mind:
- "Picture a newborn's tiny hand..." → gives clear image direction
- "Studies show that infants process..." → abstract, no visual hook
- Mention visual subjects explicitly so the image generator knows what to create
- Each scene should have 1 clear visual subject (don't describe 3 things for 1 image)

### Strategic Repetition
- Reference earlier facts to create cohesion: "Remember that bone fact from earlier? Here's why that number drops..."
- This rewards viewers who watched from the start
- Don't overdo it — 2-3 callbacks per video max

### Narrator Fatigue Prevention
- Vary sentence length (mix 5-word punches with 20-word explanations)
- Include 1-2 light humor moments per video (not forced jokes — gentle observations)
- Mix question-answer patterns with declarative statements
- Every 3-4 minutes, include a "reset" moment that re-engages wandering attention

---

## Output Format

Output a valid JSON object matching this schema:

```json
{
  "title": "YouTube-optimized title (under 60 chars, keyword-rich)",
  "description": "YouTube description with chapter timestamps and hashtags",
  "tags": ["tag1", "tag2", "..."],
  "chapters": [
    {
      "chapter_id": "intro",
      "title": "Introduction",
      "scenes": [
        {
          "scene_id": "hook_01",
          "narration": "Full narration text for this scene...",
          "image_hint": "Description for image generation",
          "image_tags": ["tag1", "tag2"],
          "estimated_words": 75
        }
      ]
    },
    {
      "chapter_id": "chapter_1",
      "title": "Chapter Title",
      "scenes": [...]
    }
  ],
  "outro": {
    "scenes": [
      {
        "scene_id": "outro_01",
        "narration": "Outro narration...",
        "image_hint": "...",
        "image_tags": ["..."],
        "estimated_words": 75
      }
    ]
  },
  "metadata": {
    "total_estimated_words": 2800,
    "total_scenes": 18,
    "chapter_timestamps": [
      "0:00 Introduction",
      "0:30 Chapter Title 1",
      "..."
    ]
  },
  "testing_vectors": {
    "intro_style": "fact_hook|story_open|question|cold_open",
    "chapter_count": 4,
    "narration_pace": "slow|moderate|steady",
    "theme_type": "mixed_facts|single_topic|countdown|story_arc",
    "visual_density": "sparse|moderate|dense"
  }
}
```

**Validation:**
- Total words across all scenes should be within ±10% of `word_count_target`
- Each scene's `estimated_words` should match the actual word count of its `narration`
- Every scene must have `image_hint` and `image_tags` (even outro)
- `chapter_timestamps` are estimates — real timestamps come from TTS audio durations
- `testing_vectors` must log the actual choices made for analytics decomposition

---

## Dedup Check

Before writing, cross-reference `used-topics.md`:
- Individual facts that appear in short-form CAN be reused in long-form (different framing)
- The theme itself must not duplicate an existing long-form entry (>70% fact overlap)
- If the theme is too similar to an existing long-form video, suggest a different angle

---

## Analytics-Informed Adjustments

If `analytics_insights` are provided (from the latest long-form brief), apply them:
- If a specific `intro_style` is recommended, use it
- If a `narration_pace` is recommended, adjust sentence length accordingly
- If certain `theme_type` patterns are suppressed, avoid them
- Log the actual choices in `testing_vectors` so the analytics loop can track what was used
