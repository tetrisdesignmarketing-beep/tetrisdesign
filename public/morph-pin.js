/* ES5 — không qua bundle Next.
   Fallback khi React KHÔNG hydrate (hoặc hydrate rất chậm): iOS cũ / in-app
   browser (Zalo, FB...) parse hỏng bundle, Safari giữ HTML cũ nhưng chunk đã
   đổi hash, hoặc `next dev` mở qua LAN trên điện thoại (bundle dev rất nặng).
   Khi đó hook React `useMorphPinScroll` không chạy → ảnh không thu nhỏ, 3 khối
   logo brand-break nằm ngoài màn hình (translate 100vw), text partner ẩn.

   Kiến trúc hiện tại của /about (đã bỏ full-page-scroll): cuộn window bình
   thường, [data-morph-pin-track] cao = vvh + collapse, [data-morph-pin-pin]
   sticky bên trong. Tiến trình = headerOffset − track.top. Script này tính y
   hệt hook React (enter logo → letter exit → image shrink → pin → flow) và ghi
   cùng các biến CSS / data-attribute. Khi React bind (data-morph-pin-bound =
   "react") script tự dừng, nhường hoàn toàn cho React.

   Bản cũ (v7) chỉ bind khi có [data-fps-inner-scroll] (inner scroller của
   full-page-scroll) — /about không còn phần tử đó nên fallback im lặng không
   làm gì, đó là lý do trên điện thoại mất sạch animation khi React không chạy. */
(function () {
  /* Chờ sau window load rồi mới khởi động — React thường hydrate xong trước
     mốc này, script không đụng DOM nữa → không gây hydration mismatch. Chỉ máy
     mà React không chạy được (hoặc cực chậm) mới rơi vào nhánh fallback. */
  var START_DELAY_MS = 1500;
  var BLOCK_IDS = ["top", "mid", "bot"];

  function clamp01(value) {
    return Math.min(1, Math.max(0, value));
  }

  function parseNum(styles, name, fallback) {
    var value = parseFloat(styles.getPropertyValue(name));
    return isFinite(value) ? value : fallback;
  }

  function positive(value, fallback) {
    return value > 0 ? value : fallback;
  }

  function setVar(el, name, value) {
    if (el.style.getPropertyValue(name) === value) return;
    el.style.setProperty(name, value);
  }

  function px(value) {
    return (Math.round(value * 10) / 10).toFixed(1) + "px";
  }

  function viewportWidth() {
    return (window.visualViewport && window.visualViewport.width) || window.innerWidth;
  }

  function isCoarse() {
    return (
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(max-width: 767px)").matches
    );
  }

  function headerOffset() {
    var header = document.querySelector("header");
    return header ? header.getBoundingClientRect().height : 90;
  }

  function measureCssHeight(height) {
    var probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;visibility:hidden;pointer-events:none;height:" + height;
    document.documentElement.appendChild(probe);
    var value = probe.getBoundingClientRect().height;
    probe.parentNode.removeChild(probe);
    return value;
  }

  function stableViewportHeight() {
    var svh = measureCssHeight("100svh");
    if (svh > 0) return svh;
    return (window.visualViewport && window.visualViewport.height) || window.innerHeight;
  }

  function reactAlive() {
    return !!(
      window.__siteHydrated ||
      document.querySelector('[data-morph-pin-bound="react"]')
    );
  }

  /* Cùng công thức soft-stagger với hook React (top dẫn, bot theo sau). */
  function stagger(progress, index, amount, finishAt) {
    var s = Math.min(0.3, Math.max(0, amount));
    var end = Math.min(1, Math.max(s * 2 + 0.05, finishAt));
    var span = Math.max(0.01, end - 2 * s);
    return clamp01((progress - index * s) / span);
  }

  /* Đáy photo đã paint (object-contain), không phải đáy khung wrapper. */
  function visualImageBottom(wrapper) {
    var fallback = wrapper.getBoundingClientRect().bottom;
    var img = wrapper.querySelector("img");
    if (!img || !img.naturalWidth || !img.naturalHeight) return fallback;

    var rect = img.getBoundingClientRect();
    var style = window.getComputedStyle(img);
    var scaleX = img.offsetWidth > 0 ? rect.width / img.offsetWidth : 1;
    var scaleY = img.offsetHeight > 0 ? rect.height / img.offsetHeight : 1;
    var padT = (parseFloat(style.paddingTop) || 0) * scaleY;
    var padB = (parseFloat(style.paddingBottom) || 0) * scaleY;
    var padL = (parseFloat(style.paddingLeft) || 0) * scaleX;
    var padR = (parseFloat(style.paddingRight) || 0) * scaleX;
    var contentTop = rect.top + padT;
    var contentW = Math.max(0, rect.width - padL - padR);
    var contentH = Math.max(0, rect.height - padT - padB);
    if (contentW < 1 || contentH < 1) return fallback;

    var fit = Math.min(contentW / img.naturalWidth, contentH / img.naturalHeight);
    var renderedH = img.naturalHeight * fit;

    var posY = 0.5;
    var parts = String(style.objectPosition || "").replace(/^\s+|\s+$/g, "").split(/\s+/);
    var yToken = parts[1] || parts[0];
    if (yToken === "top") posY = 0;
    else if (yToken === "bottom") posY = 1;
    else if (yToken && yToken.charAt(yToken.length - 1) === "%") {
      posY = parseFloat(yToken) / 100;
    }
    if (!isFinite(posY)) posY = 0.5;

    return contentTop + (contentH - renderedH) * posY + renderedH;
  }

  function measureContentShift(root, titleGap, appliedShift) {
    var image = root.querySelector("[data-morph-pin-image]");
    var title = root.querySelector("[data-morph-pin-content] [data-section-title]");
    if (!image || !title) return null;
    var naturalTop = title.getBoundingClientRect().top - appliedShift;
    return visualImageBottom(image) + titleGap - naturalTop;
  }

  /* Hình học cố định (đo 1 lần) → content-shift tính liên tục, như hook React. */
  function measureGeometry(root, track, appliedShift) {
    var pin = root.querySelector("[data-morph-pin-pin]");
    var image = root.querySelector("[data-morph-pin-image]");
    var title = root.querySelector("[data-morph-pin-content] [data-section-title]");
    if (!pin || !image || !title) return null;
    var imageRect = image.getBoundingClientRect();
    var scale = image.offsetHeight > 0 ? imageRect.height / image.offsetHeight : 1;
    if (!(scale > 0)) return null;
    return {
      imageTopInPin: imageRect.top - pin.getBoundingClientRect().top,
      photoBottomUnscaled: (visualImageBottom(image) - imageRect.top) / scale,
      titleFromTrackBottom:
        title.getBoundingClientRect().top - appliedShift - track.getBoundingClientRect().bottom
    };
  }

  function bindRoot(root) {
    if (root.getAttribute("data-morph-pin-bound")) return;
    var track = root.querySelector("[data-morph-pin-track]");
    if (!track) return;
    root.setAttribute("data-morph-pin-bound", "native");

    var imageEls = root.querySelectorAll("[data-morph-pin-image]");
    var contentEls = root.querySelectorAll("[data-morph-pin-content]");
    var logoEl = root.querySelector("[data-logo-component]");
    var isBrandBreak = root.hasAttribute("data-brand-break");
    var isHero = root.hasAttribute("data-about-hero-morph");
    var tokens = null;
    var coarse = false;
    var stableHeight = 0;
    var lastVvh = 0;
    var touching = false;
    var frozenTop = null;
    var frozenShrink = null;
    var frozenShift = null;
    var targetShift = null;
    var lastMeasure = { shrink: -1, align: -1 };
    var shift = 0;
    var frame = 0;
    var stopped = false;
    var header = 0;
    var geometry = null;

    /* Token CSS + viewport ổn định: đọc 1 lần, đọc lại khi resize/xoay —
       không đọc mỗi frame cuộn (tránh ép style/layout, giật trên mobile). */
    function readTokens() {
      var styles = window.getComputedStyle(root);
      tokens = {
        vvhSlack: Math.max(1, parseNum(styles, "--morph-pin-vvh-slack", 48)),
        letterRatio: Math.max(0, parseNum(styles, "--morph-pin-letter-ratio", 0)),
        letterPx: parseNum(styles, "--brand-break-letter-px", 200),
        letterMin: parseNum(styles, "--brand-break-letter-ratio-min", 0.16),
        letterMax: parseNum(styles, "--brand-break-letter-ratio-max", 0.28),
        imageRatio: positive(parseNum(styles, "--morph-pin-image-ratio", 1), 1),
        shrinkSpeed: positive(parseNum(styles, "--morph-pin-shrink-speed", 1.2), 1.2),
        topSpeed: positive(parseNum(styles, "--morph-pin-top-speed", 0.8), 0.8),
        alignSpeed: positive(parseNum(styles, "--morph-pin-align-speed", 1.2), 1.2),
        titleGap: parseNum(styles, "--morph-pin-title-gap", 0),
        endScale: parseNum(styles, "--morph-pin-image-end-scale", 0.6),
        enterRatio: positive(parseNum(styles, "--brand-break-enter-ratio", 0.14), 0.14),
        enterStagger: parseNum(styles, "--brand-break-enter-stagger", 0.12),
        enterFinish: parseNum(styles, "--brand-break-enter-finish", 1),
        exitStagger: parseNum(styles, "--brand-break-exit-stagger", 0.1),
        exitFinish: parseNum(styles, "--brand-break-exit-finish", 1)
      };
      coarse = isCoarse();
      stableHeight = coarse ? stableViewportHeight() : 0;
      header = headerOffset();
      geometry = null;
    }

    function revealPartner(logoRest) {
      if (!isBrandBreak || !logoRest) return;
      var partner = root.querySelector("[data-content-partner]");
      if (!partner) return;
      if (partner.getAttribute("data-content-partner-animate") === "in") return;
      if (partner.getBoundingClientRect().top < window.innerHeight * 0.95) {
        partner.setAttribute("data-content-partner-animate", "in");
      }
    }

    function sync() {
      if (stopped) return;
      if (root.getAttribute("data-morph-pin-bound") === "react") {
        stop();
        return;
      }
      if (!tokens) readTokens();

      var rawHeight = coarse
        ? stableHeight
        : (window.visualViewport && window.visualViewport.height) || window.innerHeight;
      var vvh = Math.max(0, rawHeight - header);
      if (vvh <= 0) return;
      if (lastVvh > 0 && (touching || Math.abs(vvh - lastVvh) < tokens.vvhSlack)) {
        vvh = lastVvh;
      }
      if (lastVvh > 0 && vvh !== lastVvh) {
        frozenShift = null;
        targetShift = null;
        lastMeasure = { shrink: -1, align: -1 };
        geometry = null;
      }
      lastVvh = vvh;

      var letterRatio = tokens.letterRatio;
      if (letterRatio > 0 && isBrandBreak) {
        letterRatio = Math.min(
          tokens.letterMax,
          Math.max(tokens.letterMin, tokens.letterPx / vvh)
        );
        setVar(root, "--morph-pin-letter-ratio-used", String(letterRatio));
      }
      var enterDist = isBrandBreak ? vvh * tokens.enterRatio : 0;
      var letterDist = vvh * letterRatio;
      var imageDist = vvh * tokens.imageRatio;
      var alignUnstick = enterDist + letterDist + imageDist / tokens.alignSpeed;

      var trackRect = track.getBoundingClientRect();
      var scrollTop = Math.max(0, header - trackRect.top);
      if (coarse && geometry === null) {
        geometry = measureGeometry(root, track, shift);
      }
      var pEnter = enterDist > 0 ? clamp01(scrollTop / enterDist) : 1;
      var morphTop = Math.max(0, scrollTop - enterDist);
      var pLetter = letterDist > 0 ? clamp01(morphTop / letterDist) : 1;
      var lettersOut = pLetter >= 1;
      var pImage =
        lettersOut && imageDist > 0 ? clamp01((morphTop - letterDist) / imageDist) : 0;
      var pShrink = lettersOut ? clamp01(pImage * tokens.shrinkSpeed) : 0;
      var pTop = lettersOut ? clamp01(pImage * tokens.topSpeed) : 0;
      var pAlign = lettersOut ? clamp01(pImage * tokens.alignSpeed) : 0;
      var shrinkDone = lettersOut && pShrink >= 1;
      var titleArrived = lettersOut && pAlign >= 1;

      if (shrinkDone || titleArrived) {
        if (frozenTop === null) frozenTop = pTop;
        if (frozenShrink === null) frozenShrink = pShrink;
        pTop = frozenTop;
        pShrink = frozenShrink;
      } else {
        frozenTop = null;
        frozenShrink = null;
      }
      if (!titleArrived) frozenShift = null;
      if (!lettersOut) {
        targetShift = null;
        lastMeasure = { shrink: -1, align: -1 };
      }

      var phase = "letter";
      if (titleArrived) phase = "flow";
      else if (shrinkDone) phase = "pin";
      else if (lettersOut) phase = "image";
      if (root.getAttribute("data-morph-pin-phase") !== phase) {
        root.setAttribute("data-morph-pin-phase", phase);
      }

      var vw = viewportWidth();
      var endScale = tokens.endScale;
      if (isHero) {
        if (vw >= 768) {
          endScale = Math.min(0.6, 640.8 / vw);
          setVar(root, "--morph-pin-image-end-scale", String(endScale));
        } else if (root.style.getPropertyValue("--morph-pin-image-end-scale")) {
          root.style.removeProperty("--morph-pin-image-end-scale");
        }
      }

      setVar(root, "--morph-pin-vvh", vvh + "px");
      setVar(root, "--morph-pin-collapse", alignUnstick + "px");
      /* Biến đổi mỗi frame ghi lên phần tử dùng nó, không lên gốc (tránh tính
         lại style cả cây con mỗi frame). */
      var e;
      for (e = 0; e < imageEls.length; e++) {
        setVar(imageEls[e], "--morph-pin-p-image", String(pImage));
        setVar(imageEls[e], "--morph-pin-p-shrink", String(pShrink));
        setVar(imageEls[e], "--morph-pin-p-top", String(pTop));
      }

      var i;
      if (letterRatio > 0 && logoEl) {
        setVar(logoEl, "--morph-pin-letter-x", px(-pLetter * vw));
        for (i = 0; i < BLOCK_IDS.length; i++) {
          setVar(
            logoEl,
            "--morph-pin-letter-x-" + BLOCK_IDS[i],
            px(-stagger(pLetter, i, tokens.exitStagger, tokens.exitFinish) * vw)
          );
        }
      } else if (logoEl) {
        setVar(logoEl, "--morph-pin-letter-x", "0px");
      }

      var logoRest = true;
      if (isBrandBreak) {
        for (i = 0; logoEl && i < BLOCK_IDS.length; i++) {
          setVar(
            logoEl,
            "--morph-pin-enter-x-" + BLOCK_IDS[i],
            px((1 - stagger(pEnter, i, tokens.enterStagger, tokens.enterFinish)) * vw)
          );
        }
        logoRest = pEnter >= 1;
        var nextLogo = logoRest ? "rest" : "waiting";
        if (root.getAttribute("data-brand-break-logo") !== nextLogo) {
          root.setAttribute("data-brand-break-logo", nextLogo);
          root.setAttribute("data-brand-break-animate", logoRest ? "in" : "out");
        }
      }

      var contentShift = 0;
      if (lettersOut && coarse && geometry) {
        var scale = 1 - pShrink * (1 - endScale);
        var pinTop = Math.min(Math.max(trackRect.top, header), trackRect.bottom - vvh);
        var target =
          pinTop +
          geometry.imageTopInPin +
          scale * geometry.photoBottomUnscaled +
          tokens.titleGap -
          (trackRect.bottom + geometry.titleFromTrackBottom);
        targetShift = target;
        if (titleArrived) {
          if (frozenShift === null) frozenShift = target;
          contentShift = frozenShift;
        } else {
          contentShift = pAlign * target;
        }
      } else if (lettersOut) {
        if (touching) {
          contentShift = shift;
        } else if (titleArrived) {
          if (frozenShift === null) {
            var measuredFlow = measureContentShift(root, tokens.titleGap, shift);
            frozenShift =
              measuredFlow !== null ? measuredFlow : targetShift !== null ? targetShift : shift;
            if (measuredFlow !== null) targetShift = measuredFlow;
          }
          contentShift = frozenShift;
        } else {
          var threshold = 0.02;
          var moved =
            Math.abs(pShrink - lastMeasure.shrink) > threshold ||
            Math.abs(pAlign - lastMeasure.align) > threshold;
          var needMeasure =
            targetShift === null ||
            (!shrinkDone && moved) ||
            (shrinkDone && lastMeasure.shrink < 1 && moved);
          if (needMeasure) {
            var measured = measureContentShift(root, tokens.titleGap, shift);
            if (measured !== null) {
              targetShift = measured;
              lastMeasure = { shrink: pShrink, align: pAlign };
            }
          }
          if (targetShift !== null) contentShift = pAlign * targetShift;
        }
      }
      shift = contentShift;
      for (e = 0; e < contentEls.length; e++) {
        setVar(contentEls[e], "--morph-pin-content-shift", contentShift + "px");
      }

      revealPartner(logoRest);
    }

    function schedule() {
      if (frame || stopped) return;
      frame = window.requestAnimationFrame(function () {
        frame = 0;
        sync();
      });
    }

    function onResize() {
      tokens = null;
      schedule();
    }

    function invalidateGeometry() {
      geometry = null;
      schedule();
    }

    function onTouchStart() {
      touching = true;
    }

    function onTouchEnd() {
      touching = false;
      schedule();
    }

    var img = root.querySelector("[data-morph-pin-image] img");
    var passive = { passive: true };

    function stop() {
      stopped = true;
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, passive);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", onResize);
      }
      document.removeEventListener("touchstart", onTouchStart, passive);
      document.removeEventListener("touchend", onTouchEnd, passive);
      document.removeEventListener("touchcancel", onTouchEnd, passive);
      if (img) img.removeEventListener("load", invalidateGeometry);
    }

    window.addEventListener("scroll", schedule, passive);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onResize);
    }
    document.addEventListener("touchstart", onTouchStart, passive);
    document.addEventListener("touchend", onTouchEnd, passive);
    document.addEventListener("touchcancel", onTouchEnd, passive);
    if (img) img.addEventListener("load", invalidateGeometry);

    sync();
  }

  /* Moving letters (ml2/ml7/ml9/ml11/ml16) ẩn chữ tới khi React set
     data-mlN-play. React chết → tiêu đề ẩn vĩnh viễn. Chỉ bật sau khoảng chờ
     và khi chắc chắn React không chạy — tránh giành attribute với React. */
  var LETTER_CLASSES = ["ml2", "ml7", "ml9", "ml11", "ml16"];
  var lettersActive = false;

  function playVisibleLetters() {
    if (reactAlive()) return;
    var limit = window.innerHeight * 0.95;
    for (var c = 0; c < LETTER_CLASSES.length; c++) {
      var name = LETTER_CLASSES[c];
      var nodes = document.querySelectorAll("." + name + ":not([data-" + name + "-play])");
      for (var n = 0; n < nodes.length; n++) {
        var rect = nodes[n].getBoundingClientRect();
        if (rect.top < limit && rect.bottom > 0) {
          nodes[n].setAttribute("data-" + name + "-play", "");
        }
      }
    }
  }

  function startLettersFallback() {
    if (lettersActive || reactAlive()) return;
    lettersActive = true;
    var pending = 0;
    var onScroll = function () {
      if (pending) return;
      pending = window.requestAnimationFrame(function () {
        pending = 0;
        playVisibleLetters();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    playVisibleLetters();
  }

  function scan() {
    if (reactAlive()) return;
    var nodes = document.querySelectorAll("[data-morph-pin]");
    for (var i = 0; i < nodes.length; i++) bindRoot(nodes[i]);
  }

  function init() {
    if (reactAlive()) return;
    scan();
    startLettersFallback();
    if (window.MutationObserver) {
      var observer = new MutationObserver(function () {
        if (reactAlive()) {
          observer.disconnect();
          return;
        }
        scan();
      });
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  }

  function scheduleInit() {
    window.setTimeout(init, START_DELAY_MS);
  }

  if (document.readyState === "complete") {
    scheduleInit();
  } else {
    window.addEventListener("load", scheduleInit);
  }
})();
