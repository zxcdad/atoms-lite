import { createRequire } from 'module';
const require = createRequire('/workspace/app/frontend/package.json');
const { chromium } = require('playwright');

const browser = await chromium.launch({ executablePath: '/opt/ms-playwright/chromium-1169/chrome-linux/chrome' });
const CASES = [['hello', '你好', 'chat'], ['ability', '你能做什么', 'chat'], ['build', '帮我做一个番茄钟', 'build'], ['edit', '把主色改成红色', 'build']];
const state = (page) =>
  page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('atoms-lite:store:v1') || '{}');
    const p = (s.projects || []).find((x) => x.id === s.activeProjectId) || (s.projects || [])[0] || { messages: [], versions: [] };
    const cur = p.versions.find((v) => v.id === p.currentVersionId);
    const last = p.messages[p.messages.length - 1];
    return { msgs: p.messages.length, versions: p.versions.length, cur: p.currentVersionId, primary: cur?.html.match(/--primary:([^;}]+)/)?.[1] ?? null, last: last?.role === 'assistant' ? last.content.slice(0, 40) : null, hasVersionLink: !!last?.versionId };
  });
const out = [];
for (const [w, h] of [[375, 667], [1440, 900]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto('http://localhost:3000/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(1500);
  for (const [tag, text, expect] of CASES) {
    if (w < 1024) await page.getByRole('button', { name: /AI 控制台/ }).first().click().catch(() => {});
    const before = await state(page);
    await page.locator('textarea').fill(text);
    await page.getByRole('button', { name: '发送' }).click();
    await page.waitForFunction((n) => {
      const s = JSON.parse(localStorage.getItem('atoms-lite:store:v1') || '{}');
      const p = s.projects.find((x) => x.id === s.activeProjectId) || s.projects[0];
      return p.messages.length >= n + 2 && p.messages[p.messages.length - 1].role === 'assistant';
    }, before.msgs, { timeout: 30000 });
    await page.waitForTimeout(800);
    const after = await state(page);
    const iframeText = await page.locator('iframe').first().evaluate((f) => f.contentDocument?.body?.innerText.slice(0, 30) ?? '').catch(() => '(无 iframe)');
    const ok = expect === 'chat' ? after.versions === before.versions && after.cur === before.cur && !after.hasVersionLink : after.versions === before.versions + 1 && after.cur !== before.cur;
    await page.screenshot({ path: `/workspace/repro/intent-${tag}-${w}.png` });
    out.push({ w, text, expect, ok, versions: `${before.versions}->${after.versions}`, primary: after.primary, reply: after.last, iframe: iframeText, hScroll: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
  }
  await page.close();
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
