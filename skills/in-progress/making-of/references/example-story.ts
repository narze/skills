// Worked example: the final Pinfloat making-of story. The agent in that thread was Codex, so tags say "CODEX · ...".
// Copy its tone: verbatim user prompts, first-person agent actions, honest status pills,
// real emulator screenshots where they existed, and one labelled mockup for the plan.
import type { Story } from "../assets/template/src/story";

export const story: Story = {
  id: "PinfloatStory",
  app: "Pinfloat",
  agent: "Codex",
  tagline: "A floating Android browser, built in one chat. Your prompts on the right, my actions on the left.",
  fps: 60,
  chapters: [
  {
    label: "01 / THE IDEA",
    title: "A floating browser, inspired by Pood.",
    messages: [
      { from: "you", tag: "YOU", text: "plan to create an android app which uses bubble display on top (see Pood project for reference) but it will be a small web broser that could pin urls) $grill-me" },
      { from: "agent", tag: "CODEX · QUESTIONS", skill: "$grill-me", text: "Q1. Is the main use case checking a website while staying in another app?\nQ2. Does “pin URLs” mean saving favorite sites inside one browser bubble?\nQ3. Should the first version be for your own daily use, installed directly on your phone?" },
      { from: "status", text: "PLAN THE APP TOGETHER  ·  THEN BUILD" },
    ],
  },
  {
    label: "02 / THE PRODUCT SHAPE",
    title: "You settled the details, round by round.",
    messages: [
      { from: "you", tag: "YOU", text: "1-3 yes" },
      { from: "agent", tag: "CODEX · QUESTIONS", skill: "$grill-me", text: "Q4. Should switching pinned sites preserve each page’s position and unfinished input?\nQ5. Should v1 support typing into websites and staying logged in?\nQ6. Should you be able to pin a URL by pasting it inside the app or sharing it from another browser?\nQ7. Should the expanded panel be movable and resizable?\nQ8. Is handing difficult pages off to your regular browser acceptable for v1?" },
      { from: "you", tag: "YOU", text: "Yes, agree all." },
      { from: "agent", tag: "CODEX · QUESTIONS", skill: "$grill-me", text: "Q9. Should collapsed pages pause media and background activity where possible?\nQ10. Should dismissing the bubble stop the browser but keep your pins and logins?\nQ11. Should a pin’s saved address stay fixed when you follow links?\nQ12. Should the bubble appear only after you explicitly start it?\nQ13. Can we define success around your actual phone and two websites first?" },
      { from: "you", tag: "YOU", text: "Yes, agree all." },
      { from: "agent", tag: "CODEX · QUESTIONS", skill: "$grill-me", text: "Q14. Should tapping outside the expanded panel collapse it?\nQ15. Should the browser include an address bar, Back, Forward, Reload, and “Go to pinned URL”?\nQ16. Should pins and browsing data stay entirely on the device?\nQ17. Should v1 support portrait and landscape, remembering the panel size and bubble position?\nQ18. Should delivery include an installable APK and a short device test checklist?" },
      { from: "you", tag: "YOU", text: "Yes, agree all." },
      { from: "agent", tag: "CODEX · ACTION", text: "The plan became one user-started bubble, saved pins, resumable pages, and private on-device data.", images: [{ src: "shots/plan-mockup.jpg", ratio: 1080 / 2400, mockup: true, caption: "What the plan described: one bubble and a small pinned browser over your chat" }] },
    ],
  },
  {
    label: "03 / THE GREEN LIGHT",
    title: "Then came the build prompt.",
    messages: [
      { from: "you", tag: "YOU", text: "yes, lets do it $implement" },
      { from: "agent", tag: "CODEX · ACTION", text: "I checked the Android tools and Pood’s project, then built Pinfloat with a floating service, browser panel, and WebView sessions.", images: [{ src: "shots/first-overlay.jpg", ratio: 1080 / 2400, caption: "Android 16 emulator · the first floating panel" }] },
      { from: "status", text: "KOTLIN  ·  ANDROID  ·  WEBVIEW" },
    ],
  },
  {
    label: "04 / THE TEST BOUNDARY",
    title: "You made the test scope clear.",
    messages: [
      { from: "agent", tag: "CODEX · QUESTION", skill: "$implement → TDD skill", text: "The TDD skill requires agreement on test boundaries. May I test pin management/URL validation and session lifecycle rules through their public interfaces, then verify Android keyboard, overlays, and WebView behavior on an emulator? These catch data and lifecycle mistakes; actual website compatibility still needs your target sites." },
      { from: "you", tag: "YOU", text: "Prioritize only end-to-end Android tests" },
      { from: "agent", tag: "CODEX · ACTION", text: "I kept the checks end-to-end: use the app, the overlay, and real WebViews on Android emulators.", images: [{ src: "shots/typing-draft.jpg", ratio: 1080 / 2400, caption: "Android 16 emulator · a test typing a draft inside the panel" }] },
      { from: "status", text: "PIN EDITING  ·  KEYBOARD  ·  OVERLAY  ·  BROWSER" },
    ],
  },
  {
    label: "05 / THE DEBUG LOOP",
    title: "The emulator found what needed fixing.",
    messages: [
      { from: "you", tag: "YOU", text: "resume" },
      { from: "agent", tag: "CODEX · ACTION", text: "I picked up the interrupted run and traced pin-editor, keyboard, landscape, and Android 10 layout failures to their causes.", images: [{ src: "shots/fail-landscape-keyboard.jpg", ratio: 2400 / 1080, caption: "Failure · the keyboard squashed the panel in landscape" }, { src: "shots/fail-api29-clipped.jpg", ratio: 1080 / 2280, caption: "Failure · Android 10 panel off the screen edge" }] },
      { from: "status", text: "REPRODUCE  →  TRACE  →  FIX  →  RERUN" },
      { from: "agent", tag: "CODEX · ACTION", text: "The fixes landed, then I reran all five journeys on both emulator versions." },
    ],
  },
  {
    label: "06 / THE CHECKPOINT",
    title: "Five journeys passed on two Android versions.",
    messages: [
      { from: "status", text: "ANDROID 10 / API 29   ✓   ANDROID 16 / API 36   ✓" },
      { from: "agent", tag: "CODEX · ACTION", text: "All five end-to-end journeys passed. Build and lint passed, and I packaged the debug APK.", images: [{ src: "shots/pass-api36-browser.jpg", ratio: 1080 / 2400, caption: "Passing · Android 16 browser" }, { src: "shots/pass-api29-landscape-keyboard.jpg", ratio: 2280 / 1080, caption: "Passing · Android 10 landscape with keyboard" }] },
      { from: "status", text: "YOUR PHONE + TARGET SITES: STILL UNCHECKED" },
    ],
  },
  {
    label: "07 / THE HANDOFF",
    title: "You asked for a private download link.",
    messages: [
      { from: "you", tag: "YOU", text: "expose apk on tailnet so I can download it" },
      { from: "agent", tag: "CODEX · ACTION", text: "I served the APK over Tailscale, downloaded it through the tailnet URL, and checked its hash against the local file." },
      { from: "status", text: "TAILNET ONLY  ·  DOWNLOAD VERIFIED" },
    ],
  },
  {
    label: "08 / THE RECAP",
    title: "You wanted the prompts preserved.",
    messages: [
      { from: "you", tag: "YOU", text: "Summarize our conversation, including turns with my exact prompts" },
      { from: "agent", tag: "CODEX · ACTION", text: "I wrote a recap. It missed how the app actually took shape, so I went back to the source thread for the prompt-by-prompt timeline." },
      { from: "status", text: "THE ORIGINAL THREAD  ·  TURN ORDER RESTORED" },
    ],
  },
  {
    label: "09 / THE VIDEO",
    title: "You asked for a video to share.",
    messages: [
      { from: "you", tag: "YOU", text: "make Remotion short video to share" },
      { from: "agent", tag: "CODEX · ACTION", text: "I turned this build chat into the replay you’re watching: your prompts and my actions, turn by turn." },
    ],
  },
],
};
