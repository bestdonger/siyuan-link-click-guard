# 链接防误跳转

适用于思源 v3.8.6 及以上的桌面端、桌面窗口和桌面浏览器；已在 v3.8.6 macOS 桌面端验证。其他版本、平台的实际兼容性尚未验证。

- 可编辑正文中的网页链接（纯网址或带标题）、块引用和 `siyuan://blocks/` 内部链接，单击不跳转。
- ⌘/Ctrl、Alt、Shift＋点击保留思源原有行为；右键、中键、悬停、拖选不受拦截。
- 网页链接、块引用分别有开关，修改后立即生效并保存。
- 只读预览、数据库专用 URL 单元格、资源文件、文档树和搜索列表保留原有行为。
- 插件不修改笔记，不发起网络请求。禁用后恢复默认行为。

## 本地安装

从 [Releases](https://github.com/bestdonger/siyuan-link-click-guard/releases/latest) 下载 `package.zip`，将包内文件解压到 `工作空间/data/plugins/siyuan-link-click-guard/`。开发者也可以复制构建后的 `dist/` 文件。
刷新思源，在「设置 → 集市 → 已下载 → 插件」启用「链接防误跳转」。
在插件设置中可分别控制网页链接和块引用。若使用过同类 JS 片段，停用该片段后重启思源，避免重复拦截。

## 开发

使用 Node.js 20.19+、22.12+ 或 24+，执行 `npm ci`、`npm test`、`npm run build`。构建需要系统 `zip` 命令，输出 `dist/` 与可上传到 GitHub Release 的 `package.zip`。
鼠标逻辑使用编辑器 DOM 选择器，升级思源后需要复查兼容性。

## 反馈与许可

遇到问题请在 [Issues](https://github.com/bestdonger/siyuan-link-click-guard/issues) 提供思源版本、操作系统、链接类型和复现步骤。提交截图时请隐藏私人笔记内容。

本项目使用 [MIT License](LICENSE)。
