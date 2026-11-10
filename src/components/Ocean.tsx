import React, { useLayoutEffect, useMemo } from "react";
import { continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import type { CamState } from "../lib/camera";
import type { SkyPreset } from "../lib/presets";
import { NO_XF, SHORE_BOX, SHORE_RANGE, WorldXf } from "../lib/world";

// Peta jarak-ke-pantai dimuat sekali di level modul supaya tersedia sebelum frame pertama.
const shoreTexture = new THREE.Texture();
if (typeof window !== "undefined") {
  const handle = delayRender("Memuat public/shore.png");
  new THREE.TextureLoader().load(
    staticFile("shore.png"),
    (t) => {
      shoreTexture.image = t.image;
      shoreTexture.flipY = false;
      shoreTexture.colorSpace = THREE.NoColorSpace;
      shoreTexture.wrapS = THREE.ClampToEdgeWrapping;
      shoreTexture.wrapT = THREE.ClampToEdgeWrapping;
      shoreTexture.needsUpdate = true;
      continueRender(handle);
    },
    undefined,
    () => continueRender(handle),
  );
}

const vert = /* glsl */ `
uniform float uTime; uniform vec2 uOffset; uniform float uAmp;
varying vec3 vWorld;
float waves(vec2 p){
  float h=0.,a=1.,f=.035,ang=.6;
  for(int i=0;i<5;i++){
    vec2 d=vec2(cos(ang),sin(ang));
    h+=a*sin(dot(d,p)*f+uTime*(1.1+float(i)*.35));
    a*=.62; f*=1.7; ang+=2.399;
  }
  return h;
}
void main(){
  vec2 w = position.xz + uOffset;
  float fade = 1.0 - smoothstep(600.0,3000.0,length(position.xz));
  vec3 p = vec3(w.x, waves(w)*uAmp*fade, w.y);
  vWorld = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p,1.0);
}`;

const frag = /* glsl */ `
uniform float uTime, uFogNear, uFogFar, uCloudShadow, uFoam, uShoreRange;
uniform vec3 uDeep, uMid, uShallow, uFoamColor, uTop, uHorizon, uSunColor, uSunDir, uFogColor, uCam;
uniform vec3 uIsl[8];
uniform int uIslCount;
uniform sampler2D uShore;
uniform vec4 uShoreBox;
uniform mat3 uToMap;
uniform vec3 uPulse[3];
uniform vec2 uPulseC;
uniform vec3 uPulseColor;
varying vec3 vWorld;

float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float vn(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p){ float a=.5,v=0.; for(int i=0;i<4;i++){ v+=a*vn(p); p*=2.02; a*=.5; } return v; }

// Normal berlapis: alun besar + riak halus yang bergerak berdasarkan waktu frame.
vec2 grad(vec2 p, float dist){
  vec2 warp = vec2(vn(p*.011+uTime*.05), vn(p*.011-3.7-uTime*.04))*16.;
  vec2 q = p + warp;
  vec2 g=vec2(0.); float a=1.,f=.035,ang=.6;
  for(int i=0;i<12;i++){
    float cut = 1.0 - smoothstep(26.0,480.0,dist*f);
    vec2 d=vec2(cos(ang),sin(ang));
    g+=d*f*a*cos(dot(d,q)*f+uTime*(1.1+float(i)*.35))*cut;
    a*=.73; f*=1.58; ang+=2.399;
  }
  return g;
}

void main(){
  vec3 toCam = uCam - vWorld;
  float dist = length(toCam);
  vec3 V = toCam/dist;
  vec2 g = grad(vWorld.xz, dist)*0.55;
  vec3 N = normalize(vec3(-g.x,1.0,-g.y));

  vec2 mapXZ = (uToMap*vec3(vWorld.xz,1.0)).xy;
  vec2 uv = (mapXZ-uShoreBox.xy)/uShoreBox.zw;
  float sd = 1.0;
  if(uv.x>0.0 && uv.y>0.0 && uv.x<1.0 && uv.y<1.0) sd = texture2D(uShore,uv).r;

  float reveal = 0.0;
  for(int i=0;i<uIslCount;i++){
    float d = length(mapXZ-uIsl[i].xy)/uIsl[i].z;
    reveal = max(reveal, 1.0-smoothstep(1.25,1.7,d));
  }
  float depth = mix(1.0, sd, reveal);

  // Gradasi kedalaman: toska terang di dekat pantai, biru tua di laut lepas.
  float nv = max(dot(N,V),0.0);
  vec3 water = mix(uShallow, uMid, smoothstep(0.02,0.42,depth));
  water = mix(water, uDeep, smoothstep(0.35,1.0,depth));

  // Bayangan awan yang bergerak pelan.
  float cloud = smoothstep(0.5,0.72,fbm(mapXZ*0.00042+vec2(uTime*0.012,uTime*0.005)));
  water *= 1.0-uCloudShadow*cloud;

  vec3 R = reflect(-V,N);
  R.y = abs(R.y);
  vec3 sky = mix(uHorizon,uTop,pow(smoothstep(0.0,0.62,R.y),0.62));
  float fres = 0.02+0.55*pow(1.0-nv,5.0);
  vec3 col = mix(water,sky,fres);
  float s = max(dot(R,uSunDir),0.0);
  col += uSunColor*(pow(s,900.0)*10.0 + pow(s,70.0)*0.45)*(1.0-smoothstep(500.0,2600.0,uCam.y));

  // Busa tipis di garis pantai, berdenyut mengikuti waktu.
  float n1 = fbm(mapXZ*0.07+uTime*0.12);
  float n2 = fbm(mapXZ*0.32-uTime*0.2);
  float m = sd*uShoreRange;
  float band = 1.0-smoothstep(3.0+n1*11.0,10.0+n1*17.0,m);
  float lap = 0.5+0.5*sin(m*0.28-uTime*1.5+n1*7.0);
  float outer = (1.0-smoothstep(20.0,46.0,m))*smoothstep(0.62,0.9,lap)*smoothstep(0.42,0.7,n2);
  float foam = clamp(band*smoothstep(0.28,0.6,n2+0.2)+outer,0.0,1.0)*reveal;
  // Sedikit busa di puncak ombak, hanya dekat kamera.
  float crest = smoothstep(0.34,0.62,length(g))*smoothstep(0.62,0.82,n2)*(1.0-smoothstep(200.0,1200.0,dist));
  foam = clamp(foam+crest*0.5,0.0,1.0)*uFoam*(1.0-0.75*smoothstep(1500.0,7000.0,uCam.y));
  col = mix(col,uFoamColor,foam);

  // Gelombang cahaya lembut di permukaan laut.
  float pd = length(mapXZ-uPulseC);
  for(int i=0;i<3;i++){
    if(uPulse[i].y>0.0){
      float x = (pd-uPulse[i].x)/uPulse[i].z;
      col += uPulseColor*exp(-x*x)*uPulse[i].y;
    }
  }

  float fogF = smoothstep(uFogNear,uFogFar,dist);
  col = mix(col,uFogColor,fogF);
  gl_FragColor = vec4(col,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const makeGrid = () => {
  const rings = 84;
  const seg = 180;
  const pos: number[] = [];
  const idx: number[] = [];
  const rOf = (i: number) => (i === 0 ? 0 : 6 * (Math.exp(i * 0.1155) - 1));
  for (let i = 0; i <= rings; i++) {
    const r = rOf(i);
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      pos.push(Math.cos(a) * r, 0, Math.sin(a) * r);
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * seg + j;
      const b = i * seg + ((j + 1) % seg);
      const c = (i + 1) * seg + j;
      const d = (i + 1) * seg + ((j + 1) % seg);
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
};

let grid: THREE.BufferGeometry | null = null;

const toMapMatrix = (xf: WorldXf) => {
  const c = Math.cos(xf.theta);
  const s = Math.sin(xf.theta);
  // peta = R(-theta) * (dunia - p) - t, cocok dengan worldToMap().
  return new THREE.Matrix3().set(
    c, -s, -c * xf.p[0] + s * xf.p[1] - xf.t[0],
    s, c, -s * xf.p[0] - c * xf.p[1] - xf.t[1],
    0, 0, 1,
  );
};

export type Pulse = { radius: number; strength: number; width: number };

export const Ocean: React.FC<{
  preset: SkyPreset;
  cam: CamState;
  /** Radius 0 = area pulau belum muncul (dipakai peta scene 2). */
  shallows: [number, number, number][];
  xf?: WorldXf;
  fog?: { color: string; near: number; far: number };
  amp?: number;
  pulses?: Pulse[];
  pulseCenter?: [number, number];
}> = ({ preset, cam, shallows, xf = NO_XF, fog, amp = 1.1, pulses, pulseCenter }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const geometry = useMemo(() => (grid ??= makeGrid()), []);
  const material = useMemo(() => {
    const f = fog ?? preset.fog;
    return new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uOffset: { value: new THREE.Vector2() },
        uCam: { value: new THREE.Vector3() },
        uAmp: { value: amp },
        uDeep: { value: new THREE.Color(preset.deep) },
        uMid: { value: new THREE.Color(preset.mid) },
        uShallow: { value: new THREE.Color(preset.shallow) },
        uFoamColor: { value: new THREE.Color(preset.foam) },
        uFoam: { value: 1 },
        uCloudShadow: { value: preset.cloudShadow },
        uTop: { value: new THREE.Color(preset.top) },
        uHorizon: { value: new THREE.Color(preset.horizon) },
        uSunColor: { value: new THREE.Color(preset.sunColor) },
        uSunDir: { value: new THREE.Vector3(...preset.sunDir) },
        uFogColor: { value: new THREE.Color(f.color) },
        uFogNear: { value: f.near },
        uFogFar: { value: f.far },
        uIsl: { value: Array.from({ length: 8 }, () => new THREE.Vector3(0, 0, 1)) },
        uIslCount: { value: 0 },
        uShore: { value: shoreTexture },
        uShoreBox: {
          value: new THREE.Vector4(SHORE_BOX.minX, SHORE_BOX.minZ, SHORE_BOX.sizeX, SHORE_BOX.sizeZ),
        },
        uShoreRange: { value: SHORE_RANGE },
        uToMap: { value: toMapMatrix(xf) },
        uPulse: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
        uPulseC: { value: new THREE.Vector2() },
        uPulseColor: { value: new THREE.Color("#35E6C8").multiplyScalar(0.9) },
      },
    });
  }, [preset, fog, amp, xf]);

  useLayoutEffect(() => {
    const u = material.uniforms;
    u.uTime.value = frame / fps;
    u.uOffset.value.set(cam.pos[0], cam.pos[2]);
    u.uCam.value.set(...cam.pos);
    u.uIslCount.value = Math.min(8, shallows.length);
    shallows.slice(0, 8).forEach((s, i) => {
      u.uIsl.value[i].set(s[0], s[1], Math.max(1, s[2]));
    });
    if (pulseCenter) u.uPulseC.value.set(...pulseCenter);
    for (let i = 0; i < 3; i++) {
      const p = pulses?.[i];
      u.uPulse.value[i].set(p?.radius ?? 0, p?.strength ?? 0, Math.max(1, p?.width ?? 1));
    }
  }, [material, frame, fps, cam, shallows, pulses, pulseCenter]);

  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
};
