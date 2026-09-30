import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { copyText } from '@/lib/clipboard';
import { complete } from '@/lib/engine';
import { KIND_LABEL, casesToMarkdown, detectKind, generateCases, parseAiCases, type TestCase } from '@/lib/qa';
import type { Settings } from '@/lib/types';

const PROMPT = (html: string) => `你是资深测试工程师。阅读下面的单文件 HTML 页面，为它的主要功能编写 6~10 条基础功能测试用例。
只输出 JSON 数组，每项字段：module(模块名称)、scenario(测试场景)、pre(前置条件)、steps(操作步骤字符串数组)、expected(预期结果)，全部使用中文。
\`\`\`html
${html.slice(0, 14000)}
\`\`\``;

export default function CasesView({ html, settings, busy }: { html: string | null; settings: Settings; busy: boolean }) {
  const [aiCases, setAiCases] = useState<TestCase[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const ruleCases = useMemo(() => (html ? generateCases(html) : []), [html]);
  const kind = useMemo(() => (html ? KIND_LABEL[detectKind(html)] : ''), [html]);
  useEffect(() => setAiCases(null), [html]);
  const cases = aiCases ?? ruleCases;
  const aiMode = !!settings.apiKey.trim();

  if (!html) return <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[#62626f]">生成页面后，这里会根据页面功能自动生成测试用例</div>;

  const copy = async () => {
    if (!cases.length) return toast.error('暂无用例可复制');
    if (await copyText(casesToMarkdown(cases, kind), ` ${cases.length} 条用例（Markdown）`)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const runAi = async () => {
    setLoading(true);
    try {
      setAiCases(parseAiCases(await complete(settings, PROMPT(html))));
      toast.success('AI 用例已生成');
    } catch (e) {
      toast.error(`AI 生成失败，继续使用规则用例：${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const btn = 'press flex shrink-0 items-center gap-1.5 rounded-md border border-[#24242e] px-2.5 py-1 hover:border-[#8b5cf6] hover:text-[#ededf2] disabled:opacity-40';
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#24242e] px-4 py-2 text-xs text-[#9a9aab]">
        <span className="min-w-0">📋 {kind} · {cases.length} 条 · <span className={aiCases ? 'text-[#34d399]' : 'text-[#38bdf8]'}>{aiCases ? 'AI 生成' : '规则生成'}</span></span>
        <div className="flex items-center gap-2">
          {aiMode && <button onClick={runAi} disabled={loading || busy} className={btn}>{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}AI 生成</button>}
          <button onClick={copy} className={btn}>{copied ? <Check className="h-3.5 w-3.5 text-[#34d399]" /> : <Copy className="h-3.5 w-3.5" />}{copied ? '已复制' : '复制 Markdown'}</button>
        </div>
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-auto">
        <table data-cases className="w-full min-w-[620px] border-collapse text-left text-[12px]">
          <thead className="sticky top-0 z-10 bg-[#17171e] text-[#9a9aab]">
            <tr>{['#', '模块名称', '测试场景', '前置条件', '操作步骤', '预期结果'].map((h) => <th key={h} className="whitespace-nowrap border-b border-[#24242e] px-2.5 py-2 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {cases.map((c, i) => (
              <tr key={`${i}-${c.scenario}`} className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both border-b border-[#17171e] align-top hover:bg-[#111116]" style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
                <td className="px-2.5 py-2 font-mono text-[#62626f]">{String(i + 1).padStart(2, '0')}</td>
                <td className="whitespace-nowrap px-2.5 py-2"><span className="rounded bg-[#8b5cf6]/15 px-1.5 py-0.5 text-[#c4b5fd]">{c.module}</span></td>
                <td className="px-2.5 py-2 font-semibold text-[#ededf2]">{c.scenario}</td>
                <td className="px-2.5 py-2 text-[#9a9aab]">{c.pre}</td>
                <td className="whitespace-pre-line px-2.5 py-2 text-[#d4d4de]">{c.steps}</td>
                <td className="px-2.5 py-2 text-[#34d399]">{c.expected}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
