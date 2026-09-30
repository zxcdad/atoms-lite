/** QA & Reliability Guard：静态体检、规则修复、运行时自愈与测试用例生成 */

export type Category = '规范性' | '可访问性' | '健壮性';

export interface Check {
  id: string;
  category: Category;
  title: string;
  weight: number;
  /** 通过比例 0~1 */
  ratio: number;
  detail: string;
  suggestion: string;
}

export interface AuditReport {
  score: number;
  checks: Check[];
  issues: Check[];
}

export interface FixResult {
  html: string;
  changes: string[];
}

export interface TestCase {
  module: string;
  scenario: string;
  pre: string;
  steps: string;
  expected: string;
}

export const CATEGORIES: Category[] = ['规范性', '可访问性', '健壮性'];

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');
const JS_TYPE = /^(|text\/javascript|application\/javascript)$/i;
const inlineScripts = (doc: Document) =>
  [...doc.querySelectorAll('script:not([src])')].filter((s) => JS_TYPE.test((s.getAttribute('type') ?? '').trim()));

function syntaxError(code: string): string | null {
  try {
    new Function(code);
    return null;
  } catch (e) {
    return e instanceof SyntaxError ? e.message : null;
  }
}

const hasSemantic = (doc: Document) =>
  !!doc.querySelector('main,[role="main"]') || doc.querySelectorAll('header,nav,section,article,footer,aside').length >= 2;

const BUTTON_SEL = 'button,[role="button"],input[type="button"],input[type="submit"],input[type="reset"]';
const CONTROL_SEL = 'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]),select,textarea';

const hasName = (el: Element) =>
  !!(
    el.textContent?.trim() ||
    el.getAttribute('aria-label')?.trim() ||
    el.getAttribute('aria-labelledby') ||
    el.getAttribute('title')?.trim() ||
    (el.tagName === 'INPUT' && el.getAttribute('value')?.trim()) ||
    el.querySelector('img[alt]:not([alt=""])')
  );

const isLabeled = (doc: Document, el: Element) =>
  !!(
    el.closest('label') ||
    (el.id && doc.querySelector(`label[for="${CSS.escape(el.id)}"]`)) ||
    el.getAttribute('aria-label')?.trim() ||
    el.getAttribute('aria-labelledby') ||
    el.getAttribute('title')?.trim()
  );

const describe = (el: Element) => {
  const id = el.id ? `#${el.id}` : '';
  const cls = el.getAttribute('class')?.split(/\s+/).filter(Boolean)[0];
  return `<${el.tagName.toLowerCase()}${id}${!id && cls ? `.${cls}` : ''}>`;
};

const listOf = (els: Element[], max = 4) =>
  els.slice(0, max).map(describe).join('、') + (els.length > max ? ` 等 ${els.length} 处` : '');

/** 对 HTML 源码做即时静态体检，返回 0~100 综合评分 */
export function auditHtml(html: string): AuditReport {
  const doc = parse(html);
  const checks: Check[] = [];
  const add = (c: Check) => checks.push(c);

  const doctype = /^\s*(<!--[\s\S]*?-->\s*)*<!DOCTYPE html>/i.test(html);
  add({ id: 'doctype', category: '规范性', title: '标准 <!DOCTYPE html> 声明', weight: 10, ratio: doctype ? 1 : 0, detail: doctype ? '文档以 HTML5 DOCTYPE 开头' : '缺少 DOCTYPE，浏览器会进入怪异模式', suggestion: '在文件首行添加 <!DOCTYPE html>' });

  const charset = !!doc.querySelector('meta[charset],meta[http-equiv="Content-Type" i]');
  add({ id: 'charset', category: '规范性', title: '字符编码声明', weight: 5, ratio: charset ? 1 : 0, detail: charset ? '已声明字符编码' : '未声明字符编码，中文可能乱码', suggestion: '在 <head> 中添加 <meta charset="UTF-8">' });

  const vp = doc.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? '';
  const vpOk = /width\s*=\s*device-width/i.test(vp);
  add({ id: 'viewport', category: '规范性', title: 'viewport 响应式声明', weight: 10, ratio: vpOk ? 1 : 0, detail: vpOk ? `content="${vp}"` : '缺少 width=device-width，移动端会被缩放显示', suggestion: '添加 <meta name="viewport" content="width=device-width, initial-scale=1.0">' });

  const lang = doc.documentElement.getAttribute('lang');
  add({ id: 'lang', category: '规范性', title: '<html lang> 语言属性', weight: 5, ratio: lang ? 1 : 0, detail: lang ? `lang="${lang}"` : '未声明页面语言，读屏软件无法正确朗读', suggestion: '为 <html> 添加 lang="zh-CN"' });

  const title = doc.title.trim();
  add({ id: 'title', category: '规范性', title: '页面标题 <title>', weight: 5, ratio: title ? 1 : 0, detail: title ? `「${title}」` : '标题为空', suggestion: '设置有意义的 <title>' });

  const semTags = [...new Set([...doc.querySelectorAll('header,nav,main,section,article,footer,aside,[role="main"]')].map((e) => e.tagName.toLowerCase()))];
  const semOk = hasSemantic(doc);
  add({ id: 'semantic', category: '规范性', title: '语义化标签', weight: 10, ratio: semOk ? 1 : semTags.length ? 0.5 : 0, detail: semTags.length ? `使用了 ${semTags.join('、')}` : '页面全部由 div 构成，没有语义化结构', suggestion: '使用 <header>/<main>/<section>/<footer> 组织页面，至少提供一个 main 区域' });

  const imgs = [...doc.querySelectorAll('img')];
  const noAlt = imgs.filter((i) => !i.hasAttribute('alt'));
  add({ id: 'alt', category: '可访问性', title: '图片 alt 替代文本', weight: 10, ratio: imgs.length ? 1 - noAlt.length / imgs.length : 1, detail: !imgs.length ? '页面没有 <img> 图片' : noAlt.length ? `${noAlt.length}/${imgs.length} 张图片缺少 alt：${listOf(noAlt)}` : `${imgs.length} 张图片均有 alt`, suggestion: '为每张图片添加描述性 alt，装饰性图片使用 alt=""' });

  const btns = [...doc.querySelectorAll(BUTTON_SEL)];
  const noName = btns.filter((b) => !hasName(b));
  add({ id: 'button-name', category: '可访问性', title: '交互按钮可用标签', weight: 10, ratio: btns.length ? 1 - noName.length / btns.length : 1, detail: !btns.length ? '页面没有按钮' : noName.length ? `${noName.length}/${btns.length} 个按钮没有文本或 aria-label：${listOf(noName)}` : `${btns.length} 个按钮均有可读名称`, suggestion: '为纯图标按钮补充 aria-label 或可见文本' });

  const ctrls = [...doc.querySelectorAll(CONTROL_SEL)];
  const noLabel = ctrls.filter((c) => !isLabeled(doc, c));
  add({ id: 'label', category: '可访问性', title: '表单控件关联 label', weight: 5, ratio: ctrls.length ? 1 - noLabel.length / ctrls.length : 1, detail: !ctrls.length ? '页面没有表单控件' : noLabel.length ? `${noLabel.length}/${ctrls.length} 个控件仅靠 placeholder 或无标签：${listOf(noLabel)}` : `${ctrls.length} 个控件均已关联标签`, suggestion: '使用 <label for> 关联控件，或补充 aria-label（placeholder 不能替代标签）' });

  const scripts = inlineScripts(doc);
  const broken = scripts.map((s, i) => ({ i: i + 1, err: syntaxError(s.textContent ?? '') })).filter((x) => x.err);
  add({ id: 'syntax', category: '健壮性', title: '内联 JS 语法预检', weight: 15, ratio: broken.length ? 0 : 1, detail: !scripts.length ? '没有内联脚本' : broken.length ? broken.map((b) => `第 ${b.i} 个 <script>：${b.err}`).join('；') : `${scripts.length} 段内联脚本语法检查通过`, suggestion: '修正语法错误，否则整段脚本都不会执行' });

  const ext = [
    ...[...doc.querySelectorAll('link[rel~="stylesheet"]')].map((l) => ({ kind: '样式', url: l.getAttribute('href') ?? '' })),
    ...[...doc.querySelectorAll('script[src]')].map((s) => ({ kind: '脚本', url: s.getAttribute('src') ?? '' })),
  ];
  const badExt = ext.filter((r) => !/^(https:)?\/\/\S+|^data:/i.test(r.url));
  add({ id: 'external', category: '健壮性', title: '外部样式库 / 脚本引入', weight: 10, ratio: ext.length ? 1 - badExt.length / ext.length : 1, detail: !ext.length ? '未引用外部资源，样式与脚本全部内联' : badExt.length ? `${badExt.length} 个引用无法在沙箱中加载：${badExt.map((b) => `${b.kind} "${b.url || '(空)'}"`).join('、')}` : `${ext.length} 个外部资源均为 HTTPS 绝对地址`, suggestion: '外部库使用 https:// 的 CDN 绝对地址；相对路径在单文件预览中无法加载' });

  const risky = scripts.filter((s) => /\bdocument\.write\s*\(|\beval\s*\(/.test(s.textContent ?? ''));
  add({ id: 'risky', category: '健壮性', title: '避免 eval / document.write', weight: 5, ratio: risky.length ? 0 : 1, detail: risky.length ? `${risky.length} 段脚本使用了 eval 或 document.write` : '未发现高风险 API', suggestion: '改用 DOM API 渲染，避免 eval 带来的安全与性能风险' });

  const score = Math.round(checks.reduce((s, c) => s + c.weight * c.ratio, 0));
  return { score, checks, issues: checks.filter((c) => c.ratio < 1) };
}

const serialize = (doc: Document) => `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;

function neutralizeBrokenScripts(doc: Document, changes: string[]) {
  inlineScripts(doc).forEach((s) => {
    const err = syntaxError(s.textContent ?? '');
    if (!err) return;
    s.textContent = `console.warn(${JSON.stringify(`[质量体检] 已停用一段存在语法错误的脚本：${err}`)});`;
    changes.push(`停用存在语法错误的脚本（${err}）`);
  });
}

/** 按体检建议做规则化修补（无 API Key 时的“一键优化”） */
export function autoFixHtml(html: string): FixResult {
  const doc = parse(html);
  const changes: string[] = [];
  if (!/^\s*<!DOCTYPE html>/i.test(html)) changes.push('补充 <!DOCTYPE html>');
  if (!doc.querySelector('meta[charset]')) {
    const m = doc.createElement('meta');
    m.setAttribute('charset', 'UTF-8');
    doc.head.prepend(m);
    changes.push('补充 <meta charset="UTF-8">');
  }
  const vp = doc.querySelector('meta[name="viewport"]');
  if (!vp || !/width\s*=\s*device-width/i.test(vp.getAttribute('content') ?? '')) {
    const m = vp ?? doc.createElement('meta');
    m.setAttribute('name', 'viewport');
    m.setAttribute('content', 'width=device-width, initial-scale=1.0');
    if (!vp) doc.head.appendChild(m);
    changes.push('补充 viewport 响应式声明');
  }
  if (!doc.documentElement.getAttribute('lang')) {
    doc.documentElement.setAttribute('lang', 'zh-CN');
    changes.push('为 <html> 添加 lang="zh-CN"');
  }
  if (!doc.title.trim()) {
    doc.title = doc.querySelector('h1')?.textContent?.trim() || '我的应用';
    changes.push(`设置页面标题「${doc.title}」`);
  }
  if (!hasSemantic(doc)) {
    const first = [...doc.body.children].find((e) => !['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT'].includes(e.tagName));
    if (first) {
      first.setAttribute('role', 'main');
      changes.push(`为主体容器 ${describe(first)} 添加 role="main" 地标`);
    }
  }
  const noAlt = [...doc.querySelectorAll('img:not([alt])')];
  noAlt.forEach((img) => {
    const stem = (img.getAttribute('src') ?? '').split(/[?#]/)[0].split('/').pop()?.replace(/\.\w+$/, '').replace(/[-_]+/g, ' ');
    img.setAttribute('alt', stem && !stem.startsWith('data:') ? stem : '图片');
  });
  if (noAlt.length) changes.push(`为 ${noAlt.length} 张图片补充 alt`);
  const noName = [...doc.querySelectorAll(BUTTON_SEL)].filter((b) => !hasName(b));
  noName.forEach((b) => b.setAttribute('aria-label', b.getAttribute('name') || b.id || '操作按钮'));
  if (noName.length) changes.push(`为 ${noName.length} 个按钮补充 aria-label`);
  const noLabel = [...doc.querySelectorAll(CONTROL_SEL)].filter((c) => !isLabeled(doc, c));
  noLabel.forEach((c) => c.setAttribute('aria-label', c.getAttribute('placeholder') || c.getAttribute('name') || '输入框'));
  if (noLabel.length) changes.push(`为 ${noLabel.length} 个表单控件补充 aria-label`);
  neutralizeBrokenScripts(doc, changes);
  let insecure = 0;
  doc.querySelectorAll('link[href^="http:"],script[src^="http:"]').forEach((el) => {
    const attr = el.tagName === 'LINK' ? 'href' : 'src';
    el.setAttribute(attr, el.getAttribute(attr)!.replace(/^http:/, 'https:'));
    insecure++;
  });
  if (insecure) changes.push(`将 ${insecure} 个 http 外部资源升级为 https`);
  return { html: changes.length ? serialize(doc) : html, changes };
}

const CALL = '\\((?:[^()]|\\([^()]*\\))*\\)';

/** 根据运行时错误堆栈做规则化自愈（无 API Key 时的降级修复） */
export function healHtml(html: string, err: string): FixResult {
  let out = html;
  const changes: string[] = [];
  const undef = [...new Set([...err.matchAll(/([A-Za-z_$][\w$]*) is not defined/g)].map((m) => m[1]))];
  if (undef.length) {
    const stub = `<script>${undef.map((n) => `window.${n}=window.${n}||function(){console.warn(${JSON.stringify(`[自愈] ${n} 未定义，已注入安全兜底`)})};`).join('')}</script>`;
    out = /<head[^>]*>/i.test(out) ? out.replace(/<head[^>]*>/i, (m) => m + stub) : stub + out;
    changes.push(`为未定义的标识符 ${undef.join('、')} 注入兜底实现`);
  }
  if (/Cannot read propert|is null|of null|of undefined/i.test(err)) {
    const before = out;
    out = out.replace(new RegExp(`(document\\.(?:getElementById|querySelector)${CALL})\\.(\\w+)\\(`, 'g'), '$1?.$2(');
    if (out !== before) changes.push('为 DOM 查询结果后的方法调用加入空值保护（?.）');
  }
  if (/Promise|rejection/i.test(err)) {
    const before = out;
    out = out.replace(new RegExp(`(Promise\\.reject${CALL})(?!\\s*\\.catch)`, 'g'), "$1.catch(function(e){console.warn('[自愈] 已处理 Promise 拒绝：'+(e&&e.message||e))})");
    if (out !== before) changes.push('为 Promise.reject 补充 .catch 错误处理');
  }
  if (/SyntaxError|Unexpected|Invalid or unexpected/i.test(err)) {
    const doc = parse(out);
    const n = changes.length;
    neutralizeBrokenScripts(doc, changes);
    if (changes.length > n) out = serialize(doc);
  }
  return { html: out, changes };
}

type Kind = 'pomodoro' | 'snake' | 'todo' | 'login' | 'generic';

export function detectKind(html: string): Kind {
  const doc = parse(html);
  const text = `${doc.title} ${doc.querySelector('h1')?.textContent ?? ''} ${html.slice(0, 4000)}`;
  if (/番茄|pomodoro/i.test(text)) return 'pomodoro';
  if (/贪吃蛇|snake/i.test(text)) return 'snake';
  if (/登录|login|sign\s*in/i.test(text)) return 'login';
  if (/待办|todo|看板|kanban/i.test(text)) return 'todo';
  return 'generic';
}

export const KIND_LABEL: Record<Kind, string> = { pomodoro: '番茄钟', snake: '贪吃蛇', todo: '待办清单', login: '登录表单', generic: '通用页面' };

const tc = (module: string, scenario: string, pre: string, steps: string[], expected: string): TestCase => ({
  module,
  scenario,
  pre,
  steps: steps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
  expected,
});

const PRESET_CASES: Record<Exclude<Kind, 'generic'>, TestCase[]> = {
  pomodoro: [
    tc('计时器', '开始专注计时', '页面已加载，处于专注模式初始状态', ['点击「开始」按钮', '等待 3 秒'], '倒计时每秒递减，按钮变为「暂停」'),
    tc('计时器', '暂停与继续', '计时进行中', ['点击「暂停」', '等待 3 秒', '点击「继续/开始」'], '暂停期间时间不变，继续后从暂停处递减'),
    tc('计时器', '重置计时', '计时已开始并经过若干秒', ['点击「重置」按钮'], '时间恢复为当前模式的初始时长，计时停止'),
    tc('模式切换', '切换短休息 / 长休息', '处于专注模式', ['点击「短休息」', '点击「长休息」'], '时长分别切换为对应预设值，当前模式高亮'),
    tc('统计', '完成一个番茄后计数', '将时长临时调短或等待倒计时结束', ['开始计时直到归零'], '完成数 +1，并提示进入休息，刷新后记录仍保留'),
  ],
  snake: [
    tc('游戏控制', '开始游戏', '页面已加载，游戏未开始', ['点击「开始」或按空格键'], '蛇开始沿初始方向移动'),
    tc('游戏控制', '方向键控制', '游戏进行中', ['依次按 ↑ → ↓ ←（或 WASD）'], '蛇按输入改变方向，且不能直接反向掉头'),
    tc('计分', '吃到食物', '游戏进行中', ['控制蛇头移动到食物位置'], '分数增加、蛇身变长、新食物出现在空位'),
    tc('结束判定', '撞墙或撞自身', '游戏进行中', ['控制蛇撞向边界或自身'], '游戏结束并提示得分，最高分被记录'),
    tc('移动端', '触控方向按钮', '在 375px 宽度下打开', ['点击屏幕方向按钮'], '蛇随按钮改变方向，画布不溢出屏幕'),
  ],
  todo: [
    tc('新增任务', '添加一条待办', '页面已加载', ['在输入框中输入「写周报」', '按 Enter 或点击添加'], '列表新增该任务，输入框被清空'),
    tc('新增任务', '空内容校验', '输入框为空', ['直接点击添加'], '不新增空任务'),
    tc('状态流转', '标记完成 / 移动列', '存在一条未完成任务', ['勾选或拖动任务到「已完成」'], '任务状态更新，对应计数变化'),
    tc('删除任务', '删除一条待办', '存在至少一条任务', ['点击任务的删除按钮'], '任务从列表移除，计数同步减少'),
    tc('持久化', '刷新后数据保留', '已添加若干任务', ['刷新页面'], '任务与状态完整保留（LocalStorage）'),
  ],
  login: [
    tc('表单校验', '空表单提交', '页面已加载', ['不填写任何内容', '点击「登录」'], '账号与密码处显示必填错误提示，不提交'),
    tc('表单校验', '邮箱/账号格式错误', '页面已加载', ['账号输入「abc」', '输入任意密码并提交'], '提示账号格式不正确'),
    tc('表单校验', '密码长度不足', '账号格式正确', ['输入少于 6 位的密码并提交'], '提示密码长度不足'),
    tc('密码显示', '切换密码可见性', '密码框已输入内容', ['点击眼睛图标', '再次点击'], '密码在明文与掩码间切换，图标不与文字重叠'),
    tc('登录流程', '正确信息登录', '输入合法账号与密码', ['点击「登录」'], '按钮显示加载状态，随后提示登录成功'),
  ],
};

function genericCases(doc: Document): TestCase[] {
  const out: TestCase[] = [];
  doc.querySelectorAll('form').forEach((f, i) => {
    const name = f.getAttribute('aria-label') || f.querySelector('h1,h2,h3,legend')?.textContent?.trim() || `表单 ${i + 1}`;
    out.push(tc('表单', `「${name}」必填校验`, '页面已加载', ['保持字段为空', '点击提交按钮'], '显示校验提示，不提交无效数据'));
    out.push(tc('表单', `「${name}」正常提交`, '所有字段填写合法值', ['点击提交按钮'], '出现成功反馈，页面无报错'));
  });
  const btns = [...doc.querySelectorAll(BUTTON_SEL)]
    .map((b) => (b.textContent?.trim() || b.getAttribute('aria-label') || b.getAttribute('title') || '').replace(/\s+/g, ' ').slice(0, 20))
    .filter((t, i, a) => t && a.indexOf(t) === i)
    .slice(0, 5);
  btns.forEach((t) => out.push(tc('交互', `点击「${t}」按钮`, '页面已加载', [`点击「${t}」`], '触发对应功能，界面给出可见反馈，控制台无报错')));
  const links = doc.querySelectorAll('a[href]').length;
  if (links) out.push(tc('导航', '页面内链接跳转', `页面包含 ${links} 个链接`, ['依次点击导航与锚点链接'], '跳转到正确位置，无死链'));
  return out;
}

/** 基于页面功能的规则化测试用例 */
export function generateCases(html: string): TestCase[] {
  const doc = parse(html);
  const kind = detectKind(html);
  const cases = kind === 'generic' ? genericCases(doc) : [...PRESET_CASES[kind]];
  cases.unshift(tc('页面加载', '首次打开无异常', '清空缓存后访问', ['打开页面', '查看控制台'], '页面完整渲染，无 JS 运行时错误'));
  cases.push(tc('响应式', '移动端 375px 适配', '将视口切换为 375px', ['浏览完整页面', '操作主要按钮'], '无横向滚动，元素不重叠、可点击'));
  if (/localStorage/.test(html) && kind === 'generic') cases.push(tc('持久化', '刷新后数据保留', '已进行若干操作', ['刷新页面'], '之前的数据/状态被恢复'));
  return cases;
}

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');

export function casesToMarkdown(cases: TestCase[], title: string) {
  const rows = cases.map((c, i) => `| TC-${String(i + 1).padStart(2, '0')} | ${[c.module, c.scenario, c.pre, c.steps, c.expected].map(cell).join(' | ')} |`);
  return [`# ${title} 功能测试用例`, '', '| 编号 | 模块名称 | 测试场景 | 前置条件 | 操作步骤 | 预期结果 |', '| --- | --- | --- | --- | --- | --- |', ...rows, ''].join('\n');
}

/** 解析 AI 返回的 JSON 用例数组 */
export function parseAiCases(text: string): TestCase[] {
  const json = text.match(/\[[\s\S]*\]/)?.[0];
  if (!json) throw new Error('AI 未返回 JSON 数组');
  const arr = JSON.parse(json) as Partial<TestCase & { steps: string | string[] }>[];
  const list = arr
    .map((c) => ({
      module: String(c.module ?? ''),
      scenario: String(c.scenario ?? ''),
      pre: String(c.pre ?? ''),
      steps: Array.isArray(c.steps) ? c.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') : String(c.steps ?? ''),
      expected: String(c.expected ?? ''),
    }))
    .filter((c) => c.scenario && c.expected);
  if (!list.length) throw new Error('AI 返回的用例为空');
  return list;
}
