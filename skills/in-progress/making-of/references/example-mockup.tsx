import React from "react";
import { AbsoluteFill } from "remotion";

// What the agreed plan described, before any code: a chat app underneath, one floating bubble,
// and an expanded panel with pin tabs, address bar and browser controls. Colors follow DESIGN.md.
const M = {
  primary: "#1b6a88",
  surface: "#f1f5f8",
  ink: "#1d2730",
  secondary: "#55636e",
  line: "#d6dee4",
};

const chat = [
  { mine: false, text: "Did the deploy finish?" },
  { mine: true, text: "Checking the dashboard…" },
  { mine: false, text: "Also the status page pls" },
  { mine: true, text: "One sec" },
];

export const PlanMockup: React.FC = () => (
  <AbsoluteFill style={{ background: "#fff", fontFamily: "Arial, Helvetica, sans-serif", color: M.ink }}>
    <div style={{ height: 90, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", fontSize: 36, color: M.secondary }}>
      <span>9:41</span>
      <span>▾ ▴ ▮</span>
    </div>
    <div style={{ height: 150, display: "flex", alignItems: "center", gap: 28, padding: "0 48px", borderBottom: `2px solid ${M.line}` }}>
      <div style={{ width: 90, height: 90, borderRadius: 45, background: "#d9c7f2" }} />
      <div style={{ fontSize: 46, fontWeight: 700 }}>Team chat</div>
    </div>
    <div style={{ position: "absolute", left: 48, right: 48, bottom: 260, display: "flex", flexDirection: "column", gap: 28 }}>
      {chat.map((m) => (
        <div key={m.text} style={{ alignSelf: m.mine ? "flex-end" : "flex-start", maxWidth: 700, borderRadius: 36, padding: "26px 36px", fontSize: 40, background: m.mine ? "#dbe9f2" : "#eef0f2" }}>{m.text}</div>
      ))}
    </div>
    <div style={{ position: "absolute", left: 48, right: 48, bottom: 80, height: 120, borderRadius: 60, border: `2px solid ${M.line}`, display: "flex", alignItems: "center", padding: "0 44px", fontSize: 38, color: M.secondary }}>Message</div>

    <div style={{ position: "absolute", left: 60, top: 330, width: 860, height: 1240, borderRadius: 32, background: "#fff", boxShadow: "0 24px 70px #0b1a2440", border: `2px solid ${M.line}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 110, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", fontSize: 36, color: M.secondary }}>
        <span>⠿ Pinfloat</span>
        <span style={{ position: "absolute", right: 40, letterSpacing: 30 }}>– ×</span>
      </div>
      <div style={{ display: "flex", gap: 18, padding: "0 32px 22px" }}>
        {["Dashboard", "Status", "Docs"].map((pin, i) => (
          <div key={pin} style={{ borderRadius: 40, padding: "18px 34px", fontSize: 34, fontWeight: 700, background: i === 0 ? M.primary : M.surface, color: i === 0 ? "#fff" : M.ink }}>{pin}</div>
        ))}
      </div>
      <div style={{ margin: "0 32px", height: 96, borderRadius: 20, background: M.surface, display: "flex", alignItems: "center", padding: "0 30px", fontSize: 34, color: M.secondary }}>dashboard.example.com/deploys</div>
      <div style={{ display: "flex", justifyContent: "space-around", padding: "22px 32px", fontSize: 44, color: M.secondary }}>
        <span>←</span><span>→</span><span>↻</span><span>⌂</span><span>↗</span>
      </div>
      <div style={{ flex: 1, background: M.surface, margin: "0 32px", borderRadius: 20, padding: 40, display: "flex", flexDirection: "column", gap: 30 }}>
        <div style={{ fontSize: 46, fontWeight: 800 }}>Deploys</div>
        {["api · production", "web · production", "worker · staging"].map((row, i) => (
          <div key={row} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", borderRadius: 18, padding: "28px 30px", fontSize: 34 }}>
            <span>{row}</span>
            <span style={{ color: i === 2 ? "#b4502f" : "#2c7a4b", fontWeight: 800 }}>{i === 2 ? "running" : "done"}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18, height: 220, padding: "0 10px" }}>
          {[50, 80, 65, 120, 90, 150, 110, 170].map((h, i) => (
            <div key={i} style={{ flex: 1, height: h, borderRadius: 8, background: M.primary, opacity: 0.35 + i * 0.07 }} />
          ))}
        </div>
      </div>
      <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 36px", fontSize: 30, color: M.secondary }}>Resize ◢</div>
    </div>

    <div style={{ position: "absolute", right: 36, top: 1650, width: 150, height: 150, borderRadius: 75, background: M.primary, color: "#fff", display: "grid", placeItems: "center", fontSize: 70, fontWeight: 800, boxShadow: "0 14px 40px #0b1a2450" }}>P</div>
  </AbsoluteFill>
);
