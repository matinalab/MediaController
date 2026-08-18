# MediaController

> [English](README.md) | 中文文档

为 HTML5 视频和音频提供键盘控制的轻量级用户脚本。

## 安装

1. 安装 [Tampermonkey 浏览器扩展](https://www.tampermonkey.net/)。
2. 打开[最新版本下载地址](https://github.com/matinalab/MediaController/releases/latest/download/media-controller.user.js)。
3. 在 Tampermonkey 弹出的页面中确认安装。

每个 GitHub Release 中都会提供 `media-controller.user.js` 安装文件。

## 功能

- 支持 `0.1x` 至 `16x` 播放速度调节。
- 支持通过快捷键切换、调整或叠加预设倍速。
- 支持标准音量调节及最高 `600%` 音量增强。
- 支持通过快捷键切换全屏及播放下一个视频。
- 支持页面中的 HTML5 `video` 和 `audio` 元素。
- 在当前媒体元素左上角显示简洁的状态提示。

## 快捷键

| 按键 | 操作 |
| --- | --- |
| `C` | 提高 `0.1x` 播放速度 |
| `X` | 降低 `0.1x` 播放速度 |
| `Z` | 在 `1x` 和上一次非 `1x` 倍速之间切换 |
| `ArrowUp` | 提高 `5%` 音量 |
| `ArrowDown` | 降低 `5%` 音量 |
| `Ctrl + ArrowUp` | 提高 `20%` 音量 |
| `Ctrl + ArrowDown` | 降低 `20%` 音量 |
| `Enter` | 切换全屏 / 退出全屏 |
| `N` | 在支持的网站播放下一个视频 |

## 兼容性

支持安装 Tampermonkey 的现代浏览器中的 HTML5 媒体。脚本运行不依赖外部服务或运行时组件。

## 许可证

MIT
