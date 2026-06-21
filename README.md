# Limitless — Command Centre (app)

The single-frontend PWA for [[Projects/limitless-25/STATUS]]. Vanilla HTML/CSS/JS, local-first, no build step. WayneTech FUI skin (see [[Projects/limitless-command-centre/VISUAL-DIRECTION]]).

## Files
| File | Role |
|---|---|
| `index.html` | shell — fonts, Tabler icons, mounts `#app` |
| `styles.css` | the FUI skin; mobile-first, desktop grid at ≥820px |
| `store.js` | **the only data layer** — localStorage, model v2, get/set/export/import |
| `app.js` | config (pillars/why/weeks), computed values, render + tick logic, view switching |
| `manifest.json` · `sw.js` · `icon.svg` | PWA install + offline shell |

## Run locally
Any static server from this folder. Examples:
```
python -m http.server 8765        # then open http://localhost:8765
npx serve .
```
(The repo's `.claude/launch.json` has a `command-centre` config that does exactly this.)

## Data model (v2)
One JSON object in `localStorage` under `limitless25`. **4 pillars × 4 horizons** — full contract in [[Projects/limitless-command-centre/BUILD-BRIEF]]. Days are created lazily on first tick. Everything (streaks, fills, heatmap) is derived, not stored.

## Decisions baked in (adjustable)
- **Streak = overall day score** (a day is "held" when ≥60% of all pillar taps are done). Per-pillar streaks are a small change if wanted.
- **Body has 6 taps**; quality is a 1–5 rating that does not count toward the fill.
- **Skill label** is set manually (tap `THIS WK: …`).
- **Day N / week / progress** computed from `startDate` (2026-06-18) vs the real date.

## Deploy (GitHub Pages — mirrors ShopOS)
1. Push this `app/` folder to a repo (or a `docs/` folder).
2. Settings → Pages → deploy from branch.
3. Open the HTTPS URL on phone → "Add to Home Screen" to install the PWA.

## Sync (future)
`store.js` is the single swap point. To add cross-device sync, replace its `load`/`save` with a backend (Supabase/Firebase free tier, or a JSON blob in a private repo) — the UI never changes. Until then: **Export** downloads JSON, **Import** loads it back to carry state between phone and PC.

## TODO before ship
- Export PNG icons (192/512) from `icon.svg` for broader install support.
- Decide per-pillar vs global streak.
- Wire the real Health checkup status if desired.
