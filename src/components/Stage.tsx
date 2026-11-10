import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import React, { useLayoutEffect, useMemo } from "react";
import { useVideoConfig } from "remotion";
import * as THREE from "three";
import type { CamState } from "../lib/camera";
import type { SkyPreset } from "../lib/presets";
import { Sky } from "./Sky";

// EffectComposer menghasilkan kanvas kosong saat render Remotion (lihat NOTES.md),
// jadi pencahayaan memakai ACES bawaan three.js + halo aditif di Dots.

export const CameraRig: React.FC<{ cam: CamState }> = ({ cam }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(...cam.pos);
    camera.fov = cam.fov;
    camera.near = 3;
    camera.far = 60000;
    camera.up.set(0, 1, 0);
    camera.lookAt(...cam.look);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }, [camera, cam]);
  return null;
};

export const Stage: React.FC<{
  preset: SkyPreset;
  cam: CamState;
  shadows?: boolean;
  noSky?: boolean;
  background?: string;
  fog?: { color: string; near: number; far: number };
  children: React.ReactNode;
}> = ({ preset, cam, shadows, noSky, background, fog, children }) => {
  const { width, height } = useVideoConfig();
  // dpr 1 saat render 4K; saat preview --scale=0.5 buffer ikut mengecil.
  const dpr = Math.min(1, window.devicePixelRatio || 1);
  const f = fog ?? preset.fog;
  const l = preset.light;
  const sun = preset.sunDir;
  const target = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    target.position.set(cam.look[0], 0, cam.look[2]);
    target.updateMatrixWorld();
  }, [target, cam]);

  return (
    <ThreeCanvas
      width={width}
      height={height}
      dpr={dpr}
      shadows={shadows ? { type: THREE.PCFSoftShadowMap } : false}
      gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
      camera={{ fov: cam.fov, near: 3, far: 60000, position: cam.pos }}
    >
      {background ? <color attach="background" args={[background]} /> : null}
      <fog attach="fog" args={[f.color, f.near, f.far]} />
      <CameraRig cam={cam} />
      {noSky ? null : <Sky preset={preset} cam={cam} />}
      <hemisphereLight args={[l.sky, l.ground, l.hemi]} />
      <directionalLight
        color={l.sunColor}
        intensity={l.sun}
        position={[
          cam.look[0] + sun[0] * 2500,
          Math.max(120, sun[1] * 2500),
          cam.look[2] + sun[2] * 2500,
        ]}
        target={target}
        castShadow={shadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-900}
        shadow-camera-right={900}
        shadow-camera-top={900}
        shadow-camera-bottom={-900}
        shadow-camera-near={10}
        shadow-camera-far={6000}
        shadow-bias={-0.0006}
      />
      {children}
    </ThreeCanvas>
  );
};
