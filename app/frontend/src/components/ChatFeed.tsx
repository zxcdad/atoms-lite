import { useEffect, useRef } from 'react';
import { Sparkles, User } from 'lucide-react';
import type { ChatMessage, Version } from '@/lib/types';
import { PRESETS } from '@/lib/templates';

interface Props {
  messages: ChatMessage[];
  versions: Version[];
  currentVersionId: string | null;
  pending: string | null;
  streamLen: number;
  onPickVersion: (id: string) => void;
  onPreset: (prompt: string) => void;
}

export default function ChatFeed({ messages, versions, currentVersionId, pending, streamLen, onPickVersion, onPreset }: Props) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // 仅滚动对话容器本身；scrollIntoView 会连带滚动 overflow:hidden 的 body/#root，导致整页被推出视口（黑屏）
    const box = end.current?.closest<HTMLElement>('[data-chat-scroll]');
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
  }, [messages.length, pending, streamLen]);

  if (!messages.length && !pending)
    return (
      <div className="flex h-full flex-col justify-center px-6 py-8">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#8b5cf6]/15 text-[#a78bfa]"><Sparkles className="h-5 w-5" /></div>
        <h2 className="text-lg font-semibold">描述你想要的应用</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#9a9aab]">用一句话生成可运行的网页，再通过对话持续修改。每次生成都会保存为一个版本快照。</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button key={p.key} onClick={() => onPreset(p.prompt)} className="press rounded-xl border border-[#24242e] bg-[#17171e] p-3 text-left text-[13px] hover:border-[#8b5cf6]/60 hover:bg-[#1c1c26]">
              <div className="font-semibold">{p.label}</div>
              <div className="mt-1 line-clamp-2 text-xs text-[#62626f]">{p.prompt}</div>
            </button>
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-4 px-4 py-4">
      {messages.map((m) => {
        const v = versions.find((x) => x.id === m.versionId);
        if (m.role === 'user')
          return (
            <div key={m.id} className="flex justify-end gap-2">
              <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-[#8b5cf6] px-3.5 py-2.5 text-[13.5px] text-white">{m.content}</div>
              <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#24242e]"><User className="h-3.5 w-3.5" /></div>
            </div>
          );
        return (
          <div key={m.id} className="flex gap-2">
            <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#8b5cf6]/20 text-[#a78bfa]"><Sparkles className="h-3.5 w-3.5" /></div>
            <div className="min-w-0 max-w-[88%] rounded-2xl rounded-tl-sm border border-[#24242e] bg-[#17171e] px-3.5 py-2.5">
              <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed">{m.content}</p>
              {v && (
                <button onClick={() => onPickVersion(v.id)} className={`press mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] ${currentVersionId === v.id ? 'bg-[#8b5cf6]/20 text-[#c4b5fd]' : 'bg-[#24242e] text-[#9a9aab] hover:text-[#ededf2]'}`}>
                  Version {v.index} {m.source === 'llm' ? '· AI 模型' : '· Mock'}
                  {currentVersionId === v.id && ' · 当前'}
                </button>
              )}
            </div>
          </div>
        );
      })}
      {pending && (
        <div className="flex gap-2">
          <div className="mt-1 flex h-6 w-6 shrink-0 animate-pulse items-center justify-center rounded-full bg-[#8b5cf6]/20 text-[#a78bfa]"><Sparkles className="h-3.5 w-3.5" /></div>
          <div className="rounded-2xl rounded-tl-sm border border-[#24242e] bg-[#17171e] px-3.5 py-2.5 text-[13.5px] text-[#9a9aab]">
            <span className="caret">{streamLen ? `正在编写代码… 已输出 ${streamLen.toLocaleString()} 字符` : '正在理解需求'}</span>
          </div>
        </div>
      )}
      <div ref={end} />
    </div>
  );
}
