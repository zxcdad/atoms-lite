---
last_updated: 2026-09-30T08:29:45Z
status: active
---

# Project Context

## Project Overview
Atoms-Lite：类 v0 / Atoms 的 AI 网页应用生成平台（纯前端，Vite + React + TS + shadcn/ui + Tailwind，代码在 app/frontend）。
- 左侧 AI 控制台：Logo、工程菜单（新建/重命名/删除/切换/导入导出 JSON）、历史版本下拉、对话/源码视图（高亮+复制）、快捷模板（番茄钟/贪吃蛇/待办看板/登录表单）与输入框、生成中可停止。
- 右侧 Live Sandbox：iframe srcdoc 隔离渲染，视口 375/768/100%，刷新/新标签打开/下载 index.html，骨架屏加载，状态栏（加载状态、渲染延迟、JS 错误数）+ 控制台日志面板。
- 生成引擎（src/lib/engine.ts）：有 API Key 时以 OpenAI 兼容流式接口调用 OpenAI/DeepSeek；未配置或失败时降级 Mock 规则引擎（预设匹配 + 增量修改：主色、重置按钮、深/浅色、标题、圆角、字号）。每次生成记录版本快照。
- 持久化：LocalStorage（atoms-lite:store:v1 / atoms-lite:settings:v1），支持一键清空重置。

## Key Decisions
| Date | Decision | By | Rationale |
|------|----------|-----|-----------|
| 2026-09-30 | 纯前端实现，不激活后端 | Alex | 需求仅要求 LocalStorage 持久化，API Key 由用户自填前端直连 |
| 2026-09-30 | iframe srcdoc + sandbox 属性 + 注入探针脚本 postMessage 上报 console/error/load | Alex | 安全隔离并实现报错捕获与渲染延迟统计 |
| 2026-09-30 | 无 Key 或调用失败时自动降级 Mock 引擎，模拟流式输出 | Alex | 保证在线 Demo 零配置可用不崩溃 |
| 2026-09-30 | 预设模板统一使用 CSS 变量（--primary/--bg/--surface/--text/--radius）并暴露 resetApp() | Alex | 让 Mock 引擎可规则化做增量修改 |
| 2026-09-30 | 自研轻量正则 HTML 高亮，不引入高亮库 | Alex | 减少依赖、体积小 |
| 2026-09-30 | QA 模块纯前端：DOMParser 静态体检（12 项加权 0~100 分）、new Function 做语法预检；一键优化与运行时自愈有 Key 走 AI，无 Key 按规则修补，结果都生成新版本 | Alex | 零依赖、零配置可用，并和版本体系打通 |
| 2026-09-30 | 探针改用 window.onerror，并在 unhandledrejection 中上报堆栈；出错时在预览底部显示红色自愈条 | Alex | 把完整堆栈回传给 AI 进行修复 |
| 2026-09-30 | 测试用例：按页面类型（4 个模板 + 通用 DOM 分析）用规则生成，有 Key 时可以改用 AI 生成 JSON；支持复制为 Markdown 表格 | Alex | 离线可用，AI 生成为增强 |
| 2026-09-30 | 暗黑 AI Native 视觉：#0B0B0F 底、紫 #8B5CF6 主色、电光蓝 #38BDF8 点缀，Manrope + JetBrains Mono | Alex | 见 app/frontend/DESIGN.md |

## Constraints
- 不修改 index.html 的 title/description/logo（由 overview 系统管理），不改 .mgx/config.yaml。
- 桌面 ≥1024px 双栏（左 420px），以下为“AI 控制台/实时预览”分段切换；全高 100dvh，禁止横向滚动。
- API Key 仅存本机浏览器；前端直连可能受目标服务 CORS 限制，失败时自动降级 Mock。
- Mock 引擎仅支持关键词匹配的有限修改指令，未识别时保留当前版本并提示。
- LocalStorage 容量有限（约 5MB），版本过多时可能写入失败（已捕获并 console.error）。


