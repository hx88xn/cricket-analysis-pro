/*
 * Scale-to-fit: render the 1920x1080 design centred and uniformly scaled to the
 * current window, so the UI looks identical on any DPI / aspect ratio.
 * Pairs with stage.css (which fixes <body> at 1920x1080).
 */
(function () {
  var DESIGN_W = 1920;
  var DESIGN_H = 1080;

  // Current transform, kept up to date by fit(). Used to convert window-space
  // coordinates (e.g. a mouse event) into the body's design space, which is
  // what code that appends fixed-position overlays to <body> needs.
  var state = { scale: 1, offsetX: 0, offsetY: 0 };

  // Map a window/viewport point to design-space px inside the scaled body.
  window.stageFromWindow = function (x, y) {
    return {
      x: (x - state.offsetX) / state.scale,
      y: (y - state.offsetY) / state.scale,
    };
  };

  function fit() {
    if (!document.body) return;
    var w = window.innerWidth;
    var h = window.innerHeight;
    // Uniform scale chosen so the 1920-wide design exactly fills the window
    // width — no horizontal squish, no letterbox bars.
    var scale = w / DESIGN_W;
    // Grow the design canvas vertically to exactly fill the window height, so
    // there is no black bar above/below. Never shorter than the 1080 design
    // height, so on very wide/short windows the layout keeps its intended size
    // (the bottom simply clips rather than crushing the layout).
    var canvasH = Math.max(DESIGN_H, h / scale);
    document.body.style.height = canvasH + "px";
    state.scale = scale;
    state.offsetX = 0;
    state.offsetY = 0;
    document.body.style.transform = "scale(" + scale + ")";
    // Reveal once the very first scale is applied so the unscaled frame is
    // never shown (paired with `html { visibility: hidden }` in stage.css).
    document.documentElement.style.visibility = "visible";
  }

  window.addEventListener("resize", fit);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fit);
  } else {
    fit();
  }
  // Run once more after fonts/layout settle so the first paint is correct.
  window.addEventListener("load", fit);
  // Safety: never leave the UI permanently hidden if something above failed.
  setTimeout(function () {
    document.documentElement.style.visibility = "visible";
  }, 1500);
})();
