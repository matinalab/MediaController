# Media Speed Controller

Lightweight userscript for controlling HTML5 media playback speed.

## Features

- Increase speed with `C`
- Decrease speed with `X`
- Toggle `1x` / last speed with `Z`
- Set preset speed with `1` - `4`
- Rapidly pressing `1` - `4` stacks the target rate, for example `2`, `2` -> `4x`
- Keeps the target speed stable during fast key presses
- Applies the target speed to all `video` and `audio` elements on the page
- Shows a small feedback label at the top-left corner of the active media element

## Install

After pushing this repository to GitHub, install from:

```text
https://raw.githubusercontent.com/matinalab/MediaSpeedController/main/media-speed-controller.user.js
```

Or install manually by copying `media-speed-controller.user.js` into Tampermonkey / Violentmonkey.

## Performance Notes

- No runtime dependencies
- No build step required
- No global API exposed to the page
- One `MutationObserver` watches for newly inserted `video` / `audio` elements
- One feedback DOM node is created only after the first visible speed change
- The metadata icon is an inline SVG used by the userscript manager only

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

## License

MIT
