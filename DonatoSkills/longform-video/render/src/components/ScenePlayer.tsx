import React from "react";
import { AbsoluteFill, Audio, Img, useCurrentFrame, useVideoConfig, interpolate, staticFile } from "remotion";
import type { SceneSequence } from "../load-composition";

/**
 * Ken Burns effect directions mapped to CSS transforms.
 * Each direction defines a start and end transform for the image.
 */
function getKenBurnsTransform(
  direction: string,
  progress: number,
  zoomRange: [number, number]
): React.CSSProperties {
  const [zoomStart, zoomEnd] = zoomRange;

  switch (direction) {
    case "zoom-in": {
      const scale = interpolate(progress, [0, 1], [zoomStart, zoomEnd]);
      return { transform: `scale(${scale})` };
    }
    case "zoom-out": {
      const scale = interpolate(progress, [0, 1], [zoomEnd, zoomStart]);
      return { transform: `scale(${scale})` };
    }
    case "pan-right": {
      const tx = interpolate(progress, [0, 1], [0, -3]);
      const scale = interpolate(progress, [0, 1], [zoomStart, zoomEnd]);
      return { transform: `scale(${scale}) translateX(${tx}%)` };
    }
    case "pan-left": {
      const tx = interpolate(progress, [0, 1], [0, 3]);
      const scale = interpolate(progress, [0, 1], [zoomStart, zoomEnd]);
      return { transform: `scale(${scale}) translateX(${tx}%)` };
    }
    case "zoom-in-right": {
      const scale = interpolate(progress, [0, 1], [zoomStart, zoomEnd]);
      const tx = interpolate(progress, [0, 1], [0, -2]);
      const ty = interpolate(progress, [0, 1], [0, -1]);
      return { transform: `scale(${scale}) translate(${tx}%, ${ty}%)` };
    }
    case "zoom-out-down": {
      const scale = interpolate(progress, [0, 1], [zoomEnd, zoomStart]);
      const ty = interpolate(progress, [0, 1], [0, 2]);
      return { transform: `scale(${scale}) translateY(${ty}%)` };
    }
    default: {
      const scale = interpolate(progress, [0, 1], [zoomStart, zoomEnd]);
      return { transform: `scale(${scale})` };
    }
  }
}

export const ScenePlayer: React.FC<{ scene: SceneSequence }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = frame / scene.durationInFrames;
  const kenBurns = getKenBurnsTransform(
    scene.kenBurnsDirection,
    progress,
    scene.kenBurnsZoomRange
  );

  return (
    <AbsoluteFill>
      {/* Background image with Ken Burns */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={staticFile(scene.imagePath)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            ...kenBurns,
          }}
        />
      </AbsoluteFill>

      {/* Audio narration */}
      <Audio src={staticFile(scene.audioFile)} />
    </AbsoluteFill>
  );
};
