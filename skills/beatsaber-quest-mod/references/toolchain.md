# Toolchain

## Tools

- `qpm` (QuestPackageManager CLI). The reference mod puts it in `~/.local/share/qpm-bin`.
- cmake and ninja through `mise` (`mise.toml`: `cmake = "3"`, `ninja = "latest"`). Run them with `mise exec --`.
- The NDK comes from `qpm ndk resolve -d`, which writes `ndkpath.txt`.
- Java for apksigner and similar: `mise exec java@temurin-21 -- ...`.

## Gotchas

- **NDK path with a space.** qpm installs the NDK under `Application Support` on macOS, and the qpm cmake files reject a path with a space. Symlink it (`ln -sfn "$(cat ndkpath.txt)" ~/.local/share/android-ndk-qpm`) and pass `-DCMAKE_ANDROID_NDK=<link>`.
- **Version pins.** `qpm restore` takes the newest version in a `^` range. Pin every library that the headset already has (paper2_scotland2, bsml, custom-types) with `=`. Example set for BS 1.40.8: beatsaber-hook ^6.4.2, paper2_scotland2 =4.7.0, scotland2 ^0.1.6 (`includeQmod: false`), bs-cordl ^4008, bsml =0.4.55, custom-types =0.18.4.
- **New `.cpp` files** need a cmake reconfigure. Run the configure step in every deploy.
- **Early vs normal mods.** scotland2 loads `Modloader/early_mods` in `setup()` before Unity starts, and `Modloader/mods` later. Hooks on native libraries that the engine uses at start (OpenXR loader, EGL) must be in an early mod's `setup()`. il2cpp hooks go in `late_load()` after `il2cpp_functions::Init()`.
- **Extra system libraries** (GLES, EGL) go into `target_link_libraries`.
- **qmod.** `qpm qmod zip` packs the mod with `mod.json`. Check that the BSML and custom-types dependencies are in it.

## APK changes

A manifest feature (for example `com.oculus.feature.PASSTHROUGH`) needs a patched APK. The reference repo has `tools/patch_apk.sh`: it edits the binary manifest with androguard + pyaxml, sorts attributes by resource ID (else versionCode reads as 0), zipaligns with `-P 16 4` and signs with the MBF debug key, so `adb install -r` keeps app data and DLC. This is a reinstall: ask the user first. Rollback: `adb install -r -d base.apk`.
