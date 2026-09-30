import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MANUAL_COPY_EVENT, type ManualCopyDetail } from '@/lib/clipboard';

/** 自动复制失败时的兜底：展示全文并自动全选，供用户 Ctrl/⌘+C 手动复制 */
export default function ManualCopyDialog() {
  const [detail, setDetail] = useState<ManualCopyDetail | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const on = (e: Event) => setDetail((e as CustomEvent<ManualCopyDetail>).detail);
    window.addEventListener(MANUAL_COPY_EVENT, on);
    return () => window.removeEventListener(MANUAL_COPY_EVENT, on);
  }, []);

  const selectAll = () => {
    ref.current?.focus();
    ref.current?.select();
  };

  return (
    <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
      <DialogContent data-manual-copy onOpenAutoFocus={(e) => { e.preventDefault(); setTimeout(selectAll, 30); }} className="flex max-h-[85dvh] w-[calc(100vw-24px)] max-w-2xl flex-col gap-3 border-[#24242e] bg-[#17171e] p-4 text-[#ededf2] sm:p-5">
        <DialogHeader className="text-left">
          <DialogTitle className="text-base">手动复制{detail?.label}</DialogTitle>
          <DialogDescription className="text-xs text-[#9a9aab]">自动复制失败：{detail?.reason}。内容已全选，请按 Ctrl+C（Mac 为 ⌘+C），移动端可长按后选择「复制」。</DialogDescription>
        </DialogHeader>
        <textarea ref={ref} readOnly value={detail?.text ?? ''} onFocus={(e) => e.currentTarget.select()} className="thin-scroll min-h-[200px] w-full flex-1 resize-none rounded-lg border border-[#24242e] bg-[#0b0b0f] p-3 font-mono text-[12px] text-[#d4d4de] outline-none focus:border-[#8b5cf6]" />
        <div className="flex justify-end gap-2">
          <button onClick={selectAll} className="press h-9 rounded-lg border border-[#24242e] px-3 text-xs text-[#ededf2] !bg-transparent hover:!bg-[#24242e]">重新全选</button>
          <button onClick={() => setDetail(null)} className="press h-9 rounded-lg bg-[#8b5cf6] px-4 text-xs font-semibold text-white hover:bg-[#7c4deb]">完成</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
