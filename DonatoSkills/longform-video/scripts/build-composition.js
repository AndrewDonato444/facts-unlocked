/**
 * build-composition.js — Long-Form Remotion Composition Plan Builder
 *
 * Transforms audio manifest + image manifest into a sequence timing plan
 * that Remotion components consume. Pure logic — no React, no rendering.
 *
 * Handles:
 *   - Scene sequences with audio-driven durations
 *   - Chapter title cards with fixed durations
 *   - Crossfade transition overlaps
 *   - Ken Burns direction cycling (no consecutive repeats)
 *   - Total duration accounting for overlaps
 *
 * Spec: .specs/features/video-generation/long-form-youtube.feature.md
 */

// Ken Burns directions to cycle through — no two consecutive scenes get the same
const KB_DIRECTIONS = [
  "zoom-in",
  "pan-right",
  "zoom-out",
  "pan-left",
  "zoom-in-right",
  "zoom-out-down",
];

/**
 * Build a composition plan from audio + image manifests.
 *
 * @param {Object} audioManifest - Output of generate-tts.js
 * @param {Object} imageManifest - Output of resolve-images.js (scene_id → { path })
 * @param {Object} config
 * @param {number} config.fps - Frames per second (default 30)
 * @param {number} config.width - Video width (default 1920)
 * @param {number} config.height - Video height (default 1080)
 * @param {number} config.transitionDurationSec - Crossfade duration in seconds
 * @param {number} config.chapterTitleDurationSec - Chapter title card duration
 * @param {number[]} config.kenBurnsZoomRange - [startScale, endScale]
 * @returns {Object} Composition plan for Remotion
 */
function buildCompositionPlan(audioManifest, imageManifest, config) {
  const {
    fps = 30,
    width = 1920,
    height = 1080,
    transitionDurationSec = 1.5,
    chapterTitleDurationSec = 3,
    kenBurnsZoomRange = [1.0, 1.12],
  } = config;

  const transitionFrames = Math.ceil(transitionDurationSec * fps);
  const chapterTitleFrames = Math.ceil(chapterTitleDurationSec * fps);

  const sequences = [];
  let kbIndex = 0;
  let seenChapters = new Set();
  let transitionCount = 0;

  for (let i = 0; i < audioManifest.scenes.length; i++) {
    const scene = audioManifest.scenes[i];
    const chapter = scene.chapter;

    // Insert chapter title card for non-intro, non-outro chapters on first encounter
    if (!seenChapters.has(chapter) && chapter !== "intro" && chapter !== "outro") {
      const marker = audioManifest.chapter_markers.find(
        (m) => m.chapter === chapter
      );
      sequences.push({
        type: "chapter_title",
        chapter,
        label: marker ? marker.label : chapter,
        durationInFrames: chapterTitleFrames,
      });
    }
    seenChapters.add(chapter);

    // Insert crossfade transition between consecutive scenes (not before first)
    if (i > 0) {
      sequences.push({
        type: "transition",
        durationInFrames: transitionFrames,
        style: "crossfade",
      });
      transitionCount++;
    }

    // Scene sequence
    const image = imageManifest[scene.scene_id];
    sequences.push({
      type: "scene",
      scene_id: scene.scene_id,
      chapter,
      durationInFrames: scene.duration_frames,
      audioFile: scene.audio_file,
      imagePath: image ? image.path : null,
      kenBurnsDirection: KB_DIRECTIONS[kbIndex % KB_DIRECTIONS.length],
      kenBurnsZoomRange,
    });

    kbIndex++;
  }

  // Calculate total duration:
  // Sum of all scene + chapter_title frames, minus transition overlaps
  // Transitions overlap (they don't add time, they subtract from the seams)
  const sceneAndTitleFrames = sequences
    .filter((s) => s.type === "scene" || s.type === "chapter_title")
    .reduce((sum, s) => sum + s.durationInFrames, 0);

  const totalOverlapFrames = transitionCount * transitionFrames;
  const totalDurationInFrames = sceneAndTitleFrames - totalOverlapFrames;
  const totalDurationInSeconds = totalDurationInFrames / fps;

  return {
    sequences,
    totalDurationInFrames,
    totalDurationInSeconds,
    width,
    height,
    fps,
    chapterMarkers: audioManifest.chapter_markers,
  };
}

module.exports = { buildCompositionPlan };
