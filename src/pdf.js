/*
 * Report → PDF rendering.
 *
 * The renderer hands over the report's markup; we wrap it in a standalone
 * document that links the app's own stylesheets (via a <base> pointing at
 * src/, so those and every asset URL still resolve from a temp file), lay it
 * out in a hidden window and print that to PDF. Printing an off-screen copy
 * rather than the live page means the PDF holds the whole report instead of
 * the slice that fits the viewport.
 */
const path = require("path");
const fs = require("fs");
const os = require("os");
const url = require("url");

function buildDocument(html, title) {
  const base = url.pathToFileURL(path.join(__dirname) + path.sep).href;
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
    <base href="${base}" />
    <title>${String(title || "Report").replace(/[<&]/g, "")}</title>
    <link rel="stylesheet" href="fonts.css" />
    <link rel="stylesheet" href="legacy.css" />
    <style>
      html, body { background: #0b1523; margin: 0; padding: 0; min-height: 0 !important; }
      body { width: auto; height: auto; transform: none; container-type: normal; }
      .pdf-wrap { padding: 18px 22px; }
      /* never split a table, chart or panel across a page break */
      .rep-scroll, .rep-panel, .pp-chart, .pp-quad, .pp-wheel, .rep-cm-over,
      .pp-tile, .rep-sc-panels { break-inside: avoid; page-break-inside: avoid; }
      /* on screen these scroll inside fixed boxes; on paper they must open up */
      .rep-scroll, .report-content, .pp-quads, .pp-wheels { overflow: visible !important; height: auto !important; }
      .rep-table thead th { position: static; }
      /* controls that only mean something on screen */
      .rep-exp, .report-groupbar, .report-pager, .pp-wtoggle, .rep-circle-toggle { display: none !important; }
    </style></head>
    <body class="cap-bg"><div class="pdf-wrap">${html}</div></body></html>`;
}

// Render `html` to a PDF buffer in a hidden window. `BrowserWindow` is passed
// in so this module stays free of a hard electron dependency at require time.
async function renderPdfBuffer(BrowserWindow, html, title, opts = {}) {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "cricpdf-"));
  const tmpFile = path.join(tmpDir, "report.html");
  await fs.promises.writeFile(tmpFile, buildDocument(html, title), "utf8");

  const win = new BrowserWindow({
    show: false,
    width: 1400,
    height: 1000,
    webPreferences: { javascript: false },
  });
  try {
    await win.loadFile(tmpFile);
    await new Promise((r) => setTimeout(r, 350)); // let webfonts / inline SVG settle
    return await win.webContents.printToPDF({
      printBackground: true,
      landscape: true,
      pageSize: "A4",
      margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
      ...opts,
    });
  } finally {
    win.destroy();
    try { await fs.promises.rm(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

module.exports = { buildDocument, renderPdfBuffer };
