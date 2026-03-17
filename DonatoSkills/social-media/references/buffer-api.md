# Buffer GraphQL API Quick Reference

## Endpoint
```
POST https://api.buffer.com
```

## Authentication
```
Authorization: Bearer {BUFFER_API_KEY}
Content-Type: application/json
```

## Common Workflows

### 1. Get Organization ID (do this first)

> **Tip:** If you've already stored `organization_id` in your project's `projects.json` Buffer config, skip this call — it saves one API request per session. Run this once to get the ID, then backfill it into `projects.json`.

```bash
curl -s -X POST https://api.buffer.com \
  -H "Authorization: Bearer $BUFFER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ account { email timezone organizations { id } } }"}'
```

### 2. List Connected Channels
```bash
curl -s -X POST https://api.buffer.com \
  -H "Authorization: Bearer $BUFFER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "query($input: ChannelsInput!) { channels(input: $input) { id service name avatar } }", "variables": {"input": {"organizationId": "ORG_ID"}}}'
```

### 3. Schedule a Post
```bash
curl -s -X POST https://api.buffer.com \
  -H "Authorization: Bearer $BUFFER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation($input: CreatePostInput!) { createPost(input: $input) { ... on CreatePostPayload { post { id status text scheduledAt } } ... on MutationError { message } } }",
    "variables": {
      "input": {
        "channelId": "CHANNEL_ID",
        "text": "Your post caption here",
        "schedulingType": "scheduled",
        "dueAt": "2026-03-15T14:00:00Z"
      }
    }
  }'
```

### 4. Add to Queue (next available slot)
```bash
# Same as above but use schedulingType: "automatic" and omit dueAt
"variables": {
  "input": {
    "channelId": "CHANNEL_ID",
    "text": "This goes in the queue",
    "schedulingType": "automatic"
  }
}
```

### 5. Post with Media
```bash
"variables": {
  "input": {
    "channelId": "CHANNEL_ID",
    "text": "Check out this photo!",
    "schedulingType": "automatic",
    "assets": {
      "images": [
        { "url": "https://example.com/image.jpg", "altText": "A cool image" }
      ]
    }
  }
}
```

### 6. Post with Video
```bash
"variables": {
  "input": {
    "channelId": "CHANNEL_ID",
    "text": "New video just dropped",
    "schedulingType": "scheduled",
    "dueAt": "2026-03-15T14:00:00Z",
    "assets": {
      "videos": [
        { "url": "https://example.com/video.mp4", "thumbnailUrl": "https://example.com/thumb.jpg" }
      ]
    },
    "metadata": {
      "instagram": { "postType": "reel" }
    }
  }
}
```

### 7. Save as Draft
```bash
"variables": {
  "input": {
    "channelId": "CHANNEL_ID",
    "text": "Not ready yet...",
    "isDraft": true
  }
}
```

### 8. Get Scheduled Posts
```bash
curl -s -X POST https://api.buffer.com \
  -H "Authorization: Bearer $BUFFER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query($input: PostsInput!, $first: Int) { posts(input: $input, first: $first) { edges { node { id status text scheduledAt channel { service name } } } totalCount pageInfo { hasNextPage endCursor } } }",
    "variables": {
      "input": {
        "organizationId": "ORG_ID",
        "status": "scheduled"
      },
      "first": 25
    }
  }'
```

### 9. Get Sent Posts
```bash
# Same as above with status: "sent"
"variables": {
  "input": {
    "organizationId": "ORG_ID",
    "status": "sent"
  },
  "first": 25
}
```

### 10. Create an Idea (for planning)
```bash
curl -s -X POST https://api.buffer.com \
  -H "Authorization: Bearer $BUFFER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation($input: CreateIdeaInput!) { createIdea(input: $input) { ... on CreateIdeaPayload { idea { id content } } ... on MutationError { message } } }",
    "variables": {
      "input": {
        "organizationId": "ORG_ID",
        "content": "Idea for a post about..."
      }
    }
  }'
```

## Important: Use Inline Variables

The Buffer GraphQL API returns `Bad Request` when using the `variables` JSON field for mutations and some queries. **Use inline variables instead:**

```graphql
# YES — works
mutation { createPost(input: { channelId: "abc", text: "hello", ... }) { ... } }

# NO — returns Bad Request on mutations
{"query": "mutation($input: CreatePostInput!) { ... }", "variables": {"input": {...}}}
```

For queries like `channels`, inline also works more reliably:
```graphql
{ channels(input: { organizationId: "abc" }) { id service name } }
```

## Required Fields for createPost

Both `schedulingType` and `mode` are **required**:

### schedulingType (enum)

| Value | Behavior |
|-------|----------|
| `automatic` | Use Buffer's scheduling |
| `notification` | Send push notification to post manually |

### mode (enum — ShareMode)

| Value | Behavior |
|-------|----------|
| `shareNow` | Publish immediately |
| `addToQueue` | Add to end of queue |
| `shareNext` | Add to top of queue (next to go out) |
| `customScheduled` | Post at specific time (requires `dueAt`) |
| `recommendedTime` | Let Buffer pick optimal time |

## Post Statuses

| Status | Meaning |
|--------|---------|
| `draft` | Saved but not scheduled |
| `needs_approval` | Awaiting team approval |
| `scheduled` | Queued for future posting |
| `sending` | Currently being published |
| `sent` | Successfully published |
| `error` | Failed to publish |

## Supported Services

instagram, facebook, twitter, linkedin, pinterest, tiktok, googlebusiness, youtube, mastodon, threads, bluesky, startpage

## Platform Metadata Options

```json
{
  "instagram": { "postType": "post" | "story" | "reel" },
  "youtube": { "privacySetting": "public" | "unlisted" | "private", "categoryId": "22" },
  "googlebusiness": { "postType": "standard" | "event" | "offer" | "promotion" }
}
```

## Rate Limits

| Scope | Limit |
|-------|-------|
| Per client-account | 100 requests / 15 min |
| Per account total | 2000 requests / 15 min |
| Query complexity | 175,000 points max |
| Query depth | 25 levels max |

Response headers: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

## Error Codes (non-recoverable)

| Code | Meaning |
|------|---------|
| `NOT_FOUND` | Resource doesn't exist |
| `FORBIDDEN` | No permission |
| `UNAUTHORIZED` | Bad or missing auth |
| `UNEXPECTED` | Server error |
| `RATE_LIMIT_EXCEEDED` | Too many requests (429) |
