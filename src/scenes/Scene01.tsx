import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Ocean } from "../components/Ocean";
import { Heading, Reveal } from "../components/Overlay";
import { Stage } from "../components/Stage";
import { BarelangWorld, Title3D } from "../components/BarelangWorld";
import { CamKey, sampleCam, withSway } from "../lib/camera";
import { PALETTE } from "../lib/data";
import { PRESETS } from "../lib/presets";
import { OCEAN_SHALLOWS, WorldXf } from "../lib/world";

// Dunia diputar 180 derajat: Batam menjadi latar di belakang judul.
const XF: WorldXf = { theta: Math.PI, p: [0, -2700], t: [0, 0] };

const KEYS: CamKey[] = [
  { t: 0, pos: [-46, 7, 1020], look: [0, 22, 0], fov: 34 },
  { t: 0.42, pos: [24, 15, 720], look: [0, 34, 0], fov: 36 },
  { t: 1, pos: [-14, 96, 500], look: [0, 44, 0], fov: 38 },
];

export const Scene01: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const preset = PRESETS.morning;
  const t = frame / (duration - 1);
  const cam = useMemo(() => withSway(sampleCam(KEYS, t), frame, 0.7), [t, frame]);
  const rise = spring({
    frame: frame - 34,
    fps,
    durationInFrames: 96,
    config: { damping: 26, mass: 2.2, stiffness: 55 },
  });
  const y = interpolate(rise, [0, 1], [-96, 50]);

  return (
    <AbsoluteFill>
      <Stage preset={preset} cam={cam}>
        <directionalLight position={[60, 220, 950]} intensity={2.4} color="#FFF4E2" />
        <Ocean preset={preset} cam={cam} shallows={OCEAN_SHALLOWS} xf={XF} />
        <BarelangWorld cam={cam} xf={XF} />
        <Title3D
          text="BARELANG"
          size={62}
          position={[0, y, 0]}
          color="#0B2545"
          emissive="#13C4A3"
          emissiveIntensity={0.28}
          metalness={0.1}
        />
      </Stage>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: 620 }}>
        <Reveal at={Math.round(duration * 0.42)}>
          <Heading size={118} color={PALETTE.white}>
            Asal Usul Ikon Kota Batam
          </Heading>
        </Reveal>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
