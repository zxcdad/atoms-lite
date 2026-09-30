import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/workspace/app/frontend/package.json');
const { chromium } = require('playwright');

const browser = await chromium.launch({ executablePath: '/opt/ms-playwright/chromium-1169/chrome-linux/chrome' });
const out = [];
const box = (l) => l.evaluate((b) => { const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { w: Math.round(r.width), inView: r.left >= 0 && r.right <= innerWidth && r.top >= 0, hit: e === b || b.contains(e), disabled: b.disabled, title: b.title }; });
for (const [w, h] of [[375, 667], [768, 1024], [1440, 900]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, acceptDownloads: true });
  await page.goto('http://localhost:3000/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const tab = page.getByRole('button', { name: '实时预览' });
  const narrow = await tab.isVisible().catch(() => false);
  if (narrow) await tab.click();
  const dl = page.getByRole('button', { name: '下载 HTML' }).first();
  const empty = await box(dl);
  await page.screenshot({ path: `/workspace/repro/download-${w}-empty.png` });
  if (narrow) await page.getByRole('button', { name: 'AI 控制台' }).click();
  await page.getByRole('button', { name: /番茄钟/ }).first().click();
  await page.waitForTimeout(5000);
  if (narrow) await tab.click();
  await page.waitForTimeout(1500);
  const ready = await box(dl);
  await page.screenshot({ path: `/workspace/repro/download-${w}.png` });
  const [d] = await Promise.all([page.waitForEvent('download'), dl.click()]);
  const p = `/workspace/repro/dl-${w}-${d.suggestedFilename()}`;
  await d.saveAs(p);
  const txt = fs.readFileSync(p, 'utf8');
  out.push({ w, empty, ready, file: d.suggestedFilename(), bytes: txt.length, complete: /^<!DOCTYPE html>/i.test(txt.trim()) && /<\/html>\s*$/i.test(txt) });
  await page.close();
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
