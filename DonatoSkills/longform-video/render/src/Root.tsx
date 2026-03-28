import React from "react";
import { Composition } from "remotion";
import { LongFormVideo } from "./LongFormVideo";
import type { CompositionPlan } from "./load-composition";
import compositionData from "../public/composition.json";

const composition = compositionData as CompositionPlan;

export const Root: React.FC = () => {
  return (
    <Composition
      id="LongFormVideo"
      component={LongFormVideo}
      durationInFrames={composition.totalDurationInFrames}
      fps={composition.fps}
      width={composition.width}
      height={composition.height}
      defaultProps={{ composition }}
    />
  );
};
