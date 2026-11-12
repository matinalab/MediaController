# MediaController

> English | [中文文档](README.zh-CN.md)

Lightweight userscript providing keyboard controls for HTML5 media playback.

## Install

1. Install the [Tampermonkey browser extension](https://www.tampermonkey.net/).
2. Open the [latest release download](https://github.com/matinalab/MediaController/releases/latest/download/media-controller.user.js).
3. Confirm the installation in Tampermonkey.

The installation file is also included in every GitHub Release as `media-controller.user.js`.

## Features

- Adjust playback speed from `0.1x` to `16x`.
- Toggle or adjust playback speed with keyboard shortcuts.
- Adjust standard volume or increase it up to `600%`.
- Toggle fullscreen and play the next video with keyboard shortcuts.
- Support HTML5 `video` and `audio` elements.
- Show a discreet status label at the top-left corner of the active media element.
- Use a browser top-layer overlay with isolated styles for webpage fullscreen, native fullscreen, and in-page floating mini-players; follow player movement while feedback is visible.

## Shortcuts

| Key | Action |
| --- | --- |
| `C` | Increase speed by `0.1x` |
| `X` | Decrease speed by `0.1x` |
| `Z` | Toggle between `1x` and the last non-`1x` speed |
| `ArrowUp` | Increase volume by `5%` |
| `ArrowDown` | Decrease volume by `5%` |
| `Ctrl + ArrowUp` | Increase volume by `20%` |
| `Ctrl + ArrowDown` | Decrease volume by `20%` |
| `Enter` | Toggle fullscreen |
| `N` | Play the next video on supported sites |

## Compatibility

Works with HTML5 media in modern browsers with Tampermonkey installed. The script has no external runtime dependencies.

Feedback prefers the browser's Popover API rather than escalating `z-index` values or maintaining per-site positioning fixes. It is promoted again when fullscreen changes, follows layout every animation frame only while visible or fading, and stops refreshing when hidden. Use an up-to-date browser with Popover API support for this behavior. Older browsers receive a regular overlay fallback, which cannot avoid every clipping or stacking issue.

An in-page floating mini-player is not native video Picture-in-Picture. Native video Picture-in-Picture displays the video surface, not arbitrary webpage HTML overlays, so speed/volume labels inside that system window are not supported. Feedback in an embedded player is also confined to its iframe viewport and cannot draw outside it.

## Development and releases

1. Run `npm run check` after editing to check syntax. For feedback changes, verify normal playback, webpage fullscreen, native fullscreen (including fullscreen directly on a video), fullscreen transitions, in-page mini-players, scrolling/zoom/layout changes, hostile site styles, and rapid shortcut input.
2. For each release, update `version` in `package.json`, the userscript's `@version`, and `CHANGELOG.md` together. Existing releases are not overwritten, so increment the version.
3. Run `npm run commit -- -m "fix: describe the change"`. This helper checks userscript syntax, stages all non-ignored changes, and commits them; check for unrelated files first.
4. Run `git push origin main`. A local commit alone does not publish a release.
5. `.github/workflows/release.yml` validates matching versions on pushes to `main`, creates the `v<version>` tag and GitHub Release, attaches `media-controller.user.js`, and marks it Latest. It also supports manual `workflow_dispatch` runs.
6. Confirm the workflow succeeds, the release tag points to the new commit, the attachment version matches, and the downloaded asset has the same SHA-256 as the local script. A failed workflow or missing release is not a completed publication.

## License

MIT
