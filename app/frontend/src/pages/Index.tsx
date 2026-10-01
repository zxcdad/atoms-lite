import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, ClipboardList, Code2, History, MessageSquare, Settings as SettingsIcon, Square } from 'lucide-react';
import { toast } from 'sonner';
import ChatFeed from '@/components/ChatFeed';
import CodeView from '@/components/CodeView';
import PreviewPanel from '@/components/PreviewPanel';
import ProjectMenu from '@/components/ProjectMenu';
import SettingsDrawer from '@/components/SettingsDrawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CasesView from '@/components/CasesView';
import ManualCopyDialog from '@/components/ManualCopyDialog';
import QaReportDialog from '@/components/QaReportDialog';
import { generate, repair } from '@/lib/engine';
import { routeIntent } from '@/lib/intent';
import { auditHtml, autoFixHtml, healHtml, type AuditReport, type FixResult } from '@/lib/qa';
import { clearAll, createProject, downloadFile, isProject, loadSettings, loadStore, saveSettings, saveStore, uid } from '@/lib/storage';
import { PRESETS } from '@/lib/templates';
import type { ChatMessage, Project, Settings, Store } from '@/lib/types';

export default function Index() {
  const [store, setStore] = useState<Store>(loadStore);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [view, setView] = useState<'chat' | 'code' | 'cases'>('chat');
  const [mobileTab, setMobileTab] = useState<'agent' | 'preview'>('agent');
  const [input, setInput] = useState('');
  const [streamCode, setStreamCode] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => saveStore(store), [store]);

  const project = store.projects.find((p) => p.id === store.activeProjectId) ?? store.projects[0];
  const current = project.versions.find((v) => v.id === project.currentVersionId) ?? null;
  const generating = pendingPrompt !== null;

  const updateProject = useCallback((id: string, fn: (p: Project) => Project) => {
    setStore((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...fn(p), updatedAt: Date.now() } : p)) }));
  }, []);

  const [audit, setAudit] = useState<AuditReport | null>(null);
  const [qaOpen, setQaOpen] = useState(false);

  /** 修复类会话：显示在对话中并生成新版本 */
  const runRepair = async (prompt: string, displayText: string, fallback: FixResult, label: string) => {
    if (generating || !current) return;
    const pid = project.id;
    const base = current.html;
    updateProject(pid, (p) => ({ ...p, messages: [...p.messages, { id: uid(), role: 'user', content: displayText, createdAt: Date.now() }] }));
    setView('chat');
    setMobileTab('agent');
    setPendingPrompt(displayText);
    setStreamCode('');
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const r = await repair({ prompt, currentHtml: base, history: [], settings, signal: ctrl.signal, onCode: setStreamCode }, fallback, label);
      if (r.fallbackReason) toast.error(`模型调用失败，已降级规则修复：${r.fallbackReason}`);
      const changed = r.html !== base;
      updateProject(pid, (p) => {
        if (!changed) return { ...p, messages: [...p.messages, { id: uid(), role: 'assistant', content: r.summary, source: r.source, createdAt: Date.now() }] };
        const version = { id: uid(), index: p.versions.length + 1, html: r.html, prompt: displayText, createdAt: Date.now() };
        return { ...p, versions: [...p.versions, version], currentVersionId: version.id, messages: [...p.messages, { id: uid(), role: 'assistant', content: r.summary, versionId: version.id, source: r.source, createdAt: Date.now() }] };
      });
      if (changed) setMobileTab('preview');
    } catch (e) {
      const stopped = (e as Error).name === 'AbortError';
      updateProject(pid, (p) => ({ ...p, messages: [...p.messages, { id: uid(), role: 'assistant', content: stopped ? '已停止修复，当前版本保持不变。' : `修复失败：${(e as Error).message}`, createdAt: Date.now() }] }));
    } finally {
      setPendingPrompt(null);
      setStreamCode(null);
      abort.current = null;
    }
  };

  const openAudit = () => {
    if (!current) return;
    setAudit(auditHtml(current.html));
    setQaOpen(true);
  };

  const optimize = () => {
    if (!current || !audit) return;
    setQaOpen(false);
    const list = audit.issues.map((i) => `- [${i.category}] ${i.title}：${i.detail}；建议：${i.suggestion}`).join('\n');
    runRepair(`请根据以下质量体检问题修复页面，保持原有功能与视觉不变：\n${list}`, `🧪 一键优化质量问题（体检 ${audit.score} 分，${audit.issues.length} 项待改进）`, autoFixHtml(current.html), '优化');
  };

  const heal = (stack: string) => {
    if (!current) return;
    runRepair(`沙箱运行时捕获到以下 JS 异常，请定位根因并修复，保持原有功能不变：\n${stack.slice(0, 3000)}`, `🩹 提交 AI 自动修复运行时异常：\n${stack.split('\n')[0].slice(0, 200)}`, healHtml(current.html, stack), '自愈');
  };

  const send = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || generating) return;
    const pid = project.id;
    const userMsg: ChatMessage = { id: uid(), role: 'user', content: prompt, createdAt: Date.now() };
    const history = project.messages.map((m) => ({ role: m.role, content: m.content }));
    updateProject(pid, (p) => ({ ...p, messages: [...p.messages, userMsg], name: p.versions.length === 0 && p.messages.length === 0 && p.name.startsWith('未命名') ? prompt.slice(0, 16) : p.name }));
    setInput('');
    setPendingPrompt(prompt);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const route = await routeIntent(prompt, !!current, settings, ctrl.signal);
      if (route.fallbackReason) toast.error(`意图识别调用失败，已使用规则判断：${route.fallbackReason}`);
      if (route.intent === 'chat') {
        updateProject(pid, (p) => ({ ...p, messages: [...p.messages, { id: uid(), role: 'assistant', content: route.reply, source: route.source, createdAt: Date.now() }] }));
        return;
      }
      setStreamCode('');
      const r = await generate({ prompt, currentHtml: current?.html ?? null, history, settings, signal: ctrl.signal, onCode: setStreamCode });
      if (r.fallbackReason) toast.error(`模型调用失败，已降级 Mock：${r.fallbackReason}`);
      updateProject(pid, (p) => {
        const version = { id: uid(), index: p.versions.length + 1, html: r.html, prompt, createdAt: Date.now() };
        const msg: ChatMessage = { id: uid(), role: 'assistant', content: r.summary, versionId: version.id, source: r.source, createdAt: Date.now() };
        return { ...p, versions: [...p.versions, version], currentVersionId: version.id, messages: [...p.messages, msg] };
      });
      setMobileTab('preview');
    } catch (e) {
      const stopped = (e as Error).name === 'AbortError';
      updateProject(pid, (p) => ({ ...p, messages: [...p.messages, { id: uid(), role: 'assistant', content: stopped ? '已停止生成，当前版本保持不变。' : `生成失败：${(e as Error).message}`, createdAt: Date.now() }] }));
    } finally {
      setPendingPrompt(null);
      setStreamCode(null);
      abort.current = null;
    }
  };

  const switchVersion = (id: string) => updateProject(project.id, (p) => ({ ...p, currentVersionId: id }));

  const projectActions = {
    onSwitch: (id: string) => !generating && setStore((s) => ({ ...s, activeProjectId: id })),
    onCreate: () => {
      if (generating) return;
      const p = createProject();
      setStore((s) => ({ projects: [p, ...s.projects], activeProjectId: p.id }));
    },
    onRename: () => {
      const name = window.prompt('工程名称', project.name)?.trim();
      if (name) updateProject(project.id, (p) => ({ ...p, name: name.slice(0, 40) }));
    },
    onDelete: () => {
      if (generating || !window.confirm(`确定删除工程「${project.name}」吗？`)) return;
      setStore((s) => {
        const rest = s.projects.filter((p) => p.id !== project.id);
        const list = rest.length ? rest : [createProject()];
        return { projects: list, activeProjectId: list[0].id };
      });
      toast.success('工程已删除');
    },
    onExport: () => downloadFile(`${project.name}.atoms.json`, JSON.stringify(project, null, 2), 'application/json'),
    onImport: async (file: File) => {
      try {
        const data = JSON.parse(await file.text());
        if (!isProject(data)) throw new Error('格式不正确');
        const p: Project = { ...data, id: uid(), name: `${data.name}（导入）` };
        setStore((s) => ({ projects: [p, ...s.projects], activeProjectId: p.id }));
        toast.success('工程导入成功');
      } catch (e) {
        toast.error(`导入失败：${(e as Error).message}`);
      }
    },
  };

  const resetAll = () => {
    if (!window.confirm('将清空所有工程、对话、版本和设置，确定继续吗？')) return;
    abort.current?.abort();
    clearAll();
    setStore(loadStore());
    setSettings(loadSettings());
    setSettingsOpen(false);
    toast.success('已重置所有数据');
  };

  const previewHtml = current?.html ?? null;
  const code = streamCode ?? current?.html ?? '';
  const versionsDesc = useMemo(() => [...project.versions].reverse(), [project.versions]);
  const mockMode = !settings.apiKey.trim();

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#0b0b0f] text-[#ededf2]">
      <div className="flex shrink-0 border-b border-[#24242e] bg-[#111116] p-1 lg:hidden">
        {(['agent', 'preview'] as const).map((t) => (
          <button key={t} onClick={() => setMobileTab(t)} className={`press flex-1 rounded-md py-1.5 text-sm ${mobileTab === t ? 'bg-[#24242e] font-semibold' : 'text-[#9a9aab]'}`}>{t === 'agent' ? 'AI 控制台' : '实时预览'}</button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className={`${mobileTab === 'agent' ? 'flex' : 'hidden'} w-full min-w-0 flex-col border-r border-[#24242e] bg-[#111116] lg:flex lg:w-[420px] lg:shrink-0`}>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[#24242e] px-3">
            <div className="relative h-6 w-6 shrink-0" aria-label="Atoms-Lite">
              <span className="absolute inset-0 rounded-md bg-[#8b5cf6]" />
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#111116] bg-[#38bdf8]" />
            </div>
            <span className="hidden shrink-0 text-sm font-bold sm:inline">Atoms-Lite</span>
            <span className="text-[#24242e]">/</span>
            <div className="min-w-0 flex-1"><ProjectMenu projects={store.projects} active={project} {...projectActions} /></div>
            <Select value={project.currentVersionId ?? undefined} onValueChange={switchVersion} disabled={!project.versions.length || generating}>
              <SelectTrigger className="press h-8 w-auto gap-1.5 border-[#24242e] bg-transparent px-2 font-mono text-xs text-[#9a9aab] hover:text-[#ededf2]" aria-label="历史版本">
                <History className="h-3.5 w-3.5" />
                <SelectValue placeholder="无版本" />
              </SelectTrigger>
              <SelectContent className="border-[#24242e] bg-[#17171e] text-[#ededf2]">
                {versionsDesc.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="font-mono text-xs focus:bg-[#24242e] focus:text-[#ededf2]">
                    V{v.index} · {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button onClick={() => setSettingsOpen(true)} className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#9a9aab] hover:bg-[#24242e] hover:text-[#ededf2]" title="设置" aria-label="设置"><SettingsIcon className="h-4 w-4" /></button>
          </header>

          <div className="flex shrink-0 items-center justify-between px-3 pt-3">
            <div className="flex rounded-lg bg-[#0b0b0f] p-0.5">
              {([['chat', '对话', MessageSquare], ['code', '源码', Code2], ['cases', '用例', ClipboardList]] as const).map(([k, label, Icon]) => (
                <button key={k} onClick={() => setView(k)} className={`press flex items-center gap-1.5 rounded-md px-3 py-1 text-xs ${view === k ? 'bg-[#24242e] text-[#ededf2]' : 'text-[#9a9aab] hover:text-[#ededf2]'}`}><Icon className="h-3.5 w-3.5" />{label}</button>
              ))}
            </div>
            <button onClick={() => setSettingsOpen(true)} className={`press rounded-full px-2 py-0.5 text-[11px] ${mockMode ? 'bg-[#38bdf8]/10 text-[#38bdf8]' : 'bg-[#34d399]/10 text-[#34d399]'}`}>
              {mockMode ? '● Mock 引擎' : `● ${settings.model}`}
            </button>
          </div>

          <div data-chat-scroll className="thin-scroll mx-3 my-3 min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-[#24242e] bg-[#0b0b0f]">
            {view === 'chat' ? (
              <ChatFeed messages={project.messages} versions={project.versions} currentVersionId={project.currentVersionId} pending={pendingPrompt} streamLen={streamCode?.length ?? 0} onPickVersion={switchVersion} onPreset={send} />
            ) : view === 'code' ? (
              <CodeView code={code} streaming={generating} projectName={project.name} />
            ) : (
              <CasesView html={current?.html ?? null} settings={settings} busy={generating} />
            )}
          </div>

          <div className="shrink-0 px-3 pb-[calc(80px+env(safe-area-inset-bottom))] lg:pb-3">
            <div className="thin-scroll mb-2 flex gap-1.5 overflow-x-auto pb-1">
              {PRESETS.map((p) => (
                <button key={p.key} disabled={generating} onClick={() => setInput(p.prompt)} className="press shrink-0 rounded-full border border-[#24242e] px-2.5 py-1 text-xs text-[#9a9aab] hover:border-[#8b5cf6]/60 hover:text-[#ededf2] disabled:opacity-40">{p.label}</button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="rounded-xl border border-[#24242e] bg-[#0b0b0f] p-2 transition focus-within:border-[#8b5cf6]">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); } }}
                rows={3}
                placeholder={current ? '继续修改，例如：把主色调换成紫色 / 增加一个数据重置按钮' : '描述你想生成的应用，Enter 发送，Shift+Enter 换行'}
                className="w-full resize-none bg-transparent px-1.5 py-1 text-[13.5px] outline-none placeholder:text-[#62626f]"
              />
              <div className="flex items-center justify-between">
                <span className="px-1.5 text-[11px] text-[#62626f]">{current ? `基于 Version ${current.index} 修改` : '新建生成'}</span>
                {generating ? (
                  <button type="button" onClick={() => abort.current?.abort()} className="press flex h-8 items-center gap-1.5 rounded-lg bg-[#24242e] px-3 text-xs font-semibold hover:bg-[#2e2e3a]"><Square className="h-3 w-3 fill-current" />停止</button>
                ) : (
                  <button type="submit" disabled={!input.trim()} aria-label="发送" className="press flex h-8 w-8 items-center justify-center rounded-lg bg-[#8b5cf6] text-white hover:bg-[#7c4deb] disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
                )}
              </div>
            </form>
          </div>
        </aside>

        <main className={`${mobileTab === 'preview' ? 'flex' : 'hidden'} min-w-0 flex-1 flex-col lg:flex`}>
          <PreviewPanel html={previewHtml} generating={generating} projectName={project.name} onAudit={openAudit} onHeal={heal} />
        </main>
      <ManualCopyDialog />
      <QaReportDialog open={qaOpen} onOpenChange={setQaOpen} report={audit} aiMode={!mockMode} busy={generating} onOptimize={optimize} />
      </div>
      <SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} onSave={(s) => { setSettings(s); saveSettings(s); toast.success('设置已保存'); }} onResetAll={resetAll} />
    </div>
  );
}
