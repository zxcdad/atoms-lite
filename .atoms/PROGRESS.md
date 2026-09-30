---
last_updated: 2026-09-30T08:29:45Z
---

# Requirements & Progress

## Requirements Overview

## User Stories

## Task Breakdown
| ID | Task | Assignee | Status | Deps |
|----|------|----------|--------|------|

## Progress Log
- 2026-09-30 Alex：完成 T1-T15 全部实现（双栏工作台、Mock/LLM 引擎、沙箱预览、版本、多项目、导入导出、持久化），lint/build 通过。
- 2026-09-30 Alex：修复发送后黑屏——ChatFeed 的 scrollIntoView 会滚动 overflow:hidden 的 body/#root，把整页推出视口；改为只滚动对话容器，根节点改用 overflow:clip，并加 ErrorBoundary 兜底。
- 2026-09-30 Alex：修复登录表单密码框右侧重叠——文字按钮叠在仅 12px 右内边距的输入框上，且 Edge 原生 ::-ms-reveal 同时显示；改为单一 SVG 眼睛切换按钮，#pw 右内边距 44px，隐藏 ::-ms-reveal/::-ms-clear。
- 2026-09-30 Alex：修复窄屏首次生成后预览白屏——iframe 在 display:none（0 尺寸）预览区内加载，页面按 0 尺寸布局；PreviewPanel 用 ResizeObserver 检测隐藏→可见时重挂 iframe，加载态加 5s 超时兜底。
- 2026-09-30 Alex：用 Playwright 清空 LocalStorage，实测 4 个模板在桌面 1440 和窄屏 390 下的首次生成、iframe 内点击和 2 轮修改。根因：窄屏时预览区隐藏，修改后的 iframe 在 0 尺寸容器中重新挂载，文档 body 高度为 0 导致白屏；旧的 ResizeObserver 重挂只在首次生效。修复：PreviewPanel 改为仅在预览区可见时才挂载 iframe。复测 16 组 DOM 均有内容，body 高度 >0，修改后主色生效；截图见 /workspace/repro。
- 2026-09-30 Alex：修复设置抽屉“清空并重置所有数据”按钮在移动端不可见、桌面端底部重叠的问题。根因：SheetContent 是固定全高且没有滚动区，内容比视口高时底部被裁掉，底部也没有留安全区。改为 flex 纵向布局：表单区 overflow-y-auto 可滚动，危险操作区 shrink-0 固定在底部，并加 safe-area 内边距。Playwright 在 375、768、1440 宽度下实测：按钮完全在视口内，elementFromPoint 命中，确认弹窗后数据已重置。截图为 repro/settings-*.png。
- 2026-09-30 Alex：处理“没有下载 HTML 功能”反馈。下载功能本来就有，但入口只是一个 32px 的无文字灰色图标，混在刷新、新标签图标中间，不好发现；原 downloadFile 的 a 标签没有挂到 DOM 上，1s 后就 revoke URL（部分浏览器下这样可能失败，本次未复现）。修复：工具栏改为紫色“下载 HTML”图标+文字按钮，无内容时禁用并显示提示“暂无内容，请先生成页面”；文件名改为“项目名-index.html”；a 标签先挂到 DOM 再点击，30s 后才 revoke；源码视图复制按钮旁也加了下载入口。Playwright 在 375、768、1440 宽度下实测：按钮可见、没有遮挡，空状态禁用；生成后触发下载，文件为 3626 字节，DOCTYPE 到 </html> 完整。截图为 repro/download-*.png。
- 2026-09-30 Alex：新增 QA & Reliability Guard，包括 🧪 质量体检（加一键优化）、🚨 运行时异常捕获加 🩹 自愈、📋 用例 Tab（可复制 Markdown）。实测脚本为 repro/qa.mjs，在 375/768/1440 宽度下，向番茄钟注入缺陷（删除 viewport、图片无 alt、空按钮、null 访问、missingFn），结果如下：体检 68 分、4 项未通过；一键优化后为 100 分；出现 1 个 JS 错误时自愈按钮可见且没有溢出；Mock 自愈 2 轮后清零，因为每轮只暴露第一个错误；用例 7 条，复制 Markdown 正确，页面没有横向滚动。截图为 repro/qa-*.png。
- 2026-09-30 Alex：修复「复制 Markdown」点击无反应。根因：嵌在 iframe 中的预览环境不是安全上下文，navigator.clipboard 为 undefined，代码直接调用 writeText 抛出 TypeError，async 函数里的异常被静默吞掉，既没有提示也没有写入。原测试授予了剪贴板权限，而且页面不在 iframe 中，所以没有复现。修复：新增 lib/clipboard.ts 的 copyText，依次尝试 Clipboard API、隐藏 textarea + execCommand('copy')，都失败时弹出 ManualCopyDialog（只读全文，自动全选）；每次复制都有成功或失败提示，成功时按钮临时显示「已复制」；CasesView 和 CodeView 统一改用该工具（体检报告本身没有复制按钮）。实测脚本为 repro/copy.mjs：不授予剪贴板权限，外层用 iframe 嵌入，在 375/768/1440 宽度下，execCommand 降级都写入了完整 Markdown，按钮显示「已复制」并弹出提示；模拟 execCommand 失败时，弹窗包含全文、已全选、完全在视口内；源码复制同样可用。截图为 repro/copy-*.png。
- 2026-09-30 Alex：交付准备。新增 scripts.start（vite preview），import 扫描未发现缺失依赖；在干净副本中执行 npm install && npm run build 成功，lint 通过。补全 .gitignore（根目录和 frontend，忽略 .env*.local、日志、repro 截图等），新增根目录 vercel.json 和 README.md。提交和推送都受阻：git 数据目录 /run/gitdata 是只读文件系统，无法创建 index.lock，commit 失败，HEAD 仍是 38327ab；仓库也没有配置 remote，平台没有可用的 GitHub 集成（内置授权仅支持 stripe，MCP 无工具）。

