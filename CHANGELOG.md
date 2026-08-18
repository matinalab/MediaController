# Changelog

## 0.4.3

- Remove the `1`-`4` preset playback-speed shortcuts.

## 0.4.2

- Restore the selected volume once per media source without overriding later site controls.
- Reapply the selected playback speed when media starts playing.
- Detect media created outside the main document tree.
- Keep Douyu fullscreen controls aligned with the current state.

## 0.4.1

- Preserve the selected volume when a site switches media.

## 0.4.0

- Add `Enter` to toggle fullscreen mode.
- Add `N` to play the next video on supported sites.
- Improve compatibility with site-provided media controls.
- Reduce redundant work during rapid shortcut input and dynamic page updates.

## 0.3.0

- Rename the project and userscript to `MediaController`.
- Rename the release asset to `media-controller.user.js`.
- Add volume controls and volume enhancement up to `600%`.
- Migrate existing playback-speed and volume preferences automatically.
- Improve media lifecycle handling and volume-mode transitions.
- Improve rapid keyboard input handling and shortcut isolation.
- Add Tampermonkey update metadata and remove the previous release asset.

## 0.2.3

- Add volume shortcuts.
- Support `ArrowUp` / `ArrowDown` volume adjustment by `5%`.
- Support `Ctrl + ArrowUp` / `Ctrl + ArrowDown` volume adjustment by `20%`.
- Add volume enhancement from `200%` through `600%`.
- Improve volume stability on pages that update media controls automatically.

## 0.2.2

- Add official repository namespace metadata.
- Restore userscript manager icon metadata.
- Refine the userscript scope and metadata.

## 0.2.1

- Remove unused project metadata.
- Update userscript identity and metadata.
- Remove unused page-global API exposure.

## 0.2.0

- Improve stability during rapid repeated key presses.
- Keep keyboard-selected playback speed consistent.

## 0.1.0

- Initial userscript implementation.
