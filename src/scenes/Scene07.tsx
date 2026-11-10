import React, { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Ocean } from "../components/Ocean";
import { Heading, Reveal } from "../components/Overlay";
import { Stage } from "../components/Stage";
import { BarelangWorld, GlowLine } from "../components/BarelangWorld";
import { CamKey, sampleCam, withSway } from "../lib/camera";
import { PALETTE } from "../lib/data";
import { PRESETS } from "../lib/presets";
import { CHAIN_CENTER, OCEAN_SHALLOWS, PLACEMENTS } from "../lib/world";

const [cx, cz] = CHAIN_CENTER;
const b1 = PLACEMENTS[0];
const KEYS: CamKey[] = [
  { t: 0, pos: [b1.mid[0] - 700, 170, b1.mid[1] - 420], look: [b1.mid[0], 60, b1.mid[1]], fov: 38 },
  { t: 0.42, pos: [cx - 5600, 4200, cz - 2800], look: [cx - 300, 0, cz - 1700], fov: 38 },
  { t: 1, pos: [cx - 9600, 11600, cz], look: [cx, 0, cz + 200], fov: 36 },
];

export const Scene07: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const preset = PRESETS.night;
  const t = frame / (duration - 1);
  const cam = useMemo(() => withSway(sampleCam(KEYS, t), frame, 2), [t, frame]);
  const line = interpolate(t, [0.1, 0.62], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  const at = (x: number) => Math.round(duration * x);
  return (
    <AbsoluteFill>
      <Stage preset={preset} cam={cam}>
        <Ocean preset={preset} cam={cam} shallows={OCEAN_SHALLOWS} amp={0.7} />
        <BarelangWorld cam={cam} lights={1} city={1} />
        <GlowLine progress={line} />
      </Stage>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 220 }}>
        <Reveal at={at(0.44)} rise={70}>
          <Heading size={270} style={{ textAlign: "center" }}>
            BARELANG
          </Heading>
          <Heading body size={104} color={PALETTE.gold} style={{ textAlign: "center", marginTop: 8 }}>
            Menghubungkan Pulau, Menyatukan Cerita
          </Heading>
        </Reveal>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
