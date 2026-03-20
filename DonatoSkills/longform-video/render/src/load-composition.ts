// Types for the composition plan
export interface SceneSequence {
  type: "scene";
  scene_id: string;
  chapter: string;
  durationInFrames: number;
  audioFile: string;
  imagePath: string;
  kenBurnsDirection: string;
  kenBurnsZoomRange: [number, number];
}

export interface ChapterTitleSequence {
  type: "chapter_title";
  chapter: string;
  label: string;
  durationInFrames: number;
}

export interface TransitionSequence {
  type: "transition";
  durationInFrames: number;
  style: "crossfade";
}

export type SequenceItem = SceneSequence | ChapterTitleSequence | TransitionSequence;

export interface CompositionPlan {
  sequences: SequenceItem[];
  totalDurationInFrames: number;
  totalDurationInSeconds: number;
  width: number;
  height: number;
  fps: number;
  chapterMarkers: Array<{
    chapter: string;
    start_seconds: number;
    label: string;
  }>;
}
