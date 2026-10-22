import React from "react";
import {
  AbsoluteFill,
  Composition,
  Html5Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { story, type Chapter, type Message, type Shot } from "./story";

const { chapters } = story;
const FPS = story.fps ?? 30;
// Pacing constants below are written in 30fps frames; f() converts them to the story's fps.
const f = (frames30: number) => Math.round((frames30 * FPS) / 30);

const C = {
  ink: "#132018",
  paper: "#f8f8f3",
  canvas: "#e9eee7",
  green: "#c5f36a",
  assistant: "#ffffff",
  muted: "#748075",
  line: "#d5ddd3",
  orange: "#ff7448",
  sidebar: "#1b2a20",
};


type Item =
  | { kind: "intro"; at: number }
  | { kind: "divider"; at: number; chapter: number }
  // typeFrom: when the user's text starts appearing in the composer, before it is sent at `at`.
  | { kind: "message"; at: number; chapter: number; message: Message; typeFrom?: number };

const INTRO_HOLD = f(45);
const DIVIDER_HOLD = f(26);
const TYPING = f(14);
// User prompts are typed into the composer first: ~2 characters per 30fps frame, 0.5–1.8s.
const userTyping = (message: Message) => f(Math.min(54, Math.max(14, Math.round(message.text.length * 0.5))));
// The video ends 3s after the last turn appears.
const END_HOLD = f(90);

const isQuestions = (message: Message) => /^Q\d+\. /.test(message.text);

// Reading time; screenshots get extra time to be looked at.
const readFrames = (message: Message) =>
  f(
    message.from === "status"
      ? 30
      : 26 + Math.round(message.text.length * (isQuestions(message) ? 0.34 : 0.28)) + (message.images?.length ? 50 + 20 * message.images.length : 0),
  );

const buildTimeline = () => {
  const items: Item[] = [{ kind: "intro", at: 0 }];
  let cursor = INTRO_HOLD;
  chapters.forEach((chapter, chapterIndex) => {
    items.push({ kind: "divider", at: cursor, chapter: chapterIndex });
    cursor += DIVIDER_HOLD;
    chapter.messages.forEach((message) => {
      if (message.from === "agent") cursor += TYPING;
      const typeFrom = message.from === "you" ? cursor : undefined;
      if (message.from === "you") cursor += userTyping(message);
      items.push({ kind: "message", at: cursor, chapter: chapterIndex, message, typeFrom });
      cursor += readFrames(message);
    });
  });
  const lastAt = items[items.length - 1].at;
  return { items, duration: lastAt + END_HOLD };
};

const timeline = buildTimeline();

const appear = (frame: number, fps: number, at: number) =>
  spring({ frame: frame - at, fps, config: { damping: 19, stiffness: 120 } });

const fontSizeFor = (text: string) => (text.length > 300 ? 27 : text.length > 140 ? 30 : 34);

const SHOT_MAX_WIDTH = 830;
const SHOT_MAX_HEIGHT = 470;
const SHOT_GAP = 18;

// All shots in a row share one height, sized so the row fits the bubble.
const Shots: React.FC<{ shots: Shot[] }> = ({ shots }) => {
  const totalRatio = shots.reduce((sum, shot) => sum + shot.ratio, 0);
  const height = Math.min(SHOT_MAX_HEIGHT, (SHOT_MAX_WIDTH - SHOT_GAP * (shots.length - 1)) / totalRatio);
  return (
    <div style={{ display: "flex", gap: SHOT_GAP, marginTop: 16 }}>
      {shots.map((shot) => (
        <div key={shot.src} style={{ display: "flex", flexDirection: "column", gap: 8, width: height * shot.ratio }}>
          <div style={{ position: "relative", height, borderRadius: 18, overflow: "hidden", border: `2px solid ${C.line}`, background: C.paper }}>
            <Img src={staticFile(shot.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            {shot.mockup && <div style={{ position: "absolute", top: 12, left: 12, borderRadius: 99, background: C.orange, color: "#fff", padding: "5px 12px", fontSize: 14, fontWeight: 900, letterSpacing: 1.5 }}>MOCKUP</div>}
          </div>
          {shot.caption && <div style={{ fontSize: 15, lineHeight: 1.3, color: C.muted }}>{shot.caption}</div>}
        </div>
      ))}
    </div>
  );
};

const Bubble: React.FC<{ message: Message; p: number }> = ({ message, p }) => {
  const lift = interpolate(p, [0, 1], [26, 0]);
  if (message.from === "status") {
    return (
      <div style={{ display: "flex", justifyContent: "center", opacity: p, transform: `translateY(${lift}px)` }}>
        <div style={{ borderRadius: 99, background: "#dce5d9", color: "#566551", padding: "13px 26px", fontSize: 19, fontWeight: 900, letterSpacing: 1.8, whiteSpace: "pre" }}>{message.text}</div>
      </div>
    );
  }
  const isYou = message.from === "you";
  return (
    <div style={{ display: "flex", justifyContent: isYou ? "flex-end" : "flex-start", opacity: p, transform: `translateY(${lift}px)` }}>
      <div style={{ maxWidth: "68%", boxSizing: "border-box", borderRadius: isYou ? "28px 28px 8px 28px" : "28px 28px 28px 8px", background: isYou ? C.green : C.assistant, padding: "20px 28px 18px", boxShadow: "0 5px 17px #1b28180f" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <span style={{ color: isYou ? "#53643f" : C.orange, fontSize: 15, fontWeight: 900, letterSpacing: 2 }}>{message.tag}</span>
          {message.skill && <span style={{ borderRadius: 99, background: C.ink, color: C.green, padding: "5px 12px", fontSize: 14, fontWeight: 800, letterSpacing: 0.5 }}>⚙ FROM SKILL · {message.skill}</span>}
        </div>
        {isQuestions(message) ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 27, lineHeight: 1.28, letterSpacing: -0.3, fontWeight: 500, color: C.ink }}>
            {message.text.split("\n").map((line) => {
              const [number, ...rest] = line.split(" ");
              return (
                <div key={number} style={{ display: "flex", gap: 14 }}>
                  <span style={{ flexShrink: 0, minWidth: 58, color: C.orange, fontWeight: 900 }}>{number.replace(".", "")}</span>
                  <span>{rest.join(" ")}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ whiteSpace: "pre-wrap", fontSize: fontSizeFor(message.text), lineHeight: 1.3, letterSpacing: -0.3, fontWeight: isYou ? 700 : 500, color: C.ink }}>{message.text}</div>
        )}
        {message.images?.length ? <Shots shots={message.images} /> : null}
        <div style={{ textAlign: "right", color: isYou ? "#60724d" : "#a0a99e", fontSize: 14, marginTop: 8 }}>{isYou ? "sent ✓✓" : "delivered"}</div>
      </div>
    </div>
  );
};

const Divider: React.FC<{ chapter: Chapter; p: number }> = ({ chapter, p }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 22, opacity: p, padding: "18px 0 6px" }}>
    <div style={{ flex: 1, height: 1, background: C.line }} />
    <div style={{ borderRadius: 99, background: C.ink, color: C.paper, padding: "11px 24px", fontSize: 18, fontWeight: 800, letterSpacing: 1.6 }}>
      <span style={{ color: C.green }}>{chapter.label}</span>&nbsp; · &nbsp;{chapter.title.toUpperCase()}
    </div>
    <div style={{ flex: 1, height: 1, background: C.line }} />
  </div>
);

const Intro: React.FC = () => (
  <div style={{ minHeight: 850, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
    <div style={{ width: 120, height: 120, borderRadius: 40, display: "grid", placeItems: "center", background: C.green, color: C.ink, fontSize: 62, fontWeight: 900 }}>{story.app[0]}</div>
    <div style={{ fontSize: 50, fontWeight: 900, letterSpacing: -1.2 }}>The making of {story.app}</div>
    <div style={{ fontSize: 24, color: C.muted }}>{story.tagline}</div>
  </div>
);

// Each row grows from 0fr to 1fr, so the bottom-anchored column scrolls smoothly as the chat grows.
const Row: React.FC<{ p: number; children: React.ReactNode }> = ({ p, children }) => (
  <div style={{ display: "grid", gridTemplateRows: `${Math.min(1, Math.max(0, p))}fr` }}>
    <div style={{ overflow: "hidden", minHeight: 0 }}>
      <div style={{ paddingTop: 18 }}>{children}</div>
    </div>
  </div>
);

const Sfx: React.FC<{ at: number; name: string; volume: number; duration?: number }> = ({ at, name, volume, duration = f(20) }) => (
  <Sequence from={at} durationInFrames={duration} layout="none">
    <Html5Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

const SoundTrack: React.FC = () => (
  <>
    {timeline.items.map((item, index) => {
      if (item.kind === "intro") return null;
      if (item.kind === "divider") return <Sfx key={index} at={item.at} name="whoosh" volume={0.75} />;
      const { from } = item.message;
      if (from === "status") return <Sfx key={index} at={item.at} name="tick" volume={0.85} />;
      if (from === "you" && item.typeFrom !== undefined) {
        return (
          <React.Fragment key={index}>
            <Sfx at={item.typeFrom} name="keys" volume={0.55} duration={item.at - item.typeFrom} />
            <Sfx at={item.at} name="send" volume={1} />
          </React.Fragment>
        );
      }
      if (from === "you") return <Sfx key={index} at={item.at} name="send" volume={1} />;
      return (
        <React.Fragment key={index}>
          <Sfx at={item.at - TYPING} name="typing" volume={0.5} />
          <Sfx at={item.at} name="receive" volume={0.9} />
        </React.Fragment>
      );
    })}
  </>
);

const Replay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const visible = timeline.items.filter((item) => item.at <= frame);
  const current = visible.reduce((acc, item) => (item.kind === "intro" ? acc : item.chapter), 0);
  const next = timeline.items.find((item) => item.at > frame);
  const typing = next?.kind === "message" && next.message.from === "agent" && next.at - frame <= TYPING;
  const composing = next?.kind === "message" && next.typeFrom !== undefined && frame >= next.typeFrom ? next : undefined;
  const draft = composing
    ? composing.message.text.replace(/\s+/g, " ").slice(0, Math.ceil(composing.message.text.length * ((frame - composing.typeFrom!) / (composing.at - composing.typeFrom!))))
    : "";
  const caretOn = Math.floor(frame / f(8)) % 2 === 0;
  const progress = interpolate(frame, [0, durationInFrames - END_HOLD], [0, 100], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: C.canvas, color: C.ink, fontFamily: "Arial, Helvetica, sans-serif", overflow: "hidden", flexDirection: "row" }}>
      <SoundTrack />
      <div style={{ width: 470, background: C.sidebar, color: C.paper, display: "flex", flexDirection: "column", padding: "38px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "0 34px 30px" }}>
          <div style={{ width: 60, height: 60, borderRadius: 20, display: "grid", placeItems: "center", background: C.green, color: C.ink, fontSize: 30, fontWeight: 900 }}>{story.app[0]}</div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{story.app}</div>
            <div style={{ fontSize: 16, color: "#a3b1a2", marginTop: 4 }}>Build chat · {chapters.length} chapters</div>
          </div>
        </div>
        {chapters.map((chapter, i) => {
          const active = i === current;
          const done = i < current;
          return (
            <div key={chapter.label} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 34px", background: active ? "#2c3d31" : "transparent", borderLeft: `5px solid ${active ? C.green : "transparent"}`, opacity: done || active ? 1 : 0.45 }}>
              <div style={{ width: 30, height: 30, borderRadius: 15, display: "grid", placeItems: "center", fontSize: 15, fontWeight: 900, background: done ? C.green : active ? C.paper : "#3a4b3f", color: C.ink }}>{done ? "✓" : i + 1}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1.6, color: active ? C.green : "#a3b1a2" }}>{chapter.label}</div>
                <div style={{ fontSize: 18, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chapter.title}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ height: 104, background: C.ink, color: C.paper, display: "flex", alignItems: "center", gap: 20, padding: "0 44px", position: "relative", flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>{story.app} build chat</div>
            <div style={{ marginTop: 6, fontSize: 19, color: typing ? C.green : "#a3b1a2" }}>
              {typing ? `${story.agent} is typing…` : <>You &amp; {story.agent}&nbsp; · &nbsp;{chapters[current].label}</>}
            </div>
          </div>
          <div style={{ color: C.green, fontSize: 24, letterSpacing: 2 }}>•••</div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "#334238" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: C.green }} />
          </div>
        </div>

        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <AbsoluteFill style={{ backgroundImage: "radial-gradient(#92a18f 0.8px, transparent 0.8px)", backgroundSize: "19px 19px", opacity: 0.09 }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 70px 26px" }}>
            {visible.map((item, index) => {
              if (item.kind === "intro") return <Intro key="intro" />;
              const p = appear(frame, fps, item.at);
              return (
                <Row key={index} p={p}>
                  {item.kind === "divider" ? <Divider chapter={chapters[item.chapter]} p={p} /> : <Bubble message={item.message} p={p} />}
                </Row>
              );
            })}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 60, background: `linear-gradient(${C.canvas}, transparent)` }} />
        </div>

        <div style={{ height: 100, background: C.paper, borderTop: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 16, padding: "0 40px", flexShrink: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.green, display: "grid", placeItems: "center", fontSize: 26, fontWeight: 700 }}>＋</div>
          <div style={{ flex: 1, minWidth: 0, height: 58, border: `1px solid ${composing ? C.ink : C.line}`, borderRadius: 30, background: "#fff", display: "flex", alignItems: "center", padding: "0 24px", fontSize: 23, overflow: "hidden" }}>
            {composing ? (
              // An RTL box overflows to the left, so a long prompt keeps its newest characters visible;
              // the isolated LTR span keeps short drafts left-aligned and the text in normal order.
              <div style={{ flex: 1, minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", direction: "rtl", textAlign: "left", color: C.ink, fontWeight: 600 }}>
                <span style={{ direction: "ltr", unicodeBidi: "isolate" }}>
                  {draft}
                  <span style={{ display: "inline-block", width: 2, height: 26, marginLeft: 2, verticalAlign: "middle", background: caretOn ? C.ink : "transparent" }} />
                </span>
              </div>
            ) : (
              <span style={{ color: "#9aa397", fontSize: 21 }}>Message the build chat…</span>
            )}
          </div>
          <div style={{ width: 50, height: 50, borderRadius: 16, background: composing ? C.green : C.ink, color: composing ? C.ink : C.green, display: "grid", placeItems: "center", fontSize: 23 }}>↑</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ChatReplayComposition = () => (
  <Composition
    id={story.id}
    component={Replay}
    durationInFrames={timeline.duration}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
