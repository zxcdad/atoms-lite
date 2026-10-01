import { createRequire } from 'module';
const require = createRequire('/workspace/app/frontend/package.json');
const { chromium } = require('playwright');

const browser = await chromium.launch({ executablePath: '/opt/ms-playwright/chromium-1169/chrome-linux/chrome' });
const out = [];
for (const [w, h] of [[375, 667], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto('http://localhost:3000/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(1500);
  // 模拟 Netlify 角标：右下角固定 300×56
  await page.evaluate(() => {
    const b = document.createElement('div');
    b.id = 'fake-badge';
    b.textContent = 'Powered by Netlify';
    Object.assign(b.style, { position: 'fixed', right: '16px', bottom: '16px', width: '300px', height: '56px', background: '#0e2a2e', color: '#fff', borderRadius: '28px', zIndex: 2147483647, display: 'flex', alignItems: 'center', justifyContent: 'center' });
    document.body.appendChild(b);
  });
  await page.locator('textarea').fill('把主色调换成紫色');
  const btn = page.getByRole('button', { name: '发送' });
  const r = await btn.evaluate((el) => {
    const a = el.getBoundingClientRect();
    const b = document.getElementById('fake-badge').getBoundingClientRect();
    const overlap = !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
    // 圆角按钮的四个角落在 border-radius 外，取内缩 6px 的点
    const pts = [[a.left + a.width / 2, a.top + a.height / 2], [a.left + 6, a.top + 6], [a.right - 6, a.bottom - 6]];
    const hits = pts.map(([x, y]) => { const t = document.elementFromPoint(x, y); return t === el || el.contains(t) ? 'btn' : `${t?.tagName}#${t?.id}.${String(t?.className).slice(0, 30)}`; });
    return { btnBottom: Math.round(a.bottom), badgeTop: Math.round(b.top), overlap, hit: hits.every((x) => x === 'btn'), hits, disabled: el.disabled, hScroll: document.documentElement.scrollWidth > innerWidth };
  });
  await page.screenshot({ path: `/workspace/repro/netlify-badge-${w}.png` });
  out.push({ w, ...r });
  await page.close();
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
