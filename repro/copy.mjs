import { createRequire } from 'module';
const require = createRequire('/workspace/app/frontend/package.json');
const { chromium } = require('playwright');

const browser = await chromium.launch({ executablePath: '/opt/ms-playwright/chromium-1169/chrome-linux/chrome' });
const out = [];
const HEAD = '| 编号 | 模块名称 | 测试场景 | 前置条件 | 操作步骤 | 预期结果 |';

for (const [w, h] of [[375, 667], [768, 1024], [1440, 900]]) {
  // 不授予任何剪贴板权限；外层页面用无 allow 属性的 iframe 嵌入（模拟 App Viewer）
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('about:blank');
  await page.setContent(`<body style="margin:0"><iframe src="http://localhost:3000/" style="border:0;width:100vw;height:100vh"></iframe></body>`);
  await page.waitForTimeout(2500);
  const f = page.frames().find((x) => x.url().startsWith('http://localhost:3000'));
  const r = { w };
  const narrow = w < 1024;
  await f.getByRole('button', { name: /番茄钟/ }).first().click();
  await page.waitForTimeout(4500);
  if (narrow) await f.getByRole('button', { name: 'AI 控制台', exact: true }).click();
  await f.getByRole('button', { name: '用例' }).click();
  await page.waitForTimeout(600);

  // 记录 copy 事件实际写入的文本 + 原生 API 的失败情况
  r.apiResult = await f.evaluate(() => (navigator.clipboard ? navigator.clipboard.writeText('x').then(() => 'ok', (e) => e.name) : `undefined (isSecureContext=${isSecureContext})`));
  await f.evaluate(() => {
    window.__copied = null;
    document.addEventListener('copy', () => {
      const a = document.activeElement;
      window.__copied = a && a.tagName === 'TEXTAREA' ? a.value : String(getSelection());
    });
  });

  // 路径 A：Clipboard API 被拒 → execCommand 降级
  const btn = f.getByRole('button', { name: /复制 Markdown/ });
  const bb = await btn.boundingBox();
  r.btnInView = bb.x >= 0 && bb.x + bb.width <= w && bb.y >= 0 && bb.y + bb.height <= h;
  await btn.click();
  await page.waitForTimeout(500);
  r.fallbackCopied = ((await f.evaluate(() => window.__copied)) || '').includes(HEAD);
  r.btnLabel = (await f.getByRole('button', { name: /已复制|复制 Markdown/ }).textContent()).trim();
  r.toast = (await f.locator('[data-sonner-toast]').first().textContent().catch(() => '')).trim();
  await page.screenshot({ path: `/workspace/repro/copy-fallback-${w}.png` });
  await page.waitForTimeout(1600);

  // 路径 B：execCommand 也失败 → 手动复制弹窗
  await f.evaluate(() => { document.execCommand = () => false; });
  await f.getByRole('button', { name: /复制 Markdown/ }).click();
  await page.waitForTimeout(700);
  const dlg = f.locator('[data-manual-copy]');
  r.dialog = await dlg.isVisible();
  const db = await dlg.boundingBox();
  r.dialogInView = !!db && db.x >= 0 && db.x + db.width <= w && db.y >= 0 && db.y + db.height <= h;
  r.dialogFull = (await dlg.locator('textarea').inputValue()).includes(HEAD);
  r.selectedAll = await f.evaluate(() => { const t = document.querySelector('[data-manual-copy] textarea'); return document.activeElement === t && t.selectionEnd - t.selectionStart === t.value.length; });
  const done = await f.getByRole('button', { name: '完成' }).boundingBox();
  r.doneInView = !!done && done.y + done.height <= h;
  r.errToast = (await f.locator('[data-sonner-toast]').first().textContent().catch(() => '')).trim();
  await page.screenshot({ path: `/workspace/repro/copy-manual-${w}.png` });
  await f.getByRole('button', { name: '完成' }).click();

  // 源码视图复制同样走降级
  await f.evaluate(() => { delete document.execCommand; window.__copied = null; });
  await f.getByRole('button', { name: '源码' }).click();
  await f.getByRole('button', { name: /复制代码/ }).click();
  await page.waitForTimeout(400);
  r.codeCopied = ((await f.evaluate(() => window.__copied)) || '').startsWith('<!DOCTYPE');
  out.push(r);
  await ctx.close();
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
