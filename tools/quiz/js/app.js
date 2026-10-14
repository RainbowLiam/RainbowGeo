'use strict';
/* ============================================================
   工具 & 全局状态
   ============================================================ */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = () => 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store = {
  get(k, f){ try{ const v = localStorage.getItem(k); return v === null ? f : JSON.parse(v); }catch(e){ return f; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};
const fmtTime = s => { s = Math.max(0, Math.round(s)); const m = Math.floor(s/60), ss = s%60; return (m<10?'0':'') + m + ':' + (ss<10?'0':'') + ss; };

/* 题组数据：GROUPS=[{id,name,questions}]，curG 为当前题组索引 */
let GROUPS = store.get('qa_groups_v1', null);
if(!GROUPS || !Array.isArray(GROUPS) || !GROUPS.length){
  const legacy = store.get('qa_bank_v1', []);
  GROUPS = [{ id: uid(), name: '默认题组', questions: Array.isArray(legacy) ? legacy : [] }];
}
let curG = 0;
if(!Array.isArray(GROUPS[curG]?.questions)) GROUPS[curG].questions = [];
const curQs = () => GROUPS[curG].questions;
let playG = -1; // 游戏参数面板所选题组（-1=跟随当前题组）
const playQs = () => GROUPS[playG >= 0 && playG < GROUPS.length ? playG : curG].questions;
let settings = store.get('qa_settings_v1', { muted:false });
let cfg = store.get('qa_cfg_v1', {});
let theme = store.get('qa_theme_v1', 'dark');
let view = 'lobby';
let pendingGroups = [];  // 导入预览中的题组 [{name, items, asNewGroup}]
let editingId = null;     // 手动编辑中的题目 id（null=新增）

const TYPES = {
  single:   { name:'单选',        color:'#43C6FF' },
  multiple: { name:'多选',        color:'#A78BFF' },
  judge:    { name:'判断',        color:'#3AD29F' },
  fill:     { name:'填空 / 问答',  color:'#FFC53D' },
};

/* ============================================================
   图标库（内联 SVG）
   ============================================================ */
const IC = {
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
  bolt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12z"/></svg>',
  shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
  swords:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19 21l2-2"/><path d="M9.5 14.5L21 3v3L9.5 17.5"/><path d="M11 11l-2 2"/><path d="M5 21l2-2"/></svg>',
  rocket:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2"/><path d="M14 4c3.5-1.5 7-1 8.5 2-1 2.5-3 4-5 5l-4.5 4.5"/><path d="M9 15l-4-4c1.5-3.5 4-6 8-7l3 3c-1 4-3.5 6.5-7 8z"/><path d="M14 10a2 2 0 1 0 0 .01"/></svg>',
  bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  trophy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v4a6 6 0 0 1-12 0z"/><path d="M6 5H3v2a3 3 0 0 0 3 3"/><path d="M18 5h3v2a3 3 0 0 1-3 3"/><path d="M12 14v4"/><path d="M8 21h8"/><path d="M10 17h4v4h-4z"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  cross:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  upload:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5-5 5 5"/><path d="M12 15V3"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 8l5 5 5-5"/><path d="M12 3v12"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4l14 8-14 8z"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>',
  crown:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l4.5 4L12 5l4.5 7L21 8v11H3z"/></svg>',
  gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  vol:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.4 5.6a9 9 0 0 1 0 12.8"/></svg>',
  mute:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>',
  sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>',
  arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>',
  warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  qmark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 10a3 3 0 1 1 6 0c0 2-3 2.5-3 4"/><path d="M12 17h.01"/></svg>',
  heart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 12.6L12 20l-7.5-7.4A5 5 0 1 1 12 6.6a5 5 0 1 1 7.5 6z"/></svg>',
  flag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22V4c4-2 8 2 12 0v10c-4 2-8-2-12 0"/></svg>',
  target:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>',
  pause:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 4v16M17 4v16"/></svg>',
};
const icon = (name, cls='') => `<span class="${cls}">${IC[name]||''}</span>`;

/* ============================================================
   音效引擎（Web Audio 合成，无外部资源）
   ============================================================ */
const Fx = {
  ctx:null, muted:false,
  ensure(){ if(!this.ctx){ const AC = window.AudioContext||window.webkitAudioContext; if(AC) this.ctx = new AC(); } if(this.ctx && this.ctx.state==='suspended') this.ctx.resume(); },
  tone(freq, dur, type='sine', vol=.2, when=0, slideTo=null){
    if(this.muted) return;
    this.ensure(); if(!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t+dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t); o.stop(t+dur+0.05);
  },
  ding(){ this.tone(880,.14,'sine',.22); this.tone(1318,.2,'sine',.2,.09); },
  buzz(){ this.tone(196,.28,'sawtooth',.18,0,120); this.tone(150,.3,'square',.1,.05,98); },
  tick(){ this.tone(1050,.05,'square',.1); },
  buzzer(){ this.tone(620,.12,'square',.2); this.tone(620,.12,'square',.2,.15); },
  fanfare(){ [523,659,784,1046].forEach((f,i)=>this.tone(f,.28,'triangle',.2,i*.11)); },
  lose(){ [392,330,262].forEach((f,i)=>this.tone(f,.25,'triangle',.16,i*.12)); },
  click(){ this.tone(600,.04,'square',.06); },
  start(){ this.tone(660,.1,'sine',.15); this.tone(880,.14,'sine',.15,.09); },
};
Fx.muted = settings.muted;

/* ============================================================
   彩带粒子（Canvas）
   ============================================================ */
const Confetti = {
  cv:null, ctx:null, parts:[], running:false,
  init(){
    this.cv = $('#confetti'); this.ctx = this.cv.getContext('2d');
    const rs = () => { this.cv.width = innerWidth; this.cv.height = innerHeight; };
    rs(); addEventListener('resize', rs);
  },
  burst(x, y, n=90){
    if(!this.cv) return; this.cv.style.display='block';
    const colors = ['#FFC53D','#43C6FF','#3AD29F','#FF6B6B','#FF9F45','#A78BFF','#FFD97A'];
    for(let i=0;i<n;i++){
      const a = Math.random()*Math.PI*2, sp = 4+Math.random()*9;
      this.parts.push({
        x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp-4,
        w:6+Math.random()*7, h:8+Math.random()*8,
        rot:Math.random()*Math.PI, vr:(Math.random()-.5)*.3,
        c:colors[Math.floor(Math.random()*colors.length)],
        life:1, decay:.008+Math.random()*.012, g:.22
      });
    }
    if(!this.running){ this.running = true; this.loop(); }
  },
  loop(){
    const c = this.ctx; c.clearRect(0,0,this.cv.width,this.cv.height);
    this.parts = this.parts.filter(p => p.life > 0);
    if(!this.parts.length){ this.running=false; this.cv.style.display='none'; c.clearRect(0,0,this.cv.width,this.cv.height); return; }
    for(const p of this.parts){
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.rot += p.vr; p.life -= p.decay;
      c.save(); c.translate(p.x,p.y); c.rotate(p.rot); c.globalAlpha = Math.max(0,p.life);
      c.fillStyle = p.c; c.fillRect(-p.w/2,-p.h/2,p.w,p.h); c.restore();
    }
    requestAnimationFrame(() => this.loop());
  }
};

/* ============================================================
   Toast
   ============================================================ */
function toast(msg, kind='info'){
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = icon(kind==='ok'?'check':kind==='err'?'warn':'info') + `<span>${esc(msg)}</span>`;
  $('#toast').appendChild(el);
  setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>el.remove(), 320); }, 2600);
}

/* ============================================================
   视图路由
   ============================================================ */
function switchView(v){
  view = v;
  $$('.view').forEach(el => el.classList.toggle('active', el.id === 'view-'+v));
  $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.nav === v));
  if(v==='bank') renderBank();
  if(v==='lobby') renderLobby();
}

/* ============================================================
   游戏模式定义
   ============================================================ */
const MODES = [
  {
    id:'solo', name:'单人挑战', tag:'计时 / 生存', hue:'#FFC53D', hueDark:'#C78A00', emoji:'🎯',
    desc:'每题限时作答；可选「生存闯关」赛制——答错扣一条命，生命耗尽立即结束。适合随堂测验与极限挑战。',
    icon:'clock',
    fields:[
      { key:'rule', label:'赛制', type:'select', def:'classic', options:[['classic','经典计时 · 答完即止'],['survival','生存闯关 · 错 N 题结束']] },
      { key:'lives', label:'生命值', type:'range', min:1, max:5, step:1, def:3, unit:'条', when:c=>c.rule==='survival' },
      { key:'perTime', label:'每题限时', type:'range', min:5, max:60, step:1, def:10, unit:'秒' },
      { key:'penalty', label:'答错扣分', type:'toggle', def:false, hint:'答错 / 超时扣 1 题分值' },
    ]
  },
  {
    id:'rush', name:'限时冲刺', tag:'限时计数', hue:'#43C6FF', hueDark:'#0B7CB8', emoji:'⚡',
    desc:'总时长内尽可能多地答对题目，答对自动跳下一题。比的是速度和准确率。',
    icon:'bolt',
    fields:[
      { key:'totalTime', label:'总时长', type:'range', min:30, max:600, step:10, def:120, unit:'秒' },
      { key:'penalty', label:'答错扣分', type:'toggle', def:false, hint:'答错不扣分则只计正确数' },
    ]
  },
  {
    id:'duelTimed', name:'双人对战·计时', tag:'轮流作答', hue:'#FF8FA3', hueDark:'#D94A6A', emoji:'🤝',
    desc:'两人轮流作答，每题限时。最终按总分决出胜负，平局也有说法。',
    icon:'swords',
    fields:[
      { key:'p1Name', label:'选手一', type:'text', def:'选手一', ph:'输入名称' },
      { key:'p2Name', label:'选手二', type:'text', def:'选手二', ph:'输入名称' },
      { key:'perTime', label:'每题限时', type:'range', min:5, max:60, step:1, def:10, unit:'秒' },
      { key:'penalty', label:'答错扣分', type:'toggle', def:true, hint:'答错扣 1 题分值' },
    ]
  },
  {
    id:'duelRush', name:'双人对战·冲刺', tag:'独立计时', hue:'#FF9F45', hueDark:'#C76A00', emoji:'🔥',
    desc:'双方各有独立总时长，答对继续连答，答错或超时换对方。时间耗尽即结束。',
    icon:'rocket',
    fields:[
      { key:'p1Name', label:'选手一', type:'text', def:'选手一', ph:'输入名称' },
      { key:'p2Name', label:'选手二', type:'text', def:'选手二', ph:'输入名称' },
      { key:'eachTime', label:'每人总时长', type:'range', min:30, max:300, step:10, def:90, unit:'秒' },
    ]
  },
  {
    id:'buzz', name:'抢答擂台', tag:'先按先答', hue:'#A78BFF', hueDark:'#6B46D8', emoji:'🚨',
    desc:'题目出现即可抢答，先按下者获得作答权。答对得分，答错扣分并进入下一题。',
    icon:'bell',
    fields:[
      { key:'players', label:'参赛人数', type:'select', def:'2', options:[['1','单人抢答'],['2','双人抢答']] },
      { key:'p1Name', label:'选手一', type:'text', def:'选手一', ph:'输入名称', when:p=>true },
      { key:'p2Name', label:'选手二', type:'text', def:'选手二', ph:'输入名称', when:p=>p.players==='2' },
      { key:'buzzTime', label:'无人抢答跳过', type:'range', min:5, max:30, step:1, def:15, unit:'秒' },
      { key:'penalty', label:'答错扣分', type:'toggle', def:true, hint:'抢答后答错扣 1 题分值' },
    ]
  },
];
const MODE_MAP = Object.fromEntries(MODES.map(m=>[m.id,m]));
/* 共享参数 */
const SHARED_FIELDS = [
  { key:'useAll', label:'使用全部题目', type:'toggle', def:false },
  { key:'types', label:'题型范围', type:'types', def:['single','multiple','judge','fill'] },
  { key:'count', label:'题目数量', type:'range', min:1, max:50, step:1, def:10, unit:'题', when:c=>!c.useAll },
  { key:'shuffle', label:'随机打乱顺序', type:'toggle', def:true },
  { key:'score', label:'每题分值', type:'range', min:1, max:50, step:1, def:10, unit:'分' },
  { key:'showAnalysis', label:'答后展示解析', type:'toggle', def:true, hint:'答题后显示本题解析' },
];

/* ============================================================
   题目规范化
   ============================================================ */
function normAnswer(ans){
  let a = String(ans ?? '').trim().toUpperCase();
  if(!a) return '';
  if(/^(对|正确|√|是|TRUE|T)$/.test(a)) return '对';
  if(/^(错|错误|×|否|FALSE|F)$/.test(a)) return '错';
  const letters = a.replace(/[^A-H]/g, '');
  if(letters) return [...new Set(letters.split(''))].sort().join('');
  return String(ans).trim();
}
function inferType(q){
  const t = String(q.type || '').toLowerCase();
  if(/判断|judge/.test(t)) return 'judge';
  if(/多选|multiple/.test(t)) return 'multiple';
  if(/填空|简答|问答|fill/.test(t)) return 'fill';
  if(/单选|single/.test(t)) return 'single';
  if(q.options && q.options.length){
    const a = (q.answer||'').replace(/[^A-H]/g,'');
    return a.length > 1 ? 'multiple' : 'single';
  }
  if(q.answer==='对' || q.answer==='错') return 'judge';
  return q.answer ? 'fill' : 'fill'; // 无答案无选项（如教案填空）按填空处理，用户可补充答案
}
function normalizeQuestion(raw){
  const q = {
    id: raw.id || uid(),
    qNo: raw.qNo || null,
    type: inferType(raw),
    question: String(raw.question||'').trim(),
    options: (raw.options||[]).filter(o=>o && o.text!==undefined && String(o.text).trim()!=='').map((o,i)=>({ key:String(o.key||'ABCDEFGH'[i]||'').toUpperCase(), text:String(o.text).trim() })),
    answer: normAnswer(raw.answer),
    analysis: String(raw.analysis||'').trim(),
  };
  if(q.type==='judge' && !q.options.length) q.options = [{key:'A',text:'正确'},{key:'B',text:'错误'}];
  return q;
}
function validQuestion(q){ return q.question !== '' && (q.answer !== '' || q.options.length >= 2); }

/* ============================================================
   导入解析：Excel / Word / JSON
   ============================================================ */
function parseExcelBuffer(buf){
  const wb = XLSX.read(buf, { type:'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:'' });
  let hi = rows.findIndex(r => r.some(c => /题目|题干|问题|题面|question/i.test(String(c))));
  if(hi < 0) hi = 0;
  const header = rows[hi].map(c => String(c).trim());
  const col = { q:-1, opts:[], ans:-1, ana:-1, type:-1, optSingle:-1 };
  header.forEach((h, i) => {
    if(/题目|题干|问题|题面|题干内容|question/i.test(h)) col.q = i;
    else if(/答案|正确答案|参考答案|标准答案|answer/i.test(h)) col.ans = i;
    else if(/解析|详解|解释|分析|explanation/i.test(h)) col.ana = i;
    else if(/题型|类型|type/i.test(h)) col.type = i;
    else if(/选项/i.test(h) && !/选项\s*[A-H]|^[A-H]\s*$/i.test(h)) col.optSingle = i;
  });
  header.forEach((h, i) => {
    const m = h.match(/^(?:选项)?\s*([A-H])\s*(?:选项)?$/i);
    if(m && col.opts.length < 8) col.opts.push({ key:m[1].toUpperCase(), idx:i });
  });
  if(col.opts.length) col.opts.sort((a,b)=>a.key.localeCompare(b.key));
  if(col.q < 0) throw new Error('未能在表格中找到「题目」列。请确认表头包含「题目 / 题干 / 问题」字样。');
  const out = [];
  for(let r = hi+1; r < rows.length; r++){
    const row = rows[r];
    if(!row || row.every(c => String(c).trim()==='')) continue;
    const qText = String(row[col.q]||'').trim();
    if(!qText) continue;
    let opts = [];
    if(col.opts.length) col.opts.forEach(o => { const v = String(row[o.idx]||'').trim(); if(v) opts.push({ key:o.key, text:v }); });
    if(!opts.length && col.optSingle >= 0){
      const cell = String(row[col.optSingle]||'');
      cell.split(/\n+/).forEach(line => {
        const m = line.trim().match(/^([A-H])[.、．)]?\s*(.+)$/);
        if(m) opts.push({ key:m[1].toUpperCase(), text:m[2].trim() });
      });
    }
    out.push(normalizeQuestion({
      question: qText,
      options: opts,
      answer: col.ans>=0 ? row[col.ans] : '',
      analysis: col.ana>=0 ? row[col.ana] : '',
      type: col.type>=0 ? row[col.type] : '',
    }));
  }
  return out.filter(validQuestion);
}
/* 参考答案区解析：选择题压缩答案（1~5 . B C D D B）+ 大题参考答案（31.（1）…） */
function parseAnswerKey(text, keyMap, bigMap){
  const idx = text.search(/参考答案|标准答案/);
  if(idx < 0) return; // 无参考答案区标记（如教案型 PPT），不启用答案区解析，避免误匹配正文
  const sec = text.slice(idx);
  const re = /(\d{1,3})\s*[~～\-–]\s*(\d{1,3})\s*[.、．:]?\s*([A-Ha-h](?:[\s、，,]*[A-Ha-h])*)/g;
  let m;
  while((m = re.exec(sec))){
    const from = +m[1], to = +m[2], n = to - from + 1;
    const ans = m[3].replace(/[\s、，,]/g,'').toUpperCase();
    if(ans.length === n){ for(let i=0;i<n;i++) keyMap[from+i] = ans[i]; }
  }
  // 选择题增强：逐题字母答案（1.B 2.C / 1.B、2.C），不覆盖区间答案
  const per = /\n?\s*(\d{1,3})\s*[.、．):]\s*([A-H])\s*(?=[\n;；,，、]|(?:\s+\d)|$)/g;
  let pm;
  while((pm = per.exec(sec))){
    const no = +pm[1];
    if(!(no in keyMap)) keyMap[no] = pm[2].toUpperCase();
  }
  const big = /\n(\d{1,3})\s*[.、．]\s*\n?([\s\S]*?)(?=\n\d{1,3}\s*[.、．]|\n(?:一|二|三|四|五|六|七|八|九|十)[、.．]|$)/g;
  let bm;
  while((bm = big.exec(sec))) bigMap[+bm[1]] = bm[2].trim();
}
function parseDocxText(text, keepNoAnswer){
  const lines = String(text||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const out = []; let cur = null; let typeHint = '';
  const splitInline = line => {
    // 同一行多选项：A. xxx  B. xxx  C. xxx  D. xxx
    const parts = []; const re = /(?:^|\s)([A-H])[.、．):]\s*/g;
    let m, last = -1, key = '';
    while((m = re.exec(line))){
      if(last >= 0) parts.push({ key, text: line.slice(last, m.index).trim() });
      key = m[1].toUpperCase(); last = m.index + m[0].length;
    }
    if(last >= 0){ parts.push({ key, text: line.slice(last).trim() }); }
    return parts.length >= 2 ? parts : null;
  };
  const splitInlineQ = s => {
    // 题号行内嵌选项：「题干（  ）A. xxx B. xxx」→ {lead 题干, opts 选项}
    const starts = [];
    const re = /(?:^|[\s（(）)】〕])([A-H])[.、．):]\s*/g;
    let mm;
    while((mm = re.exec(s))) starts.push({ at: mm.index + (mm[0][0]===' ' ? 1 : 0), key: mm[1], after: mm.index + mm[0].length });
    if(starts.length < 2) return null;
    const lead = s.slice(0, starts[0].at).trim();
    if(!lead) return null;
    const opts = starts.map((st, k) => ({ key: st.key.toUpperCase(), text: (k < starts.length-1 ? s.slice(st.after, starts[k+1].at) : s.slice(st.after)).trim() }));
    return { lead, opts };
  };
  const hintOf = s => /判断/.test(s) ? '判断' : /多选/.test(s) ? '多选' : /填空/.test(s) ? '填空' : /问答|简答|综合|解答|材料题/.test(s) ? '问答' : /单选/.test(s) ? '单选' : '';
  let inAns = false; // 正在收集【解析】内容
  let entered = false; // 是否已进入题目区（见到题型标题或题号）
  for(const line of lines){
    // 参考答案区：停止题目解析
    if(/^(?:参考答案|标准答案)\s*[:：]?$/.test(line)) break;
    // 【解析】答案块：选择类题目进 analysis，无选项题进 answer（解析文本可能与本行共存）
    if(/^【解析】/.test(line)){
      const rest = line.replace(/^【解析】/, '').trim();
      if(cur && rest){
        if(cur.options.length) cur.analysis += (cur.analysis?'\n':'') + rest;
        else if(!cur.answer) cur.answer += (cur.answer?'\n':'') + rest;
      }
      inAns = true; continue;
    }
    if(inAns){
      if(/^(\d{1,3})[.、．]/.test(line) || /^([A-H])[.、．)]/.test(line)) inAns = false;
      else {
        if(cur && cur.options.length) cur.analysis += (cur.analysis?'\n':'') + line;
        else if(cur && !cur.answer) cur.answer += (cur.answer?'\n':'') + line.replace(/^【解析】/,'');
        continue;
      }
    }
    // 中文序号题型标题（一、单选题 / 二、综合题…）
    let m = line.match(/^[一二三四五六七八九十]+[、.．]\s*(.+)$/);
    if(m && /(题|选择|判断|填空|问答|简答|综合|解答|辨析|改错)/.test(m[1]) && !line.includes('。')){
      typeHint = hintOf(m[1]);
      entered = true;
      continue;
    }
    m = line.match(/^(\d{1,3})[.、．]\s*(.*)$/) || line.match(/^第\s*(\d{1,3})\s*题[.、．:]?\s*(.*)$/);
    if(m){
      entered = true;
      cur = { qNo: +m[1], question:m[2], options:[], answer:'', analysis:'', type:typeHint }; out.push(cur);
      // 选择题增强：题号行内嵌选项「题干（  ）A.xxx B.xxx」直接拆分为选项
      const emb = splitInlineQ(m[2]);
      if(emb && emb.opts.length >= 2){ cur.question = emb.lead; cur.options = emb.opts.slice(0, 8); }
      continue;
    }
    // 噪音行跳过（在题号分支之后，避免误杀真实题干）：
    // ① 材料/读图引导句（无题号）；② 分值/说明行
    if(/完成(?:下面|下列|以下)?(?:小)?题|回答(?:下面|下列|以下)?问题|读(?:下图|材料|下表)|根据(?:材料|图文|图表|资料|以下内容)/.test(line)) continue;
    if(/^(?:每|各)(?:题|小|空)\s*\d+\s*分\s*[。；;]?$/.test(line) || (line.includes('共') && /共\s*\d+\s*分/.test(line) && line.length < 40)) continue;
    // ③ 试卷头部栏：试卷名 / 出题人 / 时间 / 分值 / 个人信息（仅未进入题目区时跳过）
    if(!entered && /(试卷|试题|检测|考卷|模拟|真题|统考|联考|月考|段考|期中|期末|单元|学业|会考|中考|高考|学年|学期|年级|学校|教育|命题|出题|审题|制卷|考试时间|满分|总分|分值|注意事项|答题卡|姓名|班级|考号|学号|座位号|准考证号|考场)/.test(line)) continue;
    if(!cur){ cur = { qNo:null, question:line, options:[], answer:'', analysis:'', type:typeHint }; out.push(cur); continue; }
    const inl = splitInline(line);
    if(inl && cur.options.length + inl.length <= 8){ cur.options.push(...inl); continue; }
    m = line.match(/^([A-H])[.、．):]?\s*(.+)$/);
    if(m && cur.options.length < 8){ cur.options.push({ key:m[1].toUpperCase(), text:m[2].trim() }); continue; }
    m = line.match(/^(?:正确答案|答案|参考答案)\s*[:：]\s*(.*)$/i);
    if(m){ cur.answer = m[1].trim(); continue; }
    m = line.match(/^(?:解析|详解|解释|分析)\s*[:：]\s*(.*)$/);
    if(m){ cur.analysis = m[1].trim(); continue; }
    if(!cur.answer && !cur.options.length) cur.question += ' ' + line;
    else if(!cur.answer && cur.options.length) cur.analysis += (cur.analysis?'\n':'') + line;
  }
  // 文末参考答案回填
  const keyMap = {}, bigMap = {};
  parseAnswerKey(text, keyMap, bigMap);
  for(const q of out){
    if(!q.answer){
      if(q.qNo && keyMap[q.qNo]) q.answer = keyMap[q.qNo];
      else if(q.qNo && bigMap[q.qNo]) q.answer = bigMap[q.qNo];
    }
  }
  const final = out.map(normalizeQuestion);
  if(keepNoAnswer){
    // PPT 教案常无答案区：保留带题号或有答案的题，滤除标题页、导语页、知识图例页等噪音
    return final.filter(q => {
      if(!q.question.trim()) return false;
      if(q.answer) return true;
      if(!q.qNo) return false; // 无题号 = 标题/导语噪音
      if(q.options.length > 6 && !/[（(]/.test(q.question)) return false; // 知识页/图例页
      return true;
    });
  }
  return final.filter(validQuestion);
}
function parseJsonFile(text){
  const data = JSON.parse(text);
  if(data.groups && Array.isArray(data.groups)){
    // 导出全部题组 格式：{ groups:[{name, questions}] }，空组也保留以实现双向同步
    return data.groups.map(g => ({ name: String(g.name || '题组').trim() || '题组', items: (g.questions || []).map(normalizeQuestion).filter(validQuestion) }));
  }
  const arr = Array.isArray(data) ? data : (Array.isArray(data.questions) ? data.questions : null);
  if(!arr) throw new Error('JSON 结构无法识别：需要题目数组，或包含 questions / groups 数组的对象。');
  return [{ name: String(data.groupName || '导入题组').trim() || '导入题组', items: arr.map(normalizeQuestion).filter(validQuestion) }];
}
async function parsePptxBuffer(buf){
  if(!window.JSZip) throw new Error('JSZip 解析库加载失败，无法解析 PPTX，请刷新页面重试');
  const zip = await JSZip.loadAsync(buf);
  const slides = [];
  zip.forEach((p, f) => { const m = p.match(/^ppt\/slides\/slide(\d+)\.xml$/); if(m) slides.push({ n:+m[1], f: p }); });
  slides.sort((a,b) => a.n - b.n);
  if(!slides.length) throw new Error('未在 PPTX 中找到幻灯片内容');
  const parts = [];
  for(const s of slides){
    const xml = await zip.file(s.f).async('string');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    // 按段落（a:p）拼接 a:t，同一段落内的碎片文本直接连成一行
    const paras = Array.from(doc.getElementsByTagName('a:p')).map(p =>
      Array.from(p.getElementsByTagName('a:t')).map(t => t.textContent || '').join('')
    );
    parts.push(paras.join('\n'));
  }
  return parts.join('\n\n');
}
/* 解析单个文件：返回 { name, items, asNewGroup }，asNewGroup=true 时导入后自成题组 */
async function parseImportFile(file){
  const ext = (file.name||'').split('.').pop().toLowerCase();
  if(ext === 'json'){
    // JSON 文件：每个文件形成一个题组（一个文件内可能含多组）
    const groups = parseJsonFile(await file.text());
    if(!groups.length) throw new Error('JSON 中未识别出任何题目：' + file.name);
    return groups.map(g => ({ ...g, asNewGroup: true }));
  }
  let items = [];
  if(ext === 'docx'){
    const res = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    items = parseDocxText(res.value);
  } else if(ext === 'pptx'){
    // 教案型 PPT 常缺答案区：保留全部带题干的题目（答案留空，预览中可手动补充）
    items = parseDocxText(await parsePptxBuffer(await file.arrayBuffer()), true);
  } else if(ext === 'ppt'){
    throw new Error('旧版 .ppt 二进制格式暂不支持，请用 PowerPoint 另存为 .pptx 后再导入');
  } else if(ext === 'xlsx' || ext === 'xls'){
    items = parseExcelBuffer(await file.arrayBuffer());
  } else {
    throw new Error('不支持的文件类型：' + (file.name||'未知') + '。支持 .xlsx / .xls / .docx / .pptx / .json');
  }
  if(!items.length) throw new Error('未能从文件中识别出任何题目：' + file.name + '。请检查表头列名或文档格式。');
  const base = (file.name||'题组').replace(/\.(json|xlsx|xls|docx|pptx|ppt)$/i, '');
  return [{ name: base.trim() || '导入题组', items, asNewGroup: false }];
}
async function handleImportFiles(files){
  const arr = Array.from(files || []);
  if(!arr.length) return;
  const groups = [];
  const fails = [];
  for(const f of arr){
    try{ groups.push(...await parseImportFile(f)); }
    catch(e){ fails.push({ name: f.name || '未知文件', err: e.message || '导入失败' }); }
  }
  if(!groups.length){
    // 全部文件均无法识别：弹出信息框，手动选择重试或放弃
    openFailModal(fails);
    return;
  }
  if(fails.length){
    // 部分失败：信息框说明，可查看成功题目继续
    openFailModal(fails, groups);
    return;
  }
  pendingGroups = groups;
  openPreview();
}
function openFailModal(fails, okGroups){
  $('#failList').innerHTML = fails.map(f => `
    <div class="fail-item">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
      <div><b>${esc(f.name)}</b><div class="reason">${esc(f.err)}</div></div>
    </div>`).join('');
  if(okGroups && okGroups.length) pendingGroups = okGroups;
  const partial = !!(okGroups && okGroups.length);
  const total = partial ? okGroups.reduce((n,g)=>n+g.items.length,0) : 0;
  $('#failPartial').style.display = partial ? 'block' : 'none';
  $('#failPartial').innerHTML = partial ? `另有 ${okGroups.length} 个文件识别成功（共 ${total} 道题），可继续查看导入。` : '';
  $('#failContinue').style.display = partial ? 'inline-flex' : 'none';
  $('#importFailModal').classList.add('open');
}
function closeFailModal(){ $('#importFailModal').classList.remove('open'); }
function downloadJSON(){ exportGroups([GROUPS[curG]]); }
function exportGroups(groups){
  if(!groups.length){ toast('题库为空，没有可导出的内容','err'); return; }
  const single = groups.length === 1;
  const payload = single
    ? { app:'答题竞技场', version:1, exportedAt:new Date().toISOString().slice(0,10), groupName:groups[0].name, questionCount:groups[0].questions.length, questions:groups[0].questions }
    : { app:'答题竞技场', version:1, exportedAt:new Date().toISOString().slice(0,10), groupCount:groups.length, groups:groups.map(g => ({ name:g.name, questionCount:g.questions.length, questions:g.questions })) };
  const blob = new Blob([JSON.stringify(payload,null,2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '答题竞技场_题库_' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('题库已导出为 JSON','ok');
}

/* ============================================================
   导入预览弹窗
   ============================================================ */
function openPreview(){
  renderPreview();
  $('#previewModal').classList.add('open');
}
function closePreview(){ $('#previewModal').classList.remove('open'); pendingGroups = []; }
function renderPreview(){
  const box = $('#previewList');
  const total = pendingGroups.reduce((n, g) => n + g.items.length, 0);
  $('#previewCount').textContent = total;
  let gi = 0;
  box.innerHTML = pendingGroups.map((g, gIdx) => {
    const targets = [
      `<option value="current" ${g.target==='current'?'selected':''}>并入当前题组（${esc(GROUPS[curG].name)}）</option>`,
      `<option value="new" ${(g.target==='new'||(!g.target&&g.asNewGroup))?'selected':''}>＋ 新建题组</option>`,
      ...GROUPS.map((x, xi) => xi===curG ? '' : `<option value="g_${x.id}" ${g.target==='g_'+x.id?'selected':''}>并入「${esc(x.name)}」（${x.questions.length} 题）</option>`)
    ];
    const head = `<div class="preview-group" data-g="${gIdx}">
      <div class="pg-head"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        <input type="text" class="text-input pg-name" data-g="${gIdx}" value="${esc(g.name)}" placeholder="题组名称" style="max-width:200px">
        <span class="pg-count">${g.items.length} 题</span>
        <label class="pg-target"><span>导入到</span>
          <select class="text-input pg-target-sel" data-g="${gIdx}" style="max-width:230px">${targets.join('')}</select>
        </label>
      </div>
    </div>`;
    const items = g.items.map((q, i) => `
      <div class="preview-item" data-g="${gIdx}" data-i="${i}">
        <div class="row1">
          <input type="checkbox" class="pv-check" data-i="${i}" checked>
          <div class="fields">
            <input type="text" class="text-input pv-q" data-i="${i}" value="${esc(q.question)}" placeholder="题干">
            <input type="text" class="text-input pv-ans num" data-i="${i}" value="${esc(q.answer)}" placeholder="答案（A / AB / 对 / 错 / 文本）" style="font-size:13px">
          </div>
        </div>
        <div class="row2">
          <textarea class="text-input opts-in pv-opts" data-i="${i}" placeholder="选项：每行一条，如「选项一」（判断题可留空）">${esc(q.options.map(o=>o.key+'. '+o.text).join('\n'))}</textarea>
          <div class="field"><label style="font-size:12px;color:var(--text-3)">题型</label>
            <select class="text-input pv-type" data-i="${i}">
              ${['single','multiple','judge','fill'].map(t=>`<option value="${t}" ${q.type===t?'selected':''}>${TYPES[t].name}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>`).join('');
    return head + items;
  }).join('');
}
$('#previewList').addEventListener('input', e => {
  const t = e.target;
  if(t.classList.contains('pg-name')){ const g = pendingGroups[+t.dataset.g]; if(g) g.name = t.value; return; }
  if(!t.dataset.i || !t.dataset.g) return;
  const q = pendingGroups[+t.dataset.g].items[+t.dataset.i]; if(!q) return;
  if(t.classList.contains('pv-q')) q.question = t.value;
  if(t.classList.contains('pv-ans')) q.answer = t.value;
  if(t.classList.contains('pv-opts')) q.options = t.value.split(/\n+/).map(l=>{ const m=l.trim().match(/^([A-H])[.、．)]?\s*(.+)$/); return m?{key:m[1].toUpperCase(),text:m[2].trim()}:{key:'',text:l.trim()}; }).filter(o=>o.text);
  if(t.classList.contains('pv-type')) q.type = t.value;
  q.answer = normAnswer(q.answer);
  if(q.type==='judge' && !q.options.length) q.options = [{key:'A',text:'正确'},{key:'B',text:'错误'}];
});
$('#previewList').addEventListener('change', e => {
  const t = e.target;
  if(t.classList.contains('pg-target-sel')){ const g = pendingGroups[+t.dataset.g]; if(g) g.target = t.value; return; }
  if(t.classList.contains('pv-check')) t.closest('.preview-item').classList.toggle('exclude', !t.checked);
});
$('#previewConfirm').addEventListener('click', () => {
  let added = 0, newGroups = 0;
  pendingGroups.forEach(g => {
    const selected = g.items.map((q, i) => {
      const c = document.querySelector(`.pv-check[data-i="${i}"]`);
      return c && c.checked ? normalizeQuestion(q) : null;
    }).filter(Boolean);
    added += selected.length;
    const target = g.target || (g.asNewGroup ? 'new' : 'current');
    if(target === 'new'){
      // 新建题组（JSON 导入默认）；空组也创建，保证导出全部→导入全部双向同步
      GROUPS.push({ id: uid(), name: (g.name||'').trim() || '题组', questions: selected });
      newGroups++;
    } else if(target === 'current'){
      if(selected.length) GROUPS[curG].questions = GROUPS[curG].questions.concat(selected);
    } else {
      const dst = GROUPS.find(x => x.id === target.slice(2));
      if(dst && selected.length) dst.questions = dst.questions.concat(selected);
    }
  });
  if(!added){ toast('请至少勾选一题','err'); return; }
  saveGroups();
  toast(`已导入 ${added} 道题目${newGroups ? '，新增 ' + newGroups + ' 个题组' : ''}`,'ok');
  closePreview();
  renderBank();
});
$('#previewCancel').addEventListener('click', closePreview);
$('#previewClose').addEventListener('click', closePreview);
$('#failClose').addEventListener('click', closeFailModal);
$('#failAbort').addEventListener('click', closeFailModal);
$('#failRetry').addEventListener('click', () => { closeFailModal(); $('#fileInput').click(); });
$('#failContinue').addEventListener('click', () => { closeFailModal(); openPreview(); });

/* ============================================================
   题库 CRUD & 渲染
   ============================================================ */
function saveGroups(){ store.set('qa_groups_v1', GROUPS); store.set('qa_bank_v1', curQs()); renderHeader(); }
function renderHeader(){
  $('#chipCount').textContent = curQs().length;
}
function renderGroups(){
  const bar = $('#groupTabs');
  bar.innerHTML = GROUPS.map((g, i) => `
    <div class="group-tab ${i===curG?'on':''}" data-g="${i}" title="切换到题组「${esc(g.name)}」">
      <span class="gn">${esc(g.name)}<button class="grp-rename" data-g="${i}" title="重命名题组"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button></span>
      <span class="gc">${g.questions.length} 题</span>
    </div>`).join('');
  bar.querySelectorAll('.group-tab').forEach(tab => tab.addEventListener('click', e => {
    if(e.target.closest('.grp-rename')) return;
    curG = +tab.dataset.g;
    saveGroups(); renderBank();
  }));
  $('#mergeCurName').textContent = GROUPS[curG].name;
}
/* 题组重命名：内联编辑（Enter 保存 / Esc 取消 / 失焦保存） */
$('#groupTabs').addEventListener('click', e => {
  const rn = e.target.closest('.grp-rename');
  if(!rn) return;
  e.stopPropagation();
  const tab = rn.closest('.group-tab');
  const gi = +rn.dataset.g;
  const old = GROUPS[gi].name;
  const inp = document.createElement('input');
  inp.type = 'text'; inp.className = 'text-input'; inp.value = old; inp.maxLength = 30;
  inp.style.cssText = 'width:112px;padding:3px 8px;font-size:12.5px;margin-right:4px';
  const gn = tab.querySelector('.gn');
  gn.replaceWith(inp);
  inp.focus(); inp.select();
  let done = false;
  const finish = save => {
    if(done) return; done = true;
    const v = inp.value.trim();
    if(save && v && v !== old){ GROUPS[gi].name = v; saveGroups(); toast('题组已重命名为「' + v + '」','ok'); }
    renderGroups(); renderBank();
  };
  inp.addEventListener('keydown', ev => {
    if(ev.key === 'Enter'){ ev.preventDefault(); finish(true); }
    else if(ev.key === 'Escape'){ finish(false); }
  });
  inp.addEventListener('blur', () => finish(true));
});
function renderBank(){
  renderHeader();
  renderGroups();
  const kw = ($('#bankSearch').value||'').trim().toLowerCase();
  const ft = $('#typeFilter').value;
  const list = curQs().filter(q =>
    (ft==='all' || q.type===ft) &&
    (!kw || q.question.toLowerCase().includes(kw) || (q.analysis||'').toLowerCase().includes(kw))
  );
  $('#statTotal').textContent = curQs().length;
  $('#statSingle').textContent = curQs().filter(q=>q.type==='single').length;
  $('#statMulti').textContent = curQs().filter(q=>q.type==='multiple').length;
  $('#statOther').textContent = curQs().filter(q=>q.type==='judge'||q.type==='fill').length;
  const box = $('#qList');
  if(!list.length){
    box.innerHTML = `<div class="qlist-empty">
      ${icon('book')}
      <div class="t">${curQs().length ? '没有匹配的题目' : '题库还是空的'}</div>
      <div class="s">${curQs().length ? '换个关键词或题型筛选试试' : '导入 Excel / Word / PPT / JSON 文件，或点击「手动添加题目」开始搭建题库'}</div>
    </div>`;
    return;
  }
  box.innerHTML = list.map(q => {
    const optsHtml = q.options.length
      ? `<div class="opt-mini">${q.options.map(o=>`<span>${esc(o.key)}. ${esc(o.text)}</span>`).join('')}</div>` : '';
    const anaHtml = q.analysis ? `<div class="ana-mini">解析：${esc(q.analysis)}</div>` : '';
    return `<div class="qitem" data-id="${q.id}">
      <div class="q-top">
        <span class="qtype-tag" style="--qt:${TYPES[q.type].color}">${TYPES[q.type].name}</span>
        <div class="q-text">${esc(q.question)}</div>
        <div class="q-ops">
          <button class="icon-btn" data-act="edit" title="编辑" aria-label="编辑">${icon('edit')}</button>
          <button class="icon-btn" data-act="del" title="删除" aria-label="删除" style="color:var(--text-3)">${icon('trash')}</button>
        </div>
      </div>
      <div class="q-meta">
        ${optsHtml}
        <div class="ans-mini">正确答案：<b>${esc(q.answer)}</b></div>
      </div>
      ${anaHtml}
    </div>`;
  }).join('');
}
$('#qList').addEventListener('click', e => {
  const btn = e.target.closest('[data-act]'); if(!btn) return;
  const item = btn.closest('.qitem'); const id = item.dataset.id;
  if(btn.dataset.act === 'del'){
    if(!confirm('确定删除这道题吗？')) return;
    GROUPS[curG].questions = curQs().filter(q=>q.id!==id); saveGroups(); renderBank(); toast('题目已删除','ok');
  }
  if(btn.dataset.act === 'edit'){
    const q = curQs().find(x=>x.id===id); if(!q) return;
    openManual(q);
  }
});
$('#bankSearch').addEventListener('input', renderBank);
$('#typeFilter').addEventListener('change', renderBank);

/* ============================================================
   手动添加 / 编辑题目弹窗
   ============================================================ */
function openManual(q){
  editingId = q ? q.id : null;
  $('#mQ').value = q ? q.question : '';
  $('#mAns').value = q ? q.answer : '';
  $('#mAna').value = q ? q.analysis : '';
  $('#mType').value = q ? q.type : 'single';
  $('#mOpts').value = q ? q.options.map(o=>o.text).join('\n') : '';
  $('#manualModal').classList.add('open');
}
function closeManual(){ $('#manualModal').classList.remove('open'); editingId = null; }
$('#mType').addEventListener('change', () => {
  const t = $('#mType').value;
  $('#mOptsField').style.display = (t==='fill') ? 'none' : 'flex';
});
$('#manualClose').addEventListener('click', closeManual);
$('#manualSave').addEventListener('click', () => {
  const q = {
    type: $('#mType').value,
    question: $('#mQ').value.trim(),
    options: $('#mType').value==='fill' ? [] : $('#mOpts').value.split(/\n+/).map(l=>l.trim()).filter(Boolean).map((t,i)=>({ key:'ABCDEFGH'[i], text:t })),
    answer: $('#mAns').value.trim(),
    analysis: $('#mAna').value.trim(),
  };
  const n = normalizeQuestion(q);
  if(!n.question){ toast('题干不能为空','err'); return; }
  if(!n.answer){ toast('请填写答案','err'); return; }
  if(editingId){ GROUPS[curG].questions = curQs().map(x => x.id===editingId ? { ...n, id:editingId } : x); toast('题目已更新','ok'); }
  else { GROUPS[curG].questions.push(n); toast('题目已添加','ok'); }
  saveGroups(); renderBank(); closeManual();
});

/* ============================================================
   参数面板渲染
   ============================================================ */
function mergeCfg(mode){
  const base = {};
  SHARED_FIELDS.forEach(f => base[f.key] = f.def);
  mode.fields.forEach(f => base[f.key] = f.def);
  return { ...base, ...(cfg[mode.id] || {}) };
}
function setField(el, mode, f){
  const val = f.type==='toggle' ? el.checked : (f.type==='range' ? +el.value : el.value);
  cfg[mode.id] = cfg[mode.id] || {};
  cfg[mode.id][f.key] = val;
  store.set('qa_cfg_v1', cfg);
  if(f.type==='range'){
    el.style.setProperty('--fill', ((val-f.min)/(f.max-f.min)*100) + '%');
    const lbl = el.closest('.field').querySelector('.val');
    if(lbl) lbl.textContent = val + (f.unit||'');
  }
  if(f.key==='useAll' || f.key==='players') renderConfig(mode);  // 联动重绘
}
function fieldHtml(f, val, mode){
  const id = 'f_' + mode.id + '_' + f.key;
  if(f.type==='types'){
    const all = ['single','multiple','judge','fill'];
    return `<div class="field"><label>${f.label}</label>
      <div class="type-chips" data-key="${f.key}">
        ${all.map(t=>`<button type="button" class="tchip" data-t="${t}" data-on="${(val||[]).includes(t)?1:0}">${TYPES[t].name}</button>`).join('')}
      </div></div>`;
  }
  if(f.type==='range'){
    const mx = f.key==='count' ? Math.max(1, playQs().length) : f.max;
    const v = Math.min(val, mx);
    const pct = ((v-f.min)/(mx-f.min)*100) + '%';
    return `<div class="field">
      <label for="${id}">${f.label}<span class="val num">${v}${f.unit||''}</span></label>
      <input type="range" id="${id}" data-key="${f.key}" min="${f.min}" max="${mx}" step="${f.step}" value="${v}" style="--fill:${pct}">
    </div>`;
  }
  if(f.type==='toggle'){
    return `<div class="field"><label for="${id}">${f.label}<span style="color:var(--text-3);font-weight:400;font-size:12px">${f.hint||''}</span></label>
      <label class="toggle"><input type="checkbox" id="${id}" data-key="${f.key}" ${val?'checked':''}><span class="track"></span><span class="thumb"></span></label>
    </div>`;
  }
  if(f.type==='select'){
    return `<div class="field"><label for="${id}">${f.label}</label>
      <select class="text-input" id="${id}" data-key="${f.key}">${f.options.map(o=>`<option value="${o[0]}" ${String(val)===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select>
    </div>`;
  }
  if(f.type==='text'){
    return `<div class="field"><label for="${id}">${f.label}</label>
      <input type="text" class="text-input" id="${id}" data-key="${f.key}" value="${esc(val)}" placeholder="${f.ph||''}"></div>`;
  }
  return '';
}
function renderConfig(mode){
  const c = mergeCfg(mode);
  $('#panelEmpty').style.display = 'none';
  const panel = $('#configPanel');
  panel.classList.add('open');
  panel.style.setProperty('--mc', theme==='light' ? (mode.hueDark||mode.hue) : mode.hue);
  const allFields = SHARED_FIELDS.concat(mode.fields);
  const shared = SHARED_FIELDS.filter(f => !f.when || f.when(c)).map(f => fieldHtml(f, c[f.key], mode)).join('');
  const specific = mode.fields.filter(f => !f.when || f.when(c)).map(f => fieldHtml(f, c[f.key], mode)).join('');
  const playName = GROUPS[playG >= 0 && playG < GROUPS.length ? playG : curG].name;
  const total = c.useAll ? playQs().length : Math.min(c.count, playQs().length);
  panel.innerHTML = `
    <div class="config-head">
      <h2>${icon(mode.icon)}${esc(mode.name)} · 参数调节</h2>
      <button class="close" id="cfgClose" title="收起">${icon('cross')}</button>
    </div>
    <div class="config-section"><h4><span class="dot"></span>选择题组</h4><div class="fields">
      <div class="field"><label for="cfgGroup">本次使用的题库题组</label>
        <select class="text-input" id="cfgGroup">
          <option value="-1" ${playG < 0 ? 'selected' : ''}>跟随当前题组「${esc(GROUPS[curG].name)}」</option>
          ${GROUPS.map((g, i) => `<option value="${i}" ${playG === i ? 'selected' : ''}>${esc(g.name)}（${g.questions.length} 题）</option>`).join('')}
        </select>
      </div>
    </div></div>
    <div class="config-section"><h4><span class="dot"></span>题目范围</h4><div class="fields">${shared}</div></div>
    <div class="config-section"><h4><span class="dot"></span>玩法参数</h4><div class="fields">${specific}</div></div>
    <div class="start-bar">
      <div class="info">将进行 <b class="num">${total}</b> 题${c.rule==='survival' ? '（答错可能提前结束）' : ''} · 每题 <b class="num">${c.score}</b> 分 · 题组「${esc(playName)}」</div>
      <button class="btn-start-cta" id="btnStart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4l14 8-14 8z"/></svg>开始游戏</button>
    </div>`;
  panel.querySelectorAll('input[type=range]').forEach(el => {
    const f = allFields.find(x=>x.key===el.dataset.key);
    el.addEventListener('input', () => setField(el, mode, f));
  });
  panel.querySelectorAll('input[type=checkbox]').forEach(el => {
    const f = allFields.find(x=>x.key===el.dataset.key);
    el.addEventListener('change', () => setField(el, mode, f));
  });
  panel.querySelectorAll('input[type=text]').forEach(el => {
    const f = allFields.find(x=>x.key===el.dataset.key);
    el.addEventListener('input', () => setField(el, mode, f));
  });
  panel.querySelectorAll('select').forEach(el => {
    const f = allFields.find(x=>x.key===el.dataset.key);
    if(!f) return; // 非参数字段（如题组选择器）由专用 handler 处理
    el.addEventListener('change', () => setField(el, mode, f));
  });
  $('#cfgGroup').addEventListener('change', e => {
    playG = +e.target.value;
    renderConfig(mode);
  });
  panel.querySelectorAll('.tchip').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.dataset.on = chip.dataset.on === '1' ? '0' : '1';
      const wrap = chip.closest('.type-chips');
      const arr = [...wrap.querySelectorAll('.tchip')].filter(x=>x.dataset.on==='1').map(x=>x.dataset.t);
      cfg[mode.id] = cfg[mode.id] || {};
      cfg[mode.id][wrap.dataset.key] = arr;
      store.set('qa_cfg_v1', cfg);
      renderConfig(mode);
    });
  });
  $('#cfgClose').addEventListener('click', () => { panel.classList.remove('open'); $('#panelEmpty').style.display='flex'; });
  $('#btnStart').addEventListener('click', () => startGame(mode.id));
}
function renderLobby(){
  const hueOf = m => (theme==='light' ? (m.hueDark||m.hue) : m.hue);
  const cardHtml = m => `
    <button class="mode-card" data-mode="${m.id}" style="--mc:${hueOf(m)}">
      <div class="top"><span class="mode-icon">${IC[m.icon]}</span><span class="chip" style="color:${hueOf(m)};background:color-mix(in srgb, ${hueOf(m)} 12%, transparent);border-color:color-mix(in srgb, ${hueOf(m)} 35%, transparent)">${esc(m.tag)}</span></div>
      <h3><span class="mode-emoji">${m.emoji||''}</span>${esc(m.name)}</h3>
      <p class="desc">${esc(m.desc)}</p>
      <div class="foot"><div class="mode-tags">${['限时','计分','动效反馈'].map(t=>`<span class="chip">${t}</span>`).join('')}</div>
      <span class="play-arrow">${IC.arrow}</span></div>
    </button>`;
  const singles = ['solo','rush'].map(id=>MODE_MAP[id]);
  const duos = ['duelTimed','duelRush','buzz'].map(id=>MODE_MAP[id]);
  $('#modeGrid').innerHTML = singles.map(cardHtml).join('');
  $('#modeGridDuo').innerHTML = duos.map(cardHtml).join('');
  const sel = $('.mode-card.selected') || $('#modeGrid .mode-card');
  if(sel){ renderConfig(MODE_MAP[sel.dataset.mode]); }
}
$('#view-lobby').addEventListener('click', e => {
  const card = e.target.closest('.mode-card'); if(!card) return;
  $$('.mode-card').forEach(c => c.classList.toggle('selected', c === card));
  renderConfig(MODE_MAP[card.dataset.mode]);
});

/* ============================================================
   倒计时管理器
   ============================================================ */
const RING_C = 301.6;
const Count = {
  items:{},
  tick(it){
    it.remain = Math.max(0, it.remain - 0.1);
    if(it.opts.update) it.opts.update(it.remain, it.total);
    if(it.remain <= 0){ this.stop(it.key); if(it.opts.onEnd) it.opts.onEnd(); }
  },
  start(key, total, opts){
    this.stop(key);
    const it = { key, total, remain: total, opts, id:null };
    this.items[key] = it;
    it.id = setInterval(()=>this.tick(it), 100);
    return it;
  },
  stop(key){ const it=this.items[key]; if(it && it.id){ clearInterval(it.id); it.id=null; } delete this.items[key]; },
  pauseAll(){ for(const k in this.items){ const it=this.items[k]; if(it.id){ clearInterval(it.id); it.id=null; } } },
  resumeAll(){ for(const k in this.items){ const it=this.items[k]; if(!it.id){ it.id=setInterval(()=>this.tick(it),100); } } },
  stopAll(){ for(const k in this.items) this.stop(k); }
};
function setRing(remain, total, panelEl){
  if(panelEl){
    const fg = panelEl.querySelector('.fg'), t = panelEl.querySelector('.t');
    fg.style.strokeDashoffset = 138.2 * (1 - (total>0?remain/total:0));
    if(t) t.textContent = Math.ceil(remain);
    return;
  }
  $('#timerFg').style.strokeDashoffset = RING_C * (1 - (total>0?remain/total:0));
  $('#timerNum').textContent = Math.ceil(remain);
  $('#timerRing').classList.toggle('danger', remain <= 3);
}
function updateTotalBar(r, tot){
  $('#totalLeft').textContent = fmtTime(r);
  $('#totalFill').style.width = (r/tot*100) + '%';
  $('#totalBar').classList.toggle('danger', r <= 10);
}

/* ============================================================
   游戏引擎
   ============================================================ */
let G = null;
const shuffle = arr => { const a=[...arr]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const correctKeys = q => (q.type==='judge' && (q.answer==='对'||q.answer==='错')) ? (q.answer==='对'?'A':'B') : q.answer;
const choiceCorrect = (keys, q) => [...keys].sort().join('') === correctKeys(q);

function startGame(modeId){
  const mode = MODE_MAP[modeId];
  const c = mergeCfg(mode);
  const pool = playQs().filter(q => (c.types||[]).includes(q.type));
  if(!pool.length){ toast('没有符合当前题型范围的题目，请先在题库导入或调整题型范围','err'); return; }
  let qs = c.shuffle ? shuffle(pool) : [...pool];
  qs = qs.slice(0, c.useAll ? qs.length : Math.min(c.count, qs.length));
  G = {
    mode: modeId, cfg:c, qs, i:0,
    score:0, correct:0, wrong:0, skipped:0, wrongItems:[], log:[],
    lives: c.lives ?? 3, turn:0, players:null,
    phase:'ready', locked:false, selKeys:[], buzzWinner:null, startTs:Date.now(),
  };
  if(['duelTimed','duelRush','buzz'].includes(modeId)){
    const pcount = modeId==='buzz' ? Math.max(1, +c.players||2) : 2;
    const names = [c.p1Name||'选手一', c.p2Name||'选手二'];
    G.players = Array.from({length:pcount}, (_,i)=>({
      name: names[i] || (i===0?'选手一':'选手二'),
      score:0, correct:0, wrong:0, time: modeId==='duelRush' ? c.eachTime : 0,
    }));
    if(pcount > 1){
      G.split = true;
      G.pState = [{status:'answering',res:null,keys:[]},{status:'answering',res:null,keys:[]}];
      G.pIdx = [0,0]; G.pOver = [false,false]; G.lastSide = 0; G.runDist = [0,0];
      if(modeId==='duelRush'){
        if(qs.length < 2){ toast('双人冲刺至少需要 2 道题目，请调整题目范围','err'); return; }
        const pool = shuffle(qs);
        G.pool = [pool.filter((_,i)=>i%2===0), pool.filter((_,i)=>i%2===1)];
      }
    }
  }
  const st = $('#stage');
  st.classList.add('open');
  st.dataset.mode = G.mode;
  st.style.setProperty('--mc', theme==='light' ? (mode.hueDark||mode.hue) : mode.hue);
  $('#stageModeChip').innerHTML = IC[mode.icon] + `<span class="mode-emoji">${mode.emoji||''}</span>` + esc(mode.name);
  $('#stageScore').classList.toggle('hide', !!(G.players && G.players.length>1));
  $('#resultView').classList.remove('show');
  $('#pauseMask').classList.remove('show');
  $('#duelTop').style.display = 'none';
  $('#splitWrap').classList.toggle('open', !!G.split);
  if(!G.split) $('#qzone').style.display = 'flex';
  trackReset();
  syncNavVisibility();
  renderBuzz(); updateStageTop();
  readyGo(()=>{ G.phase='question'; renderQuestion(); });
}
/* 双人竖向跑道：页面中间，角色从底部往上跑 */
function vtrackHtml(){
  const runner = id => `<div class="runner" id="${id}" style="--rc:${id==='runner0'?'#FF8FA3':'#FF9F45'}">
      <div class="r-head"></div><div class="r-body"></div>
      <div class="r-arm ra1"></div><div class="r-arm ra2"></div>
      <div class="r-leg rl1"></div><div class="r-leg rl2"></div>
    </div>`;
  return `<div class="vtrack">
    <div class="v-grass"></div>
    <div class="v-badge">VS</div>
    <div class="v-lane"><div class="v-bg"></div>${runner('runner0')}<div class="v-name">选手一</div></div>
    <div class="v-lane"><div class="v-bg"></div>${runner('runner1')}<div class="v-name">选手二</div></div>
    <div class="v-finish">🏁</div>
  </div>`;
}
function trackReset(){
  if(G) G.runDist = [0,0];
  syncTrackV();
}
/* splitGrid 重建后恢复 runner 位置与动画状态 */
function syncTrackV(){
  const vt = document.querySelector('.vtrack');
  if(!vt || !G || !G.runDist) return;
  ['runner0','runner1'].forEach((id,i)=>{
    const r = document.getElementById(id);
    if(r) r.style.bottom = (4 + (G.runDist[i]||0)*11) + '%';
  });
  vt.classList.toggle('running', G.phase==='question');
}
function trackAdvance(pi){
  if(!G || !G.runDist) return;
  G.runDist[pi] = (G.runDist[pi]||0) + 1;
  const r = document.getElementById('runner'+pi);
  if(r) r.style.bottom = Math.min(4 + G.runDist[pi]*11, 88) + '%';
}
function syncNavVisibility(){
  // 结算阶段与限时冲刺/双人冲刺（独立题流）不显示跳题导航
  const show = G && G.phase!=='end' && !['rush','duelRush'].includes(G.mode);
  $('#stageNavPrev').style.display = show ? 'flex' : 'none';
  $('#stageNavNext').style.display = show ? 'flex' : 'none';
}
function jumpQuestion(dir){
  // 点击上一题/下一题 → 暂时进入讲解模式，讲解目标题；关闭后回到该题继续游戏
  if(!G || G.phase==='end' || ['rush','duelRush'].includes(G.mode)) return;
  const ni = Math.max(0, Math.min(G.qs.length-1, G.i + dir));
  if(ni === G.i){ toast(dir<0?'已是第一题':'已是最后一题','info'); return; }
  G.i = ni;
  Count.stopAll();
  G.phase = 'paused';
  openExplain('game', ni);
}
function readyGo(cb){
  const body = $('#stage .stage-body');
  const layer = document.createElement('div');
  layer.style.cssText = 'position:absolute;inset:0;z-index:45;display:flex;align-items:center;justify-content:center;background:rgba(5,8,18,.93);backdrop-filter:blur(4px)';
  const num = document.createElement('div');
  num.style.cssText = 'font-size:110px;font-weight:900;font-family:"Space Grotesk","Noto Sans SC",sans-serif;color:var(--amber-2);text-shadow:0 8px 44px rgba(255,197,61,.4)';
  layer.appendChild(num); body.appendChild(layer);
  let n = 3;
  const step = () => {
    if(n > 0){ num.textContent = n; Fx.tick(); n--; setTimeout(step, 700); }
    else { num.textContent = 'GO'; num.style.color = 'var(--green)'; Fx.start(); setTimeout(()=>{ layer.remove(); cb(); }, 500); }
  };
  step();
}
function updateProgress(){
  if(G.split){
    $('#stageProgText').textContent = G.mode==='duelRush' ? '对战进行中' : `${G.i+1} / ${G.qs.length}`;
    $('#stageProgBar').style.width = G.mode==='duelRush' ? '100%' : ((G.i+1)/G.qs.length*100) + '%';
    return;
  }
  $('#stageProgText').textContent = `${G.i+1} / ${G.qs.length}`;
  $('#stageProgBar').style.width = ((G.i+1)/G.qs.length*100) + '%';
}
function updateStageTop(){
  const box = $('#stageScore').closest('.stage-score');
  box.style.display = (G.players && G.players.length>1) ? 'none' : 'flex';
  animateScore($('#stageScore'), G.score);
}
function animateScore(el, to){
  const from = +el.textContent, t0 = performance.now(), dur = 520;
  const step = t => {
    const p = Math.min(1,(t-t0)/dur), e = 1-Math.pow(1-p,3);
    el.textContent = Math.round(from + (to-from)*e);
    if(p<1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function renderDuel(){
  if(G && G.split){ $('#duelTop').style.display='none'; return; }
  const top = $('#duelTop');
  if(!G || !G.players || G.players.length<2){ top.style.display='none'; return; }
  top.style.display = 'grid';
  const showRing = G.mode==='duelRush';
  const hues = G.mode==='buzz' ? ['#A78BFF','#43C6FF'] : ['#FF8FA3','#FF9F45'];
  top.innerHTML = G.players.map((p,i)=>`
    <div class="player-panel ${i===G.turn?'active':''}" data-p="${i}" style="--pp:${hues[i]}">
      <div class="ava">${i===0?'一':'二'}</div>
      <div class="meta"><div class="nm">${esc(p.name)}</div><div class="sc num">${p.score}<small> 分</small></div></div>
      ${showRing?`<div class="player-ring"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="22"/><circle class="fg" cx="26" cy="26" r="22" stroke-dasharray="138.2" stroke-dashoffset="0"/></svg><div class="t num">${Math.ceil(p.time)}</div></div>`:''}
    </div>`).join('') + `<div class="vs-badge">VS</div>`;
}
function renderBuzz(){
  const row = $('#buzzRow');
  if(!G || G.mode!=='buzz'){ row.style.display='none'; return; }
  row.style.display='flex';
  const single = +G.cfg.players===1;
  row.innerHTML = G.players.map((p,i)=>{
    const hue = single ? '#A78BFF' : (i===0?'#A78BFF':'#43C6FF');
    return `<button class="buzz-btn" data-buzz="${i}" style="--bb:${hue}"><span class="l">${esc(p.name)} 抢答</span><span class="k">按 ${single?'Q':(i===0?'Q':'P')} 或点击</span></button>`;
  }).join('');
}
function renderQuestion(){
  if(G.split){ renderSplit(); return; }
  const q = G.qs[G.i];
  G.locked = false; G.selKeys = []; G.buzzWinner = null;
  const mode = G.mode;
  $('#qIndex').textContent = `第 ${G.i+1} 题 / ${G.qs.length}`;
  $('#qTitle').textContent = q.question;
  $('#qType').textContent = TYPES[q.type].name;
  $('#feedback').classList.remove('show');
  $('#fillAns').classList.remove('show');
  document.querySelector('.submit-line')?.remove();
  updateProgress(); updateStageTop();
  const qzone = $('#qzone');
  qzone.classList.remove('swap'); void qzone.offsetWidth; qzone.classList.add('swap');
  // 计时区
  $('#timerWrap').style.display = 'flex';
  $('#totalBar').style.display = mode==='rush' ? 'flex' : 'none';
  $('#timerRing').style.display = mode==='rush' || mode==='duelRush' ? 'none' : 'flex';
  $('#buzzRow').style.display = mode==='buzz' ? 'flex' : 'none';
  $('#buzzHint').style.display = mode==='buzz' ? 'block' : 'none';
  if(mode==='buzz') $('#buzzHint').textContent = '题目已出现 — 抢先按下你的抢答键';
  // 选项 / 填空
  const optBox = $('#options'), fillBox = $('#fillBox');
  const buzzPending = mode==='buzz';
  if(q.type==='fill'){
    optBox.style.display='none'; fillBox.style.display='flex';
    $('#fillInput').value='';
    $('#fillInput').disabled = buzzPending;
    $('#fillSubmit').disabled = buzzPending;
    $('#fillAns').innerHTML='';
  } else {
    optBox.style.display='grid'; fillBox.style.display='none';
    optBox.innerHTML = q.options.map(o=>`
      <button class="option" data-key="${o.key}" ${buzzPending?'disabled':''}>
        <span class="key">${o.key}</span><span class="txt">${esc(o.text)}</span>
        <span class="mark"></span>
      </button>`).join('');
    if(q.type==='multiple'){
      optBox.insertAdjacentHTML('afterend', `<div class="submit-line"><button class="btn btn-primary" id="multiSubmit">提交答案</button><span class="hint">多选：点击选项切换选中，可多选</span></div>`);
    }
  }
  renderDuel(); renderBuzz();
  Count.stopAll();
  if(mode==='solo' || mode==='duelTimed'){
    const t = G.cfg.perTime;
    setRing(t, t, null);
    Count.start('q', t, {
      update:(r,tot)=>{ setRing(r,tot,null); if(r<=3 && Math.ceil(r)!==Math.ceil(r+0.1)) Fx.tick(); },
      onEnd:()=>{ if(!G.locked){ G.locked=true; timeout(); } }
    });
  } else if(mode==='rush'){
    updateTotalBar(G.cfg.totalTime, G.cfg.totalTime);
    Count.start('total', G.cfg.totalTime, {
      update:(r,tot)=>{ updateTotalBar(r,tot); },
      onEnd:()=>{ if(!G.locked){ G.locked=true; endGame(); } }
    });
  } else if(mode==='duelRush'){
    G.players.forEach((p,i)=>{
      const pn = document.querySelector(`.player-panel[data-p="${i}"] .player-ring`);
      if(pn){ const fg=pn.querySelector('.fg'), tt=pn.querySelector('.t'); fg.style.strokeDashoffset=0; tt.textContent=Math.ceil(p.time); }
      Count.start('p'+i, p.time, {
        update:(r,tot)=>{ const el=document.querySelector(`.player-panel[data-p="${i}"] .player-ring`); if(el) setRing(r,tot,el); },
        onEnd:()=>{ if(i===G.turn && !G.locked){ G.locked=true; clockOut(i); } }
      });
    });
  } else if(mode==='buzz'){
    setRing(G.cfg.buzzTime, G.cfg.buzzTime, null);
    Count.start('buzz', G.cfg.buzzTime, {
      update:(r,tot)=>{ setRing(r,tot,null); if(r<=3 && Math.ceil(r)!==Math.ceil(r+0.1)) Fx.tick(); },
      onEnd:()=>{ if(G.buzzWinner==null && !G.locked){ G.locked=true; G.skipped++; G.wrongItems.push({q, yours:'未抢答'}); G.log.push({i:G.i, ok:null, yours:'未抢答'}); Fx.lose(); feedback(false,'😴 无人抢答，本题跳过',q); setTimeout(next,1900); } }
    });
  }
}
/* ============================================================
   双人分屏渲染与对战逻辑
   ============================================================ */
const SPLIT_HUE = ['#FF8FA3','#FF9F45'];
const BUZZ_HUE = ['#A78BFF','#43C6FF'];
const SP_RING_C = 194.8;   // r=31 周长
const CURQ = pi => G.mode==='duelRush' ? G.pool[pi][G.pIdx[pi]] : G.qs[G.i];

function renderSplit(){
  $('#qzone').style.display = 'none';
  $('#duelTop').style.display = 'none';
  $('#feedback').classList.remove('show');
  $('#splitWrap').classList.add('open');
  G.locked = false; G.selKeys = []; G.buzzWinner = null; G.lastSide = 0;
  const m = G.mode;
  if(m==='duelRush') renderSplitRush();
  else if(m==='buzz') renderSplitBuzz();
  else renderSplitTimed();
  updateProgress(); updateStageTop();
}
function splitBodyHtml(pi, q, locked){
  if(q.type==='fill'){
    return `<div class="sp-fill"><input type="text" class="text-input num" id="spFill${pi}" placeholder="输入答案…" autocomplete="off"><button class="btn btn-primary" id="spFillBtn${pi}" style="align-self:flex-start">提交</button></div>`;
  }
  const multi = q.type==='multiple';
  return `
    <div class="sp-opts">${q.options.map(o=>`<button class="option" data-key="${o.key}" ${locked?'disabled':''}><span class="key">${o.key}</span><span class="txt">${esc(o.text)}</span><span class="mark"></span></button>`).join('')}</div>
    ${multi?`<div class="submit-line" style="margin-top:0"><button class="btn btn-primary" id="spSubmit${pi}" style="padding:9px 18px;font-size:14px">提交答案</button><span class="hint">多选，可点选多个</span></div>`:''}`;
}
function splitTimedPanelHtml(pi){
  const p = G.players[pi], q = G.qs[G.i];
  return `
  <div class="split-panel" data-p="${pi}" style="--pp:${SPLIT_HUE[pi]}">
    <div class="sp-head">
      <div class="ava">${pi===0?'一':'二'}</div>
      <div class="nm">${esc(p.name)}</div>
      <div class="sp-timer"><svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="31"/><circle class="fg" cx="36" cy="36" r="31" stroke-dasharray="${SP_RING_C}" stroke-dashoffset="0"/></svg><div class="t num">${G.cfg.perTime}</div></div>
      <div class="sc num">${p.score}<small> 分</small></div>
    </div>
    <div class="sp-q">${esc(q.question)}</div>
    ${splitBodyHtml(pi, q, false)}
    <div class="sp-status"><b>作答中</b> · 抢分倒计时</div>
    <div class="sp-fb"></div>
  </div>`;
}
function renderSplitTimed(){
  $('#splitShared').style.display = 'none';
  $('#spCtl').style.display = 'none';
  G.pState = G.pState.map(()=>({status:'answering',res:null,keys:[],yours:''}));
  const t = G.cfg.perTime;
  $('#splitGrid').innerHTML = splitTimedPanelHtml(0) + `${vtrackHtml()}` + splitTimedPanelHtml(1);
  syncTrackV();
  Count.stopAll();
  G.players.forEach((_,pi)=>{
    Count.start('p'+pi, t, {
      update:(r,tot)=>{ updateSpTimer(pi,r,tot); if(r<=3 && Math.ceil(r)!==Math.ceil(r+0.1)) Fx.tick(); },
      onEnd:()=>{ if(G && G.phase==='question') splitTimedTimeout(pi, G.qs[G.i]); }
    });
  });
}
function updateSpTimer(pi, r, tot){
  const panel = document.querySelector(`[data-p="${pi}"]`);
  if(!panel) return;
  const fg = panel.querySelector('.sp-timer .fg'), t = panel.querySelector('.sp-timer .t');
  if(fg) fg.style.strokeDashoffset = SP_RING_C * (1 - (tot>0?r/tot:0));
  if(t) t.textContent = Math.ceil(r);
  const wrap = panel.querySelector('.sp-timer');
  if(wrap) wrap.classList.toggle('danger', r<=3);
}
function splitScoreUpdate(pi, ok, q, yours){
  const p = G.players[pi];
  if(ok){ G.correct++; p.correct++; p.score = Math.max(0, p.score+G.cfg.score); trackAdvance(pi); }
  else { G.wrong++; p.wrong++; if(G.cfg.penalty) p.score = Math.max(0, p.score-G.cfg.score); G.wrongItems.push({q, yours}); }
  const sc = document.querySelector(`[data-p="${pi}"] .sc`);
  if(sc && sc.firstChild) sc.firstChild.textContent = p.score;
  if(G.players.length===1) G.score = p.score;
}
function splitReveal(pi, ok, q, keys){
  const panel = document.querySelector(`[data-p="${pi}"]`);
  if(!panel) return;
  if(q.type==='fill'){
    panel.querySelectorAll('.fill-ans').forEach(el => el.remove());
    const inp = panel.querySelector('.text-input'); if(inp) inp.disabled = true;
    const host = panel.querySelector('.sp-fill') || panel.querySelector('.sp-status');
    host.insertAdjacentHTML('afterend', `<div class="fill-ans show"><span class="std">${IC.check} 正确答案：${esc(q.answer)}</span></div>`);
    return;
  }
  panel.querySelectorAll('.option').forEach(b => {
    b.disabled = true;
    const k = b.dataset.key;
    const isCor = correctKeys(q).includes(k);
    const isSel = keys.includes(k);
    if(isCor) b.classList.add('correct');
    else if(isSel) b.classList.add('wrong');
    else b.classList.add('dim');
    b.querySelector('.mark').innerHTML = isCor ? IC.check : (isSel ? IC.cross : '');
  });
}
function splitRevealTimeout(pi, q){
  const panel = document.querySelector(`[data-p="${pi}"]`);
  if(!panel) return;
  if(q.type==='fill'){
    panel.querySelectorAll('.fill-ans').forEach(el => el.remove());
    const inp = panel.querySelector('.text-input'); if(inp) inp.disabled = true;
    const host = panel.querySelector('.sp-fill') || panel.querySelector('.sp-status');
    host.insertAdjacentHTML('afterend', `<div class="fill-ans show"><span class="std">${IC.check} 正确答案：${esc(q.answer)}</span></div>`);
    return;
  }
  panel.querySelectorAll('.option').forEach(b => {
    b.disabled = true;
    if(correctKeys(q).includes(b.dataset.key)){ b.classList.add('correct'); b.querySelector('.mark').innerHTML = IC.check; }
    else b.classList.add('dim');
  });
}
function splitFb(pi, ok, title, delta){
  const panel = document.querySelector(`[data-p="${pi}"]`);
  if(!panel) return;
  panel.classList.remove('ok','no');
  panel.classList.add(ok?'ok':'no');
  const fb = panel.querySelector('.sp-fb');
  fb.style.setProperty('--fb', ok ? 'var(--green)' : 'var(--red)');
  fb.innerHTML = `<div class="ic">${ok?IC.check:IC.cross}</div><div class="tx">${esc(title)}</div>${delta?`<div class="sc2">${delta}</div>`:''}`;
  fb.classList.add('show');
}
function splitWaiting(pi, text){
  const panel = document.querySelector(`[data-p="${pi}"]`);
  if(!panel) return;
  const fb = panel.querySelector('.sp-fb');
  fb.style.setProperty('--fb','var(--text-2)');
  fb.innerHTML = `<div class="wait">${IC.user} ${esc(text)}</div>`;
  fb.classList.add('show');
}
function splitAnswer(pi, q, keys, fillVal){
  const isFill = q.type==='fill';
  const ok = isFill ? (normAnswer(fillVal||'')===q.answer) : choiceCorrect(keys, q);
  const yours = isFill ? (fillVal||'未作答') : (keys.length?keys.join(''):'未作答');
  if(G.mode==='duelTimed'){
    const ps = G.pState[pi]; if(ps.status!=='answering') return;
    ps.status='done'; ps.res = ok?'ok':'wrong'; ps.keys = keys; ps.yours = yours;
    G.log.push({i:G.i, ok, yours});
    Count.stop('p'+pi);
    lockSplitInput(pi, q);
    splitWaiting(pi, '✋ 已作答，等待对方…');
    maybeRevealSplitTimed();
  } else if(G.mode==='duelRush'){
    if(G.pOver[pi]) return;
    G.log.push({i:G.qs.indexOf(q), ok, yours});
    splitScoreUpdate(pi, ok, q, yours);
    splitReveal(pi, ok, q, keys);
    splitFb(pi, ok, ok?'🎉 回答正确':'💥 回答错误', ok?`+${G.cfg.score}`:(G.cfg.penalty?`-${G.cfg.score}`:''));
    if(ok){ Fx.ding(); confettiAtPanel(pi); } else Fx.buzz();
    setTimeout(()=>{
      if(!G || G.phase!=='question') return;
      G.pIdx[pi]++;
      if(G.pIdx[pi] >= G.pool[pi].length){ G.pOver[pi]=true; rushOverPanel(pi,'🏁 题已答完'); }
      else renderSplitRushPanel(pi);
      if(G.pOver[0] && G.pOver[1]) endGame();
    }, 850);
  } else if(G.mode==='buzz'){
    const pi2 = G.buzzWinner; if(pi2==null) return;
    G.log.push({i:G.i, ok, yours});
    splitScoreUpdate(pi2, ok, q, yours);
    const panel = document.querySelector(`[data-p="${pi2}"]`);
    if(panel){
      splitReveal(pi2, ok, q, keys);
      panel.classList.add(ok?'ok':'no');
      const fb = panel.querySelector('.sp-fb');
      fb.style.setProperty('--fb', ok?'var(--green)':'var(--red)');
      fb.innerHTML = `<div class="ic">${ok?IC.check:IC.cross}</div><div class="tx">${ok?'🎉 回答正确':'💥 回答错误'}</div>${ok?`<div class="sc2">+${G.cfg.score}</div>`:(G.cfg.penalty?`<div class="sc2">-${G.cfg.score}</div>`:'')}`;
      fb.classList.add('show');
    }
    if(ok){ Fx.ding(); confettiAtPanel(pi2); } else Fx.buzz();
    const other = 1-pi2;
    const op = document.querySelector(`[data-p="${other}"]`);
    if(op){ op.querySelector('.sp-status').textContent = '⏳ 等待下一题…'; }
    setTimeout(()=>{ if(!G) return; G.i++; if(G.i>=G.qs.length) endGame(); else renderSplit(); }, 1500);
  }
}
function splitTimedTimeout(pi, q){
  const ps = G.pState[pi]; if(ps.status!=='answering') return;
  ps.status='done'; ps.res='timeout'; ps.keys=[]; ps.yours='超时未答';
  G.log.push({i:G.i, ok:false, yours:'超时未答'});
  lockSplitInput(pi, q);
  splitWaiting(pi, '时间到，等待对方…');
  maybeRevealSplitTimed();
}
function lockSplitInput(pi, q){
  const panel = document.querySelector(`[data-p="${pi}"]`);
  if(!panel) return;
  if(q.type==='fill'){
    const inp = panel.querySelector('.text-input'); if(inp) inp.disabled = true;
  } else {
    panel.querySelectorAll('.option').forEach(b => b.disabled = true);
  }
}
function maybeRevealSplitTimed(){
  if(!G || G.phase!=='question') return;
  if(!G.pState.every(ps=>ps.status==='done')) return;
  G.locked = true;
  const q = G.qs[G.i];
  G.pState.forEach((ps,i)=>{
    if(ps.res==='timeout'){
      G.skipped++;
      G.players[i].wrong++;
      if(G.cfg.penalty) G.players[i].score = Math.max(0, G.players[i].score-G.cfg.score);
      G.wrongItems.push({q, yours: ps.yours});
      refreshSplitScore(i);
      splitRevealTimeout(i, q);
      splitFb(i,false,'⏰ 时间到', G.cfg.penalty?`-${G.cfg.score}`:'');
      Fx.buzz();
    } else {
      const ok = ps.res==='ok';
      splitScoreUpdate(i, ok, q, ps.yours);
      splitReveal(i, ok, q, ps.keys||[]);
      splitFb(i, ok, ok?'🎉 回答正确':'💥 回答错误', ok?`+${G.cfg.score}`:(G.cfg.penalty?`-${G.cfg.score}`:''));
      if(ok){ Fx.ding(); confettiAtPanel(i); } else Fx.buzz();
    }
  });
  setTimeout(()=>{ if(!G || G.phase!=='question') return; G.i++; if(G.i>=G.qs.length) endGame(); else renderSplit(); }, 1700);
}
function refreshSplitScore(i){
  const sc = document.querySelector(`[data-p="${i}"] .sc`);
  if(sc && sc.firstChild) sc.firstChild.textContent = G.players[i].score;
}
function splitRushPanelBase(pi){
  const p = G.players[pi];
  return `
  <div class="split-panel" data-p="${pi}" style="--pp:${SPLIT_HUE[pi]}">
    <div class="sp-head">
      <div class="ava">${pi===0?'一':'二'}</div>
      <div class="nm">${esc(p.name)}</div>
      <div class="sp-timer"><svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="31"/><circle class="fg" cx="36" cy="36" r="31" stroke-dasharray="${SP_RING_C}" stroke-dashoffset="0"/></svg><div class="t num">${G.cfg.eachTime}</div></div>
      <div class="sc num">${p.score}<small> 分</small></div>
    </div>
    <div class="sp-q"></div>
    <div class="sp-opts"></div>
    <div class="sp-status"><b>答题中</b></div>
    <div class="sp-fb"></div>
  </div>`;
}
function renderSplitRush(){
  $('#splitShared').style.display = 'none';
  $('#spCtl').style.display = 'none';
  G.pOver = [false,false]; G.pIdx = [0,0];
  $('#splitGrid').innerHTML = splitRushPanelBase(0) + `${vtrackHtml()}` + splitRushPanelBase(1);
  syncTrackV();
  Count.stopAll();
  G.players.forEach((_,pi)=>{
    Count.start('p'+pi, G.cfg.eachTime, {
      update:(r,tot)=>{ updateSpTimer(pi,r,tot); if(r<=3 && Math.ceil(r)!==Math.ceil(r+0.1)) Fx.tick(); },
      onEnd:()=>{ if(G && G.phase==='question') rushTimeout(pi); }
    });
    renderSplitRushPanel(pi);
  });
}
function renderSplitRushPanel(pi){
  const panel = document.querySelector(`[data-p="${pi}"]`);
  if(!panel || !G) return;
  panel.querySelectorAll('.fill-ans').forEach(el => el.remove()); // 清除上一题填空题的正确答案残留
  const q = G.pool[pi][G.pIdx[pi]];
  panel.classList.remove('ok','no');
  panel.querySelector('.sp-q').textContent = q.question;
  panel.querySelector('.sp-opts').innerHTML = q.type==='fill' ? '' : q.options.map(o=>`<button class="option" data-key="${o.key}"><span class="key">${o.key}</span><span class="txt">${esc(o.text)}</span><span class="mark"></span></button>`).join('');
  let fill = panel.querySelector('.sp-fill');
  if(q.type==='fill'){
    if(!fill){ fill=document.createElement('div'); fill.className='sp-fill'; panel.insertBefore(fill, panel.querySelector('.sp-status')); }
    fill.style.display='flex';
    fill.innerHTML = `<input type="text" class="text-input num" id="spFill${pi}" placeholder="输入答案…" autocomplete="off"><button class="btn btn-primary" id="spFillBtn${pi}" style="align-self:flex-start">提交</button>`;
  } else if(fill){ fill.style.display='none'; }
  const sub = panel.querySelector('.submit-line'); if(sub) sub.remove();
  if(q.type==='multiple'){
    panel.querySelector('.sp-opts').insertAdjacentHTML('afterend', `<div class="submit-line" style="margin-top:0"><button class="btn btn-primary" id="spSubmit${pi}" style="padding:9px 18px;font-size:14px">提交答案</button><span class="hint">多选</span></div>`);
  }
  panel.querySelector('.sp-status').innerHTML = '<b>答题中</b> · 限时抢分';
  const fb = panel.querySelector('.sp-fb'); fb.classList.remove('show'); fb.innerHTML='';
  const it = Count.items['p'+pi];
  if(it) updateSpTimer(pi, it.remain, it.total);
}
function rushTimeout(pi){
  if(G.pOver[pi]) return;
  G.pOver[pi] = true;
  G.skipped++;
  rushOverPanel(pi,'⏰ 时间到');
  Fx.lose();
  if(G.pOver[0] && G.pOver[1]) endGame();
}
function rushOverPanel(pi, text){
  const panel = document.querySelector(`[data-p="${pi}"]`);
  if(!panel) return;
  panel.classList.add('over');
  panel.querySelectorAll('.sp-opts .option').forEach(b=>b.disabled=true);
  const fb = panel.querySelector('.sp-fb');
  fb.style.setProperty('--fb','var(--text-2)');
  fb.innerHTML = `<div class="tx" style="color:var(--text-2)">${esc(text)}</div>`;
  fb.classList.add('show');
  panel.querySelector('.sp-status').textContent = text;
}
function renderSplitBuzz(){
  const q = G.qs[G.i];
  G.buzzWinner = null; G.locked = false;
  G.pState = G.pState.map(()=>({status:'waiting',res:null,keys:[]}));
  $('#splitShared').style.display = 'flex';
  $('#spCtl').style.display = 'flex';
  $('#spQIndex').textContent = `第 ${G.i+1} 题 / ${G.qs.length}`;
  $('#spQType').textContent = TYPES[q.type].name;
  $('#spQTitle').textContent = q.question;
  $('#spMiniNum').textContent = G.cfg.buzzTime;
  $('#spMiniRing').classList.remove('danger');
  $('#spMiniFg').style.strokeDashoffset = 0;
  const buzzPanelHtml = pi => {
    const p = G.players[pi];
    return `
    <div class="sp-buzz" data-p="${pi}" style="--bb:${BUZZ_HUE[pi]}">
      <div class="sp-head" style="width:100%"><div class="ava" style="background:${BUZZ_HUE[pi]}">${pi===0?'一':'二'}</div><div class="nm">${esc(p.name)}</div><div class="sc num" style="margin-left:auto">${p.score}<small> 分</small></div></div>
      <button class="b-btn"><span class="b-emo">🔔</span>抢答<span class="b-key">按 ${pi===0?'Q':'P'}</span></button>
      <div class="opts"></div>
      <div class="sp-status">🔕 等待抢答</div>
      <div class="sp-fb"></div>
    </div>`;
  };
  $('#splitGrid').innerHTML = buzzPanelHtml(0) + `${vtrackHtml()}` + buzzPanelHtml(1);
  syncTrackV();
  Count.stopAll();
  Count.start('buzz', G.cfg.buzzTime, {
    update:(r,tot)=>{
      $('#spMiniFg').style.strokeDashoffset = 201.1 * (1 - (tot>0?r/tot:0));
      $('#spMiniNum').textContent = Math.ceil(r);
      $('#spMiniRing').classList.toggle('danger', r<=3);
      if(r<=3 && Math.ceil(r)!==Math.ceil(r+0.1)) Fx.tick();
    },
    onEnd:()=>{
      if(G && G.buzzWinner==null && G.phase==='question'){
        G.locked = true;
        G.skipped++;
        G.wrongItems.push({q, yours:'未抢答'});
        G.log.push({i:G.i, ok:null, yours:'未抢答'});
        Fx.lose();
        $$('#splitGrid .sp-buzz').forEach(el=>{
          const fb = el.querySelector('.sp-fb');
          if(fb){ fb.style.setProperty('--fb','var(--text-2)'); fb.innerHTML='<div class="tx" style="color:var(--text-2)">😴 无人抢答，本题跳过</div>'; fb.classList.add('show'); }
        });
        setTimeout(()=>{ if(!G) return; G.i++; if(G.i>=G.qs.length) endGame(); else renderSplit(); }, 1500);
      }
    }
  });
}
function buzzSplit(pi){
  if(!G || G.phase!=='question' || G.buzzWinner!=null || G.locked) return;
  G.buzzWinner = pi;
  Count.stop('buzz');
  Fx.buzzer(); Fx.start();
  const q = G.qs[G.i];
  $$('#splitGrid .sp-buzz').forEach(el=>{
    const p = +el.dataset.p;
    if(p===pi){
      el.classList.add('won');
      const opts = el.querySelector('.opts');
      if(q.type==='fill'){
        opts.style.display = 'none';
        const st = el.querySelector('.sp-status');
        st.innerHTML = `<input type="text" class="text-input num" id="spFill${pi}" placeholder="输入答案…" autocomplete="off" style="max-width:210px"><button class="btn btn-primary" id="spFillBtn${pi}" style="padding:9px 16px">提交</button>`;
      } else {
        opts.innerHTML = q.options.map(o=>`<button class="option" data-key="${o.key}"><span class="key">${o.key}</span><span class="txt">${esc(o.text)}</span><span class="mark"></span></button>`).join('');
        if(q.type==='multiple'){
          opts.insertAdjacentHTML('afterend', `<div style="padding:0 6px;width:100%"><button class="btn btn-primary" id="spSubmit${pi}" style="padding:9px 18px;font-size:14px">提交答案</button></div>`);
        }
        el.querySelector('.sp-status').textContent = '⚡ 请作答（点击选项或按键盘）';
      }
    } else {
      el.classList.add('locked');
      el.querySelector('.sp-status').textContent = '⏳ 对方抢到，等待…';
    }
  });
}
function confettiAtPanel(pi){
  const panel = document.querySelector(`[data-p="${pi}"]`);
  if(!panel) return;
  const r = panel.getBoundingClientRect();
  Confetti.burst(r.left + r.width/2, r.top + r.height*.35, 70);
}
function buzzReveal(){
  if(!G || G.mode!=='buzz' || G.phase!=='question' || G.locked) return;
  G.locked = true;
  Count.stopAll();
  const q = G.qs[G.i];
  G.log.push({i:G.i, ok:null, yours:'公布答案'});
  $$('#splitGrid .sp-buzz').forEach(el=>{
    const opts = el.querySelector('.opts');
    if(q.type==='fill'){
      opts.style.display = 'none';
      el.querySelector('.sp-status').insertAdjacentHTML('afterend', `<div class="fill-ans show" style="padding:0 6px"><span class="std">${IC.check} 正确答案：${esc(q.answer)}</span></div>`);
    } else {
      opts.style.display = 'grid';
      opts.innerHTML = q.options.map(o=>`<button class="option" data-key="${o.key}"><span class="key">${o.key}</span><span class="txt">${esc(o.text)}</span><span class="mark"></span></button>`).join('');
      opts.querySelectorAll('.option').forEach(b=>{
        b.disabled = true;
        if(correctKeys(q).includes(b.dataset.key)){ b.classList.add('correct'); b.querySelector('.mark').innerHTML = IC.check; }
        else b.classList.add('dim');
      });
    }
    el.querySelector('.sp-status').textContent = '💡 已公布答案';
    const fb = el.querySelector('.sp-fb');
    fb.style.setProperty('--fb','var(--amber-2)');
    fb.innerHTML = `<div class="tx" style="color:var(--amber-2)">💡 公布答案</div>`;
    fb.classList.add('show');
  });
  Fx.fanfare();
  setTimeout(()=>{ if(!G) return; G.i++; if(G.i>=G.qs.length) endGame(); else renderSplit(); }, 1700);
}
function buzzSkip(){
  if(!G || G.mode!=='buzz' || G.phase!=='question' || G.locked) return;
  G.locked = true;
  Count.stopAll();
  G.skipped++;
  G.log.push({i:G.i, ok:null, yours:'跳过'});
  $$('#splitGrid .sp-buzz').forEach(el=>{
    const fb = el.querySelector('.sp-fb');
    if(fb){ fb.style.setProperty('--fb','var(--text-2)'); fb.innerHTML='<div class="tx" style="color:var(--text-2)">⏭️ 跳过本题</div>'; fb.classList.add('show'); }
  });
  Fx.tick();
  setTimeout(()=>{ if(!G) return; G.i++; if(G.i>=G.qs.length) endGame(); else renderSplit(); }, 800);
}
function splitSubmit(pi){
  if(!G || G.locked || G.phase!=='question') return;
  const q = CURQ(pi);
  if(q.type==='fill'){
    const inp = document.getElementById('spFill'+pi);
    if(!inp) return;
    const v = inp.value.trim();
    if(!v){ toast('请输入答案','info'); return; }
    splitAnswer(pi, q, [], v);
  } else if(q.type==='multiple'){
    const sel = [...document.querySelectorAll(`[data-p="${pi}"] .option.sel`)].map(b=>b.dataset.key).sort();
    if(!sel.length){ toast('请先选择答案','info'); return; }
    splitAnswer(pi, q, sel);
  }
}

function clockOut(i){
  const q = G.qs[G.i];
  G.players[i].time = 0;
  G.skipped++; G.wrongItems.push({q, yours:'时间耗尽'});
  G.log.push({i:G.i, ok:false, yours:'时间耗尽'});
  feedback(false,'时间耗尽',q); Fx.buzz();
  const other = 1-i;
  if(G.players[other].time<=0 || G.i+1>=G.qs.length){ setTimeout(()=>endGame(),1900); return; }
  G.turn = other;
  setTimeout(()=>next(true),1900);
}
function next(skipTurnSwitch){
  G.i++;
  if(G.i >= G.qs.length){ endGame(); return; }
  if(!skipTurnSwitch && G.mode==='duelTimed') G.turn = 1-G.turn;
  if(G.mode==='duelRush' && G.players[G.turn].time<=0 && G.players[1-G.turn].time<=0){ endGame(); return; }
  renderQuestion();
}
function answer(q, keys){
  G.locked = true;
  Count.stopAll();
  const isFill = q.type==='fill';
  const ok = isFill ? (normAnswer(G.fillVal)===q.answer) : choiceCorrect(keys, q);
  const yours = isFill ? (G.fillVal||'未作答') : (keys.length?keys.join(''):'未作答');
  G.log.push({i:G.i, ok, yours});
  const who = G.players ? (G.mode==='buzz' ? G.buzzWinner : G.turn) : -1;
  if(ok){
    G.correct++;
    if(who>=0){
      G.players[who].correct++;
      G.players[who].score = Math.max(0, G.players[who].score+G.cfg.score);
      if(G.players.length===1) G.score = G.players[0].score;
    }
    else G.score = Math.max(0, G.score+G.cfg.score);
    updateStageTop(); renderDuel();
    revealUI(true, q, keys);
    feedback(true, who>=0 ? `🎉 ${G.players[who].name} 回答正确！` : '🎉 回答正确！', q);
    Fx.ding();
    Confetti.burst(innerWidth/2, innerHeight*.38, 90);
    setTimeout(next, 1150);
  } else {
    G.wrong++;
    G.wrongItems.push({ q, yours: isFill ? (G.fillVal||'未作答') : (keys.length?keys.join(''):'未作答') });
    if(who>=0){
      G.players[who].wrong++;
      if(G.cfg.penalty) G.players[who].score = Math.max(0, G.players[who].score-G.cfg.score);
      if(G.players.length===1) G.score = G.players[0].score;
      if(G.mode==='duelRush') G.turn = 1-who;
    } else if(G.cfg.penalty){
      G.score = Math.max(0, G.score-G.cfg.score);
    }
    if(G.cfg.rule==='survival') G.lives--;
    updateStageTop(); renderDuel();
    revealUI(false, q, keys);
    feedback(false, who>=0 ? `💥 ${G.players[who].name} 回答错误` : '💥 回答错误', q);
    Fx.buzz();
    const endSoon = (G.cfg.rule==='survival' && G.lives<=0);
    setTimeout(()=>{ if(endSoon) endGame(); else next(); }, 2000);
  }
}
function timeout(){
  const q = G.qs[G.i];
  G.skipped++;
  G.wrongItems.push({ q, yours:'超时未答' });
  G.log.push({i:G.i, ok:false, yours:'超时未答'});
  const who = G.players ? G.turn : -1;
  if(who>=0){
    G.players[who].wrong++;
    if(G.cfg.penalty) G.players[who].score = Math.max(0, G.players[who].score-G.cfg.score);
    if(G.mode==='duelRush') G.turn = 1-who;
  } else if(G.cfg.penalty){
    G.score = Math.max(0, G.score-G.cfg.score);
  }
  if(G.cfg.rule==='survival') G.lives--;
  updateStageTop(); renderDuel();
  revealTimeout(q);
  feedback(false,'⏰ 时间到',q); Fx.buzz();
  const endSoon = (G.cfg.rule==='survival' && G.lives<=0);
  setTimeout(()=>{ if(endSoon) endGame(); else next(); }, 2000);
}
function revealUI(ok, q, keys){
  if(q.type==='fill'){
    $('#fillInput').disabled = true; $('#fillSubmit').disabled = true;
    const fa = $('#fillAns');
    fa.innerHTML = `<span class="std">${IC.check} 正确答案：${esc(q.answer)}</span>`;
    fa.classList.add('show');
    return;
  }
  $('#options').querySelectorAll('.option').forEach(b => {
    b.disabled = true;
    const k = b.dataset.key;
    const isCor = correctKeys(q).includes(k);
    const isSel = keys.includes(k);
    if(isCor) b.classList.add('correct');
    else if(isSel) b.classList.add('wrong');
    else b.classList.add('dim');
    b.querySelector('.mark').innerHTML = isCor ? IC.check : (isSel ? IC.cross : '');
  });
}
function revealTimeout(q){
  if(q.type==='fill'){
    $('#fillInput').disabled = true;
    $('#fillAns').innerHTML = `<span class="std">${IC.check} 正确答案：${esc(q.answer)}</span>`;
    $('#fillAns').classList.add('show');
    return;
  }
  $('#options').querySelectorAll('.option').forEach(b => {
    b.disabled = true;
    if(correctKeys(q).includes(b.dataset.key)){ b.classList.add('correct'); b.querySelector('.mark').innerHTML = IC.check; }
    else b.classList.add('dim');
  });
}
function feedback(ok, title, q){
  const fb = $('#feedback');
  fb.style.setProperty('--fb', ok ? 'var(--green)' : 'var(--red)');
  const delta = ok ? `+${G.cfg.score}` : (G.cfg.penalty ? `-${G.cfg.score}` : '');
  fb.innerHTML = `
    <div class="fb-card">
      <div class="fb-ic">${ok?IC.check:IC.cross}</div>
      <div class="fb-txt">${esc(title)}</div>
      ${q.analysis && G.cfg.showAnalysis ? `<div class="fb-sub">${esc(q.analysis)}</div>` : ''}
    </div>
    ${delta?`<div class="fb-score" style="color:${ok?'var(--green)':'var(--red)'}">${delta}</div>`:''}`;
  fb.classList.add('show');
}
function buzz(pi){
  if(G && G.split){ buzzSplit(pi); return; }
  if(!G || G.phase!=='question' || G.locked || G.buzzWinner!=null) return;
  G.buzzWinner = pi;
  Count.stop('buzz');
  Fx.buzzer(); Fx.start();
  $$('.buzz-btn').forEach(b => b.classList.toggle('locked', +b.dataset.buzz !== pi));
  const q = G.qs[G.i];
  if(q.type==='fill'){ $('#fillInput').disabled=false; $('#fillSubmit').disabled=false; $('#fillInput').focus(); }
  else $('#options').querySelectorAll('.option').forEach(b => b.disabled=false);
  $('#buzzHint').textContent = `${G.players[pi].name} 抢到！请作答`;
}
function submitFill(){
  if(!G || G.locked || G.qs[G.i].type!=='fill') return;
  G.fillVal = $('#fillInput').value.trim();
  if(!G.fillVal){ toast('请输入答案','info'); return; }
  answer(G.qs[G.i], []);
}
function pauseGame(){
  if(!G || G.phase!=='question') return;
  G.phase = 'paused';
  Count.pauseAll();
  document.querySelectorAll('.vtrack').forEach(v=>v.classList.remove('running'));
  $('#pauseMask').classList.add('show');
}
function resumeGame(){
  if(!G || G.phase!=='paused') return;
  G.phase = 'question';
  Count.resumeAll();
  document.querySelectorAll('.vtrack').forEach(v=>v.classList.add('running'));
  $('#pauseMask').classList.remove('show');
}

/* ============================================================
   成绩结算
   ============================================================ */
function endGame(){
  Count.stopAll();
  G.phase = 'end';
  document.querySelectorAll('.vtrack').forEach(v=>v.classList.remove('running'));
  syncNavVisibility();
  G.elapsed = ((Date.now()-G.startTs)/1000).toFixed(1);
  renderResult();
}
function statBox(label, val, cls){ return `<div class="st ${cls}"><b class="num">${val}</b><span>${label}</span></div>`; }
function wrongReviewHtml(){
  if(!G.wrongItems.length) return '';
  return `<div class="wrong-review">
    <div class="wr-head">${IC.cross} 错题回顾（${G.wrongItems.length}）</div>
    <div class="wr-list">${G.wrongItems.map(w=>`
      <div class="wr-item">
        <div class="wq">${esc(w.q.question)}</div>
        <div class="wa"><span class="yours">你的答案：${esc(w.yours)}</span>正确答案：<b>${esc(w.q.answer)}</b></div>
        ${w.q.analysis?`<div class="ana-mini" style="border:none;padding:0;margin:4px 0 0">解析：${esc(w.q.analysis)}</div>`:''}
      </div>`).join('')}</div>
  </div>`;
}
function renderResult(){
  const rv = $('#resultView');
  const acc = G.correct + G.wrong ? Math.round(G.correct/(G.correct+G.wrong)*100) : 0;
  let html = '';
  const acts = `<div class="result-acts">
    <button class="btn btn-lg btn-explain" id="btnExplain">📖 讲解</button>
    <button class="btn btn-primary btn-lg" id="btnReplay">${IC.play} 再来一局</button>
    <button class="btn btn-lg" id="btnBackHome">返回大厅</button>
  </div>`;
  if(G.players && G.players.length>1){
    const p0=G.players[0], p1=G.players[1];
    const winner = p0.score===p1.score ? -1 : (p0.score>p1.score?0:1);
    html = `
      <div class="result-trophy">${winner>=0?IC.trophy:''}</div>
      <div class="result-title">${winner>=0?`🏆 ${G.players[winner].name} 获胜！`: '🤝 平局'}</div>
      <div class="result-sub">${G.mode==='buzz'?'抢答擂台':G.mode==='duelRush'?'双人对战·冲刺':'双人对战·计时'} · 用时 ${G.elapsed}s</div>
      <div class="duel-result">
        ${G.players.map((p,i)=>`
          <div class="dr ${winner===i?'win':''}" style="--pp:${i===0?'#FF8FA3':'#FF9F45'}">
            <span class="crown">${IC.crown}</span>
            <div class="nm">${esc(p.name)}</div>
            <div class="sc num">${p.score}</div>
            <div style="font-size:11.5px;color:var(--text-3);margin-top:6px">答对 ${p.correct} · 答错 ${p.wrong}</div>
          </div>`).join('')}
      </div>
      ${wrongReviewHtml()}
      ${acts}`;
  } else if(G.cfg.rule==='survival'){
    html = `
      <div class="result-trophy">${G.lives>0?IC.trophy:IC.flag}</div>
      <div class="result-title">${G.lives>0?'🏆 闯关成功！':'🏁 闯关结束'}</div>
      <div class="result-sub">你闯过了 <b class="num" style="color:var(--amber-2)">${G.i+1}</b> 题 · 剩余生命 ${G.lives} · 用时 ${G.elapsed}s</div>
      <div class="result-stats">
        ${statBox('得分',G.score,'ok')}${statBox('答对',G.correct,'ok')}${statBox('答错',G.wrong,'no')}${statBox('正确率',acc+'%','acc')}
      </div>
      ${wrongReviewHtml()}
      ${acts}`;
  } else {
    html = `
      <div class="result-trophy">${IC.trophy}</div>
      <div class="result-title">🎉 比赛结束</div>
      <div class="result-sub">${G.mode==='rush'?'限时冲刺':'经典计时'} · ${G.qs.length} 题 · 用时 ${G.elapsed}s</div>
      <div class="result-score-line"><span class="big num">${G.score}</span><span class="u">分</span></div>
      <div class="result-stats">
        ${statBox('答对',G.correct,'ok')}${statBox('答错',G.wrong,'no')}${statBox('跳过',G.skipped,'tm')}${statBox('正确率',acc+'%','acc')}
      </div>
      ${wrongReviewHtml()}
      ${acts}`;
  }
  rv.innerHTML = html;
  rv.classList.add('show');
  if(G.wrongItems.length===0) Fx.fanfare(); else Fx.lose();
}
/* ============================================================
   讲解模式（结束后逐题讲解，直接展示答案）
   ============================================================ */
let EX_I = 0, EXPLAIN_FROM = 'result';
function openExplain(from, idx){
  if(!G) return;
  EXPLAIN_FROM = from || 'result';
  EX_I = idx ?? 0;
  $('#resultView').classList.remove('show');
  const sub = $('#explainView .ex-sub');
  if(sub) sub.textContent = (EXPLAIN_FROM==='game') ? '讲解中 · 关闭后回到该题继续游戏' : '点击题号跳转讲解，直接展示正确答案';
  $('#explainView').classList.add('show');
  renderExplainNav();
  renderExplain(EX_I);
}
function closeExplain(){
  $('#explainView').classList.remove('show');
  if(!G){ EXPLAIN_FROM='result'; return; }
  if(EXPLAIN_FROM==='game'){
    // 返回游戏：从所讲解的题重新开始计时作答
    EXPLAIN_FROM = 'result';
    G.i = EX_I;
    Count.stopAll();
    G.phase = 'question';
    G.locked = false;
    renderQuestion();
  } else {
    EXPLAIN_FROM = 'result';
    $('#resultView').classList.add('show');
  }
}
function explainRec(i){
  return (G.log||[]).filter(l=>l.i===i)[0];
}
function renderExplainNav(){
  $('#exNav').innerHTML = G.qs.map((q,i)=>{
    const rec = explainRec(i);
    const err = rec && rec.ok===false;
    return `<button class="ex-num ${err?'err':''} ${i===EX_I?'on':''}" data-ex="${i}" title="${err?'答错':'讲解'}">${i+1}</button>`;
  }).join('');
}
function renderExplain(i){
  EX_I = i;
  const q = G.qs[i];
  const rec = explainRec(i);
  $$('#exNav .ex-num').forEach(b=>b.classList.toggle('on', +b.dataset.ex===i));
  const prev = $('#exPrev'), next = $('#exNext');
  if(prev) prev.disabled = (i<=0);
  if(next) next.disabled = (i>=G.qs.length-1);
  const verdict = !rec ? '<span class="ex-verdict none">未作答</span>'
    : rec.ok ? '<span class="ex-verdict ok">✅ 回答正确</span>'
    : rec.ok===false ? `<span class="ex-verdict no">❌ 回答错误 · 你的答案：${esc(rec.yours)}</span>`
    : `<span class="ex-verdict none">${esc(rec.yours)}</span>`;
  let opts = '';
  if(q.type!=='fill'){
    opts = `<div class="ex-opts">${q.options.map(o=>{
      const isCor = correctKeys(q).includes(o.key);
      const isSel = rec && rec.ok===false && rec.yours && String(rec.yours).includes(o.key);
      const cls = isCor ? 'cor' : (isSel ? 'wrg' : 'dim');
      return `<div class="ex-opt ${cls}"><span class="key">${o.key}</span><span class="txt">${esc(o.text)}</span></div>`;
    }).join('')}</div>`;
  }
  $('#exBody').innerHTML = `
    <div class="ex-q-no"><span>第 ${i+1} 题 / ${G.qs.length}</span><span class="t-type">${TYPES[q.type].name}</span></div>
    <div class="ex-q-title">${esc(q.question)}</div>
    ${verdict}
    ${opts}
    <div class="ex-ans">${IC.check} 正确答案：<b>${esc(q.type==='fill'?q.answer:correctKeys(q))}</b></div>
    ${q.analysis?`<div class="ex-ana">💡 解析：${esc(q.analysis)}</div>`:''}`;
}
function closeStage(){
  Count.stopAll();
  G = null;
  $('#stage').classList.remove('open');
  $('#pauseMask').classList.remove('show');
  $('#resultView').classList.remove('show');
  $('#explainView').classList.remove('show');
  $('#feedback').classList.remove('show');
  $('#splitWrap').classList.remove('open');
  document.querySelectorAll('.vtrack').forEach(v=>v.classList.remove('running'));
  $('#splitShared').style.display = 'none';
  $('#qzone').style.display = 'flex';
  $('#duelTop').style.display = 'none';
  $('#stageNavPrev').style.display = 'none';
  $('#stageNavNext').style.display = 'none';
}

/* ============================================================
   示例题库（可一键载入体验）
   ============================================================ */
const SAMPLE = [
  { type:'single', question:'光的传播速度最快的是下列哪种介质？', options:[{key:'A',text:'真空'},{key:'B',text:'空气'},{key:'C',text:'水'},{key:'D',text:'玻璃'}], answer:'A', analysis:'光在真空中的速度约 3×10⁸ m/s，是最快的。' },
  { type:'single', question:'《静夜思》的作者是？', options:[{key:'A',text:'杜甫'},{key:'B',text:'李白'},{key:'C',text:'白居易'},{key:'D',text:'王维'}], answer:'B', analysis:'床前明月光，疑是地上霜——李白《静夜思》。' },
  { type:'multiple', question:'下列哪些动物属于哺乳动物？', options:[{key:'A',text:'蝙蝠'},{key:'B',text:'鲸鱼'},{key:'C',text:'企鹅'},{key:'D',text:'鲨鱼'}], answer:'AB', analysis:'蝙蝠和鲸鱼都是哺乳动物；企鹅是鸟类，鲨鱼是鱼类。' },
  { type:'judge', question:'地球绕太阳公转一周约为 365 天。', options:[], answer:'对', analysis:'地球公转周期约 365.25 天，即一个回归年。' },
  { type:'judge', question:'声音可以在真空中传播。', options:[], answer:'错', analysis:'声音需要介质传播，真空中无法传声。' },
  { type:'fill', question:'我国最长的河流是？', options:[], answer:'长江', analysis:'长江全长约 6300 公里，是中国第一长河。' },
  { type:'single', question:'水的化学式是？', options:[{key:'A',text:'H₂O'},{key:'B',text:'CO₂'},{key:'C',text:'O₂'},{key:'D',text:'NaCl'}], answer:'A', analysis:'水的分子式为 H₂O。' },
  { type:'multiple', question:'下列哪些属于可再生能源？', options:[{key:'A',text:'太阳能'},{key:'B',text:'风能'},{key:'C',text:'煤炭'},{key:'D',text:'石油'}], answer:'AB', analysis:'太阳能与风能可循环再生；煤炭、石油为不可再生能源。' },
];

/* ============================================================
   事件绑定
   ============================================================ */
function bindEvents(){
  // 顶栏
  $$('.nav-item').forEach(b => b.addEventListener('click', () => switchView(b.dataset.nav)));
  $('#btnMute').addEventListener('click', () => {
    settings.muted = !settings.muted;
    store.set('qa_settings_v1', settings);
    Fx.muted = settings.muted;
    renderMute();
  });
  $('#btnTheme').addEventListener('click', () => {
    applyTheme(theme==='light' ? 'dark' : 'light');
    toast(theme==='light' ? '已切换到亮色主题 ☀️' : '已切换到深色主题 🌙','info');
  });
  $('#btnThemeStage').addEventListener('click', () => {
    applyTheme(theme==='light' ? 'dark' : 'light');
    toast(theme==='light' ? '已切换到亮色主题 ☀️' : '已切换到深色主题 🌙','info');
  });
  // 品牌弹窗
  $('#btnBrand').addEventListener('click', () => $('#brandModal').classList.add('open'));
  $('#btnBrandClose').addEventListener('click', () => $('#brandModal').classList.remove('open'));
  $('#brandModal').addEventListener('mousedown', e => { if(e.target === $('#brandModal')) $('#brandModal').classList.remove('open'); });
  $('#panelEmpty').querySelector('[data-goto="bank"]').addEventListener('click', () => switchView('bank'));
  $('#btnSampleBank').addEventListener('click', () => {
    if(curQs().length && !confirm('载入示例题库会替换当前题组的题目，确定继续吗？')) return;
    GROUPS[curG].questions = SAMPLE.map(normalizeQuestion);
    saveGroups(); renderBank(); renderLobby();
    toast('已载入 8 道示例题目','ok');
  });

  // 题库：导入 / 导出 / 清空 / 题组
  $('#btnImportFile').addEventListener('click', () => $('#fileInput').click());
  $('#fileInput').addEventListener('change', e => {
    handleImportFiles(e.target.files).catch(err => toast(err.message || '导入失败','err'));
    e.target.value = '';
  });
  const dz = $('#dropZone');
  ['dragenter','dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave','drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', e => {
    handleImportFiles(e.dataTransfer.files).catch(err => toast(err.message || '导入失败','err'));
  });
  $('#btnExport').addEventListener('click', downloadJSON);
  $('#btnExportAll').addEventListener('click', () => { exportGroups(GROUPS.map(g => ({ name:g.name, questions:g.questions }))); });
  $('#btnClearBank').addEventListener('click', () => {
    if(!curQs().length){ toast('当前题组本来就是空的','info'); return; }
    if(!confirm('确定清空当前题组的全部题目吗？此操作不可恢复。')) return;
    GROUPS[curG].questions = []; saveGroups(); renderBank(); renderLobby();
    toast('当前题组已清空','ok');
  });
  $('#btnAddGroup').addEventListener('click', () => {
    GROUPS.push({ id: uid(), name: '题组 ' + (GROUPS.length + 1), questions: [] });
    curG = GROUPS.length - 1;
    saveGroups(); renderBank(); renderLobby();
    toast('已新建题组','ok');
  });
  $('#btnDelGroup').addEventListener('click', () => {
    if(GROUPS.length <= 1){ toast('至少保留一个题组','info'); return; }
    const g = GROUPS[curG];
    if(g.questions.length && !confirm(`确定删除题组「${g.name}」及其 ${g.questions.length} 道题目吗？此操作不可恢复。`)) return;
    GROUPS.splice(curG, 1);
    if(curG >= GROUPS.length) curG = GROUPS.length - 1;
    saveGroups(); renderBank(); renderLobby();
    toast('题组已删除','ok');
  });
  $('#btnMergeGroup').addEventListener('click', () => {
    if(GROUPS.length <= 1){ toast('只有一个题组，无需合并','info'); return; }
    $('#mergeCurName').textContent = GROUPS[curG].name;
    $('#mergeList').innerHTML = GROUPS.map((g, i) => i === curG ? '' : `
      <button class="btn" data-mg="${i}" style="justify-content:flex-start">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><path d="M12 8v8M8 12h8"/></svg>
        并入「${esc(g.name)}」<span style="opacity:.65;margin-left:auto">${g.questions.length} 题</span>
      </button>`).join('');
    $('#mergeModal').classList.add('open');
  });
  $('#mergeList').addEventListener('click', e => {
    const btn = e.target.closest('[data-mg]'); if(!btn) return;
    const target = +btn.dataset.mg;
    const src = GROUPS[curG], dst = GROUPS[target];
    dst.questions = dst.questions.concat(src.questions);
    GROUPS.splice(curG, 1);
    if(curG >= GROUPS.length) curG = GROUPS.length - 1;
    saveGroups(); renderBank(); renderLobby();
    $('#mergeModal').classList.remove('open');
    toast(`已合并：${src.questions.length} 道题目并入「${dst.name}」`,'ok');
  });
  $('#mergeClose').addEventListener('click', () => $('#mergeModal').classList.remove('open'));
  $('#btnAddManual').addEventListener('click', () => openManual(null));

  // 弹窗：点击遮罩关闭
  $$('.modal-mask').forEach(m => m.addEventListener('mousedown', e => {
    if(e.target === m){ if(m.id==='previewModal') closePreview(); else if(m.id==='mergeModal') $('#mergeModal').classList.remove('open'); else if(m.id==='importFailModal') closeFailModal(); else closeManual(); }
  }));

  // 游戏舞台
  $('#btnExitStage').addEventListener('click', () => {
    if(G && G.phase==='question' && !confirm('退出当前游戏？本局成绩将丢失。')) return;
    closeStage();
  });
  $('#btnResume').addEventListener('click', resumeGame);
  $('#btnQuitPause').addEventListener('click', closeStage);
  $('#btnRestart').addEventListener('click', () => {
    const m = G && G.mode; if(!m) return;
    closeStage(); startGame(m);
  });
  $('#resultView').addEventListener('click', e => {
    if(e.target.closest('#btnReplay')){ const m=G.mode; closeStage(); startGame(m); }
    else if(e.target.closest('#btnBackHome')) closeStage();
  });
  $('#options').addEventListener('click', e => {
    const btn = e.target.closest('.option');
    if(!btn || !G || G.locked || G.phase!=='question') return;
    const q = G.qs[G.i];
    if(G.mode==='buzz' && G.buzzWinner==null){ toast('请先抢答','info'); return; }
    const key = btn.dataset.key;
    if(q.type==='multiple'){
      btn.classList.toggle('sel');
      G.selKeys = [...$('#options').querySelectorAll('.option.sel')].map(b=>b.dataset.key).sort();
      return;
    }
    answer(q, [key]);
  });
  document.addEventListener('click', e => {
    if(e.target.closest('#multiSubmit')){
      if(!G || G.locked) return;
      if(!G.selKeys.length){ toast('请先选择答案','info'); return; }
      answer(G.qs[G.i], G.selKeys);
    }
    if(e.target.closest('.buzz-btn')){
      buzz(+e.target.closest('.buzz-btn').dataset.buzz);
    }
    // 跳题导航
    if(e.target.closest('#btnPrevQ')){ jumpQuestion(-1); return; }
    if(e.target.closest('#btnNextQ')){ jumpQuestion(1); return; }
    // 讲解模式交互
    if(e.target.closest('#btnExplain')){ openExplain(); return; }
    if(e.target.closest('#btnExplainClose')){ closeExplain(); return; }
    if(e.target.closest('#exPrev')){ renderExplain(Math.max(0, EX_I-1)); return; }
    if(e.target.closest('#exNext')){ renderExplain(Math.min(G.qs.length-1, EX_I+1)); return; }
    const exNum = e.target.closest('#exNav .ex-num');
    if(exNum){ renderExplain(+exNum.dataset.ex); return; }
    // 分屏对战交互
    if(G && G.split){
      const opt = e.target.closest('#splitGrid .option');
      if(opt){
        const panel = opt.closest('[data-p]');
        const pi = +panel.dataset.p;
        if(G.mode==='buzz'){
          if(G.buzzWinner==null){ toast('请先抢答','info'); return; }
          if(G.buzzWinner!==pi) return;
          const q = G.qs[G.i];
          if(q.type==='multiple'){ opt.classList.toggle('sel'); return; }
          G.locked = true;
          splitAnswer(pi, q, [opt.dataset.key]);
        } else {
          const q = CURQ(pi);
          if(G.mode==='duelRush' && G.pOver[pi]) return;
          if(q.type==='multiple'){ opt.classList.toggle('sel'); return; }
          G.lastSide = pi;
          splitAnswer(pi, q, [opt.dataset.key]);
        }
        return;
      }
      const sub = e.target.closest('#splitGrid [id^="spSubmit"]');
      if(sub){ splitSubmit(+sub.id.replace('spSubmit','')); return; }
      const fbtn = e.target.closest('#splitGrid [id^="spFillBtn"]');
      if(fbtn){ splitSubmit(+fbtn.id.replace('spFillBtn','')); return; }
      const bb = e.target.closest('#splitGrid .b-btn');
      if(bb){ buzz(+bb.closest('[data-p]').dataset.p); return; }
      // 抢答擂台控制条
      if(e.target.closest('#spBtnPause')){ pauseGame(); return; }
      if(e.target.closest('#spBtnReveal')){ buzzReveal(); return; }
      if(e.target.closest('#spBtnSkip')){ buzzSkip(); return; }
    }
  });
  $('#fillSubmit').addEventListener('click', submitFill);

  // 键盘
  document.addEventListener('keydown', e => {
    if(!$('#stage').classList.contains('open') || !G) return;
    if($('#explainView').classList.contains('show')){ if(e.key==='Escape') closeExplain(); return; }
    if(e.key==='Escape'){
      if(document.activeElement && (document.activeElement.id==='fillInput' || (document.activeElement.id||'').startsWith('spFill'))){ document.activeElement.blur(); return; }
      if(G.phase==='paused') resumeGame();
      else if(G.phase==='question' && !G.locked) pauseGame();
      return;
    }
    if(G.phase==='paused') return;
    if(G.phase!=='question') return;
    if(G.split){
      const k0 = e.key.toLowerCase();
      if(G.mode==='buzz' && G.buzzWinner==null){
        if(k0==='q'){ buzz(0); return; }
        if(k0==='p'){ buzz(1); return; }
        return;
      }
      if(G.locked) return;
      if(e.key==='Enter'){
        const ae = document.activeElement;
        let side = G.lastSide;
        if(ae && ae.id && /^spFill\d+$/.test(ae.id)) side = +ae.id.replace('spFill','');
        if(side!=null && side>=0) splitSubmit(side);
        return;
      }
      const qq = CURQ(G.lastSide);
      if(qq && qq.type==='fill') return;
      const map = [['1','2','3','4','a','b','c','d'],['7','8','9','0','u','i','o','p']];
      let pi=-1, idx=-1;
      for(let s=0;s<2;s++){ const i=map[s].indexOf(k0); if(i>=0){ pi=s; idx=i%4; break; } }
      if(pi<0) return;
      const opts = [...document.querySelectorAll(`[data-p="${pi}"] .option`)];
      if(!opts.length) return;
      G.lastSide = pi;
      if(opts[idx]) opts[idx].click();
      return;
    }
    if(G.locked) return;
    const q = G.qs[G.i];
    if(e.key==='Enter'){
      if(G.mode==='buzz' && G.buzzWinner==null && +G.cfg.players===1){ buzz(0); return; }
      if(q.type==='fill'){ submitFill(); return; }
      const sb = document.getElementById('multiSubmit');
      if(sb){ sb.click(); return; }
      return;
    }
    if(G.mode==='buzz' && G.buzzWinner==null){
      const k = e.key.toLowerCase();
      if(k==='q'){ buzz(0); return; }
      if(k==='p' && +G.cfg.players===2){ buzz(1); return; }
      return;
    }
    if(q.type==='fill') return;
    const k = e.key.toLowerCase();
    const idx = ['1','2','3','4','5','6','7','8'].indexOf(e.key) !== -1 ? +e.key-1 : ['a','b','c','d','e','f','g','h'].indexOf(k);
    if(idx < 0) return;
    const btns = [...$('#options').querySelectorAll('.option')];
    if(btns[idx]) btns[idx].click();
  });
}
function renderMute(){ $('#btnMute').innerHTML = settings.muted ? IC.mute : IC.vol; $('#btnMute').classList.toggle('muted', settings.muted); }
function renderTheme(){
  const icon = theme==='light' ? IC.moon : IC.sun;
  const tip = theme==='light' ? '切换到深色主题' : '切换到亮色主题';
  $('#btnTheme').innerHTML = icon; $('#btnTheme').title = tip;
  const st = $('#btnThemeStage');
  if(st){ st.innerHTML = icon; st.title = tip; }
}
function applyTheme(t, persist){
  theme = t;
  document.body.classList.toggle('light', t==='light');
  renderTheme();
  if(persist !== false) store.set('qa_theme_v1', t);
  if(view==='lobby') renderLobby();
  // 游戏进行中同步模式强调色（亮色下用加深版保证可读）
  if(G && $('#stage').classList.contains('open')){
    const mode = MODES.find(m=>m.id===G.mode);
    $('#stage').style.setProperty('--mc', t==='light' ? (mode ? (mode.hueDark||mode.hue) : '#FFC53D') : (mode ? mode.hue : '#FFC53D'));
  }
}

/* ============================================================
   初始化
   ============================================================ */
function init(){
  Confetti.init();
  bindEvents();
  applyTheme(theme, false);
  renderMute();
  renderHeader();
  renderLobby();
  renderBank();
}
init();
