# MediaController

> English | [中文文档](README.zh-CN.md)

Lightweight userscript for controlling playback speed and volume on HTML5 media.

## Install

1. Install the [Tampermonkey browser extension](https://www.tampermonkey.net/).
2. Open the [latest release download](https://github.com/matinalab/MediaController/releases/latest/download/media-controller.user.js).
3. Confirm the installation in Tampermonkey.

The installation file is also included in every GitHub Release as `media-controller.user.js`.

## Features

- Adjust playback speed from `0.1x` to `16x`.
- Toggle, adjust, or stack preset playback speeds with keyboard shortcuts.
- Adjust standard volume or increase it up to `600%`.
- Support HTML5 `video` and `audio` elements.
- Show a discreet status label at the top-left corner of the active media element.

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

## Compatibility

Works with HTML5 media in modern browsers with Tampermonkey installed. The script has no external runtime dependencies.

## License

MIT
