# Atoms-Lite

> **AI Native 网页原型生成与质量自愈工作台**：用一句话描述需求，立即得到可运行的单文件网页原型；页面自动完成质量体检，出错时能修复，还能生成测试用例。

![Vite](https://img.shields.io/badge/Vite-5-8B5CF6) ![React](https://img.shields.io/badge/React-18-38BDF8) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6) ![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Tailwind-111)

---

## ✨ 核心特性

| 特性 | 说明 |
|------|------|
| 💬 **多轮生成** | 对话式描述需求，可以在当前版本上继续修改（如主色、标题、圆角、深浅色、重置按钮等）；每轮都保存一个版本快照，可随时回溯 |
| 🖥️ **实时沙箱** | 页面在 `iframe srcdoc` 中隔离渲染；可切换 375 / 768 / 100% 视口，状态栏显示渲染延迟和 JS 错误数，另有控制台日志面板 |
| 💾 **LocalStorage 持久化** | 多项目、对话和版本全部保存在本机浏览器，刷新后不丢失，也可以一键清空重置 |
| 📦 **JSON 导入 / 导出** | 可将整个工程导出为 JSON 备份或迁移，也可以导入恢复；还能下载单文件 `index.html` |

## 🛡️ 工程特色：QA & Reliability Guard

- **🧪 QA 质量巡检报告**：对生成页面做 12 项加权静态检查（viewport、语义化、无障碍 alt 和按钮文本、脚本语法预检等），给出 0~100 分及分组明细，并支持**一键优化**，优化结果生成新版本。
- **🚨 沙箱异常捕获 + 🩹 AI 一键自愈**：探针捕获 `console`、`window.onerror` 和 `unhandledrejection` 的完整堆栈；出错时在预览底部显示红色自愈条，一键把错误上下文提交给 AI 修复，修复过程写入对话并生成新版本。
- **📋 自动化测试用例生成**：按页面类型用规则生成功能测试用例（模块、场景、前置条件、步骤、预期结果），有 Key 时可改用 AI 生成；可复制为 Markdown 表格。复制按 Clipboard API → `execCommand` → 手动复制弹窗三级降级，嵌在 iframe 中时也能复制。

## 🚀 快速上手

需要 Node.js 18 或更高版本。

```bash
cd app/frontend
npm install
npm run dev        # 本地开发，默认 http://localhost:5173
npm run build      # 生产构建，输出到 app/frontend/dist
npm run start      # 预览生产构建（vite preview）
npm run lint       # 代码检查
```

## 🔌 离线 / 演示模式

**不需要任何 API Key 就能完整体验。**

- 未配置 Key 时，内置 **Mock 规则引擎**接管：它会匹配快捷模板（番茄钟 / 贪吃蛇 / 待办看板 / 登录表单），并模拟流式输出；增量修改、体检优化、异常自愈和用例生成也都能按规则完成。
- 在「设置」中填入 OpenAI 或 DeepSeek 兼容的 API Key 后切换为真实 LLM；调用失败时会自动降级回 Mock，页面不会崩溃。
- Key 只保存在本机浏览器的 LocalStorage 中，不会上传到任何服务器。前端直接请求模型服务时，可能受该服务的 CORS 限制。

## ☁️ 部署到 Vercel

仓库根目录已提供 `vercel.json`，里面指定了安装、构建命令和输出目录 `app/frontend/dist`，导入仓库后可以直接部署。
也可以在 Vercel 中把 **Root Directory** 设为 `app/frontend`，Framework 选 Vite。

## 🗂️ 目录结构

```
app/frontend/src
├── pages/Index.tsx          # 工作台状态编排
├── components/              # ChatFeed / CodeView / CasesView / PreviewPanel / QaReportDialog / ManualCopyDialog ...
└── lib/
    ├── engine.ts            # LLM 流式生成 + Mock 引擎 + 修复会话
    ├── qa.ts                # 体检评分、规则优化、自愈、用例生成
    ├── sandbox.ts           # 探针注入与代码高亮
    ├── clipboard.ts         # 三级降级复制工具
    ├── storage.ts           # LocalStorage 持久化与下载
    └── templates.ts         # 内置模板
```

## 🎨 设计

暗黑 AI Native 风格：背景 `#0B0B0F`，主色紫 `#8B5CF6`，点缀电光蓝 `#38BDF8`；字体为 Manrope 和 JetBrains Mono。详见 `app/frontend/DESIGN.md`。
