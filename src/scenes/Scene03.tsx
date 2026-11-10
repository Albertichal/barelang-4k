import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { BarelangWorld, Title3D } from "../components/BarelangWorld";
import { BoxItem, Boxes, CylItem, Cylinders } from "../components/Instances";
import { Ocean, Pulse } from "../components/Ocean";
import { Heading, Reveal } from "../components/Overlay";
import { Stage } from "../components/Stage";
import { CamKey, CamState, V3, projectToScreen, sampleCam, withSway } from "../lib/camera";
import { PALETTE } from "../lib/data";
import { PRESETS } from "../lib/presets";
import { CHAIN_CENTER, ISLANDS, Island, OCEAN_SHALLOWS, PLACEMENTS, heightFnOf } from "../lib/world";

const DESK_SCALE = 1 / 18;
const [cx, cz] = CHAIN_CENTER;
const toDesk = (x: number, z: number): [number, number] => [(x - cx) * DESK_SCALE, (z - cz) * DESK_SCALE];

const paperMat = new THREE.ShaderMaterial({
  vertexShader: `varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
  fragmentShader: `varying vec2 vP;
  float line(vec2 p,float s,float w){ vec2 g=abs(fract(p/s-.5)-.5)/fwidth(p/s); return 1.-min(min(g.x,g.y)/w,1.); }
  void main(){
    float a=line(vP,8.,1.0)*.22+line(vP,40.,1.6)*.5;
    vec3 c=mix(vec3(.035,.13,.33),vec3(.6,.78,.95),a);
    gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});

/** Garis pantai asli tiap pulau, dari fungsi tinggi yang sama dengan dunia 3D. */
const outlineOf = (isl: Island): V3[] => {
  const h = heightFnOf(isl);
  const n = 72;
  const pts: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const dx = Math.cos(a) * isl.rx;
    const dz = Math.sin(a) * isl.rz;
    let lo = 0.25;
    let hi = 1.3;
    for (let k = 0; k < 12; k++) {
      const m = (lo + hi) / 2;
      if (h(isl.c[0] + dx * m, isl.c[1] + dz * m).h > 0) lo = m;
      else hi = m;
    }
    const [x, z] = toDesk(isl.c[0] + dx * lo, isl.c[1] + dz * lo);
    pts.push([x, 0.5, z]);
  }
  return pts;
};

type DeskSeg = { a: V3; b: V3; r: number; kind: "outline" | "bridge"; pivot: V3; island: number };

const buildDesk = () => {
  const segs: DeskSeg[] = [];
  const marks: { at: number; index: number; kind: "island" | "bridge"; p: V3 }[] = [];
  ISLANDS.forEach((isl, i) => {
    const out = outlineOf(isl);
    const [cxd, czd] = toDesk(isl.c[0], isl.c[1]);
    const pivot: V3 = [cxd, 0.5, czd];
    marks.push({ at: segs.length, index: i, kind: "island", p: pivot });
    for (let k = 0; k < out.length - 1; k++) {
      segs.push({ a: out[k], b: out[k + 1], r: 0.42, kind: "outline", pivot, island: i });
    }
    const pl = PLACEMENTS[i];
    if (pl) {
      const [ax, az] = toDesk(pl.a[0], pl.a[1]);
      const [bx, bz] = toDesk(pl.b[0], pl.b[1]);
      marks.push({ at: segs.length, index: i, kind: "bridge", p: [(ax + bx) / 2, 0.5, (az + bz) / 2] });
      const n = 6;
      for (let k = 0; k < n; k++) {
        const u0 = k / n;
        const u1 = (k + 1) / n;
        segs.push({
          a: [ax + (bx - ax) * u0, 0.7, az + (bz - az) * u0],
          b: [ax + (bx - ax) * u1, 0.7, az + (bz - az) * u1],
          r: 0.95,
          kind: "bridge",
          pivot: [ax, 0.7, az],
          island: i,
        });
      }
    }
  });
  return { segs, marks };
};

const whiteMat = new THREE.MeshBasicMaterial({ color: "#F4F9FF" });
const rulerMat = new THREE.MeshStandardMaterial({
  color: "#EAD9AE",
  roughness: 0.55,
  transparent: true,
  opacity: 0.88,
});
const pencilMat = new THREE.MeshStandardMaterial({ color: "#E8B23A", roughness: 0.5 });
const leadMat = new THREE.MeshStandardMaterial({ color: "#3A332C", roughness: 0.6 });
const metalMat = new THREE.MeshStandardMaterial({ color: "#D8DEE4", roughness: 0.4, metalness: 0.15 });
const tableMat = new THREE.MeshStandardMaterial({ color: "#3B2A1E", roughness: 0.8 });

const lerp3 = (a: V3, b: V3, k: number): V3 => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
];

const PartA: React.FC<{ p: number; frame: number }> = ({ p, frame }) => {
  const preset = PRESETS.day;
  const cam: CamState = useMemo(
    () =>
      withSway(
        {
          pos: [-400 + p * 30, 300 - p * 40, -150 + p * 280],
          look: [20, 0, -40 + p * 90],
          fov: 40,
        },
        frame,
        0.4,
      ),
    [p, frame],
  );
  const { segs, marks } = useMemo(buildDesk, []);
  const drawn = Math.min(1, p / 0.9) * segs.length;
  const items = useMemo<CylItem[]>(
    () =>
      segs.map((s, i) => {
        const k = Math.min(1, Math.max(0, drawn - i));
        return { a: s.a, b: lerp3(s.a, s.b, k), r: s.r, color: "#ffffff" };
      }),
    [segs, drawn],
  );

  const idx = Math.min(segs.length - 1, Math.floor(drawn));
  const cur = segs[idx];
  const tip = lerp3(cur.a, cur.b, Math.min(1, drawn - idx));
  const dx = cur.b[0] - cur.a[0];
  const dz = cur.b[2] - cur.a[2];

  // Penggaris sejajar arah menuju jembatan berikutnya (berputar pelan, tidak mengikuti tiap segmen).
  const nextPl = PLACEMENTS[Math.min(5, cur.island)];
  const [ax, az] = toDesk(nextPl.a[0], nextPl.a[1]);
  const [bx, bz] = toDesk(nextPl.b[0], nextPl.b[1]);
  const ang = cur.kind === "bridge" ? Math.atan2(dz, dx) : Math.atan2(bz - az, bx - ax);
  const ruler = useMemo<BoxItem[]>(() => {
    const px = -Math.sin(ang) * 13;
    const pz = Math.cos(ang) * 13;
    const items: BoxItem[] = [];
    const cxr = tip[0] + px;
    const czr = tip[2] + pz;
    for (let t = -56; t <= 56; t += 8) {
      const major = t % 40 === 0;
      const off = major ? 3.3 : 4.3;
      items.push({
        p: [cxr + Math.cos(ang) * t + Math.sin(ang) * off, 1.86, czr + Math.sin(ang) * t - Math.cos(ang) * off],
        s: [0.3, 0.05, major ? 5 : 3],
        r: [0, -ang, 0],
        color: "#3A332C",
      });
    }
    return items;
  }, [tip, ang]);

  const hinge: V3 = [
    (cur.pivot[0] + tip[0]) / 2,
    Math.max(26, 42 - Math.hypot(tip[0] - cur.pivot[0], tip[2] - cur.pivot[2]) * 0.3),
    (cur.pivot[2] + tip[2]) / 2,
  ];
  const compass: CylItem[] = [
    { a: hinge, b: cur.pivot, r: 0.9 },
    { a: hinge, b: tip, r: 0.9 },
  ];
  const pencilTop: V3 = [tip[0] + 15, 48, tip[2] - 9];
  const toPencil = new THREE.Vector3(pencilTop[0] - tip[0], pencilTop[1] - tip[1], pencilTop[2] - tip[2]);
  const len = toPencil.length();
  const pencilQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), toPencil.normalize());
  const pencilEuler = new THREE.Euler().setFromQuaternion(pencilQ);

  return (
    <Stage preset={preset} cam={cam} noSky background="#2A1C13" fog={{ color: "#2A1C13", near: 1500, far: 3800 }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.4, 0]} material={tableMat}>
        <planeGeometry args={[4200, 4200]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={paperMat}>
        <planeGeometry args={[430, 800]} />
      </mesh>
      <Cylinders items={items} material={whiteMat} />
      {marks.map((m) => {
        const on = drawn >= m.at;
        if (!on) return null;
        const label = m.kind === "island" ? ISLANDS[m.index].name.toUpperCase() : String(m.index + 1);
        const isl = ISLANDS[m.index];
        // Nama pulau kecil diletakkan di luar garis pantai supaya tidak menimpa gambar.
        const offset = m.kind === "bridge" ? 24 : isl.rx > 800 ? -2 : -(isl.rx * DESK_SCALE + 11);
        return (
          <group key={`${m.kind}${m.index}`} rotation={[0, -Math.PI / 2, 0]}>
            <Title3D
              text={label}
              size={m.kind === "island" ? 10 : 15}
              depth={0.05}
              position={[m.p[2], 0.9, -(m.p[0] + offset)]}
              rotation={[-Math.PI / 2, 0, 0]}
              color={m.kind === "island" ? "#CFE6FF" : "#F4A261"}
              emissive={m.kind === "island" ? "#7FB6E8" : "#F4A261"}
              emissiveIntensity={0.7}
              metalness={0}
            />
          </group>
        );
      })}
      <group position={[tip[0] - Math.sin(ang) * 13, 1, tip[2] + Math.cos(ang) * 13]} rotation={[0, -ang, 0]}>
        <mesh material={rulerMat}>
          <boxGeometry args={[130, 1.6, 15]} />
        </mesh>
      </group>
      <Boxes items={ruler} />
      <Cylinders items={compass} material={metalMat} />
      <mesh position={hinge} material={metalMat}>
        <sphereGeometry args={[2.2, 16, 12]} />
      </mesh>
      <group position={tip} rotation={pencilEuler}>
        <mesh position={[0, 3, 0]} material={leadMat}>
          <coneGeometry args={[1.5, 6, 12]} />
        </mesh>
        {/* Kerucut dibalik: ujung runcing menghadap kertas. */}
        <mesh position={[0, len / 2 + 3, 0]} material={pencilMat}>
          <cylinderGeometry args={[1.5, 1.5, len - 6, 12]} />
        </mesh>
      </group>
    </Stage>
  );
};

const MAP_KEYS: CamKey[] = [
  { t: 0, pos: [cx - 8200, 8800, cz - 1500], look: [cx, 0, cz - 1100], fov: 36 },
  { t: 1, pos: [cx - 9900, 10000, cz + 700], look: [cx, 0, cz + 300], fov: 36 },
];
const BATAM = ISLANDS[0];
const MAX_RING = Math.hypot(ISLANDS[5].c[0] - BATAM.c[0], ISLANDS[5].c[1] - BATAM.c[1]) * 1.2;
const MAP_FOG = { color: PRESETS.day.fog.color, near: 16000, far: 60000 };

const planProgress = (p: number) => PLACEMENTS.map((_, i) => Math.min(1, Math.max(0, (p - 0.2 - i * 0.1) / 0.13)));

const PartB: React.FC<{ p: number; frame: number }> = ({ p, frame }) => {
  const preset = PRESETS.day;
  const cam = useMemo(() => withSway(sampleCam(MAP_KEYS, p), frame, 4), [p, frame]);
  const pulses = useMemo<Pulse[]>(
    () =>
      [0, 0.17, 0.34].map((d) => {
        const q = Math.min(1, Math.max(0, (p - d) / 0.66));
        return {
          radius: q * MAX_RING,
          strength: q > 0 ? 0.2 * Math.sin(Math.min(1, q * 1.05) * Math.PI) ** 0.7 : 0,
          width: 130 + q * 300,
        };
      }),
    [p],
  );
  const plan = useMemo(() => ({ progress: planProgress(p), width: 58 }), [p]);
  return (
    <Stage preset={preset} cam={cam} fog={MAP_FOG}>
      <Ocean
        preset={preset}
        cam={cam}
        shallows={OCEAN_SHALLOWS}
        fog={MAP_FOG}
        pulses={pulses}
        pulseCenter={BATAM.c}
      />
      <BarelangWorld cam={cam} bridgeAppear={[0, 0, 0, 0, 0, 0]} plan={plan} />
    </Stage>
  );
};

const MapLabels: React.FC<{ p: number }> = ({ p }) => {
  const cam = sampleCam(MAP_KEYS, p);
  const items = [
    { i: 0, at: 0 },
    { i: 4, at: 0.34 },
    { i: 5, at: 0.5 },
  ];
  const planAt = PLACEMENTS[2];
  const plan = projectToScreen(cam, [planAt.mid[0], 60, planAt.mid[1]], 3840, 2160);
  const planO = interpolate(p, [0.32, 0.42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      {items.map(({ i, at }) => {
        const isl = ISLANDS[i];
        const s = projectToScreen(cam, [isl.c[0], 260, isl.c[1]], 3840, 2160);
        const o = interpolate(p, [at, at + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ position: "absolute", left: s.x, top: s.y, transform: "translate(-50%,-50%)", opacity: o }}>
            <Heading size={100} color={i === 0 ? PALETTE.white : PALETTE.gold}>
              {isl.name}
            </Heading>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: plan.x, top: plan.y - 170, transform: "translate(-50%,-50%)", opacity: planO }}>
        <Heading body size={52} color="#CFFFF4">
          Rencana jembatan
        </Heading>
      </div>
      <div style={{ position: "absolute", left: 170, top: 170 }}>
        <Reveal at={0}>
          <Heading size={118}>Wilayah pengembangan meluas</Heading>
          <Heading body size={70} color={PALETTE.gold} style={{ marginTop: 18 }}>
            Otorita Batam → Rempang &amp; Galang
          </Heading>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};

export const Scene03: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();
  const split = Math.round(duration * 0.52);
  const showA = frame < split;
  const p = showA ? frame / split : (frame - split) / (duration - split - 1);
  const flash = interpolate(frame, [split - 10, split, split + 10], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      {showA ? <PartA p={p} frame={frame} /> : <PartB p={p} frame={frame} />}
      {showA ? (
        <AbsoluteFill style={{ padding: "130px 170px" }}>
          <Reveal at={Math.round(split * 0.1)}>
            <Heading body size={70} color={PALETTE.teal}>
              DIGAGAS
            </Heading>
            <Heading size={168}>B.J. Habibie</Heading>
            <Heading body size={72} color={PALETTE.gold} style={{ marginTop: 10 }}>
              Ketua Otorita Batam
            </Heading>
          </Reveal>
        </AbsoluteFill>
      ) : (
        <MapLabels p={p} />
      )}
      <AbsoluteFill style={{ background: PALETTE.navy, opacity: flash, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
