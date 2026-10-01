import { PRESETS, genericPage } from './templates';
import type { Settings } from './types';
import { mockChatReply, ruleIntent } from './intent';

export interface GenResult {
  html: string;
  summary: string;
  source: 'mock' | 'llm';
}

export interface GenOptions {
  prompt: string;
  currentHtml: string | null;
  history: { role: 'user' | 'assistant'; content: string }[];
  settings: Settings;
  signal: AbortSignal;
  onCode: (partial: string) => void;
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((res, rej) => {
    const t = setTimeout(res, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      rej(new DOMException('已停止', 'AbortError'));
    });
  });

const COLORS: [RegExp, string, string][] = [
  [/紫|purple|violet/i, '#8b5cf6', '紫色'],
  [/粉|pink/i, '#ec4899', '粉色'],
  [/红|red/i, '#ef4444', '红色'],
  [/橙|orange/i, '#f97316', '橙色'],
  [/黄|yellow|amber/i, '#eab308', '黄色'],
  [/绿|green/i, '#22c55e', '绿色'],
  [/青|cyan|teal/i, '#14b8a6', '青色'],
  [/蓝|blue/i, '#3b82f6', '蓝色'],
  [/黑|black/i, '#111827', '黑色'],
];

const setVar = (html: string, name: string, value: string) =>
  html.replace(new RegExp(`--${name}:[^;}]+`), `--${name}:${value}`);

const RESET_SNIPPET = `
<button data-atoms-reset onclick="if(confirm('确定重置所有数据吗？')){typeof resetApp==='function'?resetApp():location.reload()}" style="position:fixed;right:16px;bottom:16px;z-index:9999;border:none;border-radius:999px;padding:10px 18px;background:var(--primary,#8b5cf6);color:#fff;font-weight:600;font-size:14px;cursor:pointer;box-shadow:0 10px 24px -8px rgba(0,0,0,.4)">↺ 重置数据</button>
`;

/** 基于规则的增量修改，返回 null 表示无法识别 */
function applyEdits(html: string, prompt: string): { html: string; changes: string[] } | null {
  let out = html;
  const changes: string[] = [];
  const colorIntent = /色|颜色|color|主题|风格/i.test(prompt);
  if (colorIntent) {
    const hit = COLORS.find(([re]) => re.test(prompt));
    if (hit && !/深色|暗色|黑暗|夜间/.test(prompt.replace(/主色.*$/, ''))) {
      out = setVar(out, 'primary', hit[1]);
      changes.push(`主色调已切换为${hit[2]} ${hit[1]}`);
    }
  }
  if (/暗色|深色|黑暗|夜间|dark/i.test(prompt)) {
    out = setVar(setVar(setVar(setVar(out, 'bg', '#0f0f14'), 'surface', '#1b1b24'), 'text', '#f1f1f5'), 'muted', '#9a9aab');
    changes.push('已切换为深色模式');
  } else if (/亮色|浅色|白天|light/i.test(prompt)) {
    out = setVar(setVar(setVar(setVar(out, 'bg', '#f7f7fa'), 'surface', '#ffffff'), 'text', '#1c1c24'), 'muted', '#6b6b7b');
    changes.push('已切换为浅色模式');
  }
  if (/重置|reset|清空/i.test(prompt) && /按钮|button|加|增加|添加/i.test(prompt)) {
    if (!out.includes('data-atoms-reset')) {
      out = out.replace(/<\/body>/i, `${RESET_SNIPPET}</body>`);
      changes.push('右下角新增「重置数据」按钮（带确认弹窗）');
    } else changes.push('页面已存在重置按钮，保持不变');
  }
  if (/圆角/.test(prompt)) {
    const more = !/小|去掉|直角/.test(prompt);
    out = setVar(out, 'radius', more ? '28px' : '6px');
    changes.push(more ? '卡片圆角已加大到 28px' : '圆角已减小到 6px');
  }
  const title = prompt.match(/标题(?:改成|改为|换成|设为|叫)[：:\s]*[“"'「]?([^”"'」]+)[”"'」]?/);
  if (title) {
    const t = title[1].trim().replace(/[<>&]/g, '');
    out = out.replace(/<title>[^<]*<\/title>/i, `<title>${t}</title>`).replace(/(<h1[^>]*data-title[^>]*>)[^<]*(<\/h1>)/i, `$1${t}$2`);
    changes.push(`标题已修改为「${t}」`);
  }
  if (/字体?(变|调|放)?大|大字/.test(prompt)) {
    out = out.replace(/body\{/, 'body{zoom:1.12;');
    changes.push('整体字号放大 12%');
  }
  return changes.length ? { html: out, changes } : null;
}

async function mockGenerate(o: GenOptions): Promise<GenResult> {
  const preset = PRESETS.find((p) => p.keywords.test(o.prompt));
  const edit = o.currentHtml ? applyEdits(o.currentHtml, o.prompt) : null;
  let html: string;
  let summary: string;
  if (edit) {
    html = edit.html;
    summary = `已在当前版本基础上完成修改：\n${edit.changes.map((c) => `• ${c}`).join('\n')}`;
  } else if (preset) {
    html = preset.html;
    summary = preset.summary;
  } else if (o.currentHtml) {
    html = o.currentHtml;
    summary =
      'Mock 引擎暂未识别这条修改指令，已保留当前页面。可尝试：“把主色调换成紫色”“增加一个数据重置按钮”“切换深色模式”“标题改成 xxx”“圆角加大”，或在设置中填写 API Key 使用真实大模型。';
  } else {
    html = genericPage(o.prompt);
    summary = '已生成通用落地页骨架。Mock 模式下内置番茄钟、贪吃蛇、待办看板、登录表单四套高质量模板；填写 API Key 可生成任意应用。';
  }
  await sleep(350, o.signal);
  const step = Math.max(120, Math.ceil(html.length / 45));
  for (let i = step; i < html.length + step; i += step) {
    o.onCode(html.slice(0, i));
    await sleep(22, o.signal);
  }
  return { html, summary, source: 'mock' };
}

const SYSTEM = `你是 Atoms-Lite 网页生成引擎。根据用户需求输出一个完整、可独立运行的单文件 HTML（内联 CSS 与 JS，不依赖外部构建工具，界面美观、响应式，中文文案）。
规则：先用一两句中文概述本次生成/修改内容，然后输出唯一一个 \`\`\`html 代码块，包含完整 <!DOCTYPE html> 文档。若提供了当前代码，请在其基础上增量修改并返回完整新文件。`;

export function extractHtml(text: string): string {
  const fenced = text.match(/```html\s*([\s\S]*?)(```|$)/i);
  if (fenced) return fenced[1].trim();
  const doc = text.indexOf('<!DOCTYPE');
  return doc >= 0 ? text.slice(doc) : '';
}

async function llmGenerate(o: GenOptions): Promise<GenResult> {
  const { baseUrl, apiKey, model } = o.settings;
  const messages = [
    { role: 'system', content: SYSTEM },
    ...o.history.slice(-6),
    {
      role: 'user',
      content: o.currentHtml ? `当前代码：\n\`\`\`html\n${o.currentHtml}\n\`\`\`\n\n修改需求：${o.prompt}` : o.prompt,
    },
  ];
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, stream: true, temperature: 0.4 }),
    signal: o.signal,
  });
  if (!res.ok || !res.body) throw new Error(`接口返回 ${res.status}：${(await res.text()).slice(0, 160)}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      const data = line.replace(/^data:\s*/, '').trim();
      if (!data || data === '[DONE]' || !line.startsWith('data:')) continue;
      try {
        text += JSON.parse(data).choices?.[0]?.delta?.content ?? '';
      } catch {
        /* 忽略不完整分片 */
      }
    }
    o.onCode(extractHtml(text) || text);
  }
  const html = extractHtml(text);
  if (!html) throw new Error('模型未返回有效的 HTML 代码块');
  const summary = text.split('```')[0].trim() || '已根据需求完成生成。';
  return { html, summary, source: 'llm' };
}

async function streamOut(html: string, o: GenOptions) {
  await sleep(300, o.signal);
  const step = Math.max(160, Math.ceil(html.length / 30));
  for (let i = step; i < html.length + step; i += step) {
    o.onCode(html.slice(0, i));
    await sleep(20, o.signal);
  }
}

/**
 * 修复类会话（质量一键优化 / 运行时自愈）：有 Key 时交给 AI，无 Key 或失败时采用规则修补结果。
 */
export async function repair(
  o: GenOptions,
  fallback: { html: string; changes: string[] },
  label: string,
): Promise<GenResult & { fallbackReason?: string }> {
  const mock = async (): Promise<GenResult> => {
    await streamOut(fallback.html, o);
    const summary = fallback.changes.length
      ? `【Mock 降级${label}】已按规则完成修补：\n${fallback.changes.map((c) => `• ${c}`).join('\n')}\n\n提示：规则修补只覆盖常见问题；在设置中填写 API Key 后可以让 AI 深度修复。`
      : `【Mock 降级${label}】没有匹配到可自动修补的规则，已保留当前版本。在设置中填写 API Key 后，AI 可以结合堆栈和源码深度修复。`;
    return { html: fallback.html, summary, source: 'mock' };
  };
  if (!o.settings.apiKey.trim()) return mock();
  try {
    return await llmGenerate(o);
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    return { ...(await mock()), fallbackReason: (e as Error).message };
  }
}

/** 非流式单轮补全（用于 AI 生成测试用例） */
export async function complete(settings: Settings, prompt: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(`${settings.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify({ model: settings.model, messages: [{ role: 'user', content: prompt }], temperature: 0.3 }),
    signal,
  });
  if (!res.ok) throw new Error(`接口返回 ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export interface ConverseResult {
  /** 左侧展示的文字（已去掉 HTML 代码块） */
  reply: string;
  /** 模型返回了 html 代码块时才有值；为 null 表示纯对话，画布保持不变 */
  html: string | null;
  source: 'mock' | 'llm';
  fallbackReason?: string;
}

const chatSystem = (hasPage: boolean) => {
  const now = new Date().toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit' });
  return `你是 Atoms-Lite 内置的 AI 助手，同时具备网页应用生成能力。当前本地时间：${now}。
- 用户闲聊、问候或提问（包括问日期、问你是什么模型、问知识类问题等）时，像普通助手一样用自然语言如实、简洁地回答，不要输出任何代码块，也不要强行推销建站功能。
- 只有当用户明确要求创建网页/应用，或修改当前页面时，先用一两句中文概述本次生成/修改内容，再输出唯一一个 \`\`\`html 代码块，包含完整、可独立运行的单文件 <!DOCTYPE html> 文档（内联 CSS 与 JS，美观、响应式，中文文案）。
- ${hasPage ? '用户消息中会附带当前页面代码；修改时请在其基础上增量修改并返回完整新文件。' : '当前还没有生成页面。'}`;
};

/** 去掉回复中的 HTML 代码块，左侧只展示文字 */
const stripCode = (text: string) => text.replace(/```html[\s\S]*?(```|$)/gi, '').trim();

async function llmConverse(o: GenOptions): Promise<ConverseResult> {
  const { baseUrl, apiKey, model } = o.settings;
  const messages = [
    { role: 'system', content: chatSystem(!!o.currentHtml) },
    ...o.history.slice(-10),
    { role: 'user', content: o.currentHtml ? `${o.prompt}\n\n（当前页面代码，仅在需要修改页面时参考）\n\`\`\`html\n${o.currentHtml}\n\`\`\`` : o.prompt },
  ];
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, stream: true, temperature: 0.5 }),
    signal: o.signal,
  });
  if (!res.ok || !res.body) throw new Error(`接口返回 ${res.status}：${(await res.text()).slice(0, 160)}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      const data = line.replace(/^data:\s*/, '').trim();
      if (!data || data === '[DONE]' || !line.startsWith('data:')) continue;
      try {
        text += JSON.parse(data).choices?.[0]?.delta?.content ?? '';
      } catch {
        /* 忽略不完整分片 */
      }
    }
    if (/```html/i.test(text)) o.onCode(extractHtml(text));
  }
  const fenced = text.match(/```html\s*([\s\S]*?)(```|$)/i);
  const html = fenced ? fenced[1].trim() : null;
  if (!text.trim()) throw new Error('模型返回了空内容');
  const reply = stripCode(text) || (html ? '已根据需求完成生成。' : text.trim());
  return { reply: html ? `${reply}\n\n（页面代码 ${html.length} 字符已更新到右侧画布，可在「源码」查看）` : reply, html: html || null, source: 'llm' };
}

/** 本地降级：关键词规则判断，闲聊用预设问候，建站走 Mock 引擎 */
async function mockConverse(o: GenOptions, fallbackReason?: string): Promise<ConverseResult> {
  if (ruleIntent(o.prompt, !!o.currentHtml) === 'chat') {
    await sleep(250, o.signal);
    return { reply: mockChatReply(o.prompt, !!o.currentHtml), html: null, source: 'mock', fallbackReason };
  }
  const r = await mockGenerate(o);
  return { reply: r.summary, html: r.html, source: 'mock', fallbackReason };
}

/** 统一对话入口：有 Key 时每条消息都真实请求模型，由回复是否含 html 代码块决定是否更新画布；未配置或请求失败时才降级本地 */
export async function converse(o: GenOptions): Promise<ConverseResult> {
  if (!o.settings.apiKey.trim()) return mockConverse(o);
  try {
    return await llmConverse(o);
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    return mockConverse(o, (e as Error).message || '网络错误');
  }
}

/** 有 API Key 时调用真实模型，失败或未配置时降级到 Mock 引擎 */
export async function generate(o: GenOptions): Promise<GenResult & { fallbackReason?: string }> {
  if (!o.settings.apiKey.trim()) return mockGenerate(o);
  try {
    return await llmGenerate(o);
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    const r = await mockGenerate(o);
    return { ...r, fallbackReason: (e as Error).message };
  }
}
