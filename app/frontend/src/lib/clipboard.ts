import { toast } from 'sonner';

export const MANUAL_COPY_EVENT = 'atoms:manual-copy';
export interface ManualCopyDetail { text: string; label: string; reason: string }

function execCopy(text: string): boolean {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
  document.body.appendChild(ta);
  const active = document.activeElement as HTMLElement | null;
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  active?.focus?.();
  return ok;
}

/**
 * 复制文本：Clipboard API → execCommand 降级 → 弹出手动复制框。
 * 每条路径都会给出明确反馈；返回是否已写入剪贴板。
 */
export async function copyText(text: string, label = '内容'): Promise<boolean> {
  if (!text) {
    toast.error(`没有可复制的${label}`);
    return false;
  }
  let reason = '';
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`已复制${label}`);
      return true;
    } catch (e) {
      reason = (e as Error).name === 'NotAllowedError' ? '浏览器/嵌入环境拒绝了剪贴板权限' : (e as Error).message;
    }
  } else {
    reason = '当前环境不支持剪贴板 API';
  }
  if (execCopy(text)) {
    toast.success(`已复制${label}`);
    return true;
  }
  const detail: ManualCopyDetail = { text, label, reason: reason || '剪贴板写入被拒绝' };
  window.dispatchEvent(new CustomEvent<ManualCopyDetail>(MANUAL_COPY_EVENT, { detail }));
  toast.error(`自动复制失败（${detail.reason}），已打开手动复制窗口`);
  return false;
}
