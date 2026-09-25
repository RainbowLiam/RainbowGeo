/* ============================================================
   RainbowGeo（文波地理）共享引导 boot.js v1.0
   引用：<script src="../../assets/js/boot.js" data-rg-mode="overlay" defer></script>
   - data-rg-mode：overlay（默认，悬浮顶/底部，适合全屏 3D 工具）
                 flow（流式占位，适合普通页面工具）
   - 工具页可在引用前设置 window.RAINBOWGEO_BRAND 覆盖品牌配置
   - 右上角 × 关闭后 localStorage 记住；URL 加 ?rg=show 可强制重新显示
   - 暴露全局 window.RainbowGeo：{ BRAND, close, showTrialNotice, isClosed }
   ============================================================ */
(function () {
  'use strict';

  var DEFAULTS = {
    name: 'RainbowGeo',
    nameCn: '文波地理',
    logo: '',                 // 空 = 自动推导 assets/img/brand-logo.jpg
    tagline: '3D 地理教学工具集',
    year: '',                 // 空 = 当前年份
    contact: 'brand@rainbowgeo.example',
    version: '',              // 空 = 读 window.APP_VERSION
    trialText: '在线试用版',
    copyrightText: '保留所有权利'
  };

  var cfg = {};
  for (var k in DEFAULTS) cfg[k] = DEFAULTS[k];
  if (window.RAINBOWGEO_BRAND) {
    for (var k2 in window.RAINBOWGEO_BRAND) cfg[k2] = window.RAINBOWGEO_BRAND[k2];
  }

  // —— 幂等：避免重复注入 ——
  if (document.getElementById('rg-brand-bar')) { expose(); return; }

  // —— 模式与资产根自动推导 ——
  var sc = document.currentScript;
  var mode = (sc && sc.getAttribute('data-rg-mode')) || cfg.mode || 'overlay';
  var assetRoot = '';
  if (sc && sc.getAttribute('src')) {
    var a = document.createElement('a');
    a.href = sc.getAttribute('src');
    var parts = a.href.split('/');
    parts.pop();          // 去掉 boot.js
    parts.pop();          // 去掉 js/
    assetRoot = parts.join('/');
  }
  var logoUrl = cfg.logo || (assetRoot ? assetRoot + '/img/brand-logo.jpg' : '');
  var version = cfg.version || (typeof window.APP_VERSION !== 'undefined' && window.APP_VERSION ? window.APP_VERSION : '');
  var year = cfg.year || new Date().getFullYear();

  // —— 关闭状态 ——
  var CLOSE_KEY = 'rg-overlay-closed';
  var closed = false;
  try { closed = !!localStorage.getItem(CLOSE_KEY); } catch (e) {}
  if (/[?&]rg=show/.test(window.location.search)) closed = false;
  if (closed) { expose(true); return; }

  // —— 构建品牌栏 ——
  function buildBrand() {
    var bar = document.createElement('div');
    bar.className = mode === 'flow' ? 'rg-flow-brand' : 'rg-brand-bar';
    bar.id = 'rg-brand-bar';
    if (logoUrl) {
      var img = document.createElement('img');
      img.className = 'rg-logo';
      img.src = logoUrl;
      img.alt = cfg.name + ' 商标（占位）';
      bar.appendChild(img);
    }
    var name = document.createElement('div');
    name.className = 'rg-name';
    name.innerHTML = '<em>' + escapeHtml(cfg.name) + '</em>';
    bar.appendChild(name);
    var cn = document.createElement('div');
    cn.className = 'rg-cn';
    cn.textContent = cfg.nameCn + (cfg.tagline ? ' · ' + cfg.tagline : '');
    bar.appendChild(cn);
    return bar;
  }

  function buildCopyright() {
    var bar = document.createElement('div');
    bar.className = mode === 'flow' ? 'rg-flow-copyright' : 'rg-copyright-bar';
    bar.id = 'rg-copyright-bar';
    var copy = document.createElement('span');
    copy.className = 'rg-copy';
    copy.innerHTML = '© ' + year + ' <b>' + escapeHtml(cfg.name) + '</b>（' + escapeHtml(cfg.nameCn) + '）· ' + escapeHtml(cfg.copyrightText) + (version ? ' · ' + escapeHtml(version) : '');
    bar.appendChild(copy);
    var trial = document.createElement('span');
    trial.className = 'rg-trial-tag';
    trial.textContent = cfg.trialText;
    bar.appendChild(trial);
    var close = document.createElement('button');
    close.className = 'rg-close';
    close.type = 'button';
    close.textContent = '×';
    close.title = '关闭品牌信息栏';
    close.setAttribute('aria-label', '关闭品牌信息栏');
    close.addEventListener('click', function (ev) {
      ev.stopPropagation();
      closeAll();
    });
    bar.appendChild(close);
    return bar;
  }

  function closeAll() {
    var b1 = document.getElementById('rg-brand-bar');
    var b2 = document.getElementById('rg-copyright-bar');
    if (b1) b1.remove();
    if (b2) b2.remove();
    try { localStorage.setItem(CLOSE_KEY, '1'); } catch (e) {}
    if (window.RainbowGeo) window.RainbowGeo.isClosed = true;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // —— 注入 ——
  if (mode === 'flow') {
    // 流式：品牌条插 body 顶部，版权条插 body 尾部
    if (document.body) {
      document.body.insertBefore(buildBrand(), document.body.firstChild);
      document.body.appendChild(buildCopyright());
    }
  } else {
    // overlay：fixed，直接挂 body 末尾
    if (document.body) {
      document.body.appendChild(buildBrand());
      document.body.appendChild(buildCopyright());
    }
  }

  // —— 全局命名空间 ——
  function expose(isClosed) {
    window.RainbowGeo = {
      BRAND: cfg,
      mode: mode,
      assetRoot: assetRoot,
      isClosed: !!isClosed,
      close: closeAll,
      showTrialNotice: function (msg) {
        var t = document.createElement('div');
        t.style.cssText = 'position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:2147483001;background:rgba(7,19,32,.92);color:#f5d547;font:600 13px/1.5 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;padding:8px 16px;border-radius:10px;border:1px solid rgba(245,213,71,.4);box-shadow:0 6px 22px rgba(0,0,0,.4);max-width:80vw;text-align:center;pointer-events:none;';
        t.textContent = msg || (cfg.name + '（' + cfg.nameCn + '）' + cfg.trialText);
        document.body.appendChild(t);
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2600);
      }
    };
  }
  expose(false);
})();
