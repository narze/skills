# Device

## Deploy loop

Use the reference `deploy.sh`: build, `adb push` the `.so` to `/sdcard/ModData/com.beatgames.beatsaber/Modloader/{early_mods|mods}/`, `am force-stop`, then wait for the pid and tail the log.

- **Start the game from the headset library**, not with `adb shell am start`. On the test headset, adb starts crashed the game within seconds with random SIGSEGVs in other mods (Chroma, BeatLeader, SongCore), also without the new mod. If crashes are random and in other mods, ask the user to start from the headset before you blame your code.
- After an `adb install`, Horizon OS can show a "Restore App" dialog. The user selects **Open App**, never **Restore**.
- If the log stops early and the process is alive, check `dumpsys activity activities | grep topResumed`. `SensorLockActivity` means the headset is locked or off the face.
- Proximity override, so the game runs with the headset off the face: `adb shell am broadcast -a com.oculus.vrpowermanager.prox_close` (resets on reboot).

## Wireless adb

`adb tcpip 5555`, then `adb connect <ip>:5555`. It resets on reboot (USB once again). With USB and Wi-Fi both connected, every adb call needs `-s`; pick one with `S=$(adb devices | awk 'NR>1 && $2=="device"{print $1; exit}')`.

## Logs

- The best log is `/sdcard/ModData/com.beatgames.beatsaber/logs2/Paperlog.log` (all mods). The per-mod file `logs2/<ModId>.log` misses some lines.
- The logcat ring buffer is small (256 KiB) and overflows during load. Stream it live (`adb logcat -T 1 | grep ...`) instead of `logcat -d` after the fact.
- Crashes: `adb logcat -d -b crash`. The tombstone comes from another process, so do not filter it by pid. Clear it with `adb logcat -c -b crash` before a test.
- To bisect a crash, check out an older commit, deploy, and compare. Also test with your mod removed.

## Screenshots

- When the user takes a screenshot in the headset, it lands in `/sdcard/Oculus/Screenshots/` (`ls -t`, then `adb pull` the newest). This is the most reliable way to see what the user sees.
- `adb exec-out screencap -p` gives a distorted, often stale image of the compositor. Use it only for a rough check.

## Long waits

Wait for a log line with a bounded loop, for example `until adb shell grep -c 'marker' $LOG | grep -q '[1-9]'; do sleep 3; done`, run in the background. Plain `sleep N` followed by a command can be blocked by the harness.
