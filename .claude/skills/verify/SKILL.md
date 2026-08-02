---
name: verify
description: Build/launch/drive recipe for verifying changes to the CRICPRO Electron app at its GUI surface.
---

# Verifying CRICPRO changes

Electron app, no build step — `src/` is loaded directly, so edits are live on relaunch.

## Launch with a CDP handle

```bash
npx electron . --remote-debugging-port=9333 &   # opens home.html
curl -s http://127.0.0.1:9333/json/list          # find the page target + ws URL
```

Node ≥22 has a global `WebSocket`; a ~40-line script can drive the page over CDP
(`Runtime.evaluate` with `awaitPromise`/`returnByValue`, `Page.navigate`,
`Page.captureScreenshot`). No Playwright needed.

## Driving the coding screen

- The coding screen is `src/index.html`; navigate the window straight to
  `file:///…/src/index.html` (it works standalone with the CANA/OMN defaults).
- It boots with whatever match state was last saved. For deterministic runs, reset
  in-page first: zero out `state.log/over/ball/runs/wkts/thisOver/overStarted/ballStarted`
  then call `render()`.
- Score a ball through the real controls: `#btn-over` (Start Over), then per ball
  `#btn-ball` (Start Ball) → click a keypad key in `#keypad` → `#btn-ball` (End Ball).
  Keypad keys are matched by label (`.kb-label` span for B4/B6/Wicket/?, else textContent).
- Wicket: keypad "Wicket" opens an overlay — click a `[data-dismiss]` pill, then
  `#wkt-save`, then End Ball.
- Wagon wheel: dispatch mouse events on `#field-map-wrap`; mouseup goes on `window`.
  Right-click = `contextmenu` event. Menus are `#context-menu` / `#context-submenu`
  / `#context-submenu2`.

## Gotchas

- **Scoring persists.** Dev DB is the repo's `data/cricket.sqlite` (userData only when
  packaged) and `scheduleSave` writes the driven state into it — expect the sqlite file
  to show modified after a verification run. Driving a match **overwrites that match's
  saved `match_state` row**; drive a throwaway match if the existing progress matters.
- **The DB is in WAL mode**, so `data/cricket.sqlite` alone is not the whole database —
  recent writes live in `cricket.sqlite-wal`. Copying just the main file makes a backup
  that silently omits them, and restoring just the main file leaves the newer WAL in
  place (so the "restore" reads back as the driven state). Back up all three
  (`.sqlite`, `-wal`, `-shm`) together, or run
  `sqlite3 data/cricket.sqlite "pragma wal_checkpoint(TRUNCATE);"` first and copy the
  single file.
- `stageRun` stages `ext:0, legal:true`, so clicking a run key after NB/WD replaces the
  extra rather than combining (runs on a no-ball go in via the ball-edit overlay).
- Kill with `pkill -f "electron .*cricket-analysis-pro"`.
