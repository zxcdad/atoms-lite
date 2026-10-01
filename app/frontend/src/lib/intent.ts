import { complete } from './engine';
import { PRESETS } from './templates';
import type { Settings } from './types';

export type Intent = 'build' | 'chat';

export interface IntentResult {
  intent: Intent;
  /** chat 意图时的自然语言回复 */
  reply: string;
  source: 'mock' | 'llm';
  fallbackReason?: string;
}

const GREETING = /^(你好|您好|嗨|哈喽|哈啰|hi|hello|hey|在吗|在不在|早上好|上午好|下午好|晚上好|早安|晚安)[\s!！。.~～,，呀啊呢哇]*$/i;
const IDENTITY = /你是谁|你叫什么|你是什么|介绍(一下)?你自己|自我介绍/;
const CAPABILITY = /你能做什么|你会(做)?什么|能干(什么|啥)|有什么功能|能帮我(做)?什么|怎么用|如何使用|使用方法|帮助|help|支持哪些|可以做(什么|哪些)/i;
const THANKS = /^(谢谢|多谢|感谢|thanks|thank you|thx|好的|ok|嗯|收到)[\s!！。.~～]*$/i;

/** 明确要求构建页面：动词 + 量词/对象 */
const BUILD = /(做|生成|写|创建|搭建|开发|制作|设计|实现|建)(一个|个|一款|一套|一张|一页|一下)?.{0,20}(页面|网页|网站|应用|app|工具|游戏|看板|清单|列表|表单|计时器|番茄钟|仪表盘|dashboard|落地页|主页|首页|小程序|系统|平台|计算器|日历|相册|博客|商城|简历)/i;
const BUILD_STRONG = /(帮我|给我|请|我想|我要|想要|麻烦)?.{0,4}(做|生成|写|创建|搭建|开发|制作|设计)(一个|个|一款|一套|一张|一页)/;
/** 已有页面时的修改指令 */
const EDIT = /(改|换|调|加|添加|增加|新增|删|去掉|移除|切换|设置|设为|变|放大|缩小|加大|减小|优化|美化).{0,12}(色|颜色|主题|深色|浅色|暗色|模式|按钮|标题|圆角|字|字体|字号|布局|样式|背景|图片|动画|边框|间距|卡片|导航|页脚|输入框|列表)|(深色|暗色|浅色|夜间)模式|主色/;

/** 关键词规则：作为无 Key 时的判定和模型失败时的兜底 */
export function ruleIntent(prompt: string, hasPage: boolean): Intent {
  const p = prompt.trim();
  if (BUILD_STRONG.test(p) && !CAPABILITY.test(p)) return 'build';
  if (GREETING.test(p) || IDENTITY.test(p) || CAPABILITY.test(p) || THANKS.test(p)) return 'chat';
  if (BUILD.test(p)) return 'build';
  if (PRESETS.some((x) => x.keywords.test(p))) return 'build';
  if (hasPage && EDIT.test(p)) return 'build';
  return 'chat';
}

const INTRO = '我是 Atoms-Lite 网页应用生成助手，可以根据一句话需求生成可直接运行的单页网页应用，并在右侧沙箱实时预览。';
const ABILITIES =
  '我可以帮你做：\n• 待办清单 / 待办看板\n• 番茄钟、计时器等效率工具\n• 数据看板、统计仪表盘\n• 登录表单、落地页、小游戏（如贪吃蛇）\n生成后还能继续说“把主色改成红色”“添加深色模式”“标题改成 xxx”来迭代修改。';
const GUIDE = '告诉我你想做什么页面吧，例如：“帮我做一个番茄钟”或“生成一个待办清单页面”。';

/** Mock 引擎内置的对话回复 */
export function mockChatReply(prompt: string, hasPage: boolean): string {
  const p = prompt.trim();
  if (THANKS.test(p)) return `不客气！${hasPage ? '如果还想调整当前页面，直接告诉我修改点即可。' : GUIDE}`;
  if (GREETING.test(p)) return `你好！👋 ${INTRO}\n\n${GUIDE}`;
  if (IDENTITY.test(p)) return `${INTRO}\n\n${ABILITIES}\n\n${GUIDE}`;
  if (CAPABILITY.test(p)) return `${ABILITIES}\n\n${GUIDE}`;
  return `${INTRO}\n这条消息看起来不是建站指令，所以我没有改动当前页面。\n\n${GUIDE}`;
}

const ROUTER_PROMPT = (prompt: string, hasPage: boolean) => `你是 Atoms-Lite 网页应用生成助手的意图路由器。判断用户消息的意图：
- "build"：明确要求生成新页面/应用，或修改当前页面（颜色、样式、增删元素、深色模式等）。
- "chat"：问候、闲聊、咨询、提问，或没有明确的页面生成/修改指令。
当前${hasPage ? '已有' : '还没有'}生成的页面。
如果是 chat，请用中文自然回复：介绍自己是 Atoms-Lite 网页应用生成助手，可以做待办清单、番茄钟、数据看板等，并引导用户说出建站需求（简洁友好，不超过 120 字，不要输出代码）。
只输出 JSON，不要其他内容：{"intent":"build"|"chat","reply":"chat 时的回复，build 时为空"}
用户消息：${prompt}`;

function parseRouter(text: string): { intent: Intent; reply: string } | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]);
    if (j.intent !== 'build' && j.intent !== 'chat') return null;
    return { intent: j.intent, reply: typeof j.reply === 'string' ? j.reply.trim() : '' };
  } catch {
    return null;
  }
}

/** 意图识别：有 Key 时由模型判断并生成聊天回复，失败或未配置时使用关键词规则 + Mock 预设回复 */
export async function routeIntent(prompt: string, hasPage: boolean, settings: Settings, signal: AbortSignal): Promise<IntentResult> {
  const rule = (): IntentResult => {
    const intent = ruleIntent(prompt, hasPage);
    return { intent, reply: intent === 'chat' ? mockChatReply(prompt, hasPage) : '', source: 'mock' };
  };
  if (!settings.apiKey.trim()) return rule();
  try {
    const parsed = parseRouter(await complete(settings, ROUTER_PROMPT(prompt, hasPage), signal));
    if (!parsed) return { ...rule(), fallbackReason: '模型未返回有效的意图 JSON' };
    if (parsed.intent === 'chat') return { intent: 'chat', reply: parsed.reply || mockChatReply(prompt, hasPage), source: 'llm' };
    return { intent: 'build', reply: '', source: 'llm' };
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    return { ...rule(), fallbackReason: (e as Error).message };
  }
}
