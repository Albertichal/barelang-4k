import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import React from "react";
import {
  AbsoluteFill,
  Audio,
  getStaticFiles,
  interpolate,
  Sequence,
  staticFile,
} from "remotion";
import { Cue, Finish, Subtitles } from "./components/Overlay";
import { SceneTiming, TRANSITION } from "./lib/timeline";
import { Scene01 } from "./scenes/Scene01";
import { Scene02 } from "./scenes/Scene02";
import { Scene03 } from "./scenes/Scene03";
import { Scene04 } from "./scenes/Scene04";
import { Scene05 } from "./scenes/Scene05";
import { Scene06 } from "./scenes/Scene06";
import { Scene07 } from "./scenes/Scene07";

export type VideoProps = {
  timeline: SceneTiming[];
  cues: Cue[];
  hasVoice: boolean;
  /** true kalau ada scene yang memakai ElevenLabs (paket gratis wajib atribusi). */
  voiceCredit: boolean;
};

type SceneProps = { duration: number; voiceCredit?: boolean };

// Lapisan suara lingkungan: from/to = bagian dari durasi scene, vol = gain relatif.
// File dinormalkan ke -24 LUFS; SFX_GAIN membuatnya sekitar -20 dB di bawah narasi.
const SFX_GAIN = 0.25;
type Bed = { file: string; from?: number; to?: number; vol: number };
const BEDS: Bed[][] = [
  [{ file: "waves.mp3", vol: 1 }, { file: "wind.mp3", vol: 0.6 }],
  [{ file: "waves.mp3", vol: 0.5 }, { file: "wind.mp3", vol: 0.4 }],
  [
    { file: "pencil.mp3", to: 0.52, vol: 1 },
    { file: "paper.mp3", to: 0.52, vol: 0.6 },
    { file: "waves.mp3", from: 0.52, vol: 0.6 },
  ],
  [{ file: "metal.mp3", vol: 0.8 }, { file: "waves.mp3", vol: 0.5 }],
  [{ file: "waves.mp3", vol: 0.9 }, { file: "wind.mp3", vol: 0.5 }, { file: "gull.mp3", from: 0.05, to: 0.75, vol: 0.5 }],
  [{ file: "waves.mp3", vol: 1 }, { file: "wind.mp3", vol: 0.7 }],
  [{ file: "wind.mp3", vol: 0.7 }, { file: "waves.mp3", vol: 0.4 }],
];

const SCENES: React.FC<SceneProps>[] = [Scene01, Scene02, Scene03, Scene04, Scene05, Scene06, Scene07];

const PRESENTATIONS = [
  () => fade(),
  () => wipe({ direction: "from-right" }),
  () => fade(),
  () => wipe({ direction: "from-left" }),
  () => fade(),
  () => fade(),
];

const has = (name: string) => getStaticFiles().some((f) => f.name === name);

const musicVolume = (frame: number, timeline: SceneTiming[]) => {
  // Jarak ke narasi terdekat menentukan tingkat ducking.
  let dist = Infinity;
  for (const s of timeline) {
    const end = s.voStart + s.voFrames;
    if (frame >= s.voStart && frame <= end) dist = 0;
    else dist = Math.min(dist, Math.abs(frame - s.voStart), Math.abs(frame - end));
  }
  return interpolate(dist, [0, 18], [0.15, 0.4], { extrapolateRight: "clamp" });
};

export const Video: React.FC<VideoProps> = ({ timeline, cues, hasVoice, voiceCredit }) => {
  const music = has("music.mp3");
  const whoosh = has("sfx/whoosh.mp3");
  return (
    <AbsoluteFill style={{ background: "#0B2545" }}>
      <TransitionSeries>
        {SCENES.flatMap((Scene, i) => {
          const seq = (
            <TransitionSeries.Sequence key={`s${i}`} durationInFrames={timeline[i].duration}>
              <Scene duration={timeline[i].duration} voiceCredit={voiceCredit} />
            </TransitionSeries.Sequence>
          );
          if (i === SCENES.length - 1) return [seq];
          return [
            seq,
            <TransitionSeries.Transition
              key={`t${i}`}
              presentation={PRESENTATIONS[i]() as ReturnType<typeof fade>}
              timing={linearTiming({ durationInFrames: TRANSITION })}
            />,
          ];
        })}
      </TransitionSeries>

      <Subtitles cues={cues} />
      <Finish />

      {hasVoice
        ? timeline.map((s, i) => (
            <Sequence key={i} from={s.voStart} durationInFrames={s.voFrames + 15} layout="none">
              <Audio src={staticFile(`vo/scene${String(i + 1).padStart(2, "0")}.mp3`)} />
            </Sequence>
          ))
        : null}

      {whoosh
        ? timeline.slice(1).map((s, i) => (
            <Sequence key={i} from={Math.max(0, s.start - 4)} durationInFrames={40} layout="none">
              <Audio src={staticFile("sfx/whoosh.mp3")} volume={0.5} />
            </Sequence>
          ))
        : null}

      {timeline.flatMap((s, i) =>
        BEDS[i]
          .filter((b) => has(`sfx/${b.file}`))
          .map((b, k) => {
            const from = s.start + Math.round((b.from ?? 0) * s.duration);
            const dur = Math.round(((b.to ?? 1) - (b.from ?? 0)) * s.duration);
            return (
              <Sequence key={`${i}-${k}`} from={from} durationInFrames={dur} layout="none">
                <Audio
                  src={staticFile(`sfx/${b.file}`)}
                  loop
                  volume={(f) =>
                    b.vol *
                    SFX_GAIN *
                    interpolate(f, [0, 24, dur - 24, dur], [0, 1, 1, 0], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    })
                  }
                />
              </Sequence>
            );
          }),
      )}

      {music ? (
        <Audio
          src={staticFile("music.mp3")}
          loop
          volume={(f) => musicVolume(f, timeline)}
        />
      ) : null}
    </AbsoluteFill>
  );
};
