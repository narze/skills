# Game API

## Finding a type or method

The generated headers after `qpm restore` are the source of truth. Search them, do not guess signatures.

- bs-cordl: `extern/includes/bs-cordl/include/`. Namespaces are folders (`GlobalNamespace/`, `UnityEngine/`). The full class body is in `zzzz__<Class>_def.hpp`, not in `<Class>.hpp`. Example: `grep -n 'SetDataToShaders' extern/includes/bs-cordl/include/GlobalNamespace/zzzz__BloomPrePassRendererSO_def.hpp`.
- beatsaber-hook: `extern/includes/beatsaber-hook/shared/utils/` (`hooking.hpp`, `typedefs-wrappers.hpp`).
- BSML: `extern/includes/bsml/shared/BSML-Lite/Creation/*.hpp` and `BSML.hpp`.
- Some Unity methods are stripped in the game build (for example `LayerMask.LayerToName`). If a call fails at runtime with a "method not found" log, look for another way.

## Hooks

- il2cpp methods: `MAKE_HOOK_MATCH(Name, &Class::Method, Ret, Class* self, args...)`, then `INSTALL_HOOK(PaperLogger, Name)` in `late_load()`. Static methods have no `self`.
- Native C functions (for example `xrGetInstanceProcAddr` from `dlsym(dlopen("libopenxr_loader.so"))`): `MAKE_HOOK_NO_CATCH(Name, nullptr, ...)`, then `INSTALL_HOOK_DIRECT(PaperLogger, Name, ptr)` in `setup()`.
- Useful hook points: `SceneManager::Internal_SceneLoaded` (scene changes), `MainCameraCullingMask::Start` (gameplay camera), `AudioTimeSyncController::Update` (per-frame in songs), `PauseMenuManager::ShowMenu` / `StartResumeAnimation` / `MenuButtonPressed` / `RestartButtonPressed` (pause).

## Unity object handles

- Keep long-lived Unity objects in `SafePtrUnity<T>`. It cannot be assigned: hold it in `std::optional` and use `emplace`, or in a `std::list`.
- `UnityW<T>` to `SafePtrUnity<T>`: pass `.ptr()`.
- Casts: `obj->get_transform().cast<UnityEngine::RectTransform>()`.

## BSML-Lite UI

- `BSML::Init()` once, then `BSML::Register::RegisterSettingsMenu`, `RegisterMainMenuViewControllerMethod` (button in the left mod list), `RegisterGameplaySetupTab`.
- Controls: `BSML::Lite::CreateToggle`, `CreateSliderSetting`, `CreateUIButton`, `CreateScrollableSettingsContainer`.
- Floating panel: `CreateFloatingScreen(size, pos, eulerRot, curvature, hasBackground, createHandle, BSML::Side)`. Movable with `createHandle = true`; save the pose from `HandleReleased.addCallback(fn)`, where `fn(FloatingScreen*, const FloatingScreenHandleEventArgs&)` reads `.position` and `.rotation`. After `set_ScreenSize`, call `UpdateHandle()`.
- A button made directly on a floating screen sits at the parent's corner. Stretch its `RectTransform` (anchorMin {0,0}, anchorMax {1,1}, sizeDelta {0,0}) or put it in a layout.
- Panel too narrow in the pause menu: the content is clipped at the left and right. Make the screen wider rather than smaller text.
- Share one `buildPanel(Transform*)` for all places, and refresh all panels when a value changes, with a guard so the refresh does not fire the change callbacks.

## Input

`GlobalNamespace::OVRInput::Get(OVRInput::RawButton::A, OVRInput::Controller::RTouch)`. Poll it in a per-frame hook and act on the rising edge.

## Rendering facts (BS 1.40.x)

- The alpha channel of the eye buffer holds glow strength, not coverage.
- Gameplay camera layers: 8 notes, 12 sabers, 13 lights, 14 rings and environment geometry, 29 BloomSkyboxQuad. Light scripts turn renderers on again, so remove layers from the camera culling mask instead of disabling renderers.
- Environment scenes are named `<Name>Environment`. The menu environment is inside `MainMenu` (`Wrapper/MenuEnvironmentManager`, `Wrapper/MenuEnvironmentCore`).
- Notes, bombs, the note spawn effect and fog read the bloom pre-pass texture. To remove light glow on them, give shaders a black texture in the static `BloomPrePassRendererSO::SetDataToShaders` hook. `BloomFogSO::bloomFogEnabled` switches the distance fog.
- The swapchain is sRGB (`GL_SRGB8_ALPHA8`, texture array with 2 layers), so shader values are linear.
