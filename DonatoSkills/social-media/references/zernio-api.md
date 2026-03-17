# Zernio API Reference

Quick reference for the Zernio REST API used by the social-media skill.

---

## Base URL & Authentication

```
Base URL: https://zernio.com/api/v1
Authorization: Bearer {ZERNIO_API_KEY}
Content-Type: application/json
```

API keys have the `sk_` prefix. Store in `.env` / `.env.local` as `ZERNIO_API_KEY`.

---

## Key Endpoints

### List Profiles

```bash
curl -s https://zernio.com/api/v1/profiles \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

Response:
```json
{
  "profiles": [
    {
      "id": "prof_123abc",
      "name": "Marketing Team",
      "description": "Main marketing profile",
      "color": "#FF5733",
      "isDefault": true,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### List Connected Accounts

```bash
curl -s https://zernio.com/api/v1/accounts \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

Response fields per account:
- `id` — unique account identifier (use as `accountId` in posts)
- `platform` — twitter, instagram, facebook, linkedin, tiktok, youtube, pinterest, reddit, bluesky, threads, googlebusiness, telegram, snapchat, whatsapp
- `name` — display name
- `username` — platform handle
- `profileImageUrl` — avatar URL
- `profileUrl` — public profile link
- `status` — active, disconnected, pending

### Create a Post

```bash
curl -s -X POST https://zernio.com/api/v1/posts \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Post text here #hashtags",
    "platforms": [
      {
        "platform": "twitter",
        "accountId": "acc_xyz"
      }
    ],
    "scheduledFor": "2026-03-17T14:00:00Z",
    "timezone": "America/New_York"
  }'
```

#### Post Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | No* | Post text. Not required if media attached or all platforms have `customContent` |
| `platforms` | array | Yes | Target accounts (see below) |
| `scheduledFor` | string | No | ISO 8601 datetime for scheduled posting |
| `timezone` | string | No | IANA timezone (e.g., "America/New_York") |
| `publishNow` | boolean | No | Set `true` to publish immediately |
| `queuedFromProfile` | string | No | Profile ID to use queue scheduling |
| `mediaItems` | array | No | Media items: `[{ "url": "https://...", "type": "video" }]` — type is `"video"` or `"image"` |
| `customContent` | object | No | Per-platform text overrides (see below) |

#### Platform Object

```json
{
  "platform": "twitter",
  "accountId": "acc_xyz"
}
```

Supported platforms: `twitter`, `instagram`, `facebook`, `linkedin`, `tiktok`, `youtube`, `pinterest`, `reddit`, `bluesky`, `threads`, `googlebusiness`, `telegram`, `snapchat`, `whatsapp`

#### Scheduling Modes

| Mode | How |
|------|-----|
| **Schedule** | Set `scheduledFor` to an ISO datetime |
| **Publish now** | Set `publishNow: true` |
| **Queue** | Set `queuedFromProfile` to a profile ID |
| **Draft** | Omit `scheduledFor`, `publishNow`, and `queuedFromProfile` |

#### Multi-Platform with Custom Content

```json
{
  "content": "Default caption for all platforms",
  "customContent": {
    "twitter": "Shorter version for Twitter",
    "linkedin": "Longer professional version for LinkedIn"
  },
  "platforms": [
    { "platform": "twitter", "accountId": "acc_tw" },
    { "platform": "linkedin", "accountId": "acc_li" }
  ]
}
```

#### Media Attachments

Media URLs must be publicly accessible. Use Cloudinary `secure_url` values directly.

**Important**: The field is `mediaItems` (not `media`), and each item requires `url` and `type` (`"video"` or `"image"`).

```json
{
  "content": "Check this out!",
  "mediaItems": [
    { "url": "https://res.cloudinary.com/dk74vmp31/video/upload/v123/sample.mp4", "type": "video" }
  ],
  "platforms": [{ "platform": "tiktok", "accountId": "acc_tk" }]
}
```

For large files (up to 5GB), get a presigned upload URL first:
```bash
curl -s https://zernio.com/api/v1/media/presigned-url \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

### List Posts

```bash
curl -s "https://zernio.com/api/v1/posts" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

### Get a Single Post

```bash
curl -s "https://zernio.com/api/v1/posts/{id}" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

### Update a Post (draft/scheduled only)

```bash
curl -s -X PATCH "https://zernio.com/api/v1/posts/{id}" \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "content": "Updated text" }'
```

### Delete a Post

```bash
curl -s -X DELETE "https://zernio.com/api/v1/posts/{id}" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

### Retry a Failed Post

```bash
curl -s -X POST "https://zernio.com/api/v1/posts/{id}/retry" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

### Validate a Post (Dry Run)

```bash
curl -s -X POST "https://zernio.com/api/v1/validate/validate-post" \
  -H "Authorization: Bearer $ZERNIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ ... same body as create post ... }'
```

Catches missing media, character limits, platform constraints before actually creating.

---

## Analytics

> **Full analytics API reference**: `analytics-loop/references/zernio-analytics.md`
>
> The analytics-loop skill uses these endpoints extensively. Below is a quick reference; see the full doc for response schemas, pagination, and advanced endpoints.

**Prerequisite**: Requires the Zernio Analytics add-on (HTTP 402 without it).

### GET /v1/analytics — Post Performance

```bash
curl -s "https://zernio.com/api/v1/analytics?profileId=prof_xxx&fromDate=2026-03-14&toDate=2026-03-16&source=late&sortBy=engagement&order=desc&limit=100&page=1" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

Key query params: `profileId` (required), `platform`, `fromDate`, `toDate`, `source` (`"late"` for API-published only), `sortBy` (`date`, `engagement`, `impressions`, `likes`, `comments`, `shares`, `saves`), `order`, `limit` (max 100), `page`.

Returns per-post: `postId`, `zernioPostId`, `content`, `publishedAt`, and `analytics` object with `impressions`, `reach`, `likes`, `comments`, `shares`, `saves`, `clicks`, `views`, `engagementRate`, `lastUpdated`.

### GET /v1/analytics/best-time — Optimal Posting Times

```bash
curl -s "https://zernio.com/api/v1/analytics/best-time?profileId=prof_xxx&platform=tiktok" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

Returns slots by `day_of_week` (0=Mon..6=Sun) and `hour` (UTC 0-23) with `avg_engagement`.

### GET /v1/analytics/daily-metrics — Aggregated Daily Data

```bash
curl -s "https://zernio.com/api/v1/analytics/daily-metrics?profileId=prof_xxx&fromDate=2026-03-01&toDate=2026-03-16" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

Returns `dailyData` array + `platformBreakdown`.

### GET /v1/analytics/content-decay — Performance Decay

```bash
curl -s "https://zernio.com/api/v1/analytics/content-decay?profileId=prof_xxx&platform=tiktok" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

Returns time buckets with `avg_pct_of_final`. Use to calibrate the collection window (default 48h).

### GET /v1/analytics/posting-frequency — Frequency vs Engagement

```bash
curl -s "https://zernio.com/api/v1/analytics/posting-frequency?profileId=prof_xxx&platform=tiktok" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

Returns `posts_per_week` vs `avg_engagement_rate` rows. Use to validate optimal posting cadence.

### Analytics Caching

Data is cached and refreshed at most once per hour. Multiple calls within the same hour return identical results.

---

## Key Differences from Buffer

| Feature | Buffer | Zernio |
|---------|--------|----------|
| API style | GraphQL | REST |
| Auth | Bearer token | Bearer token (sk_ prefix) |
| Post to multiple platforms | One `createPost` per channel | One request, multiple `platforms[]` |
| Media | URL in `assets` field | URL + type in `mediaItems` array |
| Per-platform captions | Not supported | `customContent` object |
| Scheduling | `mode` + `dueAt` | `scheduledFor` or `publishNow` or `queuedFromProfile` |
| Mutation format | Inline variables (not parameterized) | Standard JSON body |
| Validation | None | `POST /validate/validate-post` dry run |
| Platform count | 12 | 14+ |

---

## Response Format

Published posts include `platformPostUrl` with public URLs per platform.

Rate limits vary by plan tier. The API enforces posting velocity limits and profile/account count restrictions.
