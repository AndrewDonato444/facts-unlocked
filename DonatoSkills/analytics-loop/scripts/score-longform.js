#!/usr/bin/env node
/**
 * score-longform.js — Long-Form YouTube Video Scoring
 *
 * Scores long-form YouTube videos using a retention-based formula
 * separate from the short-form engagement density model.
 *
 * Formula:
 *   weighted_score = retention*W1 + watch_hours*W2 + comments*W3 + subs*W4 + likes*W5
 *
 * Estimated retention (from Zernio data):
 *   avg_retention_pct = (watch_time_hours * 3600) / (views * video_duration_sec) * 100
 *
 * Output: longform-scored.json (separate from scored-posts.json)
 *
 * Spec: .specs/features/video-generation/long-form-youtube.feature.md
 */

const DEFAULT_WEIGHTS = {
  avg_retention_pct: 3,
  watch_hours: 2,
  comments: 2,
  subscribers_gained: 4,
  likes: 1,
};

/**
 * Score a single long-form video using YouTube-specific metrics.
 *
 * @param {Object} video - Video object with analytics and metadata
 * @param {Object} weights - Scoring weights from project config
 * @param {number} minViews - Minimum views to include in scoring
 * @returns {Object} Scored video with score breakdown or exclusion
 */
function scoreLongformVideo(video, weights, minViews) {
  const a = video.analytics || {};
  const views = a.views || 0;

  if (views < minViews) {
    return {
      ...video,
      score: null,
      excluded: true,
      reason: "below_views_threshold",
    };
  }

  if (!video.videoDurationSec || video.videoDurationSec <= 0) {
    return {
      ...video,
      score: null,
      excluded: true,
      reason: "missing_video_duration",
    };
  }

  // Estimated retention: watch_time (hours→sec) / (views × duration_sec) × 100
  const watchTimeSec = (a.watch_time_hours || 0) * 3600;
  const totalViewTimeSec = views * video.videoDurationSec;
  const avgRetentionPct =
    totalViewTimeSec > 0
      ? Math.round((watchTimeSec / totalViewTimeSec) * 100 * 100) / 100
      : 0;

  const watchHours = a.watch_time_hours || 0;
  const comments = a.comments || 0;
  const subscribersGained = a.subscribers_gained || 0;
  const likes = a.likes || 0;

  const retentionContribution = avgRetentionPct * weights.avg_retention_pct;
  const watchHoursContribution = watchHours * weights.watch_hours;
  const commentsContribution = comments * weights.comments;
  const subscribersContribution = subscribersGained * weights.subscribers_gained;
  const likesContribution = likes * weights.likes;

  const weightedScore =
    Math.round(
      (retentionContribution +
        watchHoursContribution +
        commentsContribution +
        subscribersContribution +
        likesContribution) *
        100
    ) / 100;

  return {
    ...video,
    score: {
      weightedScore,
      avg_retention_pct: avgRetentionPct,
      components: {
        retentionContribution: Math.round(retentionContribution * 100) / 100,
        watchHoursContribution: Math.round(watchHoursContribution * 100) / 100,
        commentsContribution: Math.round(commentsContribution * 100) / 100,
        subscribersContribution: Math.round(subscribersContribution * 100) / 100,
        likesContribution: Math.round(likesContribution * 100) / 100,
      },
    },
    excluded: false,
  };
}

/**
 * Score a batch of long-form videos and produce a summary.
 *
 * @param {Array} videos - Array of video objects
 * @param {Object} weights - Scoring weights
 * @param {number} minViews - Minimum views threshold
 * @returns {Object} Batch scoring result with summary
 */
function scoreLongformBatch(videos, weights, minViews) {
  const scored = videos.map((v) => scoreLongformVideo(v, weights, minViews));

  // Sort: included first by weightedScore desc, excluded at end
  scored.sort((a, b) => {
    if (a.excluded && !b.excluded) return 1;
    if (!a.excluded && b.excluded) return -1;
    if (a.excluded && b.excluded) return 0;
    return b.score.weightedScore - a.score.weightedScore;
  });

  const included = scored.filter((v) => !v.excluded);
  const excluded = scored.filter((v) => v.excluded);

  const avgWeightedScore =
    included.length > 0
      ? Math.round(
          (included.reduce((sum, v) => sum + v.score.weightedScore, 0) /
            included.length) *
            100
        ) / 100
      : 0;

  return {
    videos: scored,
    summary: {
      totalVideos: scored.length,
      includedVideos: included.length,
      excludedVideos: excluded.length,
      avgWeightedScore,
      topScore: included[0]?.score?.weightedScore || null,
    },
    outputFile: "longform-scored.json",
  };
}

module.exports = { scoreLongformVideo, scoreLongformBatch, DEFAULT_WEIGHTS };
