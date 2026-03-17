---
name: text-writer
description: Write text-based social media posts for platforms like Twitter/X, LinkedIn, Facebook, Threads, and Bluesky. Use this skill when the user wants to write a tweet, thread, LinkedIn post, Facebook post, text caption, hot take, thought leadership piece, or any text-only social media content. Also trigger when the user says "write me a post", "draft a tweet", "LinkedIn post about", "write a thread", "text post", or wants text content for social platforms without images or video.
---

# Text Writer

Write platform-optimized text posts for social media. This skill handles text-only content — tweets, threads, LinkedIn posts, Facebook posts, Threads posts, and Bluesky posts.

## How This Works

You write text content tailored to the target platform's tone, length constraints, and audience expectations. Every post starts with a hook (see `shared-references/hook-writing.md`). Posts are stored in a `text-posts/` directory within the user's project so they can find, review, and reuse them.

The user tells you what they want to say. **You craft platform-perfect text and save it to a file.**

---

## Orchestrated Mode

When invoked by the `content-engine` skill (or any orchestrator), the prompt will contain **"ORCHESTRATED MODE"** and all required parameters (platform, topic, tone, content pillar). In this case:

1. **Skip the interactive question flow entirely** — all decisions are already made
2. **Write the post directly**
3. **Save to the specified output path**
4. **Output a structured summary when done:**
   ```
   TEXT_COMPLETE
   asset_path: text-posts/zenbrew-march/posts.md
   platform: twitter
   word_count: 45
   ```

If any required parameter is missing, fall back to the interactive question flow for that parameter only.

---

## Project Registry (Multi-Project Support)

**Before writing any post**, resolve which project/brand this is for.

### Step 0: Resolve Active Project

1. **Read `projects.json`** from the DonatoSkills root directory (`~/DonatoSkills/projects.json`)
2. **Resolve the active project:**
   - **CWD match** — Current directory is inside a project's `specs_path` → auto-select (most common — zero friction)
   - **Orchestrated** — Content-engine passed `project_id` → use directly
   - **Explicit** — User said "for [project name]" → match against project names/slugs
   - **Single project** — Only one project in registry → use it automatically
   - **Ask** — Multiple projects, can't auto-detect → "Which project is this post for?"

3. **Use the project's brand context:**
   - If `specs_path` is set → read vision.md, personas, and design tokens from there
   - If `brand_brief` is set → read that for tone, audience, and messaging
   - Apply `defaults.tone` and `defaults.content_pillars` as starting defaults

See `shared-references/project-registry.md` for the full resolution logic.

---

## Interactive Question Flow

### Step 1: Absorb Context (silent — no questions)

Before asking the user anything, silently read whatever project context exists. **The active project (resolved in Step 0) determines where to find brand context.**

**From the active project (`projects.json`):**
- If `specs_path` is set → read SDD files from there
- If `brand_brief` is set → read that for brand context
- Apply `defaults.tone` as starting default for tone questions
- Apply `defaults.content_pillars` to inform pillar alignment

**Brand & Audience (from project's specs_path):**

1. **`.specs/vision.md`** — What the product is, who it's for, its personality and positioning. This shapes the *content and tone* of the post.

2. **`.specs/personas/*.md`** — Who the target users are. Personas contain vocabulary, patience level, and frustrations. These inform word choice and what angles resonate.

3. **`.specs/design-system/tokens.md`** — Brand voice descriptors, if defined.

**Non-SDD projects (no specs_path):**
- Read `README.md`, landing page copy, or any product description
- Check for brand guidelines, style guides, or marketing docs

**Always check:**

4. **`shared-references/hook-writing.md`** — Platform-specific hook best practices. Read this before writing any post.
5. **`shared-references/platform-specs.md`** — Character limits, hashtag limits, and text truncation points per platform. Use this to ensure posts fit within platform constraints.
6. **`shared-references/caption-writing.md`** — Caption structure formulas, CTA patterns, hashtag strategies, and formatting rules per platform. This is your primary writing playbook.
7. **`shared-references/content-pillars.md`** — Content pillar frameworks. When creating posts as part of a content strategy, align the post to the appropriate pillar.
8. **Previous conversation** — if the user just described their topic, you already know it.

**Use everything you find** to pre-fill answers below. The more you absorb silently, the fewer questions you need to ask.

### Step 2: Ask Questions

Group these conversationally. Skip what you already know.

1. **Platform** — "Which platform? (Twitter/X, LinkedIn, Facebook, Threads, Bluesky — or multiple?)"
   - If multiple, you'll adapt the same message per platform

2. **Topic/Message** — "What should this post be about?"
   - Could be a topic, a take, a story, a lesson, a promotion, etc.

3. **Format** — "What format?
   - **Single post** — one standalone post
   - **Thread** — multi-part (Twitter threads, LinkedIn carousels-as-text)
   - **Hot take** — short, punchy, opinionated
   - **Story** — narrative arc (setup → conflict → resolution)
   - **Tips/List** — numbered tips or bullet points
   - **Announcement** — product launch, event, news"

4. **Tone** — "What's the vibe? (professional, casual, funny, provocative, inspirational, educational)"
   - If vision.md or brand context exists, suggest the tone from there

5. **CTA** — "Any call to action? (follow, link in bio, comment, share, DM, none)"

6. **Job name** — "What should I call this batch? (e.g., 'product-launch', 'weekly-tips')"
   - Used for the output folder name
   - In orchestrated mode, this comes from the campaign slug

### Step 3: Write & Confirm

Write the post and show it to the user:

> **Twitter/X Post:**
>
> Everyone says post daily, but that's killing your reach.
>
> Here's what actually works (from someone who grew to 40k doing the opposite):
>
> Post less. But make every post a scroll-stopper.
>
> The algorithm rewards engagement rate, not volume. 3 bangers/week > 7 mid posts.
>
> #growthtips

Ask: "How's this? Want me to adjust anything, or save it?"

---

## File Storage

### Directory Structure

All text posts live in a `text-posts/` directory in the project root:

```
text-posts/
├── product-launch/
│   └── posts.md           ← all posts for this job in one file
├── weekly-tips-mar-17/
│   └── posts.md
└── zenbrew-march/          ← orchestrator campaign
    └── posts.md            ← all text posts for the calendar in one file
```

**Key rules:**
- **One file per job** — all posts for a job go in `posts.md`, not scattered across files
- **Standalone use** — one job folder per invocation (e.g., `product-launch/`)
- **Orchestrated use** — all text posts for a campaign share one file (e.g., `zenbrew-march/posts.md`)
- If `text-posts/` doesn't exist, create it
- If the job folder doesn't exist, create it

### posts.md Format

```markdown
# Text Posts: [Job Name]

**Created**: 2026-03-15
**Brand**: [brand name if known]
**Platforms**: Twitter/X, LinkedIn

---

## Post 1: [Brief description]

**Platform**: Twitter/X
**Date**: 2026-03-17 (if scheduled)
**Status**: Draft | Approved | Scheduled

Everyone says post daily, but that's killing your reach.

Here's what actually works:
Post less. Make every post a scroll-stopper.

The algorithm rewards engagement rate, not volume.
3 bangers/week > 7 mid posts.

---

## Post 2: [Brief description]

**Platform**: LinkedIn
**Date**: 2026-03-18 (if scheduled)
**Status**: Draft

I've been in B2B sales for 12 years.

The biggest shift I've seen? Cold calling didn't die — it evolved.

Here's what replaced the old playbook (and grew my pipeline 300%):

[continued...]

---
```

This format means:
- All posts for a job are in one place — easy to review, approve, or hand off
- Each post is clearly separated with metadata
- The orchestrator can append new posts to an existing file
- Status tracking per post (Draft → Approved → Scheduled)

---

## Platform Constraints & Style

**Always read `shared-references/hook-writing.md` before writing.** The hook is the most important part of every post.

### Twitter/X

**Constraints:**
- 280 characters per tweet (long-form with Twitter Blue)
- Threads: each tweet is its own unit — must stand alone AND connect
- 1-2 hashtags max (more looks spammy)

**Style:**
- Witty, concise, conversational
- Every word must earn its place
- Threads: hook tweet → value tweets → CTA tweet
- Line breaks between ideas for scannability

**Thread Format:**
```
Tweet 1 (Hook):
Everyone says post daily, but that's killing your reach.

Here's what actually works (thread) 🧵

Tweet 2:
First: engagement rate > volume.
The algorithm doesn't care how often you post.
It cares how many people stop, like, reply.

Tweet 3:
Second: timing beats frequency.
Post when YOUR audience is online, not when "experts" say to.

...

Tweet N (CTA):
If this helped, follow me for more growth breakdowns.
RT the first tweet to help someone else.
```

### LinkedIn

**Constraints:**
- 3000 characters theoretical max, but **1248 characters practical limit** for posts with media attachments (images/videos). Posts exceeding 1248 chars with media get truncated or rejected by some clients.
- For text-only posts, aim for under 1500 characters for best engagement
- First 2 lines visible before "see more" — the hook MUST be in these 2 lines
- 3-5 hashtags (professional/industry terms)

**Style:**
- Professional but human — not corporate robot
- Storytelling works extremely well
- Short paragraphs (1-2 sentences each)
- Line breaks between every thought
- End with a question to drive comments

**Structure:**
```
[Hook — 2 lines max, must trigger "see more" click]

[Story or insight — 3-5 short paragraphs]

[Key takeaway — bold or clear]

[CTA question — drives comments]

#hashtag1 #hashtag2 #hashtag3
```

### Facebook

**Constraints:**
- 63,206 characters (but shorter performs better)
- Less hashtag-driven than other platforms (0-3)

**Style:**
- Conversational, community-oriented, warm
- Emotional hooks outperform informational ones
- Personal stories > professional insights
- Questions drive engagement in groups

### Threads

**Constraints:**
- 500 characters
- Minimal hashtags (0-2)

**Style:**
- Conversational, personal
- Similar to Twitter but more personal and less performative
- Community-oriented

### Bluesky

**Constraints:**
- 300 characters
- Hashtags not widely used yet

**Style:**
- Casual, techy, early-adopter crowd
- Short and punchy
- Less "hustle culture" than Twitter

---

## Multi-Platform Adaptation

When the user wants the same message across platforms, DON'T copy-paste. Adapt:

| Platform | Adaptation |
|----------|-----------|
| Twitter/X | Shortest version. Punchiest hook. 1-2 hashtags. May become a thread if topic is deep. |
| LinkedIn | Longer, more structured. Professional angle. Story format. End with question. 3-5 hashtags. |
| Facebook | Emotional angle. Personal story framing. Community language. 0-3 hashtags. |
| Threads | Conversational, personal take. Short. 0-2 hashtags. |
| Bluesky | Shortest, most casual. No hashtags. |

When adapting, save all versions in the same `posts.md` file, grouped under the same post number:

```markdown
## Post 3: Why daily posting hurts growth

### Twitter/X
Everyone says post daily, but that's killing your reach.

### LinkedIn
I posted every day for 6 months. My engagement dropped 40%.

Here's the counterintuitive lesson that changed everything...

### Facebook
Can I be honest? I was posting every single day and my reach was TANKING.

Then I tried something different...
```

---

## Writing Process

For every post, follow this process:

1. **Read the hook guide** — `shared-references/hook-writing.md` for the target platform
2. **Write 2-3 hook options** — pick the strongest one
3. **Write the body** — deliver on the hook's promise
4. **Add CTA** — if applicable
5. **Check constraints** — character count, hashtag count, format rules
6. **Platform-adapt** — if multi-platform, adapt (don't copy)
7. **Save to file** — append to the job's `posts.md`

---

## Content Types

### Hot Takes
- Bold, opinionated, slightly controversial
- 1-3 sentences max
- No hedging — commit to the take
- Works best on Twitter/X and Threads

### Threads (Twitter)
- Hook tweet must stand alone as a great tweet
- Each subsequent tweet adds one idea
- Last tweet is always a CTA
- 3-7 tweets optimal (longer threads lose people)

### Thought Leadership (LinkedIn)
- Open with a personal story or contrarian insight
- Structure: Story → Lesson → Takeaway → Question
- 150-300 words sweet spot
- Break into short paragraphs with line breaks

### Announcements
- Lead with the benefit to the reader, not the feature
- "You can now..." > "We just launched..."
- Include a clear next step

### Stories
- Setup → Conflict → Resolution → Lesson
- First line is the hook (in media res works well)
- Keep it real — authenticity > polish

---

## Hashtag Guidelines

| Platform | Count | Strategy |
|----------|-------|----------|
| Twitter/X | 1-2 | Only if genuinely relevant. Less is more. |
| LinkedIn | 3-5 | Industry terms. Mix broad + niche. |
| Facebook | 0-3 | Optional. Community/group tags if applicable. |
| Threads | 0-2 | Minimal. Platform is still finding its identity. |
| Bluesky | 0 | Not established yet. Skip. |
