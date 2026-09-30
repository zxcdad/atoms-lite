---
last_updated: 2026-09-30T08:29:45Z
---

# Architecture Design

## System Overview
纯前端 SPA（Vite+React+shadcn）。左侧 AI 控制台 + 右侧 iframe srcdoc 沙箱；生成引擎：有 Key 走 OpenAI 兼容流式接口，否则/失败降级 Mock 规则引擎；LocalStorage 持久化。
模块：lib/engine.ts（生成）、lib/templates.ts（4 套预设）、lib/sandbox.ts（探针注入+高亮）、lib/storage.ts（持久化）、components/{ChatFeed,CodeView,PreviewPanel,ProjectMenu,SettingsDrawer}、pages/Index.tsx（状态编排）。

## Tech Stack

## Module Design
| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| QA 引擎 | auditHtml 体检评分、autoFixHtml 规则优化、healHtml 规则自愈、generateCases/casesToMarkdown 生成测试用例 | src/lib/qa.ts |
| 修复会话 | repair()：有 Key 时调用 LLM，否则采用规则修补并模拟流式输出；complete() 做非流式补全 | src/lib/engine.ts |
| 质量体检 UI | 报告弹窗（评分环、分组明细、一键优化） | src/components/QaReportDialog.tsx |
| 异常自愈 UI | 探针上报堆栈；显示红点、自愈条和【🩹 提交 AI 自动修复】按钮 | src/lib/sandbox.ts, src/components/PreviewPanel.tsx |
| 测试用例 UI | 左侧【用例】Tab，展示表格并支持复制 Markdown，可选 AI 生成 | src/components/CasesView.tsx |
| 编排 | runRepair：把修复过程写入对话，并生成新版本快照 | src/pages/Index.tsx |

## Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|

## File Tree Plan

## Implementation Guide

