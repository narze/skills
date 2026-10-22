// The only file to edit per video. See SKILL.md for how to fill it from the thread,
// and references/example-story.ts for a complete worked example.

export type Message = {
  // "you" = the user's own words (verbatim). "agent" = what the agent asked or did.
  // "status" = a short centered pill for milestones and honest caveats.
  from: "you" | "agent" | "status";
  text: string;
  // Small caps label above the bubble, e.g. "YOU", "AGENT · ACTION", "AGENT · QUESTIONS".
  tag?: string;
  // Set when a skill generated the text rather than the user or agent writing it freely,
  // e.g. "$grill-me" or "$implement → TDD skill". Renders a "FROM SKILL" chip.
  skill?: string;
  // Screenshots (or labelled mockups) shown inside the bubble, from public/.
  images?: Shot[];
};

export type Shot = {
  src: string; // path under public/, e.g. "shots/first-overlay.jpg"
  ratio: number; // width / height, e.g. 1080 / 2400 for a portrait phone capture
  caption?: string; // where it came from: "Android 16 emulator · first floating panel"
  // True when this is a drawing of what was planned or described, not a real capture.
  mockup?: boolean;
};

export type Chapter = {
  label: string; // "01 / THE IDEA"
  title: string; // one short sentence, shown in the divider and sidebar
  messages: Message[];
};

export type Story = {
  id: string; // Remotion composition id, e.g. "PinfloatStory"
  app: string; // what was built; its first letter becomes the avatar
  agent: string; // the agent's display name in the thread, e.g. "Codex" or "Claude"
  tagline: string; // one line under the intro title
  fps?: number; // default 30; pacing is defined in seconds, so changing fps keeps the speed
  chapters: Chapter[];
};

export const story: Story = {
  id: "MakingOfStory",
  app: "Example",
  agent: "Claude",
  tagline: "An app, built in one chat. Your prompts on the right, my actions on the left.",
  chapters: [
    {
      label: "01 / THE IDEA",
      title: "Where it started.",
      messages: [
        { from: "you", tag: "YOU", text: "replace with the user's first prompt, verbatim" },
        // Lines starting "Q<n>. " render as a numbered question list.
        { from: "agent", tag: "AGENT · QUESTIONS", skill: "$grill-me", text: "Q1. First question headline?\nQ2. Second question headline?" },
        { from: "you", tag: "YOU", text: "1-2 yes" },
        {
          from: "agent",
          tag: "AGENT · ACTION",
          text: "First-person summary of what the agent did next.",
          // images: [{ src: "shots/first-run.jpg", ratio: 1080 / 2400, caption: "Emulator · first run" }],
        },
        { from: "status", text: "MILESTONE  ·  OR CAVEAT" },
      ],
    },
  ],
};
