import { getAudioDurationInSeconds } from "@remotion/media-utils";
import React from "react";
import { CalculateMetadataFunction, Composition, staticFile, Still } from "remotion";
import { Cue } from "./components/Overlay";
import { computeTimeline, FPS, SCENE_COUNT, totalFrames } from "./lib/timeline";
import { Debug, DebugProps } from "./Debug";
import { FontOptions } from "./FontOptions";
import { Video, VideoProps } from "./Video";

type CueFile = { scene: number; cues: { text: string; start: number; end: number }[] }[];

const calculateMetadata: CalculateMetadataFunction<VideoProps> = async ({ props }) => {
  let voSeconds = new Array<number>(SCENE_COUNT).fill(0);
  let raw: CueFile = [];
  let hasVoice = false;
  let voiceCredit = false;
  try {
    voSeconds = await Promise.all(
      Array.from({ length: SCENE_COUNT }, (_, i) =>
        getAudioDurationInSeconds(staticFile(`vo/scene${String(i + 1).padStart(2, "0")}.mp3`)),
      ),
    );
    raw = await (await fetch(staticFile("vo/cues.json"))).json();
    hasVoice = true;
    const meta = await fetch(staticFile("vo/meta.json")).catch(() => null);
    if (meta?.ok) {
      const { engines } = (await meta.json()) as { engines: Record<string, string> };
      voiceCredit = Object.values(engines).includes("elevenlabs");
    }
  } catch (err) {
    console.warn("Narasi belum ada, memakai durasi storyboard.", err);
  }
  const timeline = computeTimeline(voSeconds);
  const cues: Cue[] = raw.flatMap((s) =>
    s.cues.map((c, i) => {
      const base = timeline[s.scene - 1].voStart;
      const next = s.cues[i + 1];
      return {
        text: c.text,
        from: base + Math.round(c.start * FPS),
        to: base + Math.round((next ? next.start : c.end + 0.4) * FPS),
      };
    }),
  );
  return {
    durationInFrames: totalFrames(timeline),
    props: { ...props, timeline, cues, hasVoice, voiceCredit },
  };
};

export const RemotionRoot: React.FC = () => (
  <>
  <Still id="FontOptions" component={FontOptions} width={3840} height={2160} />
  <Still
    id="Debug"
    component={Debug}
    width={3840}
    height={2160}
    defaultProps={{ preset: "day", mode: "world", pos: [0, 400, 1200], look: [0, 0, 0], fov: 40, build: 1 } as DebugProps}
  />
  <Composition
    id="Barelang"
    component={Video}
    width={3840}
    height={2160}
    fps={FPS}
    durationInFrames={2850}
    defaultProps={{ timeline: computeTimeline([]), cues: [], hasVoice: false, voiceCredit: false }}
    calculateMetadata={calculateMetadata}
  />
  </>
);
