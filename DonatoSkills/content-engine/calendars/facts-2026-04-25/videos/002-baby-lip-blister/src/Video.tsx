import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { WhimsicalBackground } from "./components/WhimsicalBackground";
import { HookOverlay } from "./components/HookOverlay";
import { FullCaptionsOverlay, CaptionPhrase } from "./components/FullCaptionsOverlay";
import { COLORS } from "./lib/constants";
import manifest from "../public/audio/manifest.json";

const FPS = 30;
const BUFFER_FRAMES = Math.ceil(0.4 * FPS);

const hookFrames = Math.ceil(manifest["scene-1-hook"].durationSec * FPS) + BUFFER_FRAMES;
const bodyFrames = Math.ceil(manifest["scene-2-body"].durationSec * FPS) + BUFFER_FRAMES;
const ctaFrames = Math.ceil(manifest["scene-3-cta"].durationSec * FPS) + BUFFER_FRAMES;

const TOTAL_FRAMES = hookFrames + bodyFrames + ctaFrames;

const BODY_PHRASES: CaptionPhrase[] = [
  { text: "That little blister on your baby's lip?",  startSec: 0.0,  endSec: 3.5  },
  { text: "It's called a sucking callus.",            startSec: 3.5,  endSec: 6.0  },
  { text: "Newborns form them from the intense",     startSec: 6.0,  endSec: 9.0  },
  { text: "suction of breastfeeding or bottle.",     startSec: 9.0,  endSec: 12.0 },
  { text: "It's completely harmless",                startSec: 12.0, endSec: 14.5 },
  { text: "and disappears on its own",               startSec: 14.5, endSec: 17.0 },
  { text: "as the lip toughens up.",                 startSec: 17.0, endSec: 19.5 },
  { text: "No treatment needed —",                   startSec: 19.5, endSec: 21.5 },
  { text: "it means your baby is latching well.",    startSec: 21.5, endSec: 25.0 },
];

const CTA_PHRASES: CaptionPhrase[] = [
  { text: "Did you know? 💡",              startSec: 0.0, endSec: 2.5 },
  { text: "Follow for more baby facts.",  startSec: 2.5, endSec: 5.5 },
];

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>

      {/* SCENE 1: HOOK */}
      <Sequence from={0} durationInFrames={hookFrames}>
        <Audio src={staticFile("audio/scene-1-hook.wav")} />
        <WhimsicalBackground theme="hook" />
        <HookOverlay lines={["THAT LIP BLISTER", "IS GOOD NEWS"]} />
      </Sequence>

      {/* SCENE 2: BODY */}
      <Sequence from={hookFrames} durationInFrames={bodyFrames}>
        <Audio src={staticFile("audio/scene-2-body.wav")} />
        <WhimsicalBackground theme="body" />
        <FullCaptionsOverlay phrases={BODY_PHRASES} />
      </Sequence>

      {/* SCENE 3: CTA */}
      <Sequence from={hookFrames + bodyFrames} durationInFrames={ctaFrames}>
        <Audio src={staticFile("audio/scene-3-cta.wav")} />
        <WhimsicalBackground theme="cta" />
        <FullCaptionsOverlay phrases={CTA_PHRASES} />
        <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 120 }}>
          <div
            style={{
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.highlight})`,
              borderRadius: 50,
              paddingLeft: 48,
              paddingRight: 48,
              paddingTop: 20,
              paddingBottom: 20,
              boxShadow: "0 8px 32px rgba(255,107,157,0.4)",
            }}
          >
            <span
              style={{
                fontSize: 44,
                fontWeight: 900,
                fontFamily: "Arial Black, Arial, sans-serif",
                color: "#FFFFFF",
                letterSpacing: "1px",
                textShadow: "1px 1px 3px rgba(0,0,0,0.4)",
              }}
            >
              FOLLOW FOR MORE
            </span>
          </div>
        </AbsoluteFill>
      </Sequence>

    </AbsoluteFill>
  );
};

export { TOTAL_FRAMES, FPS };
