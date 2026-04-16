# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start        # dev server at http://localhost:5173 (alias for `npm run dev`)
npm run build    # production build into dist/
npm run lint     # ESLint
```

No test suite exists yet.

## What This App Does

Client-side React app that visualizes Spotify Extended Streaming History. The user drag-drops their `Streaming_History_Audio_*.json` files; everything is parsed and computed in the browser — no backend, no API calls.

## Architecture

### Data flow (read this first)

All processing happens exactly once in **`src/utils/dataProcessor.js`** → `processData(rawEntries[])`. It returns a single large object that every component reads via a `data` prop. Components never recompute — they only destructure from `data`.

`App.jsx` owns the state machine: no data → `<DataLoader>` → loading spinner → tab dashboard. The `data` object is passed down to whichever tab component is active.

### Critical invariants

**`parseTS(ts)`** — the only safe way to parse Spotify timestamps. Spotify files use two formats: `"YYYY-MM-DD HH:MM:SS"` and `"YYYY-MM-DDTHH:MM:SSZ"`. The function normalizes both. Never use `new Date(ts + 'Z')` directly — if `ts` already ends with `Z` this produces `...ZZ` → Invalid Date → silent data loss.

**All times are UTC.** Use `.getUTCHours()`, `.getUTCDay()`, `.getUTCFullYear()` everywhere. Never use local-time equivalents.

**`SearchSection.jsx`** has its own copy of this logic as `tsToDate()` — keep them in sync if `parseTS` changes.

### Adding a new stat or chart

1. Add the aggregation to `processData()` in `dataProcessor.js` and include it in the returned object.
2. Destructure it in the relevant tab component — do not compute inside a component.
3. Use `<Card>`, `<RankList>`, `<StatNumber>` from `Card.jsx` for consistent styling.
4. Use `tooltipStyle` from `Card.jsx` for custom Recharts tooltips.
5. Wrap all charts in `<ResponsiveContainer>`.

### Data shape key points

- **Music entries**: `master_metadata_track_name != null`
- **Podcast entries**: `episode_name != null`
- **30-second filter**: entries with `ms_played < 30000` are excluded everywhere
- **Old-format support**: legacy files use `endTime`/`msPlayed`/`artistName` — `normalizeEntry()` remaps these before any processing

### Styling convention

Inline `style={{}}` for component-specific styles. Tailwind utility classes for layout only. Spotify palette: `#191414` bg, `#121212` header, `#282828` cards, `#1DB954` green, `#B3B3B3` subtext. Color array for multi-series charts: `COLORS` exported from `Card.jsx`.
