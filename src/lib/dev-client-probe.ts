/** Script chẩn đoán thiết bị thật (chỉ dev). Chạy inline trong <head> nên KHÔNG
 *  phụ thuộc bundle app — vẫn báo được khi chunk lỗi / React không hydrate.
 *  Gửi báo cáo về `/api/debug-client` (ghi ra /tmp/cms-mobile-debug.log).
 *  Xoá file này + route + <script> trong layout khi debug xong. */
export const DEV_CLIENT_PROBE = `(function(){
  if (window.__siteProbe) return;
  window.__siteProbe = 1;
  var errs = [];
  var samples = [];
  window.__siteErrs = errs;

  function push(msg) {
    if (errs.length < 25) errs.push(String(msg).slice(0, 300));
  }

  addEventListener('error', function (e) {
    push('error: ' + (e.message || e.type) + ' @ ' + (e.filename || '') + ':' + (e.lineno || 0));
  }, true);

  addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    push('rejection: ' + ((r && (r.message || r.name)) || r));
  });

  function q(sel) { return document.querySelector(sel); }

  function cssVar(el, name) {
    if (!el) return null;
    return getComputedStyle(el).getPropertyValue(name).trim();
  }

  function rectOf(sel) {
    var el = q(sel);
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  }

  function topAt(sel) {
    var el = q(sel);
    if (!el) return null;
    var r = el.getBoundingClientRect();
    if (r.width < 1) return 'zero-rect';
    var hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!hit) return null;
    return (hit.tagName + '.' + (hit.className || '')).slice(0, 140);
  }

  function metrics() {
    var morph = q('[data-morph-pin]');
    var scroller = q('[data-fps-inner-scroll]');
    return {
      href: location.href,
      ua: navigator.userAgent,
      hydrated: !!window.__siteHydrated,
      errs: errs,
      innerH: window.innerHeight,
      vvH: window.visualViewport ? Math.round(window.visualViewport.height) : null,
      docH: document.documentElement.clientHeight,
      scrollY: Math.round(window.scrollY),
      fpsRoot: !!q('[data-full-page-scroll]'),
      fpsActive: !!q('[data-full-page-scroll-active]'),
      panelMotion: q('[data-fps-panel]') ? q('[data-fps-panel]').getAttribute('data-fps-motion') : null,
      morphPhase: morph ? morph.getAttribute('data-morph-pin-phase') : null,
      pShrink: cssVar(q('[data-morph-pin-image]'), '--morph-pin-p-shrink'),
      pImage: cssVar(q('[data-morph-pin-image]'), '--morph-pin-p-image'),
      morphVvh: cssVar(morph, '--morph-pin-vvh'),
      imageTransform: q('[data-morph-pin-image]') ? getComputedStyle(q('[data-morph-pin-image]')).transform : null,
      scroller: scroller ? { top: Math.round(scroller.scrollTop), h: scroller.clientHeight, sh: scroller.scrollHeight } : null,
      toggleRect: rectOf('.site-header-menu-toggle--open'),
      toggleTopEl: topAt('.site-header-menu-toggle--open'),
      menuPhase: q('.mobile-menu-panel') ? q('.mobile-menu-panel').getAttribute('data-phase') : null,
      samples: samples
    };
  }

  function send(tag) {
    try {
      var payload = JSON.stringify({ tag: tag, m: metrics() });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/debug-client', new Blob([payload], { type: 'application/json' }));
        return;
      }
      fetch('/api/debug-client', { method: 'POST', body: payload, keepalive: true });
    } catch (err) { /* ignore */ }
  }

  setTimeout(function () {
    var sc = q('[data-fps-inner-scroll]');
    var morph = q('[data-morph-pin]');
    if (!sc) return;
    sc.addEventListener('scroll', function () {
      if (samples.length >= 60) return;
      samples.push(Math.round(sc.scrollTop) + '|' + (morph ? cssVar(morph, '--morph-pin-p-shrink') : '?') + '|' + sc.clientHeight);
    }, { passive: true });
  }, 1500);

  setTimeout(function () { send('t6'); }, 6000);
  setTimeout(function () { send('t15'); }, 15000);
  addEventListener('pagehide', function () { send('pagehide'); });
})();`;
