import { createRequire } from 'module';
const require = createRequire('/workspace/app/frontend/package.json');
const { chromium } = require('playwright');

const LABELS = ['番茄钟', '贪吃蛇', '待办看板', '登录表单'];
const SIZES = { desktop: { width: 1440, height: 900 }, narrow: { width: 390, height: 844 } };
const EDITS = ['把主色调换成紫色', '切换成浅色模式'];

const browser = await chromium.launch({ executablePath: '/opt/ms-playwright/chromium-1169/chrome-linux/chrome' });
const results = [];
const bad = new Set();

async function frameInfo(page) {
  const handle = await page.$('iframe[title="实时预览"]');
  if (!handle) return { iframe: false };
  const box = await handle.boundingBox();
  const fr = await handle.contentFrame();
  const inner = fr ? await fr.evaluate(() => ({
    text: document.body.innerText.slice(0, 50).replace(/\s+/g, ' '),
    els: document.body.querySelectorAll('*').length,
    h: document.body.getBoundingClientRect().height,
    primary: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(),
  })).catch((e) => ({ err: e.message })) : null;
  return { box: box && `${Math.round(box.width)}x${Math.round(box.height)}`, inner };
}

const waitDone = (page) => page.waitForFunction(() => !document.body.innerText.includes('正在生成'), null, { timeout: 30000 }).then(() => page.waitForTimeout(1200));

for (const [sizeName, viewport] of Object.entries(SIZES)) {
  for (const label of LABELS) {
    const page = await browser.newPage({ viewport });
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    page.on('response', (r) => r.status() >= 400 && bad.add(`${r.status()} ${r.url()}`));
    await page.goto('http://localhost:3000/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole('button', { name: new RegExp(label) }).first().click();
    await waitDone(page);
    const first = await frameInfo(page);
    await page.screenshot({ path: `/workspace/repro/shot-${sizeName}-${label}-v1.png` });
    // 交互：点击 iframe 内第一个按钮
    const fr = await (await page.$('iframe[title="实时预览"]'))?.contentFrame();
    let interact = 'n/a';
    if (fr) interact = await fr.locator('button').first().click({ timeout: 3000 }).then(() => 'ok').catch((e) => 'fail:' + e.message.slice(0, 60));
    // 多轮修改（窄屏需切回控制台）
    const edits = [];
    for (const t of EDITS) {
      const tab = page.getByRole('button', { name: /AI 控制台/ });
      if (await tab.count()) await tab.first().click();
      await page.getByRole('textbox').last().fill(t);
      await page.getByRole('button', { name: '发送' }).click();
      await waitDone(page);
      const pv = page.getByRole('button', { name: /实时预览/ });
      if (await pv.count()) await pv.first().click();
      await page.waitForTimeout(800);
      edits.push(await frameInfo(page));
    }
    await page.screenshot({ path: `/workspace/repro/shot-${sizeName}-${label}-v3.png` });
    results.push({ sizeName, label, first, interact, edits, errs: errs.slice(0, 3) });
    await page.close();
  }
}
console.log(JSON.stringify(results));
console.log('BAD', [...bad]);
await browser.close();
