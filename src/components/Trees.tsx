import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { V3 } from "../lib/camera";
import { makeSimplex, mulberry32 } from "../lib/noise";
import { Island, heightFnOf } from "../lib/world";
import { Grid, gridOf, sampleGrid } from "./Terrain";

type Kind = "forest" | "coconut" | "bush";
type Tree = {
  kind: Kind;
  x: number;
  z: number;
  yHi: number;
  yLo: number;
  yaw: number;
  tiltX: number;
  tiltZ: number;
  s: number;
  leaf: THREE.Color;
  trunk: THREE.Color;
};

const SINK = 0.4; // pangkal batang ditanam 0.3-0.5 unit ke tanah
const slopeAt = (g: Grid, x: number, z: number) => {
  const e = 3;
  return Math.hypot(
    (sampleGrid(g, x + e, z) - sampleGrid(g, x - e, z)) / (2 * e),
    (sampleGrid(g, x, z + e) - sampleGrid(g, x, z - e)) / (2 * e),
  );
};

const LEAF = ["#2C7A3C", "#3B8C3E", "#25693A", "#4D9A3F", "#1F5E34"].map((c) => new THREE.Color(c));
const PALM = ["#5E9E3A", "#6FAE3E", "#4F8F38"].map((c) => new THREE.Color(c));
const BARK = ["#5A4030", "#6B4E38", "#4E382A"].map((c) => new THREE.Color(c));
const PALM_BARK = ["#8A7458", "#7D6850"].map((c) => new THREE.Color(c));

const placeTrees = (isl: Island): Tree[] => {
  const hi = gridOf(isl, "hi");
  const lo = gridOf(isl, "lo");
  const height = heightFnOf(isl);
  const rng = mulberry32(isl.seed + 1);
  const out: Tree[] = [];
  const pick = <T,>(a: T[]) => a[Math.floor(rng() * a.length)];
  const area = (isl.rx * isl.rz) / 3000;
  const want = {
    forest: Math.min(1900, Math.max(320, Math.round(area * 4))),
    coconut: Math.min(260, Math.max(50, Math.round(Math.sqrt(area) * 11))),
    bush: Math.min(600, Math.max(90, Math.round(area * 1.1))),
  };
  const roadN = isl.road.length;

  const tryPlace = (kind: Kind, tries: number) => {
    let placed = 0;
    for (let n = 0; n < tries && placed < want[kind]; n++) {
      const a = rng() * Math.PI * 2;
      let x: number;
      let z: number;
      if (kind !== "coconut" && isl.rx > 800 && rng() < 0.65) {
        // Pulau besar: hutan dipadatkan di sekitar jalan dan pangkal jembatan,
        // area yang benar-benar dilewati kamera.
        const rp = isl.road[Math.floor(rng() * roadN)].p;
        const dist = 40 + Math.pow(rng(), 0.7) * 420;
        x = rp[0] + Math.cos(a) * dist;
        z = rp[1] + Math.sin(a) * dist;
      } else {
        const r = Math.sqrt(rng()) * 1.08;
        x = isl.c[0] + Math.cos(a) * r * isl.rx;
        z = isl.c[1] + Math.sin(a) * r * isl.rz;
      }
      if (height(x, z).road > 0.04) continue;
      const y = sampleGrid(hi, x, z);
      const slope = slopeAt(hi, x, z);
      if (kind === "coconut") {
        if (y < 0.7 || y > 4 || slope > 0.32) continue;
      } else if (kind === "forest") {
        if (y < 4.5 || slope > 0.55) continue;
      } else if (y < 2.6 || slope > 0.6) {
        continue;
      }
      const s =
        kind === "forest" ? 15 + rng() * 15 : kind === "coconut" ? 13 + rng() * 8 : 3 + rng() * 3.5;
      const tilt = kind === "coconut" ? 0.07 : 0.06;
      out.push({
        kind,
        x,
        z,
        yHi: y - SINK,
        yLo: sampleGrid(lo, x, z) - SINK,
        yaw: rng() * Math.PI * 2,
        tiltX: (rng() - 0.5) * tilt,
        tiltZ: (rng() - 0.5) * tilt,
        s,
        leaf: pick(kind === "coconut" ? PALM : LEAF),
        trunk: pick(kind === "coconut" ? PALM_BARK : BARK),
      });
      placed++;
    }
  };
  tryPlace("forest", want.forest * 8);
  tryPlace("coconut", want.coconut * 90);
  tryPlace("bush", want.bush * 8);
  return out;
};

const cache = new Map<string, Tree[]>();
const treesOf = (isl: Island) => {
  if (!cache.has(isl.id)) cache.set(isl.id, placeTrees(isl));
  return cache.get(isl.id)!;
};

const noise = makeSimplex(4242);

const blob = (
  detail: number,
  r: number,
  cx: number,
  cy: number,
  cz: number,
  squash = 0.82,
  phase = 0,
) => {
  const raw = new THREE.IcosahedronGeometry(1, detail);
  raw.deleteAttribute("normal");
  raw.deleteAttribute("uv");
  const g = mergeVertices(raw, 1e-4);
  const p = g.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const n =
      1 +
      0.2 * noise(x * 1.7 + y * 0.8 + phase, z * 1.7 - y * 0.6) +
      0.1 * noise(x * 3.6 + phase, y * 3.6 + z * 2.1);
    p.setXYZ(i, cx + x * r * n, cy + y * r * n * squash, cz + z * r * n);
    // Bagian bawah kanopi lebih gelap (AO palsu).
    const shade = 0.68 + 0.5 * Math.min(1, Math.max(0, (y + 1) / 1.7));
    col.set([shade, shade, shade], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
};

const forestHi = mergeGeometries([
  blob(2, 0.27, 0, 0.72, 0, 0.8, 0),
  blob(2, 0.2, 0.2, 0.64, 0.08, 0.8, 3),
  blob(2, 0.2, -0.16, 0.62, 0.15, 0.8, 7),
  blob(2, 0.19, 0.02, 0.63, -0.21, 0.8, 11),
])!;
const forestMid = mergeGeometries([
  blob(1, 0.3, 0, 0.7, 0, 0.8, 1),
  blob(1, 0.2, 0.16, 0.62, 0.1, 0.8, 5),
])!;
const forestLo = blob(0, 0.33, 0, 0.66, 0, 0.82, 2);
const bushGeo = mergeGeometries([
  blob(1, 0.62, 0, 0.42, 0, 0.72, 13),
  blob(1, 0.42, 0.42, 0.3, 0.15, 0.72, 17),
])!;

// Batang menembus sedikit di bawah pivot supaya pangkalnya tidak pernah menggantung di lereng.
const trunkGeo = new THREE.CylinderGeometry(0.028, 0.056, 0.66, 7, 2).translate(0, 0.29, 0);

const makeCoconut = () => {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.05, 0),
    new THREE.Vector3(0.05, 0.3, 0),
    new THREE.Vector3(0.16, 0.65, 0),
    new THREE.Vector3(0.3, 1, 0),
  ]);
  const trunk = new THREE.TubeGeometry(curve, 10, 0.024, 6, false);
  const top = new THREE.Vector3(0.3, 1, 0);
  const pos: number[] = [];
  const idx: number[] = [];
  const fronds = 11;
  const segs = 7;
  for (let f = 0; f < fronds; f++) {
    const yaw = f * 2.399;
    const cs = Math.cos(yaw);
    const sn = Math.sin(yaw);
    const lift = 0.04 + (f % 3) * 0.04;
    const base = pos.length / 3;
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const r = 0.42 * u;
      const y = lift * Math.sin(u * 2.2) - 0.3 * u * u;
      const hw = 0.055 * Math.sin(Math.PI * Math.min(1, u * 1.04));
      for (const side of [-1, 1]) {
        const lx = r;
        const lz = side * hw;
        pos.push(top.x + lx * cs - lz * sn, top.y + y - Math.abs(lz) * 0.4, top.z + lx * sn + lz * cs);
      }
    }
    for (let i = 0; i < segs; i++) {
      const a = base + i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const leaf = new THREE.BufferGeometry();
  leaf.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  leaf.setIndex(idx);
  leaf.computeVertexNormals();
  return { trunk, leaf };
};
const coconut = makeCoconut();

const canopyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
const leafMat = new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide });
const trunkMat = new THREE.MeshStandardMaterial({ roughness: 0.95 });

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const P = new THREE.Vector3();
const S = new THREE.Vector3();

const HI = 330;
const MID = 1900;
const BUSH_MAX = 1500;
const PALM_MAX = 4200;

/** Pohon satu pulau, LOD per pohon berdasarkan jarak kamera. */
export const Trees: React.FC<{ island: Island; camLocal: V3; terrainLod: "hi" | "lo" }> = ({
  island,
  camLocal,
  terrainLod,
}) => {
  const trees = useMemo(() => treesOf(island), [island]);
  const n = trees.length;
  const refs = {
    hi: useRef<THREE.InstancedMesh>(null),
    hiT: useRef<THREE.InstancedMesh>(null),
    mid: useRef<THREE.InstancedMesh>(null),
    midT: useRef<THREE.InstancedMesh>(null),
    lo: useRef<THREE.InstancedMesh>(null),
    palmT: useRef<THREE.InstancedMesh>(null),
    palmL: useRef<THREE.InstancedMesh>(null),
    bush: useRef<THREE.InstancedMesh>(null),
  };

  useLayoutEffect(() => {
    const counters = new Map<THREE.InstancedMesh, number>();
    const meshes = Object.values(refs)
      .map((r) => r.current)
      .filter(Boolean) as THREE.InstancedMesh[];
    meshes.forEach((mesh) => counters.set(mesh, 0));
    const put = (mesh: THREE.InstancedMesh | null, color: THREE.Color) => {
      if (!mesh) return;
      const i = counters.get(mesh)!;
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, color);
      counters.set(mesh, i + 1);
    };
    for (const t of trees) {
      const y = terrainLod === "hi" ? t.yHi : t.yLo;
      const d = Math.hypot(t.x - camLocal[0], y - camLocal[1], t.z - camLocal[2]);
      if (t.kind === "bush" && d > BUSH_MAX) continue;
      if (t.kind === "coconut" && d > PALM_MAX) continue;
      e.set(t.tiltX, t.yaw, t.tiltZ);
      q.setFromEuler(e);
      m.compose(P.set(t.x, y, t.z), q, S.setScalar(t.s));
      if (t.kind === "bush") {
        put(refs.bush.current, t.leaf);
      } else if (t.kind === "coconut") {
        put(refs.palmT.current, t.trunk);
        put(refs.palmL.current, t.leaf);
      } else if (d < HI) {
        put(refs.hi.current, t.leaf);
        put(refs.hiT.current, t.trunk);
      } else if (d < MID) {
        put(refs.mid.current, t.leaf);
        put(refs.midT.current, t.trunk);
      } else {
        put(refs.lo.current, t.leaf);
      }
    }
    meshes.forEach((mesh) => {
      mesh.count = counters.get(mesh)!;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  });

  const inst = (ref: React.RefObject<THREE.InstancedMesh | null>, g: THREE.BufferGeometry, mat: THREE.Material) => (
    <instancedMesh ref={ref} args={[g, mat, n]} frustumCulled={false} />
  );
  return (
    <>
      {inst(refs.hi, forestHi, canopyMat)}
      {inst(refs.hiT, trunkGeo, trunkMat)}
      {inst(refs.mid, forestMid, canopyMat)}
      {inst(refs.midT, trunkGeo, trunkMat)}
      {inst(refs.lo, forestLo, canopyMat)}
      {inst(refs.palmT, coconut.trunk, trunkMat)}
      {inst(refs.palmL, coconut.leaf, leafMat)}
      {inst(refs.bush, bushGeo, canopyMat)}
    </>
  );
};
