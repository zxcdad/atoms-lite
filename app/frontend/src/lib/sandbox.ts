/** 注入到 iframe 内的探针脚本：上报控制台、运行时错误与加载完成事件 */
const PROBE = `<script>(function(){
var send=function(type,level,text){try{parent.postMessage({__atoms:1,type:type,level:level,text:text,t:performance.now()},'*')}catch(e){}};
var fmt=function(a){return Array.prototype.map.call(a,function(x){if(typeof x==='string')return x;try{return JSON.stringify(x)}catch(e){return String(x)}}).join(' ')};
['log','info','warn','error'].forEach(function(l){var o=console[l];console[l]=function(){send('console',l,fmt(arguments));o.apply(console,arguments)}});
window.onerror=function(msg,src,line,col,err){send('error','error',(msg||'脚本错误')+(line?' (行 '+line+':'+(col||0)+')':'')+(err&&err.stack?'\\n'+err.stack:''));};
window.addEventListener('unhandledrejection',function(e){var r=e.reason;send('error','error','Unhandled Promise rejection: '+(r&&r.message||r)+(r&&r.stack?'\\n'+r.stack:''))});
window.addEventListener('load',function(){send('load','info','')});
})();</script>`;

export function instrument(html: string) {
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + PROBE);
  return PROBE + html;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 轻量 HTML 语法高亮（标签、属性、字符串、注释） */
export function highlight(code: string) {
  return esc(code)
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="text-[#62626f]">$1</span>')
    .replace(/(&lt;\/?)([a-zA-Z0-9!-]+)/g, '$1<span class="text-[#f472b6]">$2</span>')
    .replace(/(\s)([a-zA-Z-:@]+)(=)(&quot;|")/g, '$1<span class="text-[#38bdf8]">$2</span>$3$4')
    .replace(/("[^"\n]*")/g, '<span class="text-[#a7f3d0]">$1</span>')
    .replace(/('[^'\n]*')/g, '<span class="text-[#fcd34d]">$1</span>');
}
