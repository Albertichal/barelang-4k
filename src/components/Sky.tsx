import React, { useLayoutEffect, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import type { CamState } from "../lib/camera";
import type { SkyPreset } from "../lib/presets";

const vert = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  gl_Position = p.xyww;
}`;

const frag = /* glsl */ `
uniform vec3 uTop, uHorizon, uSunColor, uSunDir, uCloud;
uniform float uSunSize, uSunPower, uStars, uClouds, uTime;
varying vec3 vDir;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p){ float a=.5,v=0.; for(int i=0;i<5;i++){ v+=a*vnoise(p); p*=2.03; a*=.5; } return v; }
void main(){
  vec3 d = normalize(vDir);
  float y = max(d.y, 0.0);
  vec3 col = mix(uHorizon, uTop, pow(smoothstep(0.0,0.62,y),0.62));
  float s = max(dot(d,uSunDir),0.0);
  col += uSunColor * pow(s,8.0) * 0.45;
  col += uSunColor * pow(s,90.0) * 0.8;
  float disc = smoothstep(1.0-uSunSize*0.05, 1.0-uSunSize*0.018, s);
  col += uSunColor * disc * uSunPower;
  if(uClouds>0.0 && d.y>0.005){
    vec2 uv = d.xz/(d.y+0.16)*1.25 + vec2(uTime*0.006,0.0);
    float c = smoothstep(0.52,0.84,fbm(uv))*smoothstep(0.0,0.16,d.y);
    vec3 lit = mix(uCloud, uSunColor*1.6, pow(s,6.0));
    col = mix(col, lit, c*uClouds);
  }
  if(uStars>0.0){
    vec2 g = floor(d.xz/(abs(d.y)+0.4)*420.0);
    float h = hash(g);
    float tw = 0.6+0.4*sin(uTime*2.0+h*80.0);
    col += vec3(0.85,0.92,1.0)*step(0.9965,h)*tw*uStars*smoothstep(0.02,0.25,d.y)*2.2;
  }
  gl_FragColor = vec4(col,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const Sky: React.FC<{ preset: SkyPreset; cam: CamState }> = ({ preset, cam }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color(preset.top) },
          uHorizon: { value: new THREE.Color(preset.horizon) },
          uSunColor: { value: new THREE.Color(preset.sunColor) },
          uCloud: { value: new THREE.Color(preset.cloudColor) },
          uSunDir: { value: new THREE.Vector3(...preset.sunDir) },
          uSunSize: { value: preset.sunSize },
          uSunPower: { value: preset.sunPower },
          uStars: { value: preset.stars },
          uClouds: { value: preset.clouds },
          uTime: { value: 0 },
        },
      }),
    [preset],
  );
  useLayoutEffect(() => {
    material.uniforms.uTime.value = frame / fps;
    mesh.current?.position.set(...cam.pos);
  }, [material, frame, fps, cam]);
  return (
    <mesh ref={mesh} material={material} frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[30000, 48, 32]} />
    </mesh>
  );
};
