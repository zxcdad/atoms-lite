import { createRequire } from 'module';
const require = createRequire('/workspace/app/frontend/package.json');
const { chromium } = require('playwright');

const browser = await chromium.launch({ executablePath: '/opt/ms-playwright/chromium-1169/chrome-linux/chrome' });
const RED_HTML = (c) => `<!DOCTYPE html><html><head><style>:root{--primary:${c}}</style></head><body><h1>LLM 番茄钟</h1></body></html>`;
const REPLIES = {
  今天周几: '今天是 2026 年 10 月 1 日，星期四。',
  你是什么模型: '我是 DeepSeek 提供的 deepseek-chat 模型，在 Atoms-Lite 中为你服务。',
  你好: '你好呀！有什么可以帮你的吗？',
  帮我做一个番茄钟: `好的，已生成番茄钟。\n\`\`\`html\n${RED_HTML('#f25f4c')}\n\`\`\``,
  把主色改成红色: `已将主色改为红色。\n\`\`\`html\n${RED_HTML('#ff0000')}\n\`\`\``,
};
const sse = (text) => {
  const parts = text.match(/[\s\S]{1,12}/g).map((c) => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`);
  return parts.join('') + 'data: [DONE]\n\n';
};
const state = (page) =>
  page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('atoms-lite:store:v1') || '{}');
    const p = (s.projects || []).find((x) => x.id === s.activeProjectId) || (s.projects || [])[0] || { messages: [], versions: [] };
    const cur = p.versions.find((v) => v.id === p.currentVersionId);
    const last = p.messages[p.messages.length - 1];
    return { msgs: p.messages.length, versions: p.versions.length, cur: p.currentVersionId, primary: cur?.html.match(/--primary:([^;}]+)/)?.[1] ?? null, last: last?.role === 'assistant' ? last.content : null, source: last?.source };
  });

async function run(page, w, tag, text, mode) {
  if (w < 1024) await page.getByRole('button', { name: /AI 控制台/ }).first().click().catch(() => {});
  const before = await state(page);
  await page.locator('textarea').fill(text);
  await page.getByRole('button', { name: '发送' }).click();
  await page.waitForFunction((n) => {
    const s = JSON.parse(localStorage.getItem('atoms-lite:store:v1') || '{}');
    const p = s.projects.find((x) => x.id === s.activeProjectId) || s.projects[0];
    return p.messages.length >= n + 2 && p.messages[p.messages.length - 1].role === 'assistant';
  }, before.msgs, { timeout: 30000 });
  await page.waitForTimeout(600);
  const after = await state(page);
  if (w < 1024) await page.getByRole('button', { name: /AI 控制台/ }).first().click().catch(() => {});
  await page.waitForTimeout(200);
  await page.screenshot({ path: `/workspace/repro/llm-chat-${tag}-${w}.png` });
  return { before, after };
}

const out = [];
for (const [w, h] of [[375, 667], [1440, 900]]) {
  for (const mode of ['ok', '401', 'neterr', 'nokey']) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const calls = [];
    await page.route('**/chat/completions', async (route) => {
      const body = JSON.parse(route.request().postData());
      const user = body.messages[body.messages.length - 1].content.split('\n\n（当前页面代码')[0];
      calls.push({ user, stream: body.stream, msgs: body.messages.length, hasCtx: body.messages[body.messages.length - 1].content.includes('<!DOCTYPE') });
      if (mode === '401') return route.fulfill({ status: 401, body: '{"error":{"message":"Authentication Fails"}}' });
      if (mode === 'neterr') return route.abort('failed');
      return route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: sse(REPLIES[user] ?? '未知') });
    });
    await page.goto('http://localhost:3000/');
    await page.evaluate((k) => {
      localStorage.clear();
      if (k) localStorage.setItem('atoms-lite:settings:v1', JSON.stringify({ provider: 'deepseek', baseUrl: 'https://api.deepseek.com/v1', apiKey: 'sk-test', model: 'deepseek-chat' }));
    }, mode !== 'nokey');
    await page.reload();
    await page.waitForTimeout(1200);
    const list = mode === 'ok' ? Object.keys(REPLIES) : ['你好', '帮我做一个番茄钟'];
    for (const text of list) {
      const n = calls.length;
      const tag = `${mode}-${{ 今天周几: 'weekday', 你是什么模型: 'model', 你好: 'hello', 帮我做一个番茄钟: 'build', 把主色改成红色: 'edit' }[text]}`;
      const { before, after } = await run(page, w, tag, text, mode);
      const requested = calls.length > n;
      const isBuild = /做|改/.test(text);
      let ok;
      if (mode === 'ok') {
        const call = calls[calls.length - 1];
        ok = requested && call.stream === true && (isBuild ? after.versions === before.versions + 1 && after.cur !== before.cur : after.versions === before.versions && after.cur === before.cur && after.last === REPLIES[text]) && !after.last.includes('<!DOCTYPE');
        if (text === '把主色改成红色') ok = ok && after.primary === '#ff0000' && call.hasCtx && call.msgs > 2;
      } else if (mode === 'nokey') {
        ok = !requested && after.source === 'mock' && (isBuild ? after.versions === before.versions + 1 : after.versions === before.versions);
      } else {
        ok = requested && after.source === 'mock' && after.last.startsWith('⚠️ 模型请求失败') && (isBuild ? after.versions === before.versions + 1 : after.versions === before.versions);
      }
      out.push({ w, mode, text, ok, requested, versions: `${before.versions}->${after.versions}`, primary: after.primary, reply: after.last.slice(0, 60).replace(/\n/g, ' ') });
    }
    out.push({ w, mode, hScroll: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
    await page.close();
  }
}
console.log(JSON.stringify(out, null, 0).replace(/\},\{/g, '},\n{'));
console.log('ALL_OK=', out.filter((x) => 'ok' in x).every((x) => x.ok), 'NO_HSCROLL=', out.filter((x) => 'hScroll' in x).every((x) => !x.hScroll));
await browser.close();
