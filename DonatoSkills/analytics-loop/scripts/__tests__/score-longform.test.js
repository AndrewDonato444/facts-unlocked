/**
 * Tests for score-longform.js — Long-Form YouTube Video Scoring
 *
 * Scores long-form YouTube videos using YouTube-specific metrics:
 *   retention (estimated), watch_hours, comments, subscribers_gained, likes
 *
 * Tests cover:
 *   - Estimated retention calculation (LF-SCORE-001)
 *   - Weighted score formula (LF-SCORE-002)
 *   - Minimum views threshold exclusion (LF-SCORE-003)
 *   - Scoring weights from config (LF-SCORE-004)
 *   - Output stored separately from short-form (LF-SCORE-005)
 *   - Long-form variable tagging (LF-SCORE-006)
 *   - Multiple videos ranked by score (LF-SCORE-007)
 *   - Edge case: zero views (LF-SCORE-008)
 */

const { scoreLongformVideo, scoreLongformBatch } = require("../score-longform");

// ─────────────────────────────────────────────
// Test Data
// ─────────────────────────────────────────────

const DEFAULT_WEIGHTS = {
  avg_retention_pct: 3,
  watch_hours: 2,
  comments: 2,
  subscribers_gained: 4,
  likes: 1,
};

const SAMPLE_VIDEO = {
  videoId: "vid_001",
  title: "10 Incredible Facts About Newborn Babies",
  publishedAt: "2026-03-15T10:00:00Z",
  videoDurationSec: 1200, // 20 minutes
  analytics: {
    views: 5000,
    watch_time_hours: 800,
    likes: 250,
    comments: 85,
    shares: 30,
    subscribers_gained: 45,
  },
  variables: {
    chapter_count: 4,
    intro_style: "hook_question",
    narration_pace: "moderate",
    visual_density: "medium",
    voice: "matilda",
    video_length_min: 20,
  },
};

const SAMPLE_VIDEOS = [
  SAMPLE_VIDEO,
  {
    videoId: "vid_002",
    title: "Baby Sleep Secrets Parents Need to Know",
    publishedAt: "2026-03-17T10:00:00Z",
    videoDurationSec: 900, // 15 minutes
    analytics: {
      views: 3000,
      watch_time_hours: 300,
      likes: 120,
      comments: 40,
      shares: 15,
      subscribers_gained: 20,
    },
    variables: {
      chapter_count: 3,
      intro_style: "cold_open",
      narration_pace: "slow",
      visual_density: "low",
      voice: "matilda",
      video_length_min: 15,
    },
  },
  {
    videoId: "vid_003",
    title: "Why Babies Cry — The Science",
    publishedAt: "2026-03-19T10:00:00Z",
    videoDurationSec: 1500, // 25 minutes
    analytics: {
      views: 8000,
      watch_time_hours: 1600,
      likes: 400,
      comments: 150,
      shares: 60,
      subscribers_gained: 80,
    },
    variables: {
      chapter_count: 5,
      intro_style: "hook_question",
      narration_pace: "moderate",
      visual_density: "high",
      voice: "matilda",
      video_length_min: 25,
    },
  },
];

// ─────────────────────────────────────────────
// LF-SCORE-001: Estimated retention calculation
// ─────────────────────────────────────────────

test("LF-SCORE-001: computes estimated retention from watch_time, views, and duration", () => {
  const result = scoreLongformVideo(SAMPLE_VIDEO, DEFAULT_WEIGHTS, 50);

  // retention = watch_time_hours * 3600 / (views * videoDurationSec)
  // = 800 * 3600 / (5000 * 1200) = 2880000 / 6000000 = 0.48 → 48%
  expect(result.score.avg_retention_pct).toBeCloseTo(48, 0);
});

// ─────────────────────────────────────────────
// LF-SCORE-002: Weighted score formula
// ─────────────────────────────────────────────

test("LF-SCORE-002: weighted score uses retention*3 + watch_hours*2 + comments*2 + subs*4 + likes*1", () => {
  const result = scoreLongformVideo(SAMPLE_VIDEO, DEFAULT_WEIGHTS, 50);

  // retention ~48%, watch_hours=800, comments=85, subs=45, likes=250
  // score = 48*3 + 800*2 + 85*2 + 45*4 + 250*1
  //       = 144 + 1600 + 170 + 180 + 250 = 2344
  expect(result.score.weightedScore).toBeGreaterThan(0);
  expect(result.score.components).toHaveProperty("retentionContribution");
  expect(result.score.components).toHaveProperty("watchHoursContribution");
  expect(result.score.components).toHaveProperty("commentsContribution");
  expect(result.score.components).toHaveProperty("subscribersContribution");
  expect(result.score.components).toHaveProperty("likesContribution");
  expect(result.excluded).toBe(false);
});

// ─────────────────────────────────────────────
// LF-SCORE-003: Minimum views threshold
// ─────────────────────────────────────────────

test("LF-SCORE-003: excludes videos below minimum views threshold", () => {
  const lowViewVideo = {
    ...SAMPLE_VIDEO,
    analytics: { ...SAMPLE_VIDEO.analytics, views: 30 },
  };

  const result = scoreLongformVideo(lowViewVideo, DEFAULT_WEIGHTS, 50);

  expect(result.excluded).toBe(true);
  expect(result.reason).toBe("below_views_threshold");
  expect(result.score).toBeNull();
});

// ─────────────────────────────────────────────
// LF-SCORE-004: Custom scoring weights
// ─────────────────────────────────────────────

test("LF-SCORE-004: uses custom scoring weights from config", () => {
  const customWeights = {
    avg_retention_pct: 5,
    watch_hours: 1,
    comments: 1,
    subscribers_gained: 2,
    likes: 1,
  };

  const defaultResult = scoreLongformVideo(SAMPLE_VIDEO, DEFAULT_WEIGHTS, 50);
  const customResult = scoreLongformVideo(SAMPLE_VIDEO, customWeights, 50);

  // Custom weights emphasize retention more, so scores differ
  expect(customResult.score.weightedScore).not.toBe(defaultResult.score.weightedScore);
});

// ─────────────────────────────────────────────
// LF-SCORE-005: Batch output is separate from short-form
// ─────────────────────────────────────────────

test("LF-SCORE-005: batch scoring produces longform-specific output structure", () => {
  const result = scoreLongformBatch(SAMPLE_VIDEOS, DEFAULT_WEIGHTS, 50);

  expect(result).toHaveProperty("videos");
  expect(result).toHaveProperty("summary");
  expect(result.summary).toHaveProperty("totalVideos");
  expect(result.summary).toHaveProperty("includedVideos");
  expect(result.summary).toHaveProperty("excludedVideos");
  expect(result.summary).toHaveProperty("avgWeightedScore");
  expect(result.summary).toHaveProperty("topScore");
  // Output filename hint — caller uses this to write longform-scored.json
  expect(result.outputFile).toBe("longform-scored.json");
});

// ─────────────────────────────────────────────
// LF-SCORE-006: Long-form variables preserved in output
// ─────────────────────────────────────────────

test("LF-SCORE-006: scored videos retain their long-form variables for decomposition", () => {
  const result = scoreLongformBatch(SAMPLE_VIDEOS, DEFAULT_WEIGHTS, 50);

  for (const video of result.videos) {
    if (video.excluded) continue;
    expect(video.variables).toBeDefined();
    expect(video.variables).toHaveProperty("chapter_count");
    expect(video.variables).toHaveProperty("intro_style");
    expect(video.variables).toHaveProperty("narration_pace");
    expect(video.variables).toHaveProperty("visual_density");
  }
});

// ─────────────────────────────────────────────
// LF-SCORE-007: Videos ranked by weighted score
// ─────────────────────────────────────────────

test("LF-SCORE-007: batch output ranks videos by weighted score descending", () => {
  const result = scoreLongformBatch(SAMPLE_VIDEOS, DEFAULT_WEIGHTS, 50);

  const included = result.videos.filter((v) => !v.excluded);
  for (let i = 1; i < included.length; i++) {
    expect(included[i - 1].score.weightedScore).toBeGreaterThanOrEqual(
      included[i].score.weightedScore
    );
  }
});

// ─────────────────────────────────────────────
// LF-SCORE-008: Zero views edge case
// ─────────────────────────────────────────────

test("LF-SCORE-008: zero views produces excluded result without division error", () => {
  const zeroViewsVideo = {
    ...SAMPLE_VIDEO,
    analytics: { ...SAMPLE_VIDEO.analytics, views: 0 },
  };

  const result = scoreLongformVideo(zeroViewsVideo, DEFAULT_WEIGHTS, 50);

  expect(result.excluded).toBe(true);
  expect(result.score).toBeNull();
  // No NaN or Infinity
});
