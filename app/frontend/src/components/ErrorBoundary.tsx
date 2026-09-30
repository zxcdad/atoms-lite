import { Component, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** 渲染异常兜底：避免整页黑屏，并提供恢复入口 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('界面渲染异常', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#0b0b0f] p-6 text-[#ededf2]">
        <div className="max-w-md rounded-xl border border-[#24242e] bg-[#111116] p-6 text-center">
          <h1 className="text-lg font-semibold">界面出现异常</h1>
          <p className="mt-2 break-words text-sm text-[#9a9aab]">{this.state.error.message}</p>
          <p className="mt-1 text-xs text-[#62626f]">你的工程数据已保存在本地，不会丢失。</p>
          <div className="mt-5 flex justify-center gap-2">
            <button onClick={() => this.setState({ error: null })} className="press rounded-lg bg-[#8b5cf6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7c4deb]">重试</button>
            <button onClick={() => location.reload()} className="press rounded-lg border border-[#24242e] px-4 py-2 text-sm hover:bg-[#24242e]">刷新页面</button>
          </div>
        </div>
      </div>
    );
  }
}
