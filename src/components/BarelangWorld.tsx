import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { deckProgressOf, maxDeckReach, bridge1Config } from "../lib/bridge1Config";
import { CamState, V3 } from "../lib/camera";
import { BRIDGES } from "../lib/data";
import { lerp, mulberry32 } from "../lib/noise";
import {
  CHAIN_PATH,
  ISLANDS,
  Island,
  NO_XF,
  PLACEMENTS,
  WorldXf,
  worldToMap,
} from "../lib/world";
import { FONT_3D } from "../theme/fonts";
import { ArchBridge, CableStayedBridge, GirderBridge } from "./Bridges";
import { BoxItem, Boxes, DotItem, Dots } from "./Instances";
import { Grid, TerrainLod, gridOf, sampleGrid, terrainMaterial } from "./Terrain";
import { Trees } from "./Trees";

const ribbonGeometry = (pts: V3[], width: number, colorFn?: (t: number) => THREE.Color) => {
  const pos = new Float32Array(pts.length * 6);
  const nor = new Float32Array(pts.length * 6);
  const col = new Float32Array(pts.length * 6);
  const idx: number[] = [];
  pts.forEach((p, i) => {
    const q = pts[Math.min(pts.length - 1, i + 1)];
    const o = pts[Math.max(0, i - 1)];
    const dx = q[0] - o[0];
    const dz = q[2] - o[2];
    const l = Math.hypot(dx, dz) || 1;
    const nx = (-dz / l) * width * 0.5;
    const nz = (dx / l) * width * 0.5;
    pos.set([p[0] + nx, p[1], p[2] + nz, p[0] - nx, p[1], p[2] - nz], i * 6);
    nor.set([0, 1, 0, 0, 1, 0], i * 6);
    if (colorFn) {
      const c = colorFn(i / pts.length);
      col.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
    }
    if (i < pts.length - 1) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  if (colorFn) g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
};

const roadMat = new THREE.MeshStandardMaterial({
  color: "#55585E",
  roughness: 0.92,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: -3,
  polygonOffsetUnits: -3,
});

/** Jalan tipis menempel pada permukaan mesh aktif. */
const roadGeometry = (isl: Island, grid: Grid, lod: TerrainLod) => {
  const lift = lod === "hi" ? 0.7 : 3;
  const pts = isl.road.map(
    (r) => [r.p[0], Math.max(sampleGrid(grid, r.p[0], r.p[1]), r.y - 1.2) + lift, r.p[1]] as V3,
  );
  return ribbonGeometry(pts, lod === "hi" ? 8 : 13);
};
const roadCache = new Map<string, THREE.BufferGeometry>();

const IslandBlock: React.FC<{
  island: Island;
  appear: number;
  camLocal: V3;
}> = ({ island, appear, camLocal }) => {
  if (appear <= 0) return null;
  const near =
    Math.hypot(
      Math.max(0, Math.abs(camLocal[0] - island.c[0]) - island.rx),
      Math.max(0, Math.abs(camLocal[2] - island.c[1]) - island.rz),
      camLocal[1],
    ) < 2300;
  const lod: TerrainLod = near ? "hi" : "lo";
  const grid = gridOf(island, lod);
  const key = `${island.id}:${lod}`;
  if (!roadCache.has(key)) roadCache.set(key, roadGeometry(island, grid, lod));
  return (
    <group scale={[1, appear, 1]}>
      <mesh geometry={grid.geometry} material={terrainMaterial} receiveShadow frustumCulled={false} />
      <mesh geometry={roadCache.get(key)!} material={roadMat} frustumCulled={false} />
      <Trees island={island} camLocal={camLocal} terrainLod={lod} />
    </group>
  );
};

const glowMat = new THREE.MeshBasicMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,
  fog: false,
});

/** Garis cahaya sepanjang seluruh rangkaian, digambar mengikuti progress. */
export const GlowLine: React.FC<{ progress: number; width?: number }> = ({
  progress,
  width = 46,
}) => {
  const data = useMemo(() => {
    const pts: V3[] = [];
    for (let i = 0; i < CHAIN_PATH.length - 1; i++) {
      const [a, b] = [CHAIN_PATH[i], CHAIN_PATH[i + 1]];
      const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 35));
      for (let j = 0; j < n; j++) {
        const u = j / n;
        pts.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u) + 5, lerp(a[2], b[2], u)]);
      }
    }
    const gold = new THREE.Color("#F4A261");
    const teal = new THREE.Color("#13C4A3");
    const g = ribbonGeometry(pts, width, (t) => gold.clone().lerp(teal, t).multiplyScalar(1.5));
    return { g, count: g.index!.count };
  }, [width]);
  useLayoutEffect(() => {
    data.g.setDrawRange(0, Math.floor((Math.min(1, progress) * data.count) / 6) * 6);
  }, [data, progress]);
  return <mesh geometry={data.g} material={glowMat} frustumCulled={false} renderOrder={5} />;
};

const planMat = (() => {
  const m = new THREE.MeshBasicMaterial({ color: "#7FF5E0", fog: false });
  m.color.multiplyScalar(1.5);
  return m;
})();

/** Jalur rencana: garis putus-putus bercahaya, bridge muncul berurutan. */
const PlanLines: React.FC<{ progress: number[]; width: number; b1Build?: number }> = ({
  progress,
  width,
  b1Build,
}) => {
  const { boxes, dots } = useMemo(() => {
    const boxes: BoxItem[] = [];
    const dots: DotItem[] = [];
    const deckP = b1Build === undefined ? 0 : deckProgressOf(b1Build);
    PLACEMENTS.forEach((pl, i) => {
      const dashes = Math.max(4, Math.round(pl.length / 62));
      const pitch = pl.length / dashes;
      for (let d = 0; d < dashes; d++) {
        const u = (d + 0.5) / dashes;
        let k = Math.min(1, Math.max(0, progress[i] * dashes - d));
        if (i === 0 && b1Build !== undefined) {
          // Saat dek terbangun, garis rencana di bawahnya padam.
          const x = (u - 0.5) * bridge1Config.totalLength;
          const dist = Math.abs(Math.abs(x) - bridge1Config.pylonX);
          k *= dist / maxDeckReach > deckP ? 1 : 0;
        }
        const x = pl.a[0] + pl.dir[0] * u * pl.length;
        const z = pl.a[1] + pl.dir[1] * u * pl.length;
        boxes.push({
          p: [x, 6, z],
          s: k > 0 ? [pitch * 0.66 * k, 0.6, width] : [0, 0, 0],
          r: [0, pl.yaw, 0],
          color: "#ffffff",
        });
        dots.push({ p: [x, 8, z], size: k > 0 ? width * 0.45 : 0, rgb: [0.5 * k, 1.5 * k, 1.3 * k] });
      }
    });
    return { boxes, dots };
  }, [progress, width, b1Build]);
  return (
    <>
      <Boxes items={boxes} material={planMat} />
      <Dots items={dots} halo={3} />
    </>
  );
};

const BridgeAt: React.FC<{
  index: number;
  appear: number;
  lights: number;
  build?: number;
  castShadow?: boolean;
}> = ({ index, appear, lights, build, castShadow }) => {
  const info = BRIDGES[index];
  const pl = PLACEMENTS[index];
  if (appear <= 0) return null;
  const common = { appear, lights };
  return (
    <group position={[pl.mid[0], 0, pl.mid[1]]} rotation={[0, pl.yaw, 0]}>
      {info.kind === "cable" ? (
        <CableStayedBridge {...common} build={build ?? 1} castShadow={castShadow} />
      ) : info.kind === "arch" ? (
        <ArchBridge {...common} length={info.length} deckY={info.deckY} />
      ) : (
        <GirderBridge
          {...common}
          length={info.length}
          deckY={info.deckY}
          variant={info.kind}
          mainSpan={info.kind === "haunched" ? 160 : 145}
        />
      )}
    </group>
  );
};

const NightLights: React.FC<{ level: number }> = ({ level }) => {
  const items = useMemo<DotItem[]>(() => {
    const rng = mulberry32(99);
    const out: DotItem[] = [];
    ISLANDS.forEach((isl, idx) => {
      const grid = gridOf(isl, "lo");
      const count = idx === 0 ? 300 : isl.rx > 800 ? 70 : 12;
      for (let i = 0; i < count; i++) {
        const a = rng() * Math.PI * 2;
        const r = Math.sqrt(rng()) * 0.85;
        const x = isl.c[0] + Math.cos(a) * r * isl.rx;
        const z = isl.c[1] + Math.sin(a) * r * isl.rz;
        const h = sampleGrid(grid, x, z);
        if (h > 3) {
          out.push({
            p: [x, h + 8, z],
            size: 5,
            rgb: rng() > 0.5 ? [1, 0.75, 0.42] : [0.65, 0.85, 1],
          });
        }
      }
    });
    return out;
  }, []);
  const scaled = useMemo(
    () =>
      items.map((d) => ({
        ...d,
        rgb: [d.rgb[0] * 3.5 * level, d.rgb[1] * 3.5 * level, d.rgb[2] * 3.5 * level] as V3,
      })),
    [items, level],
  );
  return <Dots items={scaled} />;
};

/** Satu dunia untuk semua scene: pulau, jalan, pohon, jembatan, dan jalur rencana. */
export const BarelangWorld: React.FC<{
  cam: CamState;
  xf?: WorldXf;
  islandAppear?: number[];
  bridgeAppear?: number[];
  lights?: number;
  city?: number;
  b1Build?: number;
  castShadow?: boolean;
  plan?: { progress: number[]; width: number };
}> = ({ cam, xf = NO_XF, islandAppear, bridgeAppear, lights = 0, city = 0, b1Build, castShadow, plan }) => {
  const [lx, lz] = worldToMap(xf, cam.pos[0], cam.pos[2]);
  const camLocal: V3 = [lx, cam.pos[1], lz];
  return (
    <group position={[xf.p[0], 0, xf.p[1]]} rotation={[0, xf.theta, 0]}>
      <group position={[xf.t[0], 0, xf.t[1]]}>
        {ISLANDS.map((isl, i) => (
          <IslandBlock key={isl.id} island={isl} appear={islandAppear?.[i] ?? 1} camLocal={camLocal} />
        ))}
        {BRIDGES.map((b, i) => (
          <BridgeAt
            key={b.no}
            index={i}
            appear={bridgeAppear?.[i] ?? 1}
            lights={lights}
            build={i === 0 ? b1Build : undefined}
            castShadow={i === 0 ? castShadow : false}
          />
        ))}
        {plan ? <PlanLines progress={plan.progress} width={plan.width} b1Build={b1Build} /> : null}
        {city > 0 ? <NightLights level={city} /> : null}
      </group>
    </group>
  );
};

/** Teks 3D (font dari src/theme/fonts.ts). Geometri sinkron, tanpa Suspense. */
export const Title3D: React.FC<{
  text: string;
  size: number;
  depth?: number;
  position?: V3;
  rotation?: V3;
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  metalness?: number;
}> = ({
  text,
  size,
  depth,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color = "#F8F9FA",
  emissive = "#000000",
  emissiveIntensity = 0,
  metalness = 0.25,
}) => {
  const geometry = useMemo(() => {
    const g = new TextGeometry(text, {
      font: FONT_3D,
      size,
      depth: depth ?? size * 0.28,
      curveSegments: 8,
      bevelEnabled: true,
      bevelSize: size * 0.012,
      bevelThickness: size * 0.018,
      bevelSegments: 2,
    });
    g.center();
    return g;
  }, [text, size, depth]);
  return (
    <mesh geometry={geometry} position={position} rotation={rotation} frustumCulled={false}>
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        metalness={metalness}
        roughness={0.32}
      />
    </mesh>
  );
};
