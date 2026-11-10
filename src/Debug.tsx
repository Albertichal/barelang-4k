import React from "react";
import { AbsoluteFill } from "remotion";
import { BarelangWorld } from "./components/BarelangWorld";
import { Ocean } from "./components/Ocean";
import { Stage } from "./components/Stage";
import { CamState, V3 } from "./lib/camera";
import { PRESETS } from "./lib/presets";
import { ISLANDS, OCEAN_SHALLOWS, PLACEMENTS } from "./lib/world";

export type DebugProps = {
  preset: "morning" | "day" | "golden" | "night";
  /** Mode kamera: world, relatif ke Jembatan 1 (bridge), atau relatif ke pusat pulau (island). */
  mode: "world" | "bridge" | "island";
  islandId?: string;
  pos: V3;
  look: V3;
  fov: number;
  build: number;
};

/** Kamera debug untuk still bukti close-up. Tidak dirender ke video. */
export const Debug: React.FC<DebugProps> = ({ preset: name, mode, islandId, pos, look, fov, build }) => {
  const preset = PRESETS[name];
  const pl = PLACEMENTS[0];
  const convert = (p: V3): V3 => {
    if (mode === "bridge") {
      const c = Math.cos(pl.yaw);
      const s = Math.sin(pl.yaw);
      return [pl.mid[0] + p[0] * c + p[2] * s, p[1], pl.mid[1] - p[0] * s + p[2] * c];
    }
    if (mode === "island") {
      const isl = ISLANDS.find((i) => i.id === islandId)!;
      return [isl.c[0] + p[0], p[1], isl.c[1] + p[2]];
    }
    return p;
  };
  const cam: CamState = { pos: convert(pos), look: convert(look), fov };
  return (
    <AbsoluteFill>
      <Stage preset={preset} cam={cam}>
        <Ocean preset={preset} cam={cam} shallows={OCEAN_SHALLOWS} />
        <BarelangWorld cam={cam} b1Build={build} />
      </Stage>
    </AbsoluteFill>
  );
};
