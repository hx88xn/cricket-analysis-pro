/*
 * Scale-to-fit: render the 1920-wide design centred and uniformly scaled to the
 * current window width, so the UI looks identical on any DPI / aspect ratio.
 * Pairs with stage.css (which fixes <body> to the 1920 design width).
 *
 * The canvas grows vertically to the taller of the 1080 design, the actual
 * content, and the window — and stage.css lets the page scroll — so screens
 * taller than the window (Reports, Match Registration) can be scrolled to
 * instead of being clipped.
 */
(function () {
  var DESIGN_W = 1920;
  var DESIGN_H = 1080;

  // Current transform, kept up to date by fit()/syncScroll(). Used to convert
  // window-space coordinates (e.g. a mouse event) into the body's design space,
  // which is what code that appends fixed-position overlays to <body> needs.
  var state = { scale: 1, offsetX: 0, offsetY: 0 };

  // Map a window/viewport point to design-space px inside the scaled body.
  window.stageFromWindow = function (x, y) {
    return {
      x: (x - state.offsetX) / state.scale,
      y: (y - state.offsetY) / state.scale,
    };
  };

  function scrollTop() {
    return window.scrollY || document.documentElement.scrollTop || 0;
  }

  // The body is the scroll content; when it scrolls up by `scrollTop` window px,
  // the window→design mapping must add that back so overlays opened at a cursor
  // position land in the right place after the page has been scrolled.
  function syncScroll() {
    state.offsetY = -scrollTop();
  }

  function fit() {
    if (!document.body) return;
    var w = window.innerWidth;
    var h = window.innerHeight;
    var scale = w / DESIGN_W;

    // Measure the natural content height (in design px) free of our own height
    // feedback: with `container-type: size` on <body>, height:auto collapses the
    // size-query container so the inner shell's 100cqh min-heights resolve to 0
    // and the body reports just its content's height.
    document.body.style.height = "auto";
    var contentH = document.body.scrollHeight;

    // Grow the design canvas to the tallest of: the 1080 design, the actual
    // content, and the window mapped back into design space (so short pages
    // still fill the window). Anything beyond the window scrolls, not clips.
    var designH = Math.max(DESIGN_H, contentH, Math.ceil(h / scale));
    document.body.style.height = designH + "px";

    state.scale = scale;
    state.offsetX = 0;
    syncScroll();
    document.body.style.transform = "scale(" + scale + ")";

    // Reveal once the very first scale is applied so the unscaled frame is
    // never shown (paired with `html { visibility: hidden }` in stage.css).
    document.documentElement.style.visibility = "visible";
  }

  // Coalesce re-fits to one per frame so the ResizeObserver (whose callback our
  // own height changes can re-trigger) settles on the stable height instead of
  // looping.
  var rafPending = false;
  function scheduleFit() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(function () {
      rafPending = false;
      fit();
    });
  }

  window.addEventListener("resize", scheduleFit);
  window.addEventListener("scroll", syncScroll, { passive: true });
  // Re-fit when the rendered content changes size — screens are swapped in
  // dynamically (prototype.js) and rows are appended live (renderer.js), so the
  // canvas height must be recomputed without those callers knowing about us.
  function observeContent() {
    if (typeof ResizeObserver === "undefined" || !document.body) return;
    var ro = new ResizeObserver(scheduleFit);
    var target = document.body.firstElementChild;
    if (target) ro.observe(target);
  }

  function start() {
    fit();
    observeContent();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
  // Run once more after fonts/layout settle so the first scale is correct.
  window.addEventListener("load", scheduleFit);
  // Safety: never leave the UI permanently hidden if something above failed.
  setTimeout(function () {
    document.documentElement.style.visibility = "visible";
  }, 1500);
})();
