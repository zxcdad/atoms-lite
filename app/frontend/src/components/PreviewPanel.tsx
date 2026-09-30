import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronUp, Download, ExternalLink, Loader2, Monitor, RotateCw, Smartphone, Tablet, Trash2 } from 'lucide-react';
import { instrument } from '@/lib/sandbox';
import { downloadFile, htmlFileName } from '@/lib/storage';
import type { LogEntry, Viewport } from '@/lib/types';

const VIEWPORTS: { key: Viewport; label: string; width: string; Icon: typeof Monitor }[] = [
  { key: 'mobile', label: '移动端 375', width: '375px', Icon: Smartphone },
  { key: 'tablet', label: '平板 768', width: '768px', Icon: Tablet },
  { key: 'desktop', label: '桌面 100%', width: '100%', Icon: Monitor },
];

const LEVEL_COLOR: Record<LogEntry['level'], string> = { log: 'text-[#d4d4de]', info: 'text-[#38bdf8]', warn: 'text-[#fbbf24]', error: 'text-[#f87171]' };

interface PanelProps {
  html: string | null;
  generating: boolean;
  projectName: string;
  onAudit: () => void;
  onHeal: (stack: string) => void;
}

export default function PreviewPanel({ html, generating, projectName, onAudit, onHeal }: PanelProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [nonce, setNonce] = useState(0);
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [open, setOpen] = useState(false);
  const started = useRef(0);
  const seq = useRef(0);

  const stage = useRef<HTMLDivElement>(null);
  // 隐藏（0 尺寸）容器中加载的页面会按 0 宽高布局导致白屏，因此仅在可见时挂载 iframe
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const check = () => setVisible(el.clientWidth > 0 && el.clientHeight > 0);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!html || !visible) return;
    started.current = performance.now();
    setLoading(true);
    setLatency(null);
    setLogs([]);
    const t = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(t);
  }, [html, nonce, visible]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || !e.data?.__atoms) return;
      const d = e.data as { type: string; level: LogEntry['level']; text: string };
      if (d.type === 'load') {
        setLoading(false);
        setLatency(Math.round(performance.now() - started.current));
        return;
      }
      setLogs((l) => [...l.slice(-199), { id: ++seq.current, level: d.level, text: d.text, time: Date.now() }]);
      if (d.type === 'error') setOpen(true);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const errorLogs = logs.filter((l) => l.level === 'error');
  const errors = errorLogs.length;
  const warns = logs.filter((l) => l.level === 'warn').length;

  const openTab = useCallback(() => {
    if (!html) return;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }, [html]);

  const width = VIEWPORTS.find((v) => v.key === viewport)!.width;
  const iconBtn = 'press flex h-8 w-8 items-center justify-center rounded-lg text-[#9a9aab] hover:bg-[#24242e] hover:text-[#ededf2] disabled:pointer-events-none disabled:opacity-40';

  return (
    <section className="flex h-full min-w-0 flex-col bg-[#0b0b0f]">
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[#24242e] px-3">
        <div className="flex items-center gap-1 rounded-lg bg-[#111116] p-0.5">
          {VIEWPORTS.map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setViewport(key)} title={label} aria-label={label} className={`press flex h-7 items-center gap-1.5 rounded-md px-2 text-xs ${viewport === key ? 'bg-[#24242e] text-[#ededf2]' : 'text-[#9a9aab] hover:text-[#ededf2]'}`}>
              <Icon className="h-3.5 w-3.5" /><span className="hidden xl:inline">{label}</span>
            </button>
          ))}
        </div>
        <span className="hidden truncate font-mono text-xs text-[#62626f] md:block">sandbox://preview · {width}</span>
        <div className="flex items-center gap-0.5">
          <button data-qa-btn disabled={!html || generating} onClick={onAudit} title={html ? '质量体检' : '暂无内容，请先生成页面'} className="press mr-1 flex h-8 items-center gap-1 rounded-lg border border-[#38bdf8]/40 px-2 text-xs font-semibold text-[#38bdf8] !bg-transparent hover:!bg-[#38bdf8]/10 disabled:opacity-40">🧪<span className="hidden sm:inline">质量体检</span></button>
          <button className={iconBtn} disabled={!html} onClick={() => setNonce((n) => n + 1)} title="刷新预览" aria-label="刷新预览"><RotateCw className="h-4 w-4" /></button>
          <button className={iconBtn} disabled={!html} onClick={openTab} title="新标签页打开" aria-label="新标签页打开"><ExternalLink className="h-4 w-4" /></button>
          <button disabled={!html} onClick={() => html && downloadFile(htmlFileName(projectName), html, 'text/html')} title={html ? `下载 ${htmlFileName(projectName)}` : '暂无内容，请先生成页面'} aria-label="下载 HTML" className="press ml-1 flex h-8 items-center gap-1.5 rounded-lg bg-[#8b5cf6] px-2.5 text-xs font-semibold text-white hover:bg-[#7c4deb] disabled:cursor-not-allowed disabled:bg-[#24242e] disabled:text-[#62626f]"><Download className="h-4 w-4" /><span>下载 HTML</span></button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden p-3 md:p-5" style={{ backgroundImage: 'radial-gradient(#1c1c26 1px, transparent 1px)', backgroundSize: '18px 18px' }}>
        <div ref={stage} className="relative mx-auto h-full max-w-full overflow-hidden rounded-[14px] border border-[#24242e] bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,.6)] transition-[width] duration-300" style={{ width }}>
          {html && visible ? (
            <iframe key={nonce} ref={frame} title="实时预览" srcDoc={instrument(html)} sandbox="allow-scripts allow-modals allow-forms allow-popups" className="h-full w-full border-0" />
          ) : null}
          {(!html || loading || generating) && (
            <div className="absolute inset-0 flex flex-col gap-3 bg-[#111116] p-6">
              {html || generating ? (
                <>
                  <div className="skeleton h-8 w-1/3 rounded-lg" />
                  <div className="skeleton h-4 w-2/3 rounded" />
                  <div className="skeleton h-40 w-full rounded-xl" />
                  <div className="grid grid-cols-3 gap-3"><div className="skeleton h-24 rounded-xl" /><div className="skeleton h-24 rounded-xl" /><div className="skeleton h-24 rounded-xl" /></div>
                  <div className="mt-auto flex items-center justify-center gap-2 text-sm text-[#9a9aab]"><Loader2 className="h-4 w-4 animate-spin text-[#8b5cf6]" />{generating ? 'AI 正在生成页面…' : '沙箱加载中…'}</div>
                </>
              ) : (
                <div className="m-auto text-center">
                  <div className="mx-auto mb-4 h-14 w-14 animate-pulse rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#38bdf8] opacity-80" />
                  <p className="text-sm font-semibold text-[#ededf2]">Live Sandbox</p>
                  <p className="mt-1 text-xs text-[#62626f]">生成的页面会在这里隔离运行</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {errors > 0 && !generating && (
        <div data-heal-bar className="flex shrink-0 animate-in fade-in slide-in-from-bottom-3 items-center gap-3 border-t border-[#f87171]/40 bg-[#f87171]/10 px-3 py-2 duration-300">
          <span className="relative flex h-2.5 w-2.5 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f87171] opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#f87171]" /></span>
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-[#fca5a5]" title={errorLogs[errors - 1].text}>{errorLogs[errors - 1].text.split('\n')[0]}</span>
          <button data-heal-btn onClick={() => onHeal(errorLogs.map((l) => l.text).join('\n\n'))} className="press flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[#f87171] px-3 text-xs font-bold text-[#1a0b0b] hover:bg-[#fb8a8a]">🩹<span>提交 AI 自动修复</span></button>
        </div>
      )}

      {open && (
        <div className="thin-scroll h-40 shrink-0 animate-in fade-in slide-in-from-bottom-2 overflow-auto border-t border-[#24242e] bg-[#111116] font-mono text-[12px] duration-200">
          {logs.length ? logs.map((l) => (
            <div key={l.id} className={`flex gap-3 border-b border-[#17171e] px-3 py-1 ${LEVEL_COLOR[l.level]}`}>
              <span className="shrink-0 text-[#62626f]">{new Date(l.time).toLocaleTimeString()}</span>
              <span className="w-10 shrink-0 uppercase">{l.level}</span>
              <span className={`whitespace-pre-wrap break-all ${l.level === 'error' ? 'rounded bg-[#f87171]/10 px-1' : ''}`}>{l.text}</span>
            </div>
          )) : <div className="p-3 text-[#62626f]">暂无控制台输出</div>}
        </div>
      )}

      <footer className="flex h-8 shrink-0 items-center gap-4 overflow-hidden border-t border-[#24242e] bg-[#111116] px-3 text-[11.5px] text-[#9a9aab]">
        <span className="flex items-center gap-1.5">
          {!html ? <span className="h-2 w-2 rounded-full bg-[#62626f]" /> : loading || generating ? <Loader2 className="h-3 w-3 animate-spin text-[#38bdf8]" /> : <CheckCircle2 className="h-3 w-3 text-[#34d399]" />}
          {!html ? '空闲' : generating ? '生成中' : loading ? '加载中' : '已加载'}
        </span>
        <span className="font-mono">渲染延迟 {latency === null ? '—' : `${latency}ms`}</span>
        <span className={`flex items-center gap-1 ${errors ? 'text-[#f87171]' : 'text-[#34d399]'}`}>
          {errors ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
          {errors ? `${errors} 个 JS 错误` : '无运行时错误'}
        </span>
        {warns > 0 && <span className="text-[#fbbf24]">{warns} 个警告</span>}
        <div className="ml-auto flex items-center gap-1">
          {open && <button onClick={() => setLogs([])} className="press rounded p-1 hover:bg-[#24242e]" title="清空日志" aria-label="清空日志"><Trash2 className="h-3 w-3" /></button>}
          <button onClick={() => setOpen((o) => !o)} className="press flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-[#24242e] hover:text-[#ededf2]">
            {errors > 0 && <span className="h-2 w-2 animate-pulse rounded-full bg-[#f87171]" />}控制台 ({logs.length}) <ChevronUp className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </footer>
    </section>
  );
}
