/* ES5 — không qua bundle Next (cùng lý do với morph-pin.js).
   Tương tác cho marquee partner (dải logo tự chạy bằng CSS animation):
   - Chạm/giữ (touch) hoặc hover chuột → đứng yên.
   - Vuốt/kéo ngang → dải logo đi theo tay; thả ra: touch chờ 1,5s rồi chạy
     tiếp, chuột chạy tiếp khi rời khỏi carousel.
   Trước đây logic này là hook React → trên điện thoại React chưa/không hydrate
   (đặc biệt `next dev` qua LAN) thì không có handler nào: giữ không dừng, vuốt
   không theo tay. File tĩnh chạy độc lập với React nên luôn hoạt động.
   Kéo = tua currentTime của chính CSS animation (Web Animations API), quy về
   [0, duration) → vòng lặp liền mạch. `touch-action: pan-y` (CSS) giữ cuộn dọc. */
(function () {
  var SELECTOR = "[data-partners-scroll]";
  var ANIMATION = "partners-marquee";
  var TOUCH_RESUME_DELAY_MS = 1500;
  /* Di chuyển quá ngưỡng mới tính là kéo — dưới ngưỡng là chạm/click (mở link). */
  var DRAG_THRESHOLD_PX = 6;
  /* Sau khi kéo: chặn click kế tiếp (tránh vuốt xong lại mở tab). */
  var CLICK_SUPPRESS_MS = 400;

  function findAnimation(track) {
    if (!track || typeof track.getAnimations !== "function") return null;
    var list = track.getAnimations();
    for (var i = 0; i < list.length; i++) {
      if (list[i].animationName === ANIMATION) return list[i];
    }
    return null;
  }

  function reducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function bind(viewport) {
    if (viewport.getAttribute("data-marquee-bound")) return;
    var track = viewport.querySelector(".partners-marquee__track");
    if (!track) return;
    viewport.setAttribute("data-marquee-bound", "");

    var hovered = false;
    var focused = false;
    /* pressed: đang chạm/giữ chuột; dragging: đã vượt ngưỡng, đang kéo. */
    var pressed = false;
    var dragging = false;
    var suppressClickUntil = 0;
    var pointerId = null;
    var startX = 0;
    var startTime = 0;
    var halfWidth = 1;
    var duration = 1;
    var resumeTimer = 0;

    function clearResume() {
      if (resumeTimer) {
        window.clearTimeout(resumeTimer);
        resumeTimer = 0;
      }
    }

    function pause() {
      clearResume();
      var anim = findAnimation(track);
      if (anim) anim.pause();
    }

    function play() {
      clearResume();
      if (hovered || focused || pressed || reducedMotion()) return;
      var anim = findAnimation(track);
      if (anim) anim.play();
    }

    function onEnter(event) {
      if (event.pointerType !== "mouse") return;
      hovered = true;
      pause();
    }

    function onLeave(event) {
      if (event.pointerType !== "mouse") return;
      hovered = false;
      if (!pressed) play();
    }

    function onDown(event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      var anim = findAnimation(track);
      if (!anim) return;
      var timing = anim.effect && anim.effect.getComputedTiming();
      duration = timing && timing.duration > 0 ? timing.duration : 1;
      halfWidth = Math.max(1, track.scrollWidth / 2);
      startTime = Number(anim.currentTime) || 0;
      startX = event.clientX;
      pressed = true;
      dragging = false;
      pointerId = event.pointerId;
      /* Giữ để dừng — nhưng CHƯA capture pointer: capture ngay sẽ khiến click
         rơi vào khung carousel thay vì thẻ <a> → bấm logo không mở link. */
      pause();
    }

    function onMove(event) {
      if (!pressed || event.pointerId !== pointerId) return;
      if (!dragging) {
        if (Math.abs(event.clientX - startX) < DRAG_THRESHOLD_PX) return;
        dragging = true;
        viewport.setAttribute("data-dragging", "");
        try {
          viewport.setPointerCapture(event.pointerId);
        } catch (err) {
          /* pointer đã huỷ */
        }
      }
      var anim = findAnimation(track);
      if (!anim) return;
      /* Kéo sang phải (dx > 0) → dải logo sang phải → lùi thời gian. */
      var dx = event.clientX - startX;
      var raw = startTime - (dx / halfWidth) * duration;
      anim.currentTime = ((raw % duration) + duration) % duration;
    }

    function onEnd(event) {
      if (!pressed || event.pointerId !== pointerId) return;
      if (dragging) suppressClickUntil = Date.now() + CLICK_SUPPRESS_MS;
      pressed = false;
      dragging = false;
      pointerId = null;
      viewport.removeAttribute("data-dragging");
      try {
        if (viewport.hasPointerCapture(event.pointerId)) {
          viewport.releasePointerCapture(event.pointerId);
        }
      } catch (err) {
        /* bỏ qua */
      }
      if (event.pointerType === "mouse") {
        play();
        return;
      }
      clearResume();
      resumeTimer = window.setTimeout(play, TOUCH_RESUME_DELAY_MS);
    }

    viewport.addEventListener("pointerenter", onEnter);
    viewport.addEventListener("pointerleave", onLeave);
    viewport.addEventListener("pointerdown", onDown);
    viewport.addEventListener("pointermove", onMove);
    viewport.addEventListener("pointerup", onEnd);
    viewport.addEventListener("pointercancel", onEnd);
    /* Vừa kéo xong → chặn click (không mở link ngoài ý muốn). */
    viewport.addEventListener(
      "click",
      function (event) {
        if (Date.now() < suppressClickUntil) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true
    );
    /* Chặn kéo-thả link/ảnh mặc định của trình duyệt (desktop). */
    viewport.addEventListener("dragstart", function (event) {
      event.preventDefault();
    });
    /* Tab bàn phím tới logo có link → dừng để đọc/bấm được. */
    viewport.addEventListener("focusin", function () {
      focused = true;
      pause();
    });
    viewport.addEventListener("focusout", function (event) {
      if (event.relatedTarget && viewport.contains(event.relatedTarget)) return;
      focused = false;
      play();
    });
    /* iOS: chặn menu giữ-lâu trên ảnh logo khi đang giữ để dừng. */
    viewport.addEventListener("contextmenu", function (event) {
      event.preventDefault();
    });
  }

  function scan() {
    var nodes = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < nodes.length; i++) bind(nodes[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan);
  } else {
    scan();
  }

  /* Điều hướng client-side (Next Link) chèn trang mới → bind lại. */
  if (window.MutationObserver) {
    var pending = 0;
    new MutationObserver(function () {
      if (pending) return;
      pending = window.setTimeout(function () {
        pending = 0;
        scan();
      }, 100);
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
