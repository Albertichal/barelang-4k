import { useThree } from "@react-three/fiber";
import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { V3 } from "../lib/camera";

export type BoxItem = { p: V3; s: V3; r?: V3; color?: string };
export type CylItem = { a: V3; b: V3; r: number; color?: string };
export type DotItem = { p: V3; size: number; rgb: V3 };

const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 6, 1);
const dot = new THREE.IcosahedronGeometry(1, 0);

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const P = new THREE.Vector3();
const S = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const D = new THREE.Vector3();
const C = new THREE.Color();

const finish = (mesh: THREE.InstancedMesh) => {
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
};

export const Boxes: React.FC<{
  items: BoxItem[];
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material;
  castShadow?: boolean;
}> = ({ items, geometry, material, castShadow }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const fallback = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.82 }),
    [],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => {
      e.set(...(it.r ?? ([0, 0, 0] as V3)));
      q.setFromEuler(e);
      m.compose(P.set(...it.p), q, S.set(...it.s));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, C.set(it.color ?? "#d5d8db"));
    });
    finish(mesh);
  }, [items]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometry ?? box, material ?? fallback, items.length]}
      frustumCulled={false}
      castShadow={castShadow}
      receiveShadow
    />
  );
};

export const Cylinders: React.FC<{
  items: CylItem[];
  material?: THREE.Material;
  castShadow?: boolean;
}> = ({ items, material, castShadow }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const fallback = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.55, metalness: 0.2 }),
    [],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((it, i) => {
      D.set(it.b[0] - it.a[0], it.b[1] - it.a[1], it.b[2] - it.a[2]);
      const len = D.length();
      if (len < 0.001) {
        m.makeScale(0, 0, 0);
      } else {
        q.setFromUnitVectors(UP, D.clone().divideScalar(len));
        P.set((it.a[0] + it.b[0]) / 2, (it.a[1] + it.b[1]) / 2, (it.a[2] + it.b[2]) / 2);
        m.compose(P, q, S.set(it.r, len, it.r));
      }
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, C.set(it.color ?? "#eceff1"));
    });
    finish(mesh);
  }, [items]);
  return (
    <instancedMesh
      ref={ref}
      args={[cyl, material ?? fallback, items.length]}
      frustumCulled={false}
      castShadow={castShadow}
    />
  );
};

const haloVert = /* glsl */ `
attribute vec3 aColor;
attribute float aSize;
uniform float uHeight;
varying vec3 vC;
void main(){
  vC = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = min(aSize * uHeight / -mv.z, 360.0);
  gl_Position = projectionMatrix * mv;
}`;
const haloFrag = /* glsl */ `
varying vec3 vC;
void main(){
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = pow(max(1.0 - d, 0.0), 2.6);
  gl_FragColor = vec4(vC * a * 0.34, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Titik cahaya HDR dengan halo aditif sebagai pengganti bloom. */
export const Dots: React.FC<{ items: DotItem[]; halo?: number }> = ({ items, halo = 4 }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const gl = useThree((s) => s.gl);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ffffff" }), []);
  const haloMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: haloVert,
        fragmentShader: haloFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uHeight: { value: 2160 } },
      }),
    [],
  );
  const haloGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = items.length;
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(n), 1));
    return g;
  }, [items.length]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const pos = haloGeo.attributes.position as THREE.BufferAttribute;
    const col = haloGeo.attributes.aColor as THREE.BufferAttribute;
    const size = haloGeo.attributes.aSize as THREE.BufferAttribute;
    items.forEach((it, i) => {
      m.compose(P.set(...it.p), q.identity(), S.setScalar(it.size));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, C.setRGB(...it.rgb));
      pos.setXYZ(i, ...it.p);
      col.setXYZ(i, ...it.rgb);
      size.setX(i, it.size * halo * 2);
    });
    pos.needsUpdate = true;
    col.needsUpdate = true;
    size.needsUpdate = true;
    haloMat.uniforms.uHeight.value = gl.domElement.height;
    finish(mesh);
  }, [items, haloGeo, haloMat, halo, gl]);
  return (
    <>
      <instancedMesh ref={ref} args={[dot, mat, items.length]} frustumCulled={false} />
      <points geometry={haloGeo} material={haloMat} frustumCulled={false} renderOrder={6} />
    </>
  );
};
