import React from "react";
import { Composition } from "remotion";
import { AiMathOlympiadVideo } from "./Video";
import { FPS, WIDTH, HEIGHT, DEFAULT_SCENE_FRAMES, BUFFER_FRAMES } from "./lib/constants";

let manifest: Record<string, { file: string; durationSec: number }> = {};
try { manifest = require("../public/audio/manifest.json"); } catch { /* use defaults */ }

function sceneDuration(key: string, defaultFrames: number): number {
  const entry = manifest[key];
  return entry ? Math.ceil(entry.durationSec * FPS) : defaultFrames;
}

const s1 = sceneDuration("scene-1", DEFAULT_SCENE_FRAMES.scene1);
const s2 = sceneDuration("scene-2", DEFAULT_SCENE_FRAMES.scene2);
const s3 = sceneDuration("scene-3", DEFAULT_SCENE_FRAMES.scene3);
const s4 = sceneDuration("scene-4", DEFAULT_SCENE_FRAMES.scene4);

const totalFrames = s1 + BUFFER_FRAMES + s2 + BUFFER_FRAMES + s3 + BUFFER_FRAMES + s4;

export const RemotionRoot: React.FC = () => (
  <Composition
    id="AiMathOlympiad"
    component={AiMathOlympiadVideo}
    durationInFrames={totalFrames}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={{ s1Frames: s1, s2Frames: s2, s3Frames: s3, s4Frames: s4 }}
  />
);
