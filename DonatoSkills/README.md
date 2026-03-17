# DonatoSkills

A collection of Claude Code skills for automated social media content creation. Create videos, images, and text posts — then schedule them all through Buffer. Use skills individually or chain them together with the content engine for full automation.

## Skills

| Skill | Command | What it does |
|-------|---------|-------------|
| **remotion-video** | `/remotion-video` | Creates short-form videos with animated text, scenes, and AI voiceover using Remotion + Gemini TTS |
| **image-gen** | `/image-gen` | Generates images (quote cards, product shots, graphics) using Gemini/Nano Banana |
| **text-writer** | `/text-writer` | Writes platform-optimized text posts (tweets, threads, LinkedIn posts, hot takes) |
| **social-media** | `/social-media` | Schedules and publishes posts to connected platforms via Buffer |
| **content-engine** | `/content-engine` | Orchestrator — plans a content calendar and chains the above skills to create and schedule everything automatically |

## How it works

```
                         /content-engine (orchestrator)
                        /        |         \
                       /         |          \
              /remotion-video  /image-gen  /text-writer
                       \         |          /
                        \        |         /
                     Cloudinary (media hosting)
                              |
                        Buffer (scheduling)
                              |
                    Twitter/X, Instagram, LinkedIn, etc.
```

Each skill works standalone:
- `/remotion-video` — just makes a video, no posting
- `/image-gen` — just generates an image
- `/text-writer` — just writes text posts
- `/social-media` — just schedules a post you give it

Or use `/content-engine` to chain them: "Create a week of content for my brand and schedule it all."

## Required API Keys

Create a `.env` file in your project root (or wherever you're using the skills):

```bash
# Buffer — social media scheduling
# Get from: https://buffer.com → Settings → API
BUFFER_API_KEY=your_buffer_api_key

# Google Gemini — AI voiceover (TTS) + image generation
# Get from: https://aistudio.google.com/apikey
GEMINI_API_KEY=your_gemini_api_key

# Cloudinary — media hosting (so Buffer can access your videos/images)
# Get from: https://cloudinary.com → Dashboard → API Keys
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Which keys do you need?

| Skill | Buffer | Gemini | Cloudinary |
|-------|--------|--------|------------|
| remotion-video | - | Required (TTS) | - |
| image-gen | - | Required (image gen) | - |
| text-writer | - | - | - |
| social-media | Required | - | - |
| content-engine | Required | Required | Required |

**text-writer** needs no API keys — it's just Claude writing text.

**remotion-video** and **image-gen** only need Gemini (no posting).

**social-media** only needs Buffer (no content creation).

**content-engine** needs everything because it does the full pipeline: create → upload → schedule.

## Setup

### 1. Install skills globally

Copy each skill to your Claude Code skills directory:

```bash
# Clone the repo
git clone https://github.com/AndrewDonato444/DonatoSkills.git

# Install each skill
mkdir -p ~/.claude/skills
cp -r DonatoSkills/remotion-video ~/.claude/skills/
cp -r DonatoSkills/image-gen ~/.claude/skills/
cp -r DonatoSkills/text-writer ~/.claude/skills/
cp -r DonatoSkills/social-media ~/.claude/skills/
cp -r DonatoSkills/content-engine ~/.claude/skills/
```

### 2. Restart Claude Code

Skills are loaded at startup. After installing, restart Claude Code for slash commands to appear.

### 3. Connect Buffer channels

Go to [buffer.com](https://buffer.com) and connect the social media accounts you want to post to. The skills will auto-detect your connected channels.

### 4. Set up API keys

Create `.env` in your project directory with the keys listed above.

## Usage Examples

### Create a video
```
/remotion-video
> Make a 15-second video about vibe coding, funny vibe, with AI voiceover, for Twitter/X
```

### Generate an image
```
/image-gen
> Create a quote card that says "Ship first. Understand later." for Twitter/X
```

### Write text posts
```
/text-writer
> Write 5 tweets about vibe coding, mix of hot takes and tips
```

### Schedule a post
```
/social-media
> Schedule this video to Twitter/X for tomorrow at 2pm
```

### Run the full content engine
```
/content-engine
> I just launched a matcha brand called ZenBrew. Create a week of content for all my connected channels and just run it.
```

The content engine will:
1. Analyze your brand
2. Generate a content calendar (video, image, text mix)
3. Create all content using the other skills
4. Upload media to Cloudinary
5. Schedule everything through Buffer
6. Give you a final report

## Shared References

The `shared-references/` directory contains cross-cutting knowledge used by all content-creation skills:

- **hook-writing.md** — Platform-specific best practices for writing hooks (first lines, opening scenes, text overlays). Every skill references this before writing any hook or opening line.

## Multi-Project Support

DonatoSkills supports managing content for **multiple brands/projects** from a single installation. The `projects.json` file in the repo root is the central registry.

### How it works

1. **One project?** Skills auto-select it — zero friction.
2. **Multiple projects?** Skills auto-detect based on your working directory, or ask which project you mean.
3. **Each project maps to**: specific Buffer channels, brand context, API keys, default tone/pillars.

### Adding a project

Edit `projects.json` or say "add a new project" and the skill will walk you through it.

### Separate Buffer accounts

Each project can use a different Buffer API key. Set `buffer.api_key_env` per project:

```json
{
  "my-brand": { "buffer": { "api_key_env": "BUFFER_API_KEY" } },
  "client-xyz": { "buffer": { "api_key_env": "BUFFER_API_KEY_CLIENT" } }
}
```

See `shared-references/project-registry.md` for the full schema and examples.

## Project Context Absorption

All skills silently check for project context before asking questions:

- **`projects.json`** — Which project/brand, which channels, which API keys
- **`.specs/vision.md`** — Product description, positioning, personality
- **`.specs/personas/*.md`** — Target audience profiles
- **`.specs/design-system/tokens.md`** — Brand colors, typography, visual style

If these files exist for the active project, the content will automatically match your brand. If they don't exist, the skill will ask you for context.

## Output Locations

| Content type | Saved to |
|-------------|----------|
| Videos | `videos/<job-name>/out/video.mp4` |
| Images | `images/<job-name>/output/` |
| Text posts | `text-posts/<job-name>/posts.md` |
| Content calendars | `content-engine/calendars/<campaign>/calendar.json` |

## Tech Stack

- **[Remotion](https://remotion.dev)** — React-based video rendering
- **[Gemini API](https://aistudio.google.com)** — TTS voiceover + image generation (Nano Banana)
- **[Buffer](https://buffer.com)** — Social media scheduling (GraphQL API)
- **[Cloudinary](https://cloudinary.com)** — Media hosting and delivery
- **[Claude Code](https://claude.com/claude-code)** — AI coding agent that runs the skills
