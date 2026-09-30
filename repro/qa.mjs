import { createRequire } from 'module';
const require = createRequire('/workspace/app/frontend/package.json');
const { chromium } = require('playwright');

const browser = await chromium.launch({ executablePath: '/opt/ms-playwright/chromium-1169/chrome-linux/chrome' });
const out = [];
const BAD = `<script>document.getElementById('nope').addEventListener('click',()=>{});missingFn();</script><img src="hero.png"><button></button>`;

for (const [w, h] of [[375, 667], [768, 1024], [1440, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:3000' });
  const page = await ctx.newPage();
  const r = { w };
  const narrow = w < 1024;
  const tab = async (name) => { if (narrow) await page.getByRole('button', { name, exact: true }).click(); };
  await page.goto('http://localhost:3000/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /番茄钟/ }).first().click();
  await page.waitForTimeout(4500);

  // 注入缺陷版本（缺 alt、空按钮、运行时错误）
  await page.evaluate((bad) => {
    const s = JSON.parse(localStorage.getItem('atoms-lite:store:v1'));
    const p = s.projects.find((x) => x.id === s.activeProjectId);
    const v = p.versions.find((x) => x.id === p.currentVersionId);
    v.html = v.html.replace(/<meta name="viewport"[^>]*>/i, '').replace('</body>', bad + '</body>');
    localStorage.setItem('atoms-lite:store:v1', JSON.stringify(s));
  }, BAD);
  await page.reload();
  await tab('实时预览');
  await page.waitForTimeout(2500);

  // 1. 质量体检
  await page.locator('[data-qa-btn]').click();
  await page.waitForTimeout(900);
  r.scoreBefore = Number(await page.locator('[data-qa-score]').textContent());
  r.fails = await page.locator('[data-qa-report] li').filter({ hasText: /FAIL|WARN/ }).count();
  await page.screenshot({ path: `/workspace/repro/qa-audit-${w}.png` });
  const opt = page.getByRole('button', { name: '一键优化' });
  const ob = await opt.boundingBox();
  r.optimizeInView = ob.y >= 0 && ob.y + ob.height <= h;
  await opt.click();
  await page.waitForTimeout(3500);
  await tab('实时预览');
  await page.waitForTimeout(1500);
  await page.locator('[data-qa-btn]').click();
  await page.waitForTimeout(900);
  r.scoreAfter = Number(await page.locator('[data-qa-score]').textContent());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // 2. 运行时异常 + 自愈（优化后仍残留 missingFn / null 错误）
  await page.getByRole('button', { name: '刷新预览' }).click();
  await page.waitForTimeout(2500);
  r.errText = (await page.locator('footer').textContent()).match(/\d+ 个 JS 错误|无运行时错误/)?.[0];
  r.healVisible = await page.locator('[data-heal-btn]').isVisible();
  const hb = await page.locator('[data-heal-btn]').boundingBox();
  r.healInView = !!hb && hb.x >= 0 && hb.x + hb.width <= w;
  await page.screenshot({ path: `/workspace/repro/qa-error-${w}.png` });
  r.healRounds = 0;
  for (let i = 0; i < 3; i++) {
    if (!(await page.locator('[data-heal-btn]').isVisible())) break;
    await page.locator('[data-heal-btn]').click();
    r.healRounds++;
    await page.waitForTimeout(3500);
    if (i === 0) {
      r.healMsg = (await page.locator('[data-chat-scroll]').textContent()).includes('Mock 降级自愈');
      await page.screenshot({ path: `/workspace/repro/qa-heal-chat-${w}.png` });
    }
    await tab('实时预览');
    await page.waitForTimeout(2500);
  }
  r.errAfterHeal = (await page.locator('footer').textContent()).match(/\d+ 个 JS 错误|无运行时错误/)?.[0];
  await page.screenshot({ path: `/workspace/repro/qa-healed-${w}.png` });

  // 3. 测试用例
  await tab('AI 控制台');
  await page.getByRole('button', { name: '用例' }).click();
  await page.waitForTimeout(800);
  r.caseRows = await page.locator('[data-cases] tbody tr').count();
  await page.getByRole('button', { name: /复制 Markdown/ }).click();
  const md = await page.evaluate(() => navigator.clipboard.readText());
  r.mdOk = md.includes('| 编号 | 模块名称 | 测试场景 | 前置条件 | 操作步骤 | 预期结果 |');
  r.hScroll = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  await page.screenshot({ path: `/workspace/repro/qa-cases-${w}.png` });
  out.push(r);
  await ctx.close();
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
