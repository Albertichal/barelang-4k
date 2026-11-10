import * as THREE from "three";
import { makeSimplex, smoothstep } from "../lib/noise";
import { Island, heightFnOf } from "../lib/world";

export type TerrainLod = "hi" | "lo";

export type Grid = {
  nx: number;
  nz: number;
  x0: number;
  z0: number;
  dx: number;
  dz: number;
  h: Float32Array;
  road: Float32Array;
  geometry: THREE.BufferGeometry;
};

const COLORS = {
  sand: new THREE.Color("#E8D8AC"),
  wetSand: new THREE.Color("#BFA981"),
  grass: new THREE.Color("#86AE45"),
  forest: new THREE.Color("#31783F"),
  deep: new THREE.Color("#1C5230"),
  rock: new THREE.Color("#7C7160"),
  road: new THREE.Color("#94896F"),
};

const buildGrid = (isl: Island, lod: TerrainLod): Grid => {
  const height = heightFnOf(isl);
  const span = 1.28;
  const w = isl.rx * 2 * span;
  const d = isl.rz * 2 * span;
  const cap = lod === "hi" ? 240 : 72;
  const minCell = lod === "hi" ? 4 : 18;
  const nx = Math.min(cap, Math.round(w / minCell));
  const nz = Math.min(cap, Math.round(d / minCell));
  const x0 = isl.c[0] - w / 2;
  const z0 = isl.c[1] - d / 2;
  const dx = w / nx;
  const dz = d / nz;
  const cols = nx + 1;
  const count = cols * (nz + 1);
  const h = new Float32Array(count);
  const road = new Float32Array(count);
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const s = height(x0 + i * dx, z0 + j * dz);
      h[j * cols + i] = s.h;
      road[j * cols + i] = s.road;
    }
  }

  const noise = makeSimplex(isl.seed + 3);
  const at = (i: number, j: number) =>
    h[Math.max(0, Math.min(nz, j)) * cols + Math.max(0, Math.min(nx, i))];
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();
  const r = lod === "hi" ? 3 : 1;
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const k = j * cols + i;
      const x = x0 + i * dx;
      const z = z0 + j * dz;
      const y = h[k];
      pos.set([x, y, z], k * 3);
      const sx = (at(i + 1, j) - at(i - 1, j)) / (2 * dx);
      const sz = (at(i, j + 1) - at(i, j - 1)) / (2 * dz);
      const slope = Math.hypot(sx, sz);
      const jitter = noise(x * 0.02, z * 0.02);
      const rel = y / isl.h;

      c.copy(COLORS.wetSand);
      c.lerp(COLORS.sand, smoothstep(0.1, 1.2, y));
      c.lerp(COLORS.grass, smoothstep(2.6, 5.5, y + jitter * 1.5));
      c.lerp(COLORS.forest, smoothstep(0.12, 0.3, rel + jitter * 0.07));
      c.lerp(COLORS.deep, smoothstep(0.38, 0.8, rel + jitter * 0.1));
      c.lerp(COLORS.rock, smoothstep(0.8, 1.3, slope + jitter * 0.1));
      c.lerp(COLORS.road, smoothstep(0.7, 1, road[k]) * 0.45);

      // AO palsu: titik yang lebih rendah dari sekitarnya (lembah) digelapkan.
      const avg = (at(i - r, j) + at(i + r, j) + at(i, j - r) + at(i, j + r)) / 4;
      const ao = smoothstep(0, 14, avg - y);
      c.multiplyScalar(1 - 0.5 * ao);
      col.set([c.r, c.g, c.b], k * 3);
    }
  }
  const idx = new Uint32Array(nx * nz * 6);
  let p = 0;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const e = a + cols;
      const f = e + 1;
      idx[p++] = a;
      idx[p++] = e;
      idx[p++] = b;
      idx[p++] = b;
      idx[p++] = e;
      idx[p++] = f;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geometry.setIndex(new THREE.BufferAttribute(idx, 1));
  geometry.computeVertexNormals();
  return { nx, nz, x0, z0, dx, dz, h, road, geometry };
};

const cache = new Map<string, Grid>();
export const gridOf = (isl: Island, lod: TerrainLod) => {
  const key = `${isl.id}:${lod}`;
  if (!cache.has(key)) cache.set(key, buildGrid(isl, lod));
  return cache.get(key)!;
};

/** Tinggi tepat di permukaan mesh: interpolasi segitiga yang sama dengan index mesh. */
export const sampleGrid = (g: Grid, x: number, z: number) => {
  const fx = (x - g.x0) / g.dx;
  const fz = (z - g.z0) / g.dz;
  const i = Math.max(0, Math.min(g.nx - 1, Math.floor(fx)));
  const j = Math.max(0, Math.min(g.nz - 1, Math.floor(fz)));
  const u = fx - i;
  const v = fz - j;
  const cols = g.nx + 1;
  const a = g.h[j * cols + i];
  const b = g.h[j * cols + i + 1];
  const e = g.h[(j + 1) * cols + i];
  const f = g.h[(j + 1) * cols + i + 1];
  return u + v <= 1 ? a + (b - a) * u + (e - a) * v : f + (e - f) * (1 - u) + (b - f) * (1 - v);
};

/** Pewarnaan vertex + noise detail per piksel supaya permukaan tidak polos. */
export const terrainMaterial = (() => {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.94 });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvWP = (modelMatrix * vec4(position, 1.0)).xyz;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vWP;
float tH(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float tN(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(tH(i),tH(i+vec2(1,0)),f.x),mix(tH(i+vec2(0,1)),tH(i+vec2(1,1)),f.x),f.y); }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
float tD = tN(vWP.xz*0.09)*0.55 + tN(vWP.xz*0.31)*0.3 + tN(vWP.xz*1.1)*0.15;
diffuseColor.rgb *= 0.78 + 0.44*tD;`,
      );
  };
  return m;
})();
