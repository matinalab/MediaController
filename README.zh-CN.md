# Media Speed Controller

> [English](README.md) | 中文文档

用于控制 HTML5 视频和音频播放速度的轻量级用户脚本。

## 安装

1. 安装 [Tampermonkey 浏览器扩展](https://www.tampermonkey.net/)。
2. 打开[最新版本下载地址](https://github.com/matinalab/MediaSpeedController/releases/latest/download/media-speed-controller.user.js)。
3. 在 Tampermonkey 弹出的页面中确认安装。

每个 GitHub Release 中都会提供 `media-speed-controller.user.js` 安装文件。

## 功能

- 按 `C` 提高播放速度。
- 按 `X` 降低播放速度。
- 按 `Z` 在 `1x` 和上一次非 `1x` 倍速之间切换。
- 按 `1` - `4` 设置或叠加预设倍速。
- 快速连续按键时，以键盘操作记录的目标倍速为准。
- 支持页面中的 `video` 和 `audio` 元素。
- 在当前媒体元素左上角显示简洁的倍速提示。

## 快捷键

| 按键 | 操作 |
| --- | --- |
| `C` | 提高 `0.1x` |
| `X` | 降低 `0.1x` |
| `Z` | 在 `1x` 和上一次非 `1x` 倍速之间切换 |
| `1` | 设置 / 叠加 `1x` |
| `2` | 设置 / 叠加 `2x` |
| `3` | 设置 / 叠加 `3x` |
| `4` | 设置 / 叠加 `4x` |

## 性能

- 无运行时依赖。
- 无需构建步骤。
- 不向页面暴露全局 API。
- 仅使用一个 `MutationObserver` 监听新插入的媒体元素。
- 第一次显示倍速变化前不会创建提示元素。

## 许可证

MIT
