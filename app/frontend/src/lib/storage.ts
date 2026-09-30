import type { Project, Settings, Store } from './types';

const STORE_KEY = 'atoms-lite:store:v1';
const SETTINGS_KEY = 'atoms-lite:settings:v1';

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const PROVIDER_DEFAULTS: Record<Settings['provider'], { baseUrl: string; model: string }> = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
};

export const DEFAULT_SETTINGS: Settings = { provider: 'openai', apiKey: '', ...PROVIDER_DEFAULTS.openai };

export function createProject(name = '未命名工程'): Project {
  const now = Date.now();
  return { id: uid(), name, messages: [], versions: [], currentVersionId: null, createdAt: now, updatedAt: now };
}

export function isProject(p: unknown): p is Project {
  const o = p as Project;
  return !!o && typeof o.id === 'string' && typeof o.name === 'string' && Array.isArray(o.messages) && Array.isArray(o.versions);
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Store;
      if (Array.isArray(s.projects) && s.projects.length && s.projects.every(isProject)) {
        const active = s.projects.some((p) => p.id === s.activeProjectId) ? s.activeProjectId : s.projects[0].id;
        return { projects: s.projects, activeProjectId: active };
      }
    }
  } catch {
    /* 数据损坏时回落到初始状态 */
  }
  const p = createProject('我的第一个应用');
  return { projects: [p], activeProjectId: p.id };
}

export function saveStore(store: Store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('保存失败', e);
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function clearAll() {
  localStorage.removeItem(STORE_KEY);
  localStorage.removeItem(SETTINGS_KEY);
}

export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function htmlFileName(project: string) {
  const safe = project.replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '') || 'atoms-app';
  return `${safe}-index.html`;
}
