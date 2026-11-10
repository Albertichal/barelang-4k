import * as THREE from "three";

export type V3 = [number, number, number];
export type CamKey = { t: number; pos: V3; look: V3; fov?: number };
export type CamState = { pos: V3; look: V3; fov: number };

const cr = (p0: number, p1: number, p2: number, p3: number, u: number) =>
  0.5 *
  (2 * p1 +
    (-p0 + p2) * u +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u +
    (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);

const crV = (a: V3, b: V3, c: V3, d: V3, u: number): V3 => [
  cr(a[0], b[0], c[0], d[0], u),
  cr(a[1], b[1], c[1], d[1], u),
  cr(a[2], b[2], c[2], d[2], u),
];

/** Kamera berbasis keyframe (t = 0..1), jalur Catmull-Rom yang mulus. */
export const sampleCam = (keys: CamKey[], tIn: number): CamState => {
  const t = Math.min(1, Math.max(0, tIn));
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1].t) i++;
  const k0 = keys[Math.max(0, i - 1)];
  const k1 = keys[i];
  const k2 = keys[i + 1];
  const k3 = keys[Math.min(keys.length - 1, i + 2)];
  const u = (t - k1.t) / Math.max(1e-6, k2.t - k1.t);
  return {
    pos: crV(k0.pos, k1.pos, k2.pos, k3.pos, u),
    look: crV(k0.look, k1.look, k2.look, k3.look, u),
    fov: cr(k0.fov ?? 38, k1.fov ?? 38, k2.fov ?? 38, k3.fov ?? 38, u),
  };
};

/** Goyangan halus supaya tidak pernah ada frame yang benar-benar diam. */
export const withSway = (s: CamState, frame: number, amount = 1): CamState => ({
  ...s,
  pos: [
    s.pos[0] + Math.sin(frame * 0.043) * 1.6 * amount,
    s.pos[1] + Math.sin(frame * 0.031 + 1.3) * 1.1 * amount,
    s.pos[2] + Math.cos(frame * 0.037 + 0.4) * 1.6 * amount,
  ],
});

const scratch = new THREE.PerspectiveCamera();
const vec = new THREE.Vector3();

/** Proyeksi titik dunia ke piksel kanvas, untuk label 2D yang menempel di objek 3D. */
export const projectToScreen = (
  cam: CamState,
  p: V3,
  width: number,
  height: number,
): { x: number; y: number; visible: boolean } => {
  scratch.fov = cam.fov;
  scratch.aspect = width / height;
  scratch.near = 3;
  scratch.far = 60000;
  scratch.position.set(...cam.pos);
  scratch.up.set(0, 1, 0);
  scratch.lookAt(...cam.look);
  scratch.updateMatrixWorld();
  scratch.updateProjectionMatrix();
  vec.set(...p).project(scratch);
  return {
    x: ((vec.x + 1) / 2) * width,
    y: ((1 - vec.y) / 2) * height,
    visible: vec.z < 1,
  };
};
