import { CheckCircle2, Sparkles, XCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CATEGORIES, type AuditReport } from '@/lib/qa';

const tone = (s: number) => (s >= 90 ? '#34d399' : s >= 70 ? '#fbbf24' : '#f87171');
const grade = (s: number) => (s >= 90 ? '优秀' : s >= 70 ? '良好' : s >= 50 ? '待改进' : '较差');

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  report: AuditReport | null;
  aiMode: boolean;
  busy: boolean;
  onOptimize: () => void;
}

export default function QaReportDialog({ open, onOpenChange, report, aiMode, busy, onOptimize }: Props) {
  const score = report?.score ?? 0;
  const c = 2 * Math.PI * 34;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88dvh] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-[#24242e] bg-[#111116] p-0 text-[#ededf2] duration-300">
        <DialogHeader className="shrink-0 border-b border-[#24242e] px-5 pb-4 pt-5 pr-12 text-left">
          <DialogTitle className="text-[#ededf2]">🧪 质量体检报告</DialogTitle>
          <DialogDescription className="text-[#9a9aab]">对当前版本的 HTML 源码做即时静态检查，覆盖规范性、可访问性和健壮性</DialogDescription>
        </DialogHeader>
        {report && (
          <div data-qa-report className="thin-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="mb-5 flex items-center gap-4 rounded-xl border border-[#24242e] bg-[#0b0b0f] p-4">
              <div className="relative h-20 w-20 shrink-0">
                <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="#24242e" strokeWidth="7" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke={tone(score)} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} className="transition-[stroke-dashoffset] duration-700" />
                </svg>
                <span data-qa-score className="absolute inset-0 flex flex-col items-center justify-center font-mono text-2xl font-bold" style={{ color: tone(score) }}>{score}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">综合评分 · <span style={{ color: tone(score) }}>{grade(score)}</span></p>
                <p className="mt-1 text-xs text-[#9a9aab]">{report.checks.length - report.issues.length}/{report.checks.length} 项通过，{report.issues.length ? `发现 ${report.issues.length} 项可优化` : '没有发现问题'}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const list = report.checks.filter((k) => k.category === cat);
                    const pass = list.filter((k) => k.ratio === 1).length;
                    return <span key={cat} className={`rounded-full px-2 py-0.5 text-[11px] ${pass === list.length ? 'bg-[#34d399]/10 text-[#34d399]' : 'bg-[#fbbf24]/10 text-[#fbbf24]'}`}>{cat} {pass}/{list.length}</span>;
                  })}
                </div>
              </div>
            </div>
            {CATEGORIES.map((cat, gi) => (
              <section key={cat} className="mb-4 animate-in fade-in slide-in-from-bottom-2 fill-mode-both" style={{ animationDelay: `${gi * 80}ms`, animationDuration: '400ms' }}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9a9aab]">{cat}</h3>
                <ul className="space-y-2">
                  {report.checks.filter((k) => k.category === cat).map((k) => {
                    const Icon = k.ratio === 1 ? CheckCircle2 : k.ratio > 0 ? AlertCircle : XCircle;
                    const col = k.ratio === 1 ? 'text-[#34d399]' : k.ratio > 0 ? 'text-[#fbbf24]' : 'text-[#f87171]';
                    return (
                      <li key={k.id} className="rounded-lg border border-[#24242e] bg-[#0b0b0f] px-3 py-2.5">
                        <div className="flex items-start gap-2">
                          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${col}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[13px] font-semibold">{k.title}</span>
                              <span className={`shrink-0 font-mono text-[11px] ${col}`}>{k.ratio === 1 ? 'PASS' : k.ratio > 0 ? 'WARN' : 'FAIL'} · {Math.round(k.weight * k.ratio)}/{k.weight}</span>
                            </div>
                            <p className="mt-0.5 break-words text-xs text-[#9a9aab]">{k.detail}</p>
                            {k.ratio < 1 && <p className="mt-1 text-xs text-[#38bdf8]">建议：{k.suggestion}</p>}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
        <div className="flex shrink-0 flex-col gap-2 border-t border-[#24242e] px-5 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] text-[#62626f]">{aiMode ? '一键优化会由 AI 按建议修复，并生成新版本' : 'Mock 模式：一键优化按规则修补，并生成新版本'}</span>
          <button onClick={onOptimize} disabled={busy || !report?.issues.length} className="press flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#8b5cf6] to-[#38bdf8] px-4 text-sm font-semibold text-white disabled:opacity-40">
            <Sparkles className="h-4 w-4" />{report?.issues.length ? '一键优化' : '已是最佳状态'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
