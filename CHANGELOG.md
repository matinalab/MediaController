# Changelog

## 0.3.0

- Rename the focused project and userscript to `MediaController`.
- Rename the release asset to `media-controller.user.js`.
- Migrate playback-rate and volume settings from the previous storage keys.
- Remove media-object amplifier properties and release amplifier resources when media is removed.
- Reset all gain nodes when returning to native volume mode.
- Prevent handled shortcuts from reaching page handlers or conflicting modifier combinations.
- Add Tampermonkey update metadata and remove the previous Release asset during migration.

## 0.2.3

- Add original h5Player-style volume shortcuts.
- Support `ArrowUp` / `ArrowDown` volume adjustment by `5%`.
- Support `Ctrl + ArrowUp` / `Ctrl + ArrowDown` volume adjustment by `20%`.
- Restore h5Player's integer Web Audio gain path from `200%` through `600%`.
- Guard page-side volume writes during h5Player's 500ms per-media lock.
- Keep native volume persistence and per-media 500ms volume locking aligned with h5Player.

## 0.2.2

- Add official repository namespace metadata.
- Restore userscript manager icon metadata.
- Keep project content focused on playback speed control only.

## 0.2.1

- Remove inherited source-project metadata.
- Rename script identity for the focused speed controller.
- Remove page-global API exposure.

## 0.2.0

- Stabilize fast repeated key presses with target-rate revisions.
- Use internal target speed as the source of truth.

## 0.1.0

- Initial userscript implementation.
