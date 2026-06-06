# Reference: recreating the live-coding app from the recordings

This documents what was reverse-engineered from the two screen-recordings (a Zoom
training session of a professional cricket live-coding tool) and how it maps onto
this project. Source clips:

- `WhatsApp Video 2026-05-25 at 00.00.14.mp4` (~29.8 min) — feature walkthrough of
  the in-game modals and the **Match Events** module.
- `rec.mp4` (~39.5 min) — live scoring plus the **Scorecard / Match Report** and
  **Over Comparison** views.

Both are 1590×768. Frames were sampled every ~2s and audio transcribed
(`transcript-whatsapp.txt`, `transcript-rec.txt`). The match is **Canada (CANA) vs
Oman (OMN)**.

## Confirmed workflow (from audio + frames)

> "Start the ball first … then I start capturing … capture the ball video."

Per delivery the scorer:
1. Presses **Start Ball**, then **Start Capture** (records the clip).
2. Selects the **bowl type** (left grid) and **shot type** (right grid).
3. Clicks the **pitch map** to drop the ball-landing dot.
4. Clicks the **field map** to draw the wagon-wheel line (shot direction).
5. Enters runs / extras on the **keypad** → the ball is logged, score/over/run-rate
   update, strike rotates on odd runs, and the over completes after 6 legal balls.

## Main scoring screen — dynamic behaviour

- **Fast / Spin** toggle swaps the bowl-type grid:
  - Fast: Inswinger, OutSwinger, Straight Ball, Angled In/Across, Bouncer, Nip
    Backer, Nipped Away, Slow Bouncer, Full Toss, Slower Ball, Yorker, Off/Leg
    Cutter, Cross Seam.
  - Spin: Off Spin, Doosra, Faster One, Leg Spin, Googly, Flipper, Orthodox,
    Chinaman, Arm Ball, Straighter One, Full Toss, No turn, Wrong One, Top Spin,
    Carrom Ball.
- **Aggressive / Defensive** toggle swaps the shot grid:
  - Aggressive: Cover/Square/Straight/Off/On Drive, Flick, Cut, Pull, Slash, Sweep,
    Slog Sweep, Slog Shot, Lofted Off/On/Over Cover.
  - Defensive: Forward/Backfoot/Soft Hand Defence, Glide, Left Alone, Push, No Shot,
    Late Cut, Ducked, Leg Glance, Steer, Worked.
- Keypad: `1 B4 NB / 2 B6 WD / 3 [MARK FOR EDIT] LB / ▲ RBW B`, plus **OVER THROW**.
- Header buttons: **UMPIRE 1/2**, **OVER COMPARISION**, **BOWLING COMPUTE**,
  **MATCH REPORT**.

## Modules / popups reproduced

| Screen | Notes |
| --- | --- |
| **Appeals** | Appeal against / type / bowler / fielder; OUT · NOT OUT · UMPIRES CALL · DRS. |
| **Fielding Events** | Two-column menu: fielder names + event (Caught, Direct Hit, Run Out Made, Stumping, …). |
| **Remarks** | Type + free-text remark. |
| **Wickets** | Dismissal pills (Bowled, Caught, LBW, Run Out, Stumped, …) + batsman/fielder/bowler. |
| **Match Report / Scorecard** | Batting table (How Out, R, B, S/R, 1's/2's/3's, B4/B6, DB, RSS, DB%), Extras, Fall of Wickets, Bowling table. |
| **Over Comparison** | Over-by-over: 1st/2nd innings bowler, score, runs, RR, RR/5, Rate/Runs Req, Balls Rem. |
| **Bowling Compute** | Per-bowler overs/runs/wkts/econ/avg speed. |
| **Match Events** (full-screen, left nav) | Breaks, Other Wickets, Power Play, Revised Overs, Revised Target, Penalty, End Session, End Innings, End Day, Declare Innings, Follow On, Match Results, Match Info Edit, Batsman In/Out Time, Ball Change, Video Count Validation, Movie Organiser. |

### Match Events sub-screens with detailed forms
- **Breaks** — start/end date-time, duration, comments, "include in players' minutes" Yes/No, table.
- **Other Wickets** — Mankading / Absent Hurt / Timed Out / Retired Hurt / Retired Out + player + Browse Video.
- **Penalty** — Batting/Bowling + reasons checklist (Save / Clear).
- **Ball Change** — New / Semi New / Second New / Old Ball + remarks.
- **Match Results** — result type, MoM/MoS, best batsman/bowler/all-rounder/MVP, team points (Done / Revert).
- **Movie Organiser** — innings ball table with column filters + clip trimmer (Trim IN / Trim OUT).

## Implementation in this repo
- `src/index.html` — scoring screen markup with element ids + overlay root.
- `src/renderer.js` — scoring engine, grid swapping, pitch/field SVG interaction,
  ball logging + over/strike logic, and the overlay/modal system.
- `src/styles.css` — base styling + the overlay/modal/chip styles (appended).
- Deep-link: `index.html?open=<appeals|fielding|remarks|wickets|matchevents|scorecard|overcomp|bowlcompute>`
  opens an overlay directly (handy for review/testing).
