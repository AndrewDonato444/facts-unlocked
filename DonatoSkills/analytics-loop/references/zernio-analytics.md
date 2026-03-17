# Zernio Analytics API Reference

Full reference for the Zernio analytics endpoints used by the analytics-loop skill.

**Base URL**: `https://zernio.com/api/v1`
**Auth**: `Authorization: Bearer {ZERNIO_API_KEY}`

**Prerequisite**: Zernio Analytics add-on must be active on your plan. The free tier only supports posting. If the add-on is not active, the API returns HTTP 402 with `"error": "Analytics add-on required"`.

---

## Endpoints

### GET /v1/analytics — Post Performance Data

The primary endpoint for the analytics loop. Returns per-post engagement metrics.

```bash
curl -s "https://zernio.com/api/v1/analytics?profileId=prof_xxx&fromDate=2026-03-14&toDate=2026-03-16&source=late&sortBy=engagement&order=desc&limit=100&page=1" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

#### Query Parameters

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `profileId` | string | Yes | — | Zernio profile ID from projects.json |
| `platform` | string | No | all | Filter by platform (tiktok, youtube, instagram, etc.) |
| `fromDate` | string | No | 30 days ago | Start date (YYYY-MM-DD) |
| `toDate` | string | No | today | End date (YYYY-MM-DD) |
| `source` | string | No | all | Filter by post source. Use `"late"` for posts published via Zernio API only |
| `sortBy` | string | No | date | Sort field: `date`, `engagement`, `impressions`, `reach`, `likes`, `comments`, `shares`, `saves`, `clicks`, `views` |
| `order` | string | No | desc | Sort order: `asc` or `desc` |
| `limit` | number | No | 25 | Posts per page (max 100) |
| `page` | number | No | 1 | Pagination page number |

#### Response

```json
{
  "posts": [
    {
      "postId": "65f1c0a9e2b5af0012ab34cd",
      "zernioPostId": "zernio_post_id_here",
      "content": "Did you know that 73% of...",
      "publishedAt": "2026-03-14T10:00:05Z",
      "analytics": {
        "impressions": 15420,
        "reach": 12350,
        "likes": 342,
        "comments": 28,
        "shares": 45,
        "saves": 67,
        "clicks": 189,
        "views": 8200,
        "engagementRate": 2.78,
        "lastUpdated": "2026-03-16T08:30:00Z"
      },
      "platformAnalytics": [
        {
          "platform": "tiktok",
          "analytics": {
            "impressions": 15420,
            "reach": 12350,
            "likes": 342,
            "comments": 28,
            "shares": 45,
            "saves": 67,
            "views": 8200
          }
        }
      ]
    }
  ]
}
```

#### Pagination

Page through results using `limit` and `page`. When `response.posts.length < limit`, you've reached the last page.

```javascript
let page = 1;
let hasMore = true;
const allPosts = [];

while (hasMore) {
  const response = await fetch(
    `https://zernio.com/api/v1/analytics?profileId=${profileId}&fromDate=${fromDate}&toDate=${toDate}&source=late&sortBy=engagement&order=desc&limit=100&page=${page}`,
    { headers: { 'Authorization': `Bearer ${apiKey}` } }
  );
  const data = await response.json();
  allPosts.push(...data.posts);
  hasMore = data.posts.length === 100;
  page++;
}
```

---

### GET /v1/analytics/daily-metrics — Aggregated Daily Metrics

Returns daily-level aggregated metrics across all posts. Useful for trend analysis.

```bash
curl -s "https://zernio.com/api/v1/analytics/daily-metrics?profileId=prof_xxx&platform=tiktok&fromDate=2026-03-01&toDate=2026-03-16" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

#### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `platform` | string | No | Filter by platform |
| `profileId` | string | Yes | Profile ID |
| `fromDate` | string | No | Start date (YYYY-MM-DD) |
| `toDate` | string | No | End date (YYYY-MM-DD) |

#### Response

```json
{
  "dailyData": [
    {
      "date": "2026-03-14",
      "impressions": 45000,
      "reach": 38000,
      "likes": 1200,
      "comments": 89,
      "shares": 156,
      "saves": 203
    }
  ],
  "platformBreakdown": {
    "tiktok": { "impressions": 30000, "likes": 800 },
    "instagram": { "impressions": 15000, "likes": 400 }
  }
}
```

---

### GET /v1/analytics/best-time — Optimal Posting Times

Returns engagement by day-of-week and hour. Use to auto-optimize `schedule_time` in generated briefs.

```bash
curl -s "https://zernio.com/api/v1/analytics/best-time?profileId=prof_xxx&platform=tiktok" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

#### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `platform` | string | No | Filter by platform |
| `profileId` | string | Yes | Profile ID |

#### Response

Returns slots grouped by `day_of_week` (0=Mon..6=Sun) and `hour` (UTC 0-23) with `avg_engagement`:

```json
{
  "slots": [
    { "day_of_week": 0, "hour": 9, "avg_engagement": 4.2 },
    { "day_of_week": 0, "hour": 14, "avg_engagement": 3.8 },
    { "day_of_week": 1, "hour": 12, "avg_engagement": 5.1 }
  ]
}
```

---

### GET /v1/analytics/content-decay — Performance Decay Over Time

Shows how engagement accumulates over time after publishing. Use to validate the 48-hour collection window.

```bash
curl -s "https://zernio.com/api/v1/analytics/content-decay?profileId=prof_xxx&platform=tiktok" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

#### Response

```json
{
  "buckets": [
    { "bucket_label": "0-6h", "avg_pct_of_final": 15 },
    { "bucket_label": "6-12h", "avg_pct_of_final": 35 },
    { "bucket_label": "12-24h", "avg_pct_of_final": 60 },
    { "bucket_label": "24-48h", "avg_pct_of_final": 85 },
    { "bucket_label": "48-72h", "avg_pct_of_final": 95 },
    { "bucket_label": "72h+", "avg_pct_of_final": 100 }
  ]
}
```

**If significant engagement arrives after 48 hours** (e.g., `48-72h` bucket is <80%), extend the collection window to 72 hours via project config.

---

### GET /v1/analytics/posting-frequency — Frequency vs Engagement

Shows whether posting more or less per week affects per-post engagement.

```bash
curl -s "https://zernio.com/api/v1/analytics/posting-frequency?profileId=prof_xxx&platform=tiktok" \
  -H "Authorization: Bearer $ZERNIO_API_KEY"
```

#### Response

```json
{
  "frequency": [
    { "posts_per_week": 3, "avg_engagement_rate": 4.5, "weeks_count": 4 },
    { "posts_per_week": 7, "avg_engagement_rate": 3.8, "weeks_count": 6 },
    { "posts_per_week": 14, "avg_engagement_rate": 2.9, "weeks_count": 2 },
    { "posts_per_week": 21, "avg_engagement_rate": 2.1, "weeks_count": 3 }
  ]
}
```

Use to validate whether 3 posts/day (21/week) is optimal, or if reducing frequency improves per-post engagement.

---

## Rate Limits

Zernio does not impose rate limits on API requests. Analytics data is **cached and refreshed at most once per hour**. Calling the same endpoint multiple times within an hour returns the same cached data.

---

## Error Handling

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | Process response |
| 402 | Analytics add-on required | Tell user: "Zernio Analytics add-on is required. Enable it at app.zernio.com/settings/billing." |
| 401 | Invalid/missing API key | Check `ZERNIO_API_KEY` is set and valid |
| 404 | Profile not found | Verify `profileId` in projects.json |
| 429 | Rate limited | Wait and retry (shouldn't happen per rate limit docs) |

---

## Collection Window Recommendations

| Scenario | Window | Rationale |
|----------|--------|-----------|
| Default | 48 hours | Most platforms deliver 85%+ of engagement within 48h |
| TikTok-heavy | 72 hours | TikTok's FYP can resurface content days later |
| YouTube Shorts | 72 hours | YouTube has slower but longer distribution curves |
| Twitter/X | 24 hours | Twitter content decays rapidly |

Use the `/content-decay` endpoint to calibrate per-platform.
