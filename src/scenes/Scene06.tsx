import { useThree } from "@react-three/fiber";
import React, { useLayoutEffect, useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { Ocean } from "../components/Ocean";
import { Stage } from "../components/Stage";
import { BarelangWorld } from "../components/BarelangWorld";
import { CamKey, sampleCam, withSway } from "../lib/camera";
import { mulberry32 } from "../lib/noise";
import { PRESETS } from "../lib/presets";
import { OCEAN_SHALLOWS, PLACEMENTS, WorldXf } from "../lib/world";

const pl = PLACEMENTS[0];
// Seluruh dunia diputar supaya Jembatan 1 berada di pusat sumbu X.
const XF: WorldXf = { theta: -pl.yaw, p: [0, 0], t: [-pl.mid[0], -pl.mid[1]] };

const KEYS: CamKey[] = [
  { t: 0, pos: [-262, 13, 95], look: [-150, 42, -30], fov: 44 },
  { t: 0.3, pos: [-155, 22, 210], look: [-110, 50, -10], fov: 42 },
  { t: 0.62, pos: [40, 96, 400], look: [-40, 70, 0], fov: 40 },
  { t: 1, pos: [-90, 240, 330], look: [-175, 112, 0], fov: 38 },
];

const pVert = /* glsl */ `
uniform float uTime, uHeight;
attribute float aSeed;
varying float vA;
void main(){
  vec3 p = position;
  p.x += sin(uTime*.33+aSeed*40.)*9.;
  p.y += mod(uTime*(1.6+aSeed*2.2)+aSeed*180.,180.);
  p.z += cos(uTime*.27+aSeed*70.)*9.;
  vec4 mv = modelViewMatrix*vec4(p,1.);
  vA = .35+.65*abs(sin(uTime*1.4+aSeed*90.));
  gl_PointSize = (1.2+aSeed*2.)*uHeight/-mv.z;
  gl_Position = projectionMatrix*mv;
}`;
const pFrag = /* glsl */ `
uniform vec3 uColor; varying float vA;
void main(){
  float d=length(gl_PointCoord-.5);
  float a=smoothstep(.5,0.,d);
  gl_FragColor=vec4(uColor*2.6,a*a*vA);
}`;

const Particles: React.FC<{ time: number; level: number }> = ({ time, level }) => {
  const gl = useThree((s) => s.gl);
  const { geometry, material } = useMemo(() => {
    const rng = mulberry32(777);
    const n = 700;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos.set([(rng() - 0.5) * 900, 6 + rng() * 20, (rng() - 0.3) * 640], i * 3);
      seed[i] = rng();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const material = new THREE.ShaderMaterial({
      vertexShader: pVert,
      fragmentShader: pFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uHeight: { value: 2160 },
        uColor: { value: new THREE.Color("#FFC58F") },
      },
    });
    return { geometry, material };
  }, []);
  useLayoutEffect(() => {
    material.uniforms.uTime.value = time;
    material.uniforms.uHeight.value = gl.domElement.height;
    material.opacity = level;
  }, [material, time, gl, level]);
  return <points geometry={geometry} material={material} frustumCulled={false} />;
};

export const Scene06: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const preset = PRESETS.golden;
  const t = frame / (duration - 1);
  const cam = useMemo(() => withSway(sampleCam(KEYS, t), frame, 0.6), [t, frame]);
  const lights = interpolate(t, [0.3, 0.86], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <Stage preset={preset} cam={cam} shadows>
        <Ocean preset={preset} cam={cam} amp={0.8} shallows={OCEAN_SHALLOWS} xf={XF} />
        <BarelangWorld cam={cam} xf={XF} lights={lights} castShadow />
        <Particles time={frame / fps} level={1} />
      </Stage>
    </AbsoluteFill>
  );
};
