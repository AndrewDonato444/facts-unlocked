import React from "react";
import { Composition } from "remotion";
import { MainVideo, TOTAL_FRAMES, FPS } from "./Video";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="FactsVideo"
      component={MainVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1080}
      height={1920}
    />
  );
};
