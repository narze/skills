---
name: beatsaber-quest-mod
description: Build, debug or deploy a native Beat Saber mod for Meta Quest (scotland2, qpm, bs-cordl, BSML, beatsaber-hook). Use when the task is a Quest Beat Saber mod, a qpm/scotland2 C++ project, or adb work on a headset that runs modded Beat Saber.
disable-model-invocation: true
---

# Beat Saber Quest mod

A working reference mod: https://github.com/narze/beatsaber-quest-passthrough-mod (BS 1.40.8_7379, Quest 3S). Copy its `deploy.sh`, `test/run.sh`, `mise.toml`, `CMakeLists.txt` and `cmake/` before you write your own.

## Rules for the headset

These are hard guardrails. Ask the user first:

- before you uninstall, update, downgrade or re-patch the game (MBF and QuestPatcher re-patch = reinstall);
- before you delete files in `/sdcard/`;
- before you touch other apps.

Back up `base.apk`, the OBB and `/sdcard/ModData/com.beatgames.beatsaber/` (skip `Mods/SongCore`, it is tens of GB) before the first change.

The user is the only **visual oracle**. Logs prove that code ran, not that it looks right. After each visual change, tell the user exactly what to look at in the headset, then stop and wait for the answer.

## Steps

1. **Recon.** Read the installed versions from the headset: game version (`dumpsys package`), modloader, and the version of each library in `/sdcard/ModData/com.beatgames.beatsaber/Modloader/libs/`. Done when you have a version table. Pin `qpm.json` to these exact versions (`=x.y.z`); a newer library than the headset has fails at load time.
2. **Hello world.** Build, push, start, and see your log line. Done when `Paperlog.log` on the headset shows your `setup()` line. See [device.md](references/device.md) for the deploy loop.
3. **Feature loop**, for each change:
   - Put pure logic (settings, math, state machines, filters) in header-only code under `include/` and write a host unit test first (`test/*_test.cpp`, plain `c++ -std=c++20`). Game types stay in `src/`.
   - Find the game API in the generated headers, never from memory: see [game-api.md](references/game-api.md).
   - Build and deploy, check the log, then ask the user to check the headset.
   - Commit after each confirmed step.
4. **Ship.** README with the supported game version, `qpm qmod zip`, dependencies listed in `mod.json`.

## Reference

- [toolchain.md](references/toolchain.md): qpm, NDK, cmake, early vs normal mods, qmod.
- [device.md](references/device.md): adb, deploy loop, logs, screenshots, crashes, wireless adb.
- [game-api.md](references/game-api.md): bs-cordl lookup, hooks, Unity pointers, BSML-Lite UI, input, rendering facts.
