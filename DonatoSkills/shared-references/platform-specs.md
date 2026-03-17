# Social Media Platform Specifications -- 2026

> Last updated: March 2026. All specs verified via web research against current platform documentation and industry guides.

---

## Table of Contents

1. [Twitter / X](#twitter--x)
2. [Instagram](#instagram)
3. [TikTok](#tiktok)
4. [LinkedIn](#linkedin)
5. [Facebook](#facebook)
6. [YouTube Shorts](#youtube-shorts)
7. [Threads](#threads)
8. [Bluesky](#bluesky)
9. [Quick-Reference Comparison Tables](#quick-reference-comparison-tables)

---

## Twitter / X

### Video

| Spec | Free | Premium |
|------|------|---------|
| Max duration | 140 seconds (2 min 20 s) | 4 hours (240 min) |
| Recommended duration | 15 s or less for engagement | 15 s or less for engagement |
| Resolution | 1280x720 (landscape) / 1080x1920 (portrait) | Up to 1080p on web/iOS; 720p for 2-4 hr videos |
| Aspect ratios | 16:9, 1:1, 9:16 | 16:9, 1:1, 9:16 |
| Max file size | 512 MB | 16 GB |
| Formats | MP4, MOV (H.264 video + AAC audio) | MP4, MOV (H.264 video + AAC audio) |
| Frame rate | 30 or 60 fps | 30 or 60 fps |
| Bitrate | 6,000 kbps (1080p) / 5,000 kbps (720p) | Same |

**Note:** Android Premium users are limited to 10-minute uploads.

### Images

| Spec | Value |
|------|-------|
| Feed post (recommended) | 1200x675 px (16:9) |
| Supported ratios | 16:9, 4:3, 1:1 |
| Profile picture | 400x400 px (1:1) |
| Header/banner | 1500x500 px (3:1) |
| Max file size | 5 MB (images), 2 MB (profile pic) |
| Formats | JPEG, PNG, GIF, WebP |
| Images per post | Up to 4 |

### Text

| Spec | Free | Premium |
|------|------|---------|
| Post character limit | 280 | 25,000 |
| Bio | 160 characters | 160 characters |
| Display name | 50 characters | 50 characters |
| Links in post | Each link = 23 characters | Same |

### Platform-Specific Quirks

- **Thread behavior:** Threads accumulate engagement across all tweets. Adding to a thread bumps the original tweet's score, extending its algorithmic life. Threads get roughly 3x more total engagement than equivalent standalone tweets.
- **Visibility decay:** A tweet loses half its visibility score every 6 hours. After 24 hours, algorithmic distribution is minimal.
- **Premium boost:** Premium accounts see 30-40% higher reply impressions compared to identical content from non-Premium accounts (Q1 2026 internal data).

---

## Instagram

### Video -- Reels

| Spec | Value |
|------|-------|
| Max duration (in-app recording) | 3 minutes (180 s) |
| Max duration (upload) | 15 minutes (posted as Reel) |
| Extended rollout | Up to 20 minutes (select accounts) |
| Recommended duration for reach | Under 90 seconds (7-15 s for highest completion rates) |
| Resolution | 1080x1920 px |
| Aspect ratio | 9:16 (others are letterboxed) |
| Max file size | 4 GB |
| Formats | MP4, MOV (H.264 video + AAC audio) |
| Frame rate | 30 fps (standard), 60 fps (action) |
| Bitrate | ~3,500 kbps |
| Reel preview in feed | 1080x1440 px (cropped from 9:16) |

### Video -- Stories

| Spec | Value |
|------|-------|
| Duration per story slide | Up to 60 seconds |
| Resolution | 1080x1920 px (9:16) |
| Safe zone -- top | Leave 250 px (14%) free of text/logos |
| Safe zone -- bottom | Leave 340 px (20%) free of text/logos |

### Images

| Spec | Dimensions | Aspect Ratio |
|------|------------|--------------|
| Square post | 1080x1080 px | 1:1 |
| Portrait post (recommended) | 1080x1350 px | 4:5 |
| Landscape post | 1080x566 px | 1.91:1 |
| Story | 1080x1920 px | 9:16 |
| Carousel | Same as above (up to 10 slides) | Mixed allowed |
| Profile picture | 320x320 px | 1:1 |
| Max file size | 30 MB | -- |
| Formats | JPEG, PNG | -- |

### Text

| Spec | Value |
|------|-------|
| Caption | 2,200 characters |
| Caption truncation ("...more") | After 125 characters |
| Bio | 150 characters |
| Hashtags per post | 30 max (3-5 recommended by Instagram; 5-10 optimal for reach) |
| Comments | 2,200 characters |
| Alt text | 100 characters |

### Platform-Specific Quirks

- **Caption truncation:** Only the first 125 characters appear before the "...more" button. Front-load your CTA and hook.
- **Reels caption visibility:** In full-screen Reels scroll, the written caption is even more obscured. On-screen text overlays within the video are far more important.
- **Reel feed preview crop:** Reels display at 1080x1440 in the feed grid (not the full 1080x1920). Keep key text/visuals away from extreme top/bottom.
- **Algorithm preference:** Reels under 90 seconds get significantly more algorithmic reach. Over 90 seconds sees a noticeable drop.
- **All video is Reels:** As of 2025, all video uploads on Instagram are shared as Reels.

---

## TikTok

### Video

| Spec | Value |
|------|-------|
| Max duration (in-app recording) | 10 minutes |
| Max duration (upload) | 60 minutes |
| Recommended duration for engagement | 15-60 seconds |
| Resolution | 1080x1920 px (max 1080p; 4K downscaled) |
| Aspect ratios | 9:16 (recommended), 1:1, 16:9 |
| Max file size -- iOS | 287.6 MB |
| Max file size -- Android | 72 MB |
| Max file size -- Desktop/Web | 500 MB |
| Formats | MP4, MOV, MPEG, 3GP, AVI |

### Images

| Spec | Value |
|------|-------|
| Photo posts / carousel slides | 1080x1920 px (9:16) recommended |
| Supported formats | JPEG, PNG |
| Carousel slides | Up to 35 images |

### Text

| Spec | Value |
|------|-------|
| Caption | 4,000 characters |
| Bio | 80 characters (some accounts see 160) |
| Comments | 150 characters |
| Username | 24 characters |
| Hashtags | No limit on count; must fit within caption character limit |

### Platform-Specific Quirks

- **File size varies by device:** iOS allows nearly 4x the file size of Android (287.6 MB vs 72 MB). Desktop/web allows 500 MB.
- **Resolution ceiling:** Even 4K uploads are downscaled to 1080p.
- **Caption SEO:** TikTok is increasingly used as a search engine. The 4,000-character caption limit (up from 2,200) is designed to support keyword-rich, SEO-optimized descriptions.
- **Sound matters:** Audio is a primary content signal. Original audio performs differently from trending sounds in the algorithm.

---

## LinkedIn

### Video

| Spec | Value |
|------|-------|
| Max duration | 10 minutes (native); 30 minutes (ads) |
| Recommended duration | 30 seconds to 2 minutes |
| Min resolution | 640x360 px |
| Recommended resolution | 1920x1080 px (16:9) |
| Max resolution | 4096x2304 px |
| Max file size | 5 GB |
| Formats | MP4 (recommended), ASF, AVI, FLV, MOV, MKV, WebM |
| Frame rate | 30 fps recommended |

### Images

| Spec | Dimensions | Aspect Ratio |
|------|------------|--------------|
| Landscape post | 1200x627 px | 1.91:1 |
| Square post | 1080x1080 px | 1:1 |
| Portrait post (best performing) | 1080x1350 px | 4:5 |
| Carousel slides | 1080x1080 or 1080x1350 px | Consistent across slides |
| Profile picture | 400x400 px | 1:1 |
| Cover/banner | 1584x396 px | 4:1 |
| Max file size | 5 MB (single image) |
| Formats | JPG, PNG, non-animated GIF |

### Text

| Spec | Value |
|------|-------|
| Post | 3,000 characters |
| "See more" cutoff -- desktop | ~210 characters |
| "See more" cutoff -- mobile | ~140 characters |
| Article (newsletter) | 125,000 characters |
| Headline | 220 characters |
| Bio / tagline | 220 characters |
| Company page description | 2,000 characters |

### Platform-Specific Quirks

- **"See more" truncation:** Only ~210 characters show on desktop (~140 on mobile) before the fold. Your hook must be above this line.
- **Practical character limit with media: 1,248 characters.** While the theoretical limit is 3,000 characters, posts with media attachments (images/videos) are limited to ~1,248 characters in practice. Posts exceeding this may be truncated or rejected. For text-only posts, the full 3,000 characters are available.
- **Carousel dominance:** LinkedIn carousels (uploaded as PDF or native carousel) consistently outperform single-image posts for engagement.
- **4:5 portrait is king:** The 1080x1350 vertical format takes up significantly more mobile feed real estate, driving higher engagement.
- **No hashtag limit:** But 3-5 targeted hashtags is the recommended sweet spot.
- **Algorithm favors dwell time:** Longer posts that keep readers engaged (even past "see more") are rewarded.

---

## Facebook

### Video -- Feed

| Spec | Value |
|------|-------|
| Max duration | 240 minutes (4 hours) |
| Recommended duration | 15 seconds to 3 minutes |
| Resolution -- Landscape | 1280x720 px (16:9) |
| Resolution -- Square | 1080x1080 px (1:1) |
| Resolution -- Vertical | 1080x1350 or 1080x1920 px |
| Max file size | 4 GB |
| Formats | MP4, MOV (H.264 video + AAC audio) |

### Video -- Reels

| Spec | Value |
|------|-------|
| Max duration | 90 seconds |
| Recommended duration | 15-60 seconds |
| Resolution | 1080x1920 px (9:16) |
| Min resolution | 720x1280 px |
| Max file size | 4 GB (recommended under 1 GB) |

### Video -- Stories

| Spec | Value |
|------|-------|
| Max duration | 60 seconds (practical limit; 120 s technical limit) |
| Photo display time | 5 seconds |
| Resolution | 1080x1920 px (9:16) |
| Max file size | 4 GB |
| Safe zone | Leave 14% (250 px) at top and bottom |

### Video -- Live

| Spec | Value |
|------|-------|
| Max duration | 8 hours |

### Images

| Spec | Dimensions | Aspect Ratio |
|------|------------|--------------|
| Feed post (landscape/link) | 1200x630 px | 1.91:1 |
| Feed post (square) | 1080x1080 px | 1:1 |
| Feed post (vertical, best for mobile) | 1080x1350 px | 4:5 |
| Profile picture | 176x176 px display (upload 360+ px) | 1:1 |
| Cover photo | 820x312 px (desktop) / 640x360 px (mobile) | Variable |
| Max file size (feed post) | 30 MB |
| Max file size (profile/cover) | 100 MB |
| Formats | JPEG, PNG (PNG for logos/text; JPEG for photos) |

### Text

| Spec | Value |
|------|-------|
| Post | 63,206 characters |
| Truncation -- desktop | ~477 characters |
| Truncation -- mobile | ~125 characters |
| Optimal post length | Under 80 characters (66% more engagement) |
| Bio / About | 101 characters |
| Page description | 255 characters |
| Comments | 8,000 characters |

### Platform-Specific Quirks

- **All videos are Reels:** As of June 2025, Facebook shares all videos as Reels, removing legacy format distinctions.
- **Massive character limit, rarely used:** 63,206 characters allowed, but posts under 80 characters get 66% more engagement.
- **Image engagement boost:** Posts with images see 2.3x more engagement than text-only posts.
- **Mobile truncation is aggressive:** Only ~125 characters show on mobile before "See more."

---

## YouTube Shorts

### Video

| Spec | Value |
|------|-------|
| Max duration | 3 minutes (180 seconds) |
| Recommended duration for engagement | 15-45 seconds (sweet spot: 15-30 s) |
| Resolution (recommended) | 1080x1920 px |
| Resolution (max supported) | 2160x3840 px (4K) |
| Aspect ratio | 9:16 (required for Shorts shelf) |
| Max file size | No official limit (256 GB general YouTube limit) |
| Typical file size | Under 100 MB for 60 s at 1080p |
| Format | MP4 (H.264 video + AAC audio) |
| Frame rate | 30 or 60 fps |
| Bitrate | 5-10 Mbps at 1080p |

### Thumbnails

| Spec | Value |
|------|-------|
| Dimensions | 1280x720 px |
| Aspect ratio | 16:9 |
| Min width | 640 px |

### Text

| Spec | Value |
|------|-------|
| Title | 100 characters (30-50 recommended) |
| Description | Up to 5,000 characters (first ~125 visible) |
| Tags (individual) | 30 characters each |
| Tags (total) | 500 characters combined |
| Hashtags | 3-5 recommended in description |

### Platform-Specific Quirks

- **Content ID kills long Shorts:** Any Short over 1 minute with an active Content ID claim is blocked globally and will not be playable or recommended.
- **Retention over duration:** Shorts reward completion rate, rewatch rate, and engagement velocity -- not raw length. Shorter videos (15-30 s) often outperform longer ones.
- **3-minute limit is new:** Extended from 60 seconds (for uploads after October 15, 2024). Older Shorts retain 60 s limit.
- **Shorts shelf qualification:** Must be vertical (9:16) and under 3 minutes.

---

## Threads

### Video

| Spec | Value |
|------|-------|
| Max duration | 5 minutes |
| Recommended resolution | 1080x1920 px (9:16) |
| Aspect ratios | 9:16 (recommended), 4:5, 1:1, 16:9 |
| Max file size | 500 MB |
| Formats | MP4, MOV |

### Images

| Spec | Value |
|------|-------|
| Recommended -- vertical | 1080x1920 px (9:16) |
| Recommended -- portrait | 1080x1350 px (4:5) |
| Recommended -- square | 1080x1080 px (1:1) |
| Formats | JPEG, PNG |
| Max per post | 10 images (carousel) |

### Text

| Spec | Value |
|------|-------|
| Post | 500 characters |
| Text attachments | 10,000 characters (does NOT count toward 500 limit) |
| Bio | 150 characters |

### Platform-Specific Quirks

- **Text attachments are a loophole:** Threads supports 10,000-character text attachments that display as expandable blocks and do not count toward the 500-character post limit. Useful for long-form content.
- **Media limit:** Up to 10 images OR videos per post (carousel format).
- **Daily post limit:** 20 posts per day.
- **Thread length limit:** 100 posts per thread.
- **Poll support:** 1 poll per thread (up to 5 options).
- **Instagram integration:** Threads posts can be cross-posted to Instagram, sharing audience data.

---

## Bluesky

### Video

| Spec | Value |
|------|-------|
| Max duration | 3 minutes |
| Recommended resolution | 1920x1080 px |
| Max file size | 100 MB |
| Formats | MP4, MOV |

### Images

| Spec | Value |
|------|-------|
| Max per post | 4 images |
| Max file size per image | 1 MB |
| Max dimension | 1000 px on longest side |
| Recommended dimensions | 1000x1000 px (1:1) |
| Formats | JPEG, PNG, WebP |

### Text

| Spec | Value |
|------|-------|
| Post | 300 characters |
| Alt text (images) | 2,000 characters (most generous of any platform) |
| Bio | 256 characters |
| Display name | 64 characters |

### Platform-Specific Quirks

- **No animated GIFs:** Bluesky does not support animated GIFs. Use short video clips instead.
- **No mixed media:** You cannot mix images and video in a single post. It is either images (up to 4), one video, or one GIF.
- **Strict image size limits:** 1 MB per image and 1000 px max dimension is notably restrictive compared to other platforms. Optimize/compress before uploading.
- **Thread support:** Reply to your own posts to create threads. No limit on thread length. Each post gets its own 300-character allowance.
- **Alt text for video:** Alt text on videos is only exposed to screen readers, not displayed visually in the app UI. Use captions for visual display.
- **Decentralized protocol:** Bluesky runs on the AT Protocol. Posts can be accessed via third-party clients and custom feeds.

---

## Quick-Reference Comparison Tables

### Video Duration Limits

| Platform | Max Duration | Recommended for Engagement |
|----------|-------------|---------------------------|
| Twitter/X (free) | 2 min 20 s | Under 15 s |
| Twitter/X (premium) | 4 hours | Under 15 s |
| Instagram Reels | 3 min (record) / 15 min (upload) | 7-15 s (completion) / under 90 s (reach) |
| Instagram Stories | 60 s per slide | 15 s |
| TikTok | 10 min (record) / 60 min (upload) | 15-60 s |
| LinkedIn | 10 min | 30 s - 2 min |
| Facebook Feed | 240 min | 15 s - 3 min |
| Facebook Reels | 90 s | 15-60 s |
| YouTube Shorts | 3 min | 15-30 s |
| Threads | 5 min | 30-60 s |
| Bluesky | 3 min | 30-60 s |

### Post Character Limits

| Platform | Post Limit | Truncation Point |
|----------|-----------|-----------------|
| Twitter/X (free) | 280 | N/A (full display) |
| Twitter/X (premium) | 25,000 | ~280 chars before fold |
| Instagram | 2,200 (caption) | 125 chars |
| TikTok | 4,000 | Varies by device |
| LinkedIn | 3,000 (1,248 with media) | ~210 (desktop) / ~140 (mobile) |
| Facebook | 63,206 | ~477 (desktop) / ~125 (mobile) |
| YouTube Shorts | 100 (title) / 5,000 (desc) | ~125 chars (description) |
| Threads | 500 (+10,000 attachment) | N/A |
| Bluesky | 300 | N/A |

### Image Specs at a Glance

| Platform | Best Feed Size | Max File Size | Max Images |
|----------|---------------|---------------|------------|
| Twitter/X | 1200x675 (16:9) | 5 MB | 4 |
| Instagram | 1080x1350 (4:5) | 30 MB | 10 (carousel) |
| TikTok | 1080x1920 (9:16) | N/A | 35 (carousel) |
| LinkedIn | 1080x1350 (4:5) | 5 MB | 20 (carousel) |
| Facebook | 1080x1350 (4:5) | 30 MB | 10 |
| YouTube Shorts | N/A (thumbnail: 1280x720) | N/A | N/A |
| Threads | 1080x1350 (4:5) | N/A | 10 |
| Bluesky | 1000x1000 (1:1) | 1 MB | 4 |

### Bio Character Limits

| Platform | Bio Limit |
|----------|----------|
| Twitter/X | 160 |
| Instagram | 150 |
| TikTok | 80 (some: 160) |
| LinkedIn | 220 |
| Facebook | 101 |
| YouTube | 1,000 (channel desc) |
| Threads | 150 |
| Bluesky | 256 |

---

## Sources

- [X (Twitter) Video Size & Specifications Guide (2026)](https://postfa.st/sizes/x/video)
- [X (Twitter) Media Specs & Best Practices (2026) -- HeyOrca](https://www.heyorca.com/blog/x-twitter-media-specs-best-practices-2026)
- [X (Twitter) Post Size & Image Dimensions Guide (2026)](https://postfa.st/sizes/x/posts)
- [X (Twitter) Limits in 2026 -- tendX](https://www.tendx.app/blog/x-twitter-limits-2026)
- [Instagram Post Size Guide 2026 -- Buffer](https://buffer.com/resources/instagram-image-size/)
- [Instagram Video Size & Format Specs 2026 -- SocialRails](https://socialrails.com/blog/instagram-video-size-format-specifications-guide)
- [Instagram Image Sizes 2026 -- iFormat](https://iformat.io/blog/instagram-image-sizes-2026-post-story-reel-profile)
- [Instagram Reels Time Limit 2026 -- Inro](https://www.inro.social/blog/instagram-reels-can-now-be-20-minutes-long-new-time-limit-explained-2025)
- [Instagram Character Limit 2026 -- Outfy](https://www.outfy.com/blog/instagram-character-limit/)
- [Instagram Character Limit 2026 -- LetterCounter](https://lettercounter.org/blog/instagram-character-limit-guide/)
- [Reel Size & Aspect Ratios -- Instagram Help](https://help.instagram.com/1038071743007909)
- [TikTok Video Size & Dimensions Guide (2026) -- PostFast](https://postfa.st/sizes/tiktok/video)
- [TikTok Video Size & Dimensions 2026 -- Fliki](https://fliki.ai/blog/tiktok-video-size)
- [TikTok Media Specs & Best Practices (2026) -- HeyOrca](https://www.heyorca.com/blog/tiktok-media-specs-best-practices-2026)
- [Social Media Character Limits 2026 -- GoldenToolHub](https://goldentoolhub.com/social-media-character-limits-2026/)
- [TikTok Bio Character Limit 2026 -- Replug](https://replug.io/blog/tiktok-bio-character-limit)
- [LinkedIn Post Specs 2026 -- Postiv AI](https://postiv.ai/blog/linkedin-posts-specs)
- [LinkedIn Post Size Guide 2026 -- Kanbox](https://www.kanbox.io/blog/linkedin-image-size-guide)
- [LinkedIn Post Character Limits 2026 -- SocialRails](https://socialrails.com/blog/linkedin-post-character-limits)
- [LinkedIn Character Limit 2026 -- TypeCount](https://typecount.com/blog/linkedin-character-limit)
- [Facebook Posting Specs 2026 -- HeyOrca](https://www.heyorca.com/blog/facebook-posting-specs-best-practices-in-2026)
- [Facebook Image & Video Sizes Guide (2026) -- PostFast](https://postfa.st/sizes/facebook)
- [Facebook Post Character Limit 2026 -- TypeCount](https://typecount.com/blog/facebook-post-character-limit)
- [Facebook Reels Size & Dimensions (2026) -- PostFast](https://postfa.st/sizes/facebook/reels)
- [Facebook Stories Size & Dimensions (2026) -- PostFast](https://postfa.st/sizes/facebook/stories)
- [YouTube Shorts Size & Dimensions 2026 -- vidIQ](https://vidiq.com/blog/post/youtube-shorts-vertical-video/)
- [YouTube Shorts Size & Dimensions (2026) -- PostFast](https://postfa.st/sizes/youtube/shorts)
- [YouTube Shorts Length 2026 -- Turrboo](https://turrboo.com/blog/how-long-can-a-youtube-shorts-be)
- [YouTube 3-Minute Shorts -- YouTube Help](https://support.google.com/youtube/answer/15424877?hl=en)
- [YouTube Character Limits 2026 -- TypeCount](https://typecount.com/blog/youtube-description-character-limit)
- [Threads Post Size & Dimensions (2026) -- PostFast](https://postfa.st/sizes/threads/posts)
- [Threads Image and Video Size Guide 2026 -- Outfy](https://www.outfy.com/blog/threads-image-and-video-size-guide/)
- [Threads Character Limit 2026 -- TypeCount](https://typecount.com/blog/threads-character-limit)
- [Bluesky Post Size & Image Dimensions (2026) -- PostFast](https://postfa.st/sizes/bluesky/posts)
- [Bluesky Image & Video Sizes (2026) -- PostFast](https://postfa.st/sizes/bluesky)
- [Bluesky Character Limit 2026 -- TypeCount](https://typecount.com/blog/bluesky-character-limit)
- [Bluesky Content Guidelines -- SocialBee](https://socialbee.com/blog/bluesky-content-guidelines/)
- [Social Media Image Sizes for All Networks (March 2026) -- Hootsuite](https://blog.hootsuite.com/social-media-image-sizes-guide/)
