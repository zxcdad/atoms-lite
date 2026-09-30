const head = (title: string, vars: string, css: string) => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
:root{${vars}}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
button{font-family:inherit}
${css}
</style>
</head>`;

export const POMODORO = `${head(
  '专注番茄钟',
  '--primary:#f25f4c;--bg:#fff7f3;--surface:#ffffff;--text:#2b1d1a;--muted:#8a7470;--radius:20px',
  `body{display:grid;place-items:center;padding:24px}
.card{background:var(--surface);border-radius:var(--radius);padding:36px 28px;width:100%;max-width:380px;text-align:center;box-shadow:0 20px 60px -20px rgba(0,0,0,.2)}
h1{font-size:22px;margin-bottom:6px}.sub{color:var(--muted);font-size:14px;margin-bottom:24px}
.modes{display:flex;gap:6px;justify-content:center;margin-bottom:24px}
.modes button{border:none;background:transparent;color:var(--muted);padding:8px 14px;border-radius:999px;cursor:pointer;font-size:14px;transition:.2s}
.modes button.on{background:var(--primary);color:#fff}
.ring{position:relative;width:220px;height:220px;margin:0 auto 24px}.ring svg{transform:rotate(-90deg)}
.ring .t{position:absolute;inset:0;display:grid;place-items:center;font-size:48px;font-weight:700;font-variant-numeric:tabular-nums}
.ctrl{display:flex;gap:12px;justify-content:center}
.btn{border:none;border-radius:14px;padding:12px 26px;font-size:15px;font-weight:600;cursor:pointer;transition:transform .15s,opacity .15s}
.btn:hover{opacity:.9}.btn:active{transform:scale(.96)}
.primary{background:var(--primary);color:#fff}.ghost{background:rgba(127,127,127,.14);color:var(--text)}
.stats{margin-top:22px;font-size:13px;color:var(--muted)}`,
)}
<body>
<div class="card">
  <h1 data-title>专注番茄钟</h1>
  <p class="sub">保持专注，一次只做一件事</p>
  <div class="modes"><button class="on" data-m="25">专注 25</button><button data-m="5">短休 5</button><button data-m="15">长休 15</button></div>
  <div class="ring">
    <svg width="220" height="220"><circle cx="110" cy="110" r="96" stroke="rgba(127,127,127,.15)" stroke-width="12" fill="none"/><circle id="bar" cx="110" cy="110" r="96" stroke="var(--primary)" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="603" stroke-dashoffset="0" style="transition:stroke-dashoffset .5s"/></svg>
    <div class="t" id="time">25:00</div>
  </div>
  <div class="ctrl"><button class="btn primary" id="toggle">开始</button><button class="btn ghost" id="reset">重置</button></div>
  <p class="stats">今日已完成 <b id="done">0</b> 个番茄</p>
</div>
<script>
var total=1500,left=1500,timer=null,done=0;
function $(i){return document.getElementById(i)}
function render(){var m=Math.floor(left/60),s=left%60;$('time').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');$('bar').style.strokeDashoffset=603*(1-left/total)}
function stop(){clearInterval(timer);timer=null;$('toggle').textContent='开始'}
$('toggle').onclick=function(){
  if(timer){stop();return}
  $('toggle').textContent='暂停';
  timer=setInterval(function(){left--;if(left<=0){stop();if(total===1500){done++;$('done').textContent=done}console.log('一个番茄完成！');left=total}render()},1000);
};
$('reset').onclick=function(){stop();left=total;render()};
document.querySelectorAll('[data-m]').forEach(function(b){b.onclick=function(){document.querySelectorAll('[data-m]').forEach(function(x){x.classList.remove('on')});b.classList.add('on');stop();total=left=b.dataset.m*60;render()}});
function resetApp(){stop();done=0;$('done').textContent='0';left=total;render();console.log('数据已重置')}
render();console.log('番茄钟已就绪');
</script>
</body>
</html>`;

export const SNAKE = `${head(
  '霓虹贪吃蛇',
  '--primary:#22c55e;--bg:#0f172a;--surface:#1e293b;--text:#e2e8f0;--muted:#94a3b8;--radius:16px',
  `body{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;gap:14px}
h1{font-size:22px}
.bar{display:flex;gap:18px;font-size:14px;color:var(--muted)}.bar b{color:var(--text)}
.board{position:relative;background:var(--surface);border-radius:var(--radius);padding:10px;box-shadow:0 20px 50px -20px rgba(0,0,0,.6)}
canvas{display:block;width:min(80vw,360px);height:min(80vw,360px);border-radius:10px;background:rgba(0,0,0,.25)}
.overlay{position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.55);border-radius:var(--radius);text-align:center}
.overlay.hide{display:none}
.btn{border:none;border-radius:12px;padding:11px 24px;font-size:15px;font-weight:600;cursor:pointer;background:var(--primary);color:#fff;transition:transform .15s}
.btn:active{transform:scale(.95)}
.pad{display:grid;grid-template-columns:repeat(3,52px);gap:6px}
.pad button{height:46px;border:none;border-radius:12px;background:var(--surface);color:var(--text);font-size:18px;cursor:pointer}
.pad button:active{background:var(--primary)}
.tip{font-size:12px;color:var(--muted)}`,
)}
<body>
<h1 data-title>霓虹贪吃蛇</h1>
<div class="bar"><span>得分 <b id="score">0</b></span><span>最高 <b id="best">0</b></span></div>
<div class="board">
  <canvas id="c" width="400" height="400"></canvas>
  <div class="overlay" id="ov"><div><p id="msg" style="margin-bottom:14px;font-size:18px">准备好了吗？</p><button class="btn" id="start">开始游戏</button></div></div>
</div>
<div class="pad"><span></span><button data-d="0,-1">▲</button><span></span><button data-d="-1,0">◀</button><button data-d="0,1">▼</button><button data-d="1,0">▶</button></div>
<p class="tip">方向键 / WASD / 屏幕按钮控制</p>
<script>
var N=20,S=20,cv=document.getElementById('c'),ctx=cv.getContext('2d');
var snake,dir,next,food,score,best=0,loop=null;
function color(){return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()||'#22c55e'}
function place(){do{food={x:Math.floor(Math.random()*N),y:Math.floor(Math.random()*N)}}while(snake.some(function(p){return p.x===food.x&&p.y===food.y}))}
function init(){snake=[{x:9,y:10},{x:8,y:10},{x:7,y:10}];dir={x:1,y:0};next=dir;score=0;document.getElementById('score').textContent=0;place();draw()}
function draw(){ctx.clearRect(0,0,400,400);ctx.fillStyle='#f43f5e';ctx.beginPath();ctx.arc(food.x*S+10,food.y*S+10,7,0,7);ctx.fill();
  var c=color();snake.forEach(function(p,i){ctx.globalAlpha=1-i/(snake.length*1.6);ctx.fillStyle=c;ctx.fillRect(p.x*S+2,p.y*S+2,S-4,S-4)});ctx.globalAlpha=1}
function tick(){dir=next;var h={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
  if(h.x<0||h.y<0||h.x>=N||h.y>=N||snake.some(function(p){return p.x===h.x&&p.y===h.y})){return over()}
  snake.unshift(h);if(h.x===food.x&&h.y===food.y){score++;document.getElementById('score').textContent=score;place()}else snake.pop();draw()}
function over(){clearInterval(loop);loop=null;if(score>best){best=score;document.getElementById('best').textContent=best}
  document.getElementById('msg').textContent='游戏结束，得分 '+score;document.getElementById('start').textContent='再来一局';document.getElementById('ov').classList.remove('hide');console.log('游戏结束，得分',score)}
function start(){init();document.getElementById('ov').classList.add('hide');clearInterval(loop);loop=setInterval(tick,120)}
function turn(x,y){if(x===-dir.x&&y===-dir.y)return;next={x:x,y:y}}
document.getElementById('start').onclick=start;
document.querySelectorAll('[data-d]').forEach(function(b){b.onclick=function(){var d=b.dataset.d.split(',');turn(+d[0],+d[1])}});
document.addEventListener('keydown',function(e){var m={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0],w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]}[e.key];if(m){e.preventDefault();turn(m[0],m[1])}});
function resetApp(){clearInterval(loop);loop=null;best=0;document.getElementById('best').textContent=0;init();document.getElementById('msg').textContent='准备好了吗？';document.getElementById('start').textContent='开始游戏';document.getElementById('ov').classList.remove('hide');console.log('数据已重置')}
init();console.log('贪吃蛇已加载');
</script>
</body>
</html>`;

export const KANBAN = `${head(
  '待办看板',
  '--primary:#3b82f6;--bg:#f4f6fb;--surface:#ffffff;--text:#1e2433;--muted:#6b7280;--radius:14px',
  `body{padding:24px}
header{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:20px}
h1{font-size:22px}
form{display:flex;gap:8px;flex:1;max-width:420px;min-width:240px}
input{flex:1;min-width:0;border:1px solid rgba(127,127,127,.25);background:var(--surface);color:var(--text);border-radius:10px;padding:10px 12px;font-size:14px;outline:none}
input:focus{border-color:var(--primary)}
.btn{border:none;border-radius:10px;padding:10px 16px;background:var(--primary);color:#fff;font-weight:600;cursor:pointer;transition:transform .15s}
.btn:active{transform:scale(.95)}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
.col{background:rgba(127,127,127,.08);border-radius:var(--radius);padding:12px;min-height:220px;transition:background .2s}
.col.over{background:rgba(127,127,127,.18)}
.col h2{font-size:14px;display:flex;justify-content:space-between;margin-bottom:10px;color:var(--muted)}
.task{background:var(--surface);border-radius:10px;padding:10px 12px;margin-bottom:8px;display:flex;justify-content:space-between;gap:8px;cursor:grab;box-shadow:0 2px 6px rgba(0,0,0,.06);font-size:14px;border-left:3px solid var(--primary)}
.task button{border:none;background:none;color:var(--muted);cursor:pointer;font-size:16px}
.empty{font-size:12px;color:var(--muted);text-align:center;padding:18px 0}`,
)}
<body>
<header><h1 data-title>待办看板</h1><form id="f"><input id="inp" placeholder="添加新任务，回车确认" maxlength="60"><button class="btn">添加</button></form></header>
<div class="cols" id="cols"></div>
<script>
var COLS=[['todo','待办'],['doing','进行中'],['done','已完成']];
var DEFAULT=[{id:1,t:'设计首页线框图',c:'todo'},{id:2,t:'编写接口文档',c:'todo'},{id:3,t:'实现登录模块',c:'doing'},{id:4,t:'项目立项评审',c:'done'}];
var tasks=JSON.parse(JSON.stringify(DEFAULT)),dragId=null;
function render(){var root=document.getElementById('cols');root.innerHTML='';
  COLS.forEach(function(c){var list=tasks.filter(function(t){return t.c===c[0]});var col=document.createElement('div');col.className='col';
    col.innerHTML='<h2><span>'+c[1]+'</span><span>'+list.length+'</span></h2>';
    if(!list.length)col.insertAdjacentHTML('beforeend','<p class="empty">拖拽任务到这里</p>');
    list.forEach(function(t){var el=document.createElement('div');el.className='task';el.draggable=true;el.innerHTML='<span></span><button title="删除">×</button>';el.firstChild.textContent=t.t;
      el.ondragstart=function(){dragId=t.id};el.lastChild.onclick=function(){tasks=tasks.filter(function(x){return x.id!==t.id});render()};
      el.ondblclick=function(){var i=COLS.findIndex(function(x){return x[0]===t.c});t.c=COLS[(i+1)%3][0];render()};col.appendChild(el)});
    col.ondragover=function(e){e.preventDefault();col.classList.add('over')};col.ondragleave=function(){col.classList.remove('over')};
    col.ondrop=function(){tasks.forEach(function(t){if(t.id===dragId)t.c=c[0]});render()};root.appendChild(col)})}
document.getElementById('f').onsubmit=function(e){e.preventDefault();var v=document.getElementById('inp').value.trim();if(!v)return;tasks.push({id:Date.now(),t:v,c:'todo'});document.getElementById('inp').value='';render();console.log('新增任务：'+v)};
function resetApp(){tasks=JSON.parse(JSON.stringify(DEFAULT));render();console.log('数据已重置')}
render();console.log('看板已就绪，可拖拽或双击任务流转');
</script>
</body>
</html>`;

export const LOGIN = `${head(
  '欢迎登录',
  '--primary:#6366f1;--bg:#eef0f7;--surface:#ffffff;--text:#1f2233;--muted:#6b7084;--radius:18px',
  `body{display:grid;place-items:center;padding:24px}
.card{background:var(--surface);border-radius:var(--radius);padding:36px 30px;width:100%;max-width:380px;box-shadow:0 24px 60px -24px rgba(0,0,0,.25)}
.logo{width:44px;height:44px;border-radius:12px;background:var(--primary);margin-bottom:18px}
h1{font-size:22px;margin-bottom:6px}.sub{color:var(--muted);font-size:14px;margin-bottom:24px}
label{display:block;font-size:13px;font-weight:600;margin-bottom:6px}
.field{margin-bottom:16px}.wrap{position:relative}
input[type=email],input[type=password],input[type=text]{width:100%;border:1px solid rgba(127,127,127,.3);background:transparent;color:var(--text);border-radius:10px;padding:11px 12px;font-size:14px;outline:none;transition:border .2s}
input:focus{border-color:var(--primary)}
.err{color:#e11d48;font-size:12px;margin-top:5px;min-height:14px}
.eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:none;border-radius:8px;background:none;color:var(--muted);cursor:pointer;padding:0}
.eye:hover{color:var(--text)}
.eye svg{width:18px;height:18px;pointer-events:none}
#pw{padding-right:44px}
#pw::-ms-reveal,#pw::-ms-clear{display:none}
.row{display:flex;justify-content:space-between;align-items:center;font-size:13px;margin-bottom:20px;color:var(--muted)}
.row a{color:var(--primary);text-decoration:none}
.btn{width:100%;border:none;border-radius:10px;padding:12px;background:var(--primary);color:#fff;font-size:15px;font-weight:600;cursor:pointer;transition:transform .15s,opacity .2s}
.btn:active{transform:scale(.98)}.btn:disabled{opacity:.6}
.ok{text-align:center}.ok .icon{width:56px;height:56px;border-radius:50%;background:var(--primary);color:#fff;display:grid;place-items:center;margin:0 auto 14px;font-size:26px}`,
)}
<body>
<div class="card" id="card">
  <div class="logo"></div>
  <h1 data-title>欢迎回来</h1>
  <p class="sub">登录你的账户以继续</p>
  <form id="f" novalidate>
    <div class="field"><label for="em">邮箱</label><input id="em" type="email" placeholder="you@example.com"><div class="err" id="e1"></div></div>
    <div class="field"><label for="pw">密码</label><div class="wrap"><input id="pw" type="password" placeholder="至少 6 位"><button type="button" class="eye" id="eye" aria-label="显示密码" title="显示密码"></button></div><div class="err" id="e2"></div></div>
    <div class="row"><label style="font-weight:400;margin:0"><input type="checkbox"> 记住我</label><a href="#">忘记密码？</a></div>
    <button class="btn" id="sub">登录</button>
  </form>
</div>
<script>
var html0=document.getElementById('card').innerHTML;
function bind(){
  var eye=document.getElementById('eye'),pw=document.getElementById('pw');
  var EYE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.9 17.9A10.4 10.4 0 0 1 12 19c-6.5 0-10-7-10-7a18.5 18.5 0 0 1 5.1-5.9M9.9 5.2A9.1 9.1 0 0 1 12 5c6.5 0 10 7 10 7a18.6 18.6 0 0 1-2.2 3.2"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/><path d="M2 2l20 20"/></svg>';
  eye.innerHTML=EYE;
  eye.onclick=function(){var s=pw.type==='password';pw.type=s?'text':'password';eye.innerHTML=s?EYE_OFF:EYE;var t=s?'隐藏密码':'显示密码';eye.setAttribute('aria-label',t);eye.title=t};
  document.getElementById('f').onsubmit=function(e){e.preventDefault();
    var em=document.getElementById('em').value.trim(),ok=true;
    document.getElementById('e1').textContent=/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(em)?'':(ok=false,'请输入有效的邮箱地址');
    document.getElementById('e2').textContent=pw.value.length>=6?'':(ok=false,'密码至少 6 位');
    if(!ok){console.warn('表单校验未通过');return}
    var b=document.getElementById('sub');b.disabled=true;b.textContent='登录中...';
    setTimeout(function(){document.getElementById('card').innerHTML='<div class="ok"><div class="icon">✓</div><h1>登录成功</h1><p class="sub" style="margin-top:6px">欢迎，'+em.replace(/[<>&]/g,'')+'</p></div>';console.log('登录成功',em)},900)};
}
function resetApp(){document.getElementById('card').innerHTML=html0;bind();console.log('数据已重置')}
bind();console.log('登录表单已就绪');
</script>
</body>
</html>`;

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] as string);

export function genericPage(prompt: string) {
  const title = esc(prompt.slice(0, 24) || '我的新页面');
  return `${head(
    title,
    '--primary:#0ea5e9;--bg:#f8fafc;--surface:#ffffff;--text:#0f172a;--muted:#64748b;--radius:16px',
    `.hero{padding:72px 24px 48px;text-align:center;max-width:760px;margin:0 auto}
.tag{display:inline-block;padding:6px 12px;border-radius:999px;background:rgba(127,127,127,.12);font-size:12px;color:var(--muted);margin-bottom:18px}
h1{font-size:clamp(28px,5vw,44px);line-height:1.15;margin-bottom:14px}
.hero p{color:var(--muted);font-size:16px;line-height:1.7;margin-bottom:26px}
.btn{border:none;border-radius:12px;padding:12px 24px;background:var(--primary);color:#fff;font-weight:600;cursor:pointer;font-size:15px;transition:transform .15s}
.btn:active{transform:scale(.96)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;max-width:900px;margin:0 auto;padding:0 24px 64px}
.f{background:var(--surface);border-radius:var(--radius);padding:22px;box-shadow:0 8px 24px -12px rgba(0,0,0,.15)}
.f i{display:block;width:34px;height:34px;border-radius:10px;background:var(--primary);opacity:.9;margin-bottom:12px}
.f h3{font-size:16px;margin-bottom:6px}.f p{font-size:14px;color:var(--muted);line-height:1.6}
.count{margin-top:14px;font-size:13px;color:var(--muted)}`,
  )}
<body>
<section class="hero">
  <span class="tag">由 Atoms-Lite 生成</span>
  <h1 data-title>${title}</h1>
  <p>根据你的需求「${esc(prompt)}」生成的页面骨架。配置 API Key 后可获得完全定制的 AI 生成结果。</p>
  <button class="btn" id="cta">立即体验</button>
  <p class="count">按钮已被点击 <b id="n">0</b> 次</p>
</section>
<section class="grid">
  <div class="f"><i></i><h3>快速上手</h3><p>清晰的信息层级与响应式布局，适配各种屏幕尺寸。</p></div>
  <div class="f"><i></i><h3>可继续迭代</h3><p>在左侧继续描述修改，例如“换成紫色主色”。</p></div>
  <div class="f"><i></i><h3>一键导出</h3><p>下载 index.html，直接部署到任意静态托管。</p></div>
</section>
<script>
var n=0;document.getElementById('cta').onclick=function(){n++;document.getElementById('n').textContent=n;console.log('CTA 点击',n)};
function resetApp(){n=0;document.getElementById('n').textContent=0;console.log('数据已重置')}
console.log('页面已生成');
</script>
</body>
</html>`;
}

export interface Preset {
  key: string;
  label: string;
  prompt: string;
  keywords: RegExp;
  html: string;
  summary: string;
}

export const PRESETS: Preset[] = [
  { key: 'pomodoro', label: '🍅 番茄钟', prompt: '做一个简洁好看的番茄钟，支持专注/短休/长休切换和进度环', keywords: /番茄|pomodoro|计时|倒计时|专注/i, html: POMODORO, summary: '已生成「专注番茄钟」：包含三种模式切换、SVG 进度环、开始/暂停/重置以及今日番茄统计。' },
  { key: 'snake', label: '🐍 贪吃蛇', prompt: '做一个贪吃蛇游戏，支持键盘和手机按键控制，显示得分和最高分', keywords: /贪吃蛇|snake|游戏|game/i, html: SNAKE, summary: '已生成「霓虹贪吃蛇」：Canvas 渲染、键盘/WASD/屏幕方向键控制、得分与最高分记录、游戏结束重开。' },
  { key: 'kanban', label: '📋 待办看板', prompt: '做一个三列的待办看板，可以添加、删除任务并拖拽流转', keywords: /待办|todo|看板|kanban|任务|清单/i, html: KANBAN, summary: '已生成「待办看板」：待办/进行中/已完成三列，支持添加、删除、拖拽流转（双击也可流转）。' },
  { key: 'login', label: '🔐 登录表单', prompt: '做一个现代风格的登录表单，带邮箱密码校验和显示密码', keywords: /登录|login|注册|sign ?in|表单/i, html: LOGIN, summary: '已生成「登录表单」：邮箱格式与密码长度校验、显示/隐藏密码、记住我、提交加载与成功状态。' },
];
