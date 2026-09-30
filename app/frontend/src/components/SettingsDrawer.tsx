import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PROVIDER_DEFAULTS } from '@/lib/storage';
import type { Provider, Settings } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  settings: Settings;
  onSave: (s: Settings) => void;
  onResetAll: () => void;
}

const input = 'w-full rounded-lg border border-[#24242e] bg-[#0b0b0f] px-3 py-2 text-[13px] text-[#ededf2] outline-none transition focus:border-[#8b5cf6]';

export default function SettingsDrawer({ open, onOpenChange, settings, onSave, onResetAll }: Props) {
  const [draft, setDraft] = useState(settings);
  useEffect(() => { if (open) setDraft(settings); }, [open, settings]);

  const pick = (p: Provider) => setDraft({ ...draft, provider: p, ...PROVIDER_DEFAULTS[p] });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-[100dvh] w-full flex-col gap-0 border-[#24242e] bg-[#111116] p-0 text-[#ededf2] sm:max-w-md">
        <SheetHeader className="shrink-0 px-6 pb-4 pt-6 pr-12">
          <SheetTitle className="text-[#ededf2]">设置</SheetTitle>
          <SheetDescription className="text-[#9a9aab]">填写 API Key 使用真实大模型生成；留空则自动使用内置 Mock 引擎。Key 仅保存在本机浏览器。</SheetDescription>
        </SheetHeader>
        <div className="thin-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-6 pt-2">
          <div>
            <label className="mb-2 block text-xs font-semibold text-[#9a9aab]">模型服务商</label>
            <div className="grid grid-cols-2 gap-2">
              {(['openai', 'deepseek'] as Provider[]).map((p) => (
                <button key={p} onClick={() => pick(p)} className={`press rounded-lg border px-3 py-2 text-sm ${draft.provider === p ? 'border-[#8b5cf6] bg-[#8b5cf6]/15 text-[#ededf2]' : 'border-[#24242e] text-[#9a9aab] hover:text-[#ededf2]'}`}>
                  {p === 'openai' ? 'OpenAI' : 'DeepSeek'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="k" className="mb-2 block text-xs font-semibold text-[#9a9aab]">API Key</label>
            <input id="k" type="password" className={input} placeholder="sk-..." value={draft.apiKey} onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} />
          </div>
          <div>
            <label htmlFor="b" className="mb-2 block text-xs font-semibold text-[#9a9aab]">Base URL</label>
            <input id="b" className={input} value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} />
          </div>
          <div>
            <label htmlFor="m" className="mb-2 block text-xs font-semibold text-[#9a9aab]">模型</label>
            <input id="m" className={input} value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} />
          </div>
          <div className="rounded-lg border border-[#24242e] bg-[#0b0b0f] p-3 text-xs text-[#9a9aab]">
            当前模式：{draft.apiKey.trim() ? <span className="text-[#34d399]">真实模型（请求失败自动降级 Mock）</span> : <span className="text-[#38bdf8]">内置 Mock 引擎</span>}
          </div>
          <button onClick={() => { onSave(draft); onOpenChange(false); }} className="press w-full rounded-lg bg-[#8b5cf6] py-2.5 text-sm font-semibold text-white hover:bg-[#7c4deb]">保存设置</button>
        </div>
        <div className="shrink-0 border-t border-[#24242e] bg-[#111116] px-6 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <p className="mb-2 text-xs text-[#9a9aab]">危险操作：清空全部项目、对话、版本与设置</p>
          <button onClick={onResetAll} className="press w-full rounded-lg border border-[#f87171]/40 !bg-transparent py-2.5 text-sm font-semibold text-[#f87171] hover:!bg-[#f87171]/10">清空并重置所有数据</button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
