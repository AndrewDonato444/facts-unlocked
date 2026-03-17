---
name: social-media
description: Plan, schedule, and publish social media content using Buffer or Zernio. Use this skill when the user wants to schedule posts, plan a content calendar, publish to social platforms (Instagram, TikTok, Twitter/X, LinkedIn, Facebook, YouTube, Threads, Bluesky, Mastodon), manage their Buffer queue, check post analytics, or repurpose content across platforms. Also trigger when the user says "post this," "schedule this," "publish," "content calendar," "social media plan," or references Buffer or Zernio directly.
---

# Social Media Planner & Publisher

Plan, schedule, and publish social media content via [Buffer](https://buffer.com) or [Zernio](https://zernio.com). This skill handles everything after content is created — captions, hashtags, scheduling, cross-platform adaptation, and analytics.

## How This Works

This skill supports **two scheduling backends**:

1. **Buffer** — GraphQL API, scheduling via mutations. The original backend.
2. **Zernio** — REST API, scheduling via `POST /v1/posts`. Supports 14+ platforms, per-platform custom content in a single request, and post validation.

**Which backend to use** is determined by the active project's configuration in `projects.json`:
- If the project has a `zernio` config with a valid API key → use Zernio
- If the project has a `buffer` config with a valid API key → use Buffer
- If both are configured → **prefer Zernio** (newer, supports multi-platform in one call), unless the user explicitly says "use Buffer" or the orchestrator specifies `scheduler: buffer`
- If neither is configured → ask the user which to set up

The user tells you what they want to post (or you receive output from another skill like `remotion-video`). **You help them craft platform-optimized posts and schedule them through the active backend.**

---

## Orchestrated Mode

When invoked by the `content-engine` skill (or any orchestrator), the prompt will contain **"ORCHESTRATED MODE"** and all required parameters (channel_id/account_id, caption, timing, asset URL). It may also specify `scheduler: buffer` or `scheduler: zernio` to override the default backend. In this case:

1. **Skip the interactive question flow entirely** — all decisions are already made
2. **Confirm in one line** — e.g., "Scheduling video post to Twitter/X for Mar 17 at 2pm..."
3. **Go straight to the API call** (Buffer GraphQL or Zernio REST, depending on the active backend)
4. **Output a structured summary when done:**

   For Buffer:
   ```
   POST_SCHEDULED
   scheduler: buffer
   buffer_post_id: 67d5f3a...
   platform: twitter
   scheduled_at: 2026-03-17T14:00:00Z
   ```

   For Zernio:
   ```
   POST_SCHEDULED
   scheduler: zernio
   zernio_post_id: post_abc123...
   platform: twitter
   scheduled_at: 2026-03-17T14:00:00Z
   ```

If any required parameter is missing, fall back to the interactive question flow for that parameter only.

---

## Project Registry (Multi-Project Support)

**Before doing anything else**, read the project registry to determine which project/brand you're working with.

### Step 0: Resolve Active Project

1. **Read `projects.json`** from the DonatoSkills root directory (`~/DonatoSkills/projects.json`)
2. **Read `shared-references/project-registry.md`** for the full resolution logic
3. **Resolve the active project** using this priority:
   - **CWD match** — Current directory is inside a project's `specs_path` → auto-select (most common — zero friction)
   - **Orchestrated** — Content-engine passed `project_id` → use directly
   - **Explicit** — User said "for [project name]" → match against project names/slugs
   - **Single project** — Only one project in registry → use it automatically
   - **Ask** — Multiple projects, can't auto-detect → "Which project is this for? I see: [list]"

4. **Once resolved, use the project's configuration:**
   - **Buffer API key**: Read from `process.env[project.buffer.api_key_env]` (NOT hardcoded `BUFFER_API_KEY`)
   - **Channels**: Only show/use channels listed in the project's `buffer.channels` — do NOT query all Buffer channels
   - **Brand context**: Read from `project.specs_path` or `project.brand_brief`
   - **Defaults**: Pre-fill tone and content pillars from `project.defaults`

5. **Tag all posts** with `source: "donatoskills-{project_slug}"` so analytics can trace posts back to projects

### Orchestrated Mode with Project Context

When in orchestrated mode, the content-engine will include `project_id` in the invocation. Use it to load the correct project without asking.

---

## Prerequisites

### Buffer API Key

If using Buffer as the scheduling backend:

This skill requires a Buffer API key environment variable. The **env var name comes from the active project's** `buffer.api_key_env` field in `projects.json` (defaults to `BUFFER_API_KEY` if not set).

The user needs to:

1. Go to [Buffer API Settings](https://publish.buffer.com/settings/api)
2. Generate an API token
3. Add it to the `.env` file with the name specified in `projects.json`

If the key is missing, tell the user:
> "I need a Buffer API key to schedule posts for [project name]. You can get one from publish.buffer.com/settings/api — want me to walk you through it?"

### Zernio API Key

If using Zernio as the scheduling backend:

The **env var name comes from the active project's** `zernio.api_key_env` field in `projects.json` (defaults to `ZERNIO_API_KEY` if not set).

The user needs to:

1. Go to [Zernio API Settings](https://app.zernio.com/settings/api)
2. Generate an API key (starts with `sk_`)
3. Add it to `.env` or `.env.local` with the name specified in `projects.json`

If the key is missing, tell the user:
> "I need a Zernio API key to schedule posts for [project name]. You can get one from app.zernio.com/settings/api — want me to walk you through it?"

### Connected Channels / Accounts

**Buffer**: Channels are connected through the Buffer web app. This skill reads available channels from `projects.json` — it does NOT need to query Buffer for the channel list (the registry already has channel IDs). If a channel in the registry returns an error from Buffer, it may have been disconnected.

**Zernio**: Accounts are connected through the Zernio web app or via OAuth endpoints. This skill reads available accounts from `projects.json` under `zernio.accounts`. If the accounts map is empty, query Zernio to discover connected accounts:

```bash
curl -s https://zernio.com/api/v1/accounts \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

Then offer to save the account IDs to `projects.json`.

---

## Interactive Question Flow

**DO NOT jump straight to posting.** Walk the user through these questions. Skip any already answered by context (e.g., if they just created a video with the remotion-video skill, you already know the content).

### Step 1: Absorb Context (silent)

Before asking questions, check:

1. **Active project** — You should have already resolved the active project in Step 0. Use the project's channels, API keys, and brand context for everything below.
2. **Was content just created?** — If a video was just rendered or an image was just made, that's the content. Don't ask "what do you want to post?"
3. **Project context** — If the active project has a `specs_path`, read `.specs/vision.md` and `.specs/personas/*.md` from there. If it has a `brand_brief`, read that instead. These inform tone, audience, and messaging.
4. **Design tokens** — Brand voice and personality from the project's `.specs/design-system/tokens.md` (if specs_path is set)
5. **Hook best practices** — Read `shared-references/hook-writing.md` before writing any caption. The first line of every caption IS the hook.
6. **Platform specs** — Read `shared-references/platform-specs.md` for character limits, hashtag limits, and media constraints per platform.
7. **Caption formulas** — Read `shared-references/caption-writing.md` for platform-specific caption structures, CTA patterns, and formatting rules.
8. **Content pillars** — Read `shared-references/content-pillars.md` for pillar alignment. Also check the project's `defaults.content_pillars` for project-specific pillars.

### Step 2: Ask Questions

Group these conversationally. Skip what you already know.

#### Always Ask:
1. **Platform(s)** — "Where should this go? (Instagram, TikTok, Twitter/X, LinkedIn, Facebook, YouTube, Threads, Bluesky — or multiple?)"
2. **Timing** — "When should this post?
   - **Now** — publish immediately
   - **Queue** — add to your Buffer queue (next available slot)
   - **Specific time** — pick a date and time
   - **Optimal** — let Buffer choose the best time"

#### Ask Based on Content Type:
3. **Caption** — "Want me to write the caption, or do you have one?" *(If writing, ask about tone: professional, casual, playful, provocative)*
4. **Hashtags** — "Want me to generate hashtags? How many? (I'll tailor them per platform)"
5. **Call to Action** — "Any CTA? (link in bio, swipe up, comment below, etc.)"

#### Ask If Multiple Platforms:
6. **Adapt or Duplicate** — "Should I adapt the caption per platform (different tone/length/hashtags for each), or post the same thing everywhere?"

#### Optional:
7. **Series** — "Is this part of a series or campaign? (helps me maintain consistency)"
8. **Alt Text** — "Want me to generate alt text for accessibility?"

### Step 3: Confirm & Schedule

After gathering answers, show what you'll do:

> "Here's what I'll schedule:
> - **Platform**: Instagram Reels + TikTok
> - **Timing**: Tomorrow at 9am EST (optimal for your audience)
> - **Caption**: [show the caption]
> - **Hashtags**: #tag1 #tag2 #tag3
> - **CTA**: Link in bio
>
> Look good? I'll schedule it."

Wait for confirmation before calling the Buffer API.

---

## Buffer GraphQL API Reference

### Endpoint
```
POST https://api.buffer.com
```

### Authentication
All requests use a Bearer token in the Authorization header:
```
Authorization: Bearer {BUFFER_API_KEY}
Content-Type: application/json
```

### Making Requests

All API calls are GraphQL POST requests with a JSON body containing `query` and optionally `variables`:

```bash
curl -X POST https://api.buffer.com \
  -H "Authorization: Bearer $BUFFER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "...", "variables": {...}}'
```

---

### Key Queries

#### Get Account & Organizations
```graphql
query GetAccount {
  account {
    email
    timezone
    organizations {
      id
    }
  }
}
```
Use this to get the `organizationId` needed for other queries. **If the project's `buffer.organization_id` is already set in `projects.json`, skip this call** — it saves one API request per session. Only call this when `organization_id` is missing, then backfill the value into `projects.json`.

#### List Connected Channels
```graphql
query GetChannels($input: ChannelsInput!) {
  channels(input: $input) {
    id
    name
    service
    avatar
    serverUrl
    metadata {
      ... on InstagramMetadata { instagramAccountType }
      ... on FacebookMetadata { facebookPageName }
      ... on TwitterMetadata { twitterUsername }
      ... on LinkedInMetadata { linkedinAccountType }
      ... on TikTokMetadata { tiktokUsername }
      ... on YouTubeMetadata { youtubeChannelTitle }
      ... on ThreadsMetadata { threadsUsername }
      ... on BlueskyMetadata { blueskyUsername }
      ... on MastodonMetadata { mastodonUsername }
    }
  }
}
```
Variables:
```json
{
  "input": {
    "organizationId": "org_id_here"
  }
}
```

Each channel has:
- `id` — ChannelId, use this for posting
- `service` — platform (instagram, facebook, twitter, linkedin, tiktok, youtube, mastodon, threads, bluesky, googlebusiness, pinterest)
- `name` — display name
- `avatar` — profile image URL

#### Get Posts (Queue / Sent)
```graphql
query GetPosts($input: PostsInput!, $first: Int, $after: String) {
  posts(input: $input, first: $first, after: $after) {
    edges {
      node {
        id
        status
        text
        scheduledAt
        publishedAt
        channel {
          id
          service
          name
        }
        tags {
          id
          name
          color
        }
        assets {
          ... on ImageAsset { url, altText }
          ... on VideoAsset { url, thumbnailUrl }
          ... on LinkAsset { url, title, description }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```
Variables:
```json
{
  "input": {
    "organizationId": "org_id_here",
    "channelIds": ["channel_id"],
    "status": "scheduled",
    "sortOrder": "ASC"
  },
  "first": 25
}
```

**Post statuses**: `draft`, `needs_approval`, `scheduled`, `sending`, `sent`, `error`

#### Get a Single Post
```graphql
query GetPost($input: PostInput!) {
  post(input: $input) {
    id
    status
    text
    scheduledAt
    publishedAt
  }
}
```
Variables:
```json
{
  "input": {
    "postId": "post_id_here"
  }
}
```

---

### Key Mutations

#### Create a Post
```graphql
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    ... on CreatePostPayload {
      post {
        id
        status
        text
        scheduledAt
      }
    }
    ... on MutationError {
      message
    }
  }
}
```
**Important: Use inline variables, not the `variables` JSON field.** The Buffer API returns `Bad Request` when using parameterized variables for mutations. Use inline values instead.

Inline example:
```graphql
mutation {
  createPost(input: {
    channelId: "channel_id_here"
    text: "Your post caption here #hashtag"
    schedulingType: automatic
    mode: addToQueue
    dueAt: "2026-03-15T14:00:00Z"
    assets: {
      images: [{ url: "https://example.com/image.jpg", altText: "Description" }]
    }
    metadata: {
      instagram: { postType: "reel" }
    }
  }) {
    ... on MutationError { message }
  }
}
```

**CreatePostInput fields:**
- `channelId` (required) — which channel to post to
- `text` — the post caption/text
- `schedulingType` (required) — enum:
  - `automatic` — use Buffer's scheduling
  - `notification` — send push notification to post manually
- `mode` (required) — enum (ShareMode):
  - `shareNow` — publish immediately
  - `addToQueue` — add to end of queue
  - `shareNext` — add to top of queue (next to go out)
  - `customScheduled` — post at specific time (requires `dueAt`)
  - `recommendedTime` — let Buffer pick optimal time
- `dueAt` — ISO 8601 datetime (required when mode is `customScheduled`)
- `assets` — media attachments:
  - `images`: `[{ url, altText }]`
  - `videos`: `[{ url, thumbnailUrl }]`
  - `documents`: `[{ url, title }]`
  - `links`: `[{ url, title, description }]`
- `metadata` — platform-specific options (see Platform Metadata below)
- `tagIds` — array of tag IDs for organizing
- `saveToDraft` — set to `true` to save as draft instead of scheduling
- `aiAssisted` — set to `true` to flag as AI-generated content
- `source` — string to identify the client (e.g., `"claude-social-media-skill"`)

**Important**: To post to multiple channels, call `createPost` once per channel. Each post is tied to a single `channelId`.

#### Create an Idea
```graphql
mutation CreateIdea($input: CreateIdeaInput!) {
  createIdea(input: $input) {
    ... on CreateIdeaPayload {
      idea {
        id
        content
      }
    }
    ... on MutationError {
      message
    }
  }
}
```
Use ideas for content planning — save post ideas before they're ready to schedule.

---

### Platform-Specific Metadata

When creating posts, you can pass platform-specific options in the `metadata` field:

```json
{
  "metadata": {
    "instagram": {
      "postType": "reel"
    },
    "youtube": {
      "privacySetting": "public",
      "categoryId": "22"
    },
    "googlebusiness": {
      "postType": "event"
    }
  }
}
```

**Instagram**: `postType` — `"post"`, `"story"`, `"reel"`
**YouTube**: `privacySetting`, `categoryId`
**Google Business**: `postType` — `"standard"`, `"event"`, `"offer"`, `"promotion"`

---

### Rate Limits

- **100 requests per 15 minutes** per client-account pair
- **2000 requests per 15 minutes** per account (across all clients)
- Query complexity limit: **175,000 points** per query
- Max query depth: **25 levels**

**Rate limit headers** are included in every response:
- `RateLimit-Limit` — max requests in window
- `RateLimit-Remaining` — requests left
- `RateLimit-Reset` — seconds until window resets

**429 response** includes `retryAfter` value in seconds.

---

### Error Handling

Buffer returns two types of errors:

**Non-recoverable** (in GraphQL `errors` array):
| Code | Meaning |
|------|---------|
| `NOT_FOUND` | Resource doesn't exist |
| `FORBIDDEN` | No permission / invalid token |
| `UNAUTHORIZED` | Missing or expired auth |
| `UNEXPECTED` | Server error |

**Recoverable** (in mutation response payloads):
Use `... on MutationError { message }` to catch these. They indicate validation issues like missing fields, invalid dates, etc.

---

## Zernio REST API Reference

For the full reference, see `references/zernio-api.md`.

### Endpoint
```
POST https://zernio.com/api/v1/posts
```

### Authentication
```
Authorization: Bearer {ZERNIO_API_KEY}
Content-Type: application/json
```

### Creating a Post

Zernio uses a single REST endpoint for post creation. Unlike Buffer, you can target **multiple platforms in one request** and provide **per-platform custom captions**.

```bash
curl -s -X POST https://zernio.com/api/v1/posts \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Post caption here #hashtags",
    "platforms": [
      { "platform": "twitter", "accountId": "acc_xyz" }
    ],
    "scheduledFor": "2026-03-17T14:00:00Z",
    "timezone": "America/New_York",
    "mediaItems": [
      { "url": "https://res.cloudinary.com/dk74vmp31/video/upload/v123/sample.mp4", "type": "video" }
    ]
  }'
```

**Post fields:**
- `content` — post text (optional if all platforms have `customContent`)
- `platforms` — array of `{ "platform": "twitter", "accountId": "acc_xyz" }` (required)
- `scheduledFor` — ISO 8601 datetime for scheduled posting
- `timezone` — IANA timezone (e.g., "America/New_York")
- `publishNow` — set `true` to publish immediately
- `queuedFromProfile` — profile ID to use queue scheduling
- `mediaItems` — array of `{ "url": "...", "type": "video" }` for media attachments (type is `"video"` or `"image"`)
- `customContent` — per-platform text overrides: `{ "twitter": "Short version", "linkedin": "Long version" }`

**Scheduling modes:**
| Mode | Field |
|------|-------|
| Schedule for later | `"scheduledFor": "2026-03-17T14:00:00Z"` |
| Publish now | `"publishNow": true` |
| Add to queue | `"queuedFromProfile": "prof_123"` |
| Save as draft | Omit all three |

> **Discovering profile IDs**: To find valid profile IDs for queue scheduling, use `GET /v1/profiles` (see `references/zernio-api.md`). Each profile object includes `id`, `name`, and `isDefault`.

**Mapping from Buffer concepts to Zernio:**
| Buffer | Zernio |
|--------|----------|
| `channelId` | `platforms[].accountId` |
| `text` | `content` |
| `mode: customScheduled` + `dueAt` | `scheduledFor` |
| `mode: shareNow` | `publishNow: true` |
| `mode: addToQueue` | `queuedFromProfile` |
| `assets.videos[].url` | `mediaItems[].url` + `"type": "video"` |
| `assets.images[].url` | `mediaItems[].url` + `"type": "image"` |
| Inline GraphQL mutation | Standard JSON POST body |

### Validate Before Posting

Zernio offers a dry-run validation endpoint:

```bash
curl -s -X POST https://zernio.com/api/v1/validate/validate-post \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ ... same body as create ... }'
```

Use this to catch missing media, character limits, and platform constraints before actually creating.

### List Connected Accounts

```bash
curl -s https://zernio.com/api/v1/accounts \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

Returns account objects with `id`, `platform`, `name`, `username`, `status`.

### Error Handling

Zernio returns standard HTTP status codes:
- `200` — success
- `400` — validation error (check response body for details)
- `401` — invalid or missing API key
- `429` — rate limited (check `Retry-After` header)

---

## Supported Services

**Buffer**: Instagram, Facebook, Twitter/X, LinkedIn, Pinterest, TikTok, Google Business, YouTube, Mastodon, Threads, Bluesky, Start Page

**Zernio**: Twitter/X, Instagram, Facebook, LinkedIn, TikTok, YouTube, Pinterest, Reddit, Bluesky, Threads, Google Business, Telegram, Snapchat, WhatsApp

---

## Platform-Specific Guidelines

### Instagram
- **Reels**: up to 90 seconds, 1080×1920 (9:16)
- **Feed posts**: 1080×1080 (1:1) or 1080×1350 (4:5)
- **Hashtags**: up to 30, but 5-15 performs best
- **Caption length**: up to 2200 chars, but front-load the hook in first 125 chars (before "more" truncation)
- **No clickable links** in captions — use "link in bio" CTA
- **Emoji usage**: moderate, improves engagement

### TikTok
- **Video**: up to 10 minutes, 1080×1920 (9:16)
- **Hashtags**: 3-5, trending ones help discovery
- **Caption length**: 300 chars max — short and punchy
- **Tone**: casual, authentic, conversational — NOT corporate
- **Hook**: first 1-2 seconds must grab attention

### Twitter/X
- **Text**: 280 chars (or long-form with Twitter Blue)
- **Video**: up to 2:20 (140s), max 512MB
- **Hashtags**: 1-2 max, more looks spammy
- **Tone**: witty, concise, conversational
- **Threads**: break long content into thread format

### LinkedIn
- **Text**: up to 3000 chars
- **Video**: up to 10 minutes
- **Hashtags**: 3-5, professional/industry terms
- **Tone**: professional but human, storytelling works well
- **Hook**: first 2 lines visible before "see more"
- **Best for**: thought leadership, behind-the-scenes, case studies

### Facebook
- **Text**: up to 63,206 chars (but shorter is better)
- **Video**: up to 240 minutes
- **Hashtags**: 1-3 or none — less hashtag-driven than other platforms
- **Tone**: conversational, community-oriented

### YouTube Shorts
- **Video**: up to 60 seconds, 1080×1920 (9:16)
- **Title**: up to 100 chars
- **Description**: up to 5000 chars
- **Hashtags**: 3-5 in description, first 3 show above title

### Threads
- **Text**: up to 500 chars
- **Tone**: conversational, community-oriented (similar to Twitter but more personal)
- **Hashtags**: minimal, 1-2 at most

### Bluesky
- **Text**: 300 chars
- **Tone**: conversational, early-adopter tech crowd
- **Hashtags**: not widely used yet on the platform

---

## Caption Writing Guidelines

### Structure
1. **Hook** — first line grabs attention (question, bold claim, surprising stat)
2. **Body** — deliver the value (keep it scannable)
3. **CTA** — tell them what to do next

### Per-Platform Adaptation
When posting to multiple platforms, adapt — don't just copy-paste:

| Platform | Tone | Length | Hashtags |
|----------|------|--------|----------|
| Instagram | polished, aspirational | medium (100-200 words) | 5-15 |
| TikTok | raw, casual, funny | short (1-2 sentences) | 3-5 |
| Twitter/X | witty, concise | very short (1-2 sentences) | 1-2 |
| LinkedIn | professional, insightful | longer (150-300 words) | 3-5 |
| Facebook | conversational, warm | medium | 0-3 |
| Threads | personal, conversational | short-medium | 0-2 |
| Bluesky | casual, techy | short (1-2 sentences) | 0-1 |

### Hashtag Strategy
- Mix reach tiers: 1-2 broad (1M+ posts), 3-5 mid (100K-1M), 2-3 niche (<100K)
- Check platform-specific trending tags when possible
- Don't use banned/shadowbanned hashtags
- Place hashtags at end of caption or in first comment (Instagram)

---

## Composing with Other Skills

### After Remotion Video Creation

When the user creates a video with `remotion-video` and then wants to post it:

1. The video file path is already known from the render output
2. Skip content questions — the video IS the content
3. Focus on: platform, caption, hashtags, timing
4. The video needs to be accessible via URL (Cloudinary). Both Buffer and Zernio accept public media URLs directly.

### Content Repurposing Flow

One piece of content → multiple platform-optimized posts:

1. **Original**: 60-second video for Instagram Reels
2. **TikTok**: same video, different caption (more casual), different hashtags
3. **Twitter/X**: pull the best quote/hook as text + video clip
4. **LinkedIn**: longer caption with professional angle + video
5. **YouTube Shorts**: same video, optimized title and description
6. **Threads**: conversational take on the same topic
7. **Bluesky**: short, punchy version

---

## Content Calendar Planning

When the user asks to plan content (not just schedule a single post):

### Weekly Planning
1. Ask about content pillars (themes they rotate through)
2. Ask about posting frequency per platform
3. Suggest a week's worth of posts with timing
4. Show as a calendar view:

```
┌──────────┬─────────────┬─────────────┬──────────────┐
│ Day      │ Instagram   │ TikTok      │ LinkedIn     │
├──────────┼─────────────┼─────────────┼──────────────┤
│ Monday   │ Reel: tip   │ —           │ Article      │
│ Tuesday  │ —           │ Trend hop   │ —            │
│ Wednesday│ Carousel    │ —           │ —            │
│ Thursday │ —           │ BTS clip    │ Case study   │
│ Friday   │ Reel: CTA   │ Reel repost │ —            │
└──────────┴─────────────┴─────────────┴──────────────┘
```

### Using Buffer Ideas for Planning
Use the `createIdea` mutation to save content ideas before they're ready to schedule. This keeps the planning phase in Buffer too:

1. Plan the week's content
2. Save each piece as an Idea in Buffer
3. When ready, convert ideas into scheduled posts

### Bulk Scheduling
When scheduling multiple posts at once:

**Buffer**: Create one `createPost` per channel per post. Use `schedulingType: "automatic"` to let Buffer space them out.

**Zernio**: Create one `POST /v1/posts` per post — but each request can target **multiple platforms** in the `platforms[]` array and provide **per-platform captions** via `customContent`. This means fewer API calls for multi-platform campaigns.

---

## Media Handling

Both Buffer and Zernio require media to be accessible via public URL. Upload to Cloudinary first, then pass the `secure_url`.

**Buffer** — assets in the `assets` field:
```json
{
  "assets": {
    "images": [{ "url": "https://...", "altText": "..." }],
    "videos": [{ "url": "https://...", "thumbnailUrl": "https://..." }]
  }
}
```

**Zernio** — media in the `mediaItems` array (each item needs `url` and `type`):
```json
{
  "mediaItems": [
    { "url": "https://res.cloudinary.com/...", "type": "video" }
  ]
}
```

---

## Workflow: Full Post Creation via curl

### Buffer (GraphQL)

```bash
# 1. Get organization ID (skip if buffer.organization_id is set in projects.json)
curl -s -X POST https://api.buffer.com \
  -H "Authorization: Bearer $BUFFER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ account { organizations { id } } }"}'

# 2. List channels for that org
curl -s -X POST https://api.buffer.com \
  -H "Authorization: Bearer $BUFFER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "query($input: ChannelsInput!) { channels(input: $input) { id service name } }", "variables": {"input": {"organizationId": "ORG_ID"}}}'

# 3. Create a scheduled post
curl -s -X POST https://api.buffer.com \
  -H "Authorization: Bearer $BUFFER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createPost(input: { channelId: \"CHANNEL_ID\", text: \"Your post here\", schedulingType: automatic, mode: customScheduled, dueAt: \"2026-03-15T14:00:00Z\" }) { ... on CreatePostPayload { post { id status scheduledAt } } ... on MutationError { message } } }"}'
```

### Zernio (REST)

```bash
# 1. List connected accounts
curl -s https://zernio.com/api/v1/accounts \
  -H "Authorization: Bearer $ZERNIO_API_KEY"

# 2. Validate post (optional dry run)
curl -s -X POST https://zernio.com/api/v1/validate/validate-post \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Your post here",
    "platforms": [{ "platform": "twitter", "accountId": "ACCOUNT_ID" }],
    "scheduledFor": "2026-03-15T14:00:00Z",
    "timezone": "America/New_York",
    "mediaItems": [{ "url": "https://res.cloudinary.com/...", "type": "video" }]
  }'

# 3. Create the scheduled post
curl -s -X POST https://zernio.com/api/v1/posts \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Your post here",
    "platforms": [{ "platform": "twitter", "accountId": "ACCOUNT_ID" }],
    "scheduledFor": "2026-03-15T14:00:00Z",
    "timezone": "America/New_York",
    "mediaItems": [{ "url": "https://res.cloudinary.com/...", "type": "video" }]
  }'
```
