import React, { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { Boxes, BoxItem } from "../components/Instances";
import { Ocean } from "../components/Ocean";
import { Counter, Heading, Reveal } from "../components/Overlay";
import { Stage } from "../components/Stage";
import { BarelangWorld, Title3D } from "../components/BarelangWorld";
import { CamKey, V3, sampleCam, withSway } from "../lib/camera";
import { PALETTE } from "../lib/data";
import { PRESETS } from "../lib/presets";
import { OCEAN_SHALLOWS, PLACEMENTS } from "../lib/world";

const pl = PLACEMENTS[0];
const toWorld = ([x, y, z]: V3): V3 => {
  const c = Math.cos(pl.yaw);
  const s = Math.sin(pl.yaw);
  return [pl.mid[0] + x * c + z * s, y, pl.mid[1] - x * s + z * c];
};

const KEYS: CamKey[] = [
  { t: 0, pos: toWorld([-640, 48, -560]), look: toWorld([-170, 58, 0]), fov: 38 },
  { t: 0.4, pos: toWorld([-210, 118, -760]), look: toWorld([-30, 66, 0]), fov: 38 },
  { t: 0.75, pos: toWorld([230, 150, -830]), look: toWorld([20, 74, 0]), fov: 38 },
  { t: 1, pos: toWorld([610, 112, -680]), look: toWorld([60, 74, 0]), fov: 38 },
];

const BAR_Y = 212;
const BAR_W = 620;

const Timeline: React.FC<{ p: number }> = ({ p }) => {
  const tMat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ color: PALETTE.teal });
    m.color.multiplyScalar(1.3);
    return m;
  }, []);
  const items = useMemo<BoxItem[]>(() => {
    const out: BoxItem[] = [];
    const done = BAR_W * p;
    out.push({ p: [BAR_W / 2 - done / 2, BAR_Y, 0], s: [done, 6, 6], color: "#ffffff" });
    for (let i = 0; i <= 6; i++) {
      const x = BAR_W / 2 - (i / 6) * BAR_W;
      const on = p >= i / 6;
      out.push({ p: [x, BAR_Y, 0], s: on ? [5, 30, 5] : [3, 16, 3], color: "#ffffff" });
    }
    return out;
  }, [p]);
  return (
    <group position={[pl.mid[0], 0, pl.mid[1]]} rotation={[0, pl.yaw, 0]}>
      <Boxes
        items={[{ p: [0, BAR_Y, 0], s: [BAR_W, 2.4, 2.4], color: "#9FB4C7" }]}
      />
      <Boxes items={items} material={tMat} />
      {/* rotasi Y = PI supaya angka menghadap kamera di sisi -z lokal */}
      <Title3D text="1992" size={34} position={[BAR_W / 2 - 6, BAR_Y + 44, 0]} rotation={[0, Math.PI, 0]} color="#F4A261" emissive="#F4A261" emissiveIntensity={0.3} />
      <Title3D text="1998" size={34} position={[-BAR_W / 2 + 6, BAR_Y + 44, 0]} rotation={[0, Math.PI, 0]} color="#13C4A3" emissive="#13C4A3" emissiveIntensity={0.3} />
    </group>
  );
};

export const Scene04: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const preset = PRESETS.day;
  const t = frame / (duration - 1);
  const cam = useMemo(() => withSway(sampleCam(KEYS, t), frame, 1.2), [t, frame]);
  const build = interpolate(t, [0.05, 0.84], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  const at = (x: number) => Math.round(duration * x);

  return (
    <AbsoluteFill>
      <Stage preset={preset} cam={cam} shadows>
        <Ocean preset={preset} cam={cam} shallows={OCEAN_SHALLOWS} />
        <BarelangWorld
          cam={cam}
          b1Build={build}
          castShadow
          bridgeAppear={[1, 0, 0, 0, 0, 0]}
          plan={{ progress: [1, 1, 1, 1, 1, 1], width: 9 }}
        />
        <Timeline p={build} />
      </Stage>
      <AbsoluteFill style={{ padding: "150px 170px" }}>
        <div style={{ position: "absolute", left: 170, top: 1590, display: "flex", gap: 44 }}>
          <Counter at={at(0.42)} value={6} suffix="tahun" />
          <Counter at={at(0.5)} value={6} suffix="jembatan" />
          <Counter at={at(0.58)} value={400} prefix="± Rp" suffix="miliar" frames={36} />
        </div>
        <div style={{ position: "absolute", left: 170, top: 1470 }}>
          <Reveal at={at(0.74)}>
            <Heading body size={72} color={PALETTE.white}>
              Melibatkan ratusan insinyur dalam negeri
            </Heading>
          </Reveal>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
