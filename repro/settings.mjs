import { createRequire } from 'module';
const require = createRequire('/workspace/app/frontend/package.json');
const { chromium } = require('playwright');

const browser = await chromium.launch({ executablePath: '/opt/ms-playwright/chromium-1169/chrome-linux/chrome' });
const out = [];
for (const [w, h] of [[375, 667], [768, 1024], [1440, 900]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const dialogs = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); d.accept(); });
  await page.goto('http://localhost:3000/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /番茄钟/ }).first().click();
  await page.waitForTimeout(4000);
  const tab = page.getByRole('button', { name: 'AI 控制台' });
  if (await tab.isVisible().catch(() => false)) await tab.click();
  await page.getByRole('button', { name: '设置' }).first().click();
  await page.waitForTimeout(700);
  const btn = page.getByRole('button', { name: '清空并重置所有数据' });
  const info = await btn.evaluate((b) => {
    const r = b.getBoundingClientRect();
    const pts = [[r.left + 4, r.top + 3], [r.right - 4, r.bottom - 3], [r.left + r.width / 2, r.top + r.height / 2]];
    const hitOk = pts.every(([x, y]) => { const e = document.elementFromPoint(x, y); return e === b || b.contains(e); });
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, inView: r.top >= 0 && r.bottom <= innerHeight, hitOk };
  });
  await page.screenshot({ path: `/workspace/repro/settings-${w}.png` });
  const before = await page.evaluate(() => Object.keys(localStorage).length);
  await btn.click();
  await page.waitForTimeout(1000);
  const confirmBtn = page.getByRole('button', { name: /确认|清空|重置/ }).filter({ hasNotText: '清空并重置所有数据' });
  let uiConfirm = false;
  if (await confirmBtn.count()) { uiConfirm = true; await page.screenshot({ path: `/workspace/repro/settings-${w}-confirm.png` }); await confirmBtn.last().click(); await page.waitForTimeout(800); }
  const after = await page.evaluate(() => ({ keys: Object.keys(localStorage), text: document.body.innerText.includes('描述你想要的应用') }));
  out.push({ w, ...info, dialogs, uiConfirm, before, after });
  await page.close();
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
