import React from "react";
import { Composition } from "remotion";
import { VIDEOS, PALETTES } from "./videos-config";
import { FactsVideo, getFrames } from "./FactsVideo";

const fps = 30;

function loadManifest(videoId: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(`../public/audio/${videoId}/manifest.json`);
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {VIDEOS.map((video) => {
        const manifest = loadManifest(video.id);
        const { total } = getFrames(manifest);
        return (
          <Composition
            key={video.compositionId}
            id={video.compositionId}
            component={FactsVideo}
            durationInFrames={total}
            fps={fps}
            width={1080}
            height={1920}
            defaultProps={{ videoId: video.id, config: video, manifest }}
          />
        );
      })}
    </>
  );
};
