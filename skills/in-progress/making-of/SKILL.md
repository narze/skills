---
name: making-of
description: Turn an agent build conversation into a "making-of" Remotion video that replays the chat turn by turn — the user's real prompts on the right, the agent's questions and actions on the left, in one continuously scrolling 16:9 chat session, with screenshots (or labelled mockups) of the results along the way and sound effects. Use this whenever the user wants a video, short, reel, clip, or animation of how something was built in a conversation ("make a Remotion video of this", "video of how we made the app", "replay our chat as a video to share"), even if they don't say "making-of" or "replay". Not for product promos or explainer videos about the app itself — this is about the conversation that built it.
disable-model-invocation: true
---

# Making-of video

A replay of the conversation that built something, styled as a chat app. The viewer should feel they are scrolling through the real thread: what the user actually typed, what the agent asked, what it did, and where it stood at each milestone.

The common failure is making a promo of the product instead. If the request is ambiguous ("make a video about the app"), confirm that they want the build conversation replayed, not a feature showcase.

## Workflow

1. **Read the source thread.** Pull the real messages; don't reconstruct from memory or summaries.
   - In T3 Code: `t3_thread_read({threadId, view: "messages", limit: 50, maxCharsPerItem: 5000})`, paginating with `afterPosition = nextPosition`. Use the current thread's id unless told otherwise.
   - Elsewhere: the conversation transcript or whatever export the user provides.
2. **Draft the story** in `src/story.ts` (see "Writing the story" below).
3. **Scaffold the project** by copying `assets/template/` into a new folder (e.g. `<app>-making-of/`), then `npm install` and `npm run sfx` to synthesize the sound effects into `public/sfx/`.
4. **Check it** with `npm run lint`, `npx remotion compositions` (shows the duration), and stills at a few frames: `npx remotion still <id> /tmp/f.png --frame=<n>`. Look at the stills. Long bubbles, question rounds, and the final frame are the places layout breaks.
5. **Open Studio for preview** (`npm run dev`, port 8792) and give the user the link. If they are on another device and use Tailscale, see "Remote preview" below.
6. **Don't render until the user says go.** They will iterate on wording, pacing, and content first.
7. **Render and check the file.** The frame rate comes from `story.fps`, so a request like "render at 60fps" means setting `fps: 60` there; the pacing stays the same. A ~100s 1080p video takes a few minutes, so run it in the background: `npx remotion render <id> out/<name>.mp4`. Then check that the output is what was asked for:
   - `ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate -show_entries format=duration -of compact out/<name>.mp4` shows resolution, fps, duration, and that an audio stream exists.
   - `ffmpeg -i out/<name>.mp4 -af volumedetect -f null - 2>&1 | grep max_volume`: a peak well below 0 dB means no clipping. "-inf" means the sound effects are missing.
   - Look in `out/` first. Studio's Render button writes its own file there (e.g. `<Id>.mp4`), which may be an older version. Don't delete files you didn't make; tell the user which file is the new one.
   - Report the path, size, resolution, fps, and duration. Offer a tailnet download link (see below) if the user is on their phone.

## Writing the story

`src/story.ts` is the only file that changes per video. `references/example-story.ts` is the complete Pinfloat story the user approved, and `references/example-mockup.tsx` is its plan mockup. Read it before writing a new one; it shows the tone and every message kind.

### Authorship must be exact

The video claims "this is what you said" and "this is what I did", so each bubble has to belong to the right speaker.

- **User prompts are verbatim**, typos included ("web broser", "aspect radio"). They are the user's voice, and friends watching will recognise it. Change the wording only when the user asks for it, then use their new wording exactly.
- **Split merged messages.** Some harnesses record an answer to an agent question as a single user message containing both the question and the reply. T3 does this with `async-answer` items, where `creationSource` is `"server"`. Put the question in an agent bubble and keep only the user's own words in the user bubble.
- **Mark skill-generated content** with `skill: "$skill-name"`, which renders a "⚙ FROM SKILL" chip. This applies to grilling questions from `$grill-me`, a boundary question that `$implement` triggered through its TDD skill, and so on. If a nested skill produced it, show the chain: `"$implement → TDD skill"`. The thread often says which skill is speaking, e.g. "The TDD skill says…".
- **Use the agent's real name** (`agent: "Codex"`, `"Claude"`) and put it in the tags (`"CODEX · ACTION"`). A thread can switch providers; label the turns by whoever actually ran them.

### Don't drop the questions

A run of "Yes, agree all." means nothing without the questions it answered. When the agent asked questions (grilling rounds, plan checks), show them between the answers as `AGENT · QUESTIONS` bubbles with one `Q<n>. headline` per line. Lines in that format render as a numbered list. Use each question's headline sentence verbatim and drop the explanations and recommendations under it.

### Agent turns: short and first-person

Summarise each stretch of agent work in one or two sentences, from the agent's side: "I traced the pin-editor, keyboard, and Android 10 layout failures to their causes." Mention failures and dead ends. They make the story, and hiding them would be dishonest. Use `status` pills for milestones and caveats that still hold ("YOUR PHONE + TARGET SITES: STILL UNCHECKED").

### Show the results along the way

Viewers want to see what each turn produced, not just read about it. Attach images to the agent bubble whose work they show, using `images: [{ src, ratio, caption, mockup? }]`. Files go in `public/shots/`, and `ratio` is width/height.

- **Prefer real captures.** Look for them in the project: test artifacts (e.g. `artifacts/`, emulator or Playwright screenshots), images attached to the thread, and screenshots the agent took while verifying. Order them by modification time against the thread's timestamps, and attach each to the turn it belongs to. Failures are worth showing too; a "before" next to a passing "after" tells the debugging story. Downscale to about 1400px JPEGs (`sips -s format jpeg -s formatOptions 82 -Z 1400 in.png --out public/shots/x.jpg`) to keep the project small, and get `ratio` from the pixel size (`sips -g pixelWidth -g pixelHeight`).
- **Use a mockup when no capture exists**, e.g. for the plan before any code, or for a result that was never screenshotted. Draw it as a Remotion `<Still>` in `src/mockups/`, register it in `Root.tsx`, and render it into `public/shots/` with `npx remotion still <Id> public/shots/x.jpg --image-format=jpeg`. Base it on what the thread actually described, plus any design doc for colors and controls. Set `mockup: true` so it carries a MOCKUP badge. A drawing passed off as a real screenshot would be the same dishonesty as putting words in the user's mouth.
- **Captions say where an image came from**: "Android 16 emulator · the first floating panel", "Failure · the keyboard squashed the panel in landscape".
- Up to two or three images per bubble. They share one row height, so a portrait phone shot next to a landscape one comes out small.

### Chapters and where to stop

- Group turns into chapters of roughly 2–6 messages. Each gets a label ("03 / THE GREEN LIGHT") and one short title sentence, which shows in the divider and the sidebar.
- **End at the turn where the user asked for the video**, with the agent's reply ("I turned this build chat into the replay you're watching…"). Turns that revise the video itself (aspect ratio, pacing, wording) are about the video, not the build. Leave them out unless the user wants them in.

## The template's design (keep unless asked)

The user arrived at each of these through feedback, so treat them as settled defaults:

- **One continuous session that scrolls.** Messages arrive in a single bottom-anchored column, and older ones scroll off the top. Don't make a page per chapter. Each row grows from `0fr` to `1fr` (CSS grid), so the scroll is smooth without measuring text.
- **16:9, 1920×1080**, with a chapter sidebar on the left. Body text is 27–34px, so it stays readable when shared.
- An intro card ("The making of <app>") fills the first screen, then scrolls away.
- **User prompts are typed into the composer first**, at about 2 characters per 30fps frame, taking 0.5–1.8s. Key taps play while the text appears, then it sends as a bubble and the box clears. An empty composer for the whole video looks fake.
- "<Agent> is typing…" appears in the header before agent bubbles.
- **Sound effects** are synthesized by `make-sfx.mjs`, so there are no licensing questions: key taps while the user types, then a send pop, typing taps followed by a chime for agent messages, a tick for status pills, and a whoosh for chapter dividers.
- **The video ends 3s after the last turn appears** (`END_HOLD = 90`). Don't add more reading time after it.

Pacing comes from `readFrames` in `ChatReplay.tsx`, in 30fps frames: about 0.28 frames per character, plus 26 frames per message. Question lists get 0.34 frames per character, and bubbles with images get 50 extra frames plus 20 per image. The engine scales all of this to `story.fps`, so switching to 60fps makes motion smoother without changing the speed. User prompts also add their typing time (`userTyping`). A nine-chapter thread with four grilling rounds and five image bubbles came out at about 99s.

Engine gotcha: `timeline` is built at module load time. Any helper that `buildTimeline` calls must be declared above it, or the composition silently disappears from `remotion compositions` (a temporal dead zone error).

## Remote preview over Tailscale

Studio binds to localhost. To preview from a phone on the tailnet:

```sh
ALLOWED_ORIGIN=https://<machine>.<tailnet>.ts.net:8793 npm run preview:proxy   # 127.0.0.1:8794 → Studio
tailscale serve --bg --https=8793 http://127.0.0.1:8794
```

The proxy rewrites the Origin header, which Studio's API checks, and rejects requests from any other origin. Check `tailscale serve status` first and pick a free port. Then confirm the URL loads before sharing it. A 403 from a foreign origin is expected and means the guard works. To share the rendered MP4 the same way, serve just that file (`tailscale serve --bg --https=<port> /abs/path/out/<name>.mp4`) rather than the whole project. Keep it tailnet-only. Don't use `tailscale funnel` unless the user explicitly asks for public access.
