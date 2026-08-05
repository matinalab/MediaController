# MediaController

> English | [中文文档](README.zh-CN.md)

Lightweight userscript for controlling HTML5 media playback speed and volume.

## Install

1. Install the [Tampermonkey browser extension](https://www.tampermonkey.net/).
2. Open the [latest release download](https://github.com/matinalab/MediaController/releases/latest/download/media-controller.user.js).
3. Confirm the installation in Tampermonkey.

The userscript is also available as `media-controller.user.js` in each GitHub Release.

## Features

- Increase speed with `C`.
- Decrease speed with `X`.
- Toggle `1x` and the last non-`1x` speed with `Z`.
- Set or stack preset speeds with `1` - `4`.
- Raise volume with `ArrowUp`, lower volume with `ArrowDown`.
- Raise or lower volume by `20%` with `Ctrl + ArrowUp` / `Ctrl + ArrowDown`.
- Use the original h5Player-style Web Audio gain path: volume enters `200%` on the first step above `100%`, then uses integer levels up to `600%`.
- Acoustic gain is enabled directly because this focused userscript has no settings menu.
- Keep the keyboard target speed stable during rapid key presses.
- Apply the target speed to all `video` and `audio` elements on the page.
- Show a small speed label at the top-left corner of the active media element.

## Shortcuts

| Key | Action |
| --- | --- |
| `C` | Increase speed by `0.1x` |
| `X` | Decrease speed by `0.1x` |
| `Z` | Toggle between `1x` and the last non-`1x` speed |
| `1` | Set / stack `1x` |
| `2` | Set / stack `2x` |
| `3` | Set / stack `3x` |
| `4` | Set / stack `4x` |
| `ArrowUp` | Increase volume by `5%` |
| `ArrowDown` | Decrease volume by `5%` |
| `Ctrl + ArrowUp` | Increase volume by `20%` |
| `Ctrl + ArrowDown` | Decrease volume by `20%` |

## Performance

- No runtime dependencies.
- No build step is required.
- No global API is exposed to the page.
- One `MutationObserver` watches for newly inserted media elements.
- The feedback element is created only after the first visible speed change.
- Web Audio gain is created only after volume goes above `100%`.
- Native volume changes are persisted; gain levels are kept in memory for the current page, matching h5Player.

## License

MIT
