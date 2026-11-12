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
- 使用浏览器顶层浮层和隔离样式显示提示，覆盖网页全屏、原生全屏及网页内悬浮小窗；提示显示期间自动跟随播放器移动。

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

提示层优先使用浏览器的 Popover API，不依靠不断提高 `z-index` 或逐个适配网站。全屏状态变化时会重新提升到顶层；提示显示及淡出期间才逐帧跟随位置，隐藏后停止刷新。建议使用支持 Popover API 的新版浏览器；不支持该 API 的浏览器仅提供普通浮层降级，不能保证避开所有裁剪和层叠问题。

“网页内悬浮小窗”与浏览器原生“画中画”不是同一种窗口。原生视频画中画仅显示视频画面，不能直接显示网页中的 HTML 提示层；本脚本不承诺在该系统窗口内显示音量或倍速提示。嵌入式播放器的提示也限制在其所在的 iframe 视口内，不能跨越 iframe 绘制。

## 开发与发布

1. 修改代码后运行 `npm run check` 检查语法。涉及提示层时，应验证普通播放、网页全屏、原生全屏（包含直接对视频元素全屏）、进出全屏、网页内悬浮小窗、滚动/缩放/布局变化、站点样式干扰以及连续快捷键输入。
2. 发布新版本时，同时更新 `package.json` 的 `version`、脚本头部的 `@version` 和 `CHANGELOG.md`。已存在的 Release 不会自动覆盖，因此必须递增版本号。
3. 运行 `npm run commit -- -m "fix: describe the change"`。该命令先检查脚本语法，再暂存全部未忽略的改动并提交；提交前请确认没有无关文件。
4. 运行 `git push origin main`。只有本地提交不会触发发布。
5. `.github/workflows/release.yml` 在 `main` 推送后自动校验版本一致性，创建 `v<version>` 标签和 GitHub Release，上传 `media-controller.user.js`，并将其设为 Latest；也可通过 `workflow_dispatch` 手动触发。
6. 发布后确认工作流成功、Release 标签指向本次提交、附件版本与本地一致且下载文件 SHA-256 相同。若工作流失败或 Release 缺失，不能视为发布完成。

## 许可证

MIT
