import { useMemo, useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { copyText } from '@/lib/clipboard';
import { highlight } from '@/lib/sandbox';
import { downloadFile, htmlFileName } from '@/lib/storage';

export default function CodeView({ code, streaming, projectName }: { code: string; streaming: boolean; projectName: string }) {
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => highlight(code), [code]);
  const lines = code ? code.split('\n').length : 0;

  const copy = async () => {
    if (await copyText(code, '源码')) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (!code)
    return <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[#62626f]">还没有生成代码，先在下方描述你的需求吧</div>;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-[#24242e] px-4 py-2 text-xs text-[#9a9aab]">
        <span className="font-mono">index.html · {lines} 行{streaming && ' · 生成中'}</span>
        <div className="flex items-center gap-2">
        <button onClick={copy} className="press flex items-center gap-1.5 rounded-md border border-[#24242e] px-2.5 py-1 hover:border-[#8b5cf6] hover:text-[#ededf2]">
          {copied ? <Check className="h-3.5 w-3.5 text-[#34d399]" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? '已复制' : '复制代码'}
        </button>
        <button onClick={() => downloadFile(htmlFileName(projectName), code, 'text/html')} disabled={streaming} title={streaming ? '生成完成后可下载' : `下载 ${htmlFileName(projectName)}`} className="press flex items-center gap-1.5 rounded-md border border-[#24242e] px-2.5 py-1 hover:border-[#8b5cf6] hover:text-[#ededf2] disabled:opacity-40">
          <Download className="h-3.5 w-3.5" />下载 HTML
        </button>
        </div>
      </div>
      <pre className="thin-scroll min-h-0 flex-1 overflow-auto p-4 text-[12.5px] leading-[1.65] text-[#d4d4de]">
        <code className={streaming ? 'caret' : ''} dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}
