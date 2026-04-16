// ─── Data Processor ────────────────────────────────────────────────────────
// Parses, merges, deduplicates, and pre-computes all aggregations from
// Spotify Extended Streaming History JSON files.
// All heavy lifting happens once at load time; components just read results.

const MIN_MS = 30_000; // ignore plays under 30s

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseTS(ts) {
  if (!ts || typeof ts !== 'string') return null;
  const s = ts.trim();
  // Normalize: space-separator → T, but never double-add Z if already present.
  // Handles: "2022-04-15 14:30:00", "2022-04-15T14:30:00Z", "2022-04-15T14:30:00"
  const withT = s.replace(' ', 'T');
  const iso = withT.endsWith('Z') ? withT : withT + 'Z';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function msToHours(ms) {
  return ms / 3_600_000;
}

function msToMinutes(ms) {
  return ms / 60_000;
}

function workweeks(ms) {
  return ms / (40 * 3_600_000);
}

function topN(map, n = 10, valueKey = 'ms') {
  return [...map.entries()]
    .sort((a, b) => b[1][valueKey] - a[1][valueKey])
    .slice(0, n)
    .map(([key, val]) => ({ name: key, ...val }));
}

// ── Old-format remapper ───────────────────────────────────────────────────────
// Spotify's legacy format uses endTime/msPlayed/artistName/trackName.
// Remap to the Extended Streaming History schema so mixed drops work.
function normalizeEntry(e) {
  if (!e.ts && e.endTime) {
    // endTime is like "2018-04-23 16:10" or "2018-04-23T16:10Z"
    let ts = e.endTime;
    if (ts.includes('T')) ts = ts.replace('T', ' ').replace('Z', '');
    if (ts.length === 16) ts += ':00'; // pad missing seconds
    return {
      ts,
      ms_played: typeof e.msPlayed === 'number' ? e.msPlayed : 0,
      master_metadata_track_name: e.trackName ?? null,
      master_metadata_album_artist_name: e.artistName ?? null,
      master_metadata_album_album_name: null,
      spotify_track_uri: null,
      episode_name: null,
      episode_show_name: null,
      spotify_episode_uri: null,
      platform: e.platform ?? null,
      conn_country: null,
      offline: null,
      shuffle: null,
      skipped: null,
      incognito_mode: null,
      reason_start: null,
      reason_end: null,
      offline_timestamp: null,
      ip_addr_decrypted: null,
      user_agent_decrypted: null,
      username: e.username ?? null,
    };
  }
  return e;
}

// ── Main processor ───────────────────────────────────────────────────────────

export function processData(rawEntries) {
  // 1. Normalize old-format entries, coerce ms_played, filter invalids
  const normalized = rawEntries
    .map(normalizeEntry)
    .map(e => ({ ...e, ms_played: Number(e.ms_played) || 0 }))
    .filter(e => {
      if (!e.ts || typeof e.ts !== 'string') return false;
      if (!isFinite(e.ms_played) || e.ms_played < 0) return false;
      if (!parseTS(e.ts)) return false;
      return true;
    });

  // 2. Deduplicate by ts+track URI combo
  const seen = new Set();
  const entries = [];
  for (const e of normalized) {
    const key = `${e.ts}|${e.spotify_track_uri || e.spotify_episode_uri || e.master_metadata_track_name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(e);
  }

  // 3. Split music vs podcasts; apply 30s filter
  const music = [];
  const podcasts = [];
  for (const e of entries) {
    if (e.ms_played < MIN_MS) continue;
    if (e.master_metadata_track_name != null) {
      music.push(e);
    } else if (e.episode_name != null) {
      podcasts.push(e);
    }
  }

  const allFiltered = [...music, ...podcasts]
    .filter(e => !!parseTS(e.ts))
    .sort((a, b) => parseTS(a.ts) - parseTS(b.ts));

  // ── Global stats ─────────────────────────────────────────────────────────
  const totalMsMusic = music.reduce((s, e) => s + e.ms_played, 0);
  const totalMsPodcast = podcasts.reduce((s, e) => s + e.ms_played, 0);
  const totalMs = totalMsMusic + totalMsPodcast;

  const firstDate = allFiltered.length ? parseTS(allFiltered[0].ts) : null;
  const lastDate = allFiltered.length ? parseTS(allFiltered[allFiltered.length - 1].ts) : null;

  const uniqueArtists = new Set(music.map(e => e.master_metadata_album_artist_name).filter(Boolean));
  const uniqueTracks = new Set(music.map(e => e.spotify_track_uri).filter(Boolean));
  const uniqueAlbums = new Set(music.map(e => e.master_metadata_album_album_name).filter(Boolean));

  // ── All-time top artists / albums / tracks ────────────────────────────────
  const artistMap = new Map(); // name -> {ms, plays}
  const albumMap = new Map();
  const trackMap = new Map(); // uri -> {ms, plays, name, artist, album}

  for (const e of music) {
    const artist = e.master_metadata_album_artist_name;
    const album = e.master_metadata_album_album_name;
    const track = e.master_metadata_track_name;
    const uri = e.spotify_track_uri;

    if (artist) {
      const a = artistMap.get(artist) || { ms: 0, plays: 0 };
      a.ms += e.ms_played; a.plays++;
      artistMap.set(artist, a);
    }
    if (album) {
      const key = `${artist} — ${album}`;
      const a = albumMap.get(key) || { ms: 0, plays: 0, artist, album };
      a.ms += e.ms_played; a.plays++;
      albumMap.set(key, a);
    }
    if (uri) {
      const t = trackMap.get(uri) || { ms: 0, plays: 0, name: track, artist, album };
      t.ms += e.ms_played; t.plays++;
      trackMap.set(uri, t);
    }
  }

  const topArtists = topN(artistMap, 10);
  const topAlbums = topN(albumMap, 10);
  const topTracks = topN(trackMap, 10);

  // ── Per-year stats ────────────────────────────────────────────────────────
  const yearMap = new Map(); // year -> {ms, plays, artistMap, trackMap}

  for (const e of music) {
    const d = parseTS(e.ts);
    if (!d) continue;
    const year = d.getUTCFullYear();
    if (!yearMap.has(year)) {
      yearMap.set(year, { ms: 0, plays: 0, artistMap: new Map(), trackMap: new Map() });
    }
    const y = yearMap.get(year);
    y.ms += e.ms_played;
    y.plays++;

    const artist = e.master_metadata_album_artist_name;
    if (artist) {
      const a = y.artistMap.get(artist) || { ms: 0, plays: 0 };
      a.ms += e.ms_played; a.plays++;
      y.artistMap.set(artist, a);
    }

    const uri = e.spotify_track_uri;
    if (uri) {
      const t = y.trackMap.get(uri) || { ms: 0, plays: 0, name: e.master_metadata_track_name, artist };
      t.ms += e.ms_played; t.plays++;
      y.trackMap.set(uri, t);
    }
  }

  const years = [...yearMap.keys()].sort();

  const yearlyHours = years.map(y => ({
    year: y,
    hours: msToHours(yearMap.get(y).ms),
    plays: yearMap.get(y).plays,
  }));

  const yearlyTop1Artist = years.map(y => {
    const ym = yearMap.get(y);
    const [name, val] = [...ym.artistMap.entries()].sort((a, b) => b[1].ms - a[1].ms)[0] || [];
    return { year: y, artist: name, hours: val ? msToHours(val.ms) : 0 };
  });

  const yearlyTop1Track = years.map(y => {
    const ym = yearMap.get(y);
    const [, val] = [...ym.trackMap.entries()].sort((a, b) => b[1].ms - a[1].ms)[0] || [];
    return { year: y, track: val?.name, artist: val?.artist, plays: val?.plays || 0 };
  });

  // ── Loyalty score ─────────────────────────────────────────────────────────
  const artistYears = new Map(); // artist -> Set of years
  for (const [year, ym] of yearMap) {
    for (const [artist] of ym.artistMap) {
      if (!artistYears.has(artist)) artistYears.set(artist, new Set());
      artistYears.get(artist).add(year);
    }
  }

  const loyaltyScores = [...artistYears.entries()]
    .map(([artist, yrs]) => ({
      artist,
      yearsActive: yrs.size,
      totalMs: artistMap.get(artist)?.ms || 0,
      score: yrs.size * Math.log10(1 + msToHours(artistMap.get(artist)?.ms || 0)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // ── Listening streak ──────────────────────────────────────────────────────
  const playDays = new Set(allFiltered.map(e => e.ts.slice(0, 10)));
  const sortedDays = [...playDays].sort();

  let longestStreak = sortedDays.length > 0 ? 1 : 0;
  let currentStreak = 1;
  let streakStart = sortedDays[0] || null;
  let bestStreakStart = sortedDays[0] || null;
  let bestStreakEnd = sortedDays[0] || null;

  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diff = (curr - prev) / 86_400_000;
    if (diff === 1) {
      currentStreak++;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        bestStreakStart = streakStart;
        bestStreakEnd = sortedDays[i];
      }
    } else {
      currentStreak = 1;
      streakStart = sortedDays[i];
    }
  }

  // ── Most listened single day ──────────────────────────────────────────────
  const dayMs = new Map();
  for (const e of allFiltered) {
    const d = e.ts.slice(0, 10);
    dayMs.set(d, (dayMs.get(d) || 0) + e.ms_played);
  }
  const [bestDay, bestDayMs] = [...dayMs.entries()].sort((a, b) => b[1] - a[1])[0] || [null, 0];

  const bestDayTracks = bestDay
    ? allFiltered
        .filter(e => e.ts.startsWith(bestDay))
        .slice(0, 5)
        .map(e => e.master_metadata_track_name || e.episode_name || 'Unknown')
    : [];

  // ── Monthly time series ───────────────────────────────────────────────────
  const monthMap = new Map();
  for (const e of allFiltered) {
    const m = e.ts.slice(0, 7);
    monthMap.set(m, (monthMap.get(m) || 0) + e.ms_played);
  }
  const monthlySeries = [...monthMap.entries()]
    .sort()
    .map(([month, ms]) => ({ month, hours: msToHours(ms) }));

  // ── Heatmap: day-of-week × hour-of-day ───────────────────────────────────
  const heatmap = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const e of music) {
    const d = parseTS(e.ts);
    if (!d) continue;
    heatmap[d.getUTCDay()][d.getUTCHours()] += msToHours(e.ms_played);
  }

  // ── Platform breakdown over time ──────────────────────────────────────────
  const platformYearMap = new Map();
  for (const e of allFiltered) {
    const d = parseTS(e.ts);
    if (!d) continue;
    const year = d.getUTCFullYear();
    const platform = normalizePlatform(e.platform);
    if (!platformYearMap.has(year)) platformYearMap.set(year, new Map());
    const pm = platformYearMap.get(year);
    pm.set(platform, (pm.get(platform) || 0) + e.ms_played);
  }

  const allPlatforms = new Set();
  for (const [, pm] of platformYearMap) for (const p of pm.keys()) allPlatforms.add(p);

  const platformByYear = years.map(y => {
    const pm = platformYearMap.get(y) || new Map();
    const obj = { year: y };
    for (const p of allPlatforms) obj[p] = msToHours(pm.get(p) || 0);
    return obj;
  });

  // ── Offline ratio ─────────────────────────────────────────────────────────
  const offlineByYear = years.map(y => {
    const yearEntries = allFiltered.filter(e => {
      const d = parseTS(e.ts);
      return d && d.getUTCFullYear() === y;
    });
    const offlineMs = yearEntries.filter(e => e.offline).reduce((s, e) => s + e.ms_played, 0);
    const totalYearMs = yearEntries.reduce((s, e) => s + e.ms_played, 0);
    return {
      year: y,
      offline: totalYearMs ? (offlineMs / totalYearMs) * 100 : 0,
      online: totalYearMs ? ((totalYearMs - offlineMs) / totalYearMs) * 100 : 0,
    };
  });

  // ── Shuffle usage ─────────────────────────────────────────────────────────
  const shuffleByYear = years.map(y => {
    const yearEntries = music.filter(e => {
      const d = parseTS(e.ts);
      return d && d.getUTCFullYear() === y;
    });
    const shuffleCount = yearEntries.filter(e => e.shuffle === true).length;
    const total = yearEntries.length;
    return { year: y, shufflePct: total ? (shuffleCount / total) * 100 : 0 };
  });

  // ── Skip rate by artist ───────────────────────────────────────────────────
  const artistSkipMap = new Map();
  for (const e of music) {
    const artist = e.master_metadata_album_artist_name;
    if (!artist) continue;
    const s = artistSkipMap.get(artist) || { skipped: 0, total: 0 };
    s.total++;
    if (e.skipped === true) s.skipped++;
    artistSkipMap.set(artist, s);
  }
  const skipRates = [...artistSkipMap.entries()]
    .filter(([, v]) => v.total >= 20)
    .map(([artist, v]) => ({ artist, skipRate: (v.skipped / v.total) * 100, total: v.total }))
    .sort((a, b) => b.skipRate - a.skipRate);

  const mostSkipped = skipRates.slice(0, 10);
  const leastSkipped = [...skipRates].sort((a, b) => a.skipRate - b.skipRate).slice(0, 10);

  // ── Reason start / end breakdown ─────────────────────────────────────────
  const reasonStartMap = new Map();
  const reasonEndMap = new Map();
  for (const e of music) {
    if (e.reason_start) reasonStartMap.set(e.reason_start, (reasonStartMap.get(e.reason_start) || 0) + 1);
    if (e.reason_end) reasonEndMap.set(e.reason_end, (reasonEndMap.get(e.reason_end) || 0) + 1);
  }
  const total = music.length || 1;
  const reasonStartBreakdown = [...reasonStartMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count, pct: (count / total) * 100 }));
  const reasonEndBreakdown = [...reasonEndMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count, pct: (count / total) * 100 }));

  // ── Late night index ──────────────────────────────────────────────────────
  const lateNightByYear = years.map(y => {
    const yearMusic = music.filter(e => {
      const d = parseTS(e.ts);
      return d && d.getUTCFullYear() === y;
    });
    const lateNight = yearMusic.filter(e => {
      const d = parseTS(e.ts);
      if (!d) return false;
      const h = d.getUTCHours();
      return h >= 0 && h < 5;
    });
    return {
      year: y,
      pct: yearMusic.length ? (lateNight.length / yearMusic.length) * 100 : 0,
    };
  });

  // ── Weekend vs weekday ────────────────────────────────────────────────────
  let weekendMs = 0, weekdayMs = 0;
  for (const e of music) {
    const d = parseTS(e.ts);
    if (!d) continue;
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) weekendMs += e.ms_played;
    else weekdayMs += e.ms_played;
  }

  // ── Seasonal patterns ─────────────────────────────────────────────────────
  const seasonMs = { Winter: 0, Spring: 0, Summer: 0, Fall: 0 };
  for (const e of music) {
    const d = parseTS(e.ts);
    if (!d) continue;
    const month = d.getUTCMonth();
    const season = month <= 1 || month === 11 ? 'Winter'
      : month <= 4 ? 'Spring'
      : month <= 7 ? 'Summer'
      : 'Fall';
    seasonMs[season] += e.ms_played;
  }
  const seasonalData = Object.entries(seasonMs).map(([season, ms]) => ({
    season, hours: msToHours(ms),
  }));

  // ── Country analysis ──────────────────────────────────────────────────────
  const countryMap = new Map();
  for (const e of allFiltered) {
    const c = e.conn_country || 'Unknown';
    const obj = countryMap.get(c) || { ms: 0, plays: 0 };
    obj.ms += e.ms_played; obj.plays++;
    countryMap.set(c, obj);
  }
  const countryData = [...countryMap.entries()]
    .sort((a, b) => b[1].ms - a[1].ms)
    .map(([country, v]) => ({ country, hours: msToHours(v.ms), plays: v.plays }));

  // ── Incognito usage ───────────────────────────────────────────────────────
  const incognitoByYear = years.map(y => {
    const yearEntries = allFiltered.filter(e => {
      const d = parseTS(e.ts);
      return d && d.getUTCFullYear() === y;
    });
    const incogCount = yearEntries.filter(e => e.incognito_mode === true).length;
    return { year: y, incognito: yearEntries.length ? (incogCount / yearEntries.length) * 100 : 0 };
  });

  // ── Fun stats ─────────────────────────────────────────────────────────────

  // 3am artist (2–5am UTC)
  const lateNightArtistMap = new Map();
  for (const e of music) {
    const d = parseTS(e.ts);
    if (!d) continue;
    const h = d.getUTCHours();
    if (h >= 2 && h < 5) {
      const a = e.master_metadata_album_artist_name;
      if (a) lateNightArtistMap.set(a, (lateNightArtistMap.get(a) || 0) + e.ms_played);
    }
  }
  const topLateNightArtist = [...lateNightArtistMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([artist, ms]) => ({ artist, hours: msToHours(ms) }));

  // Comfort food
  const trackYearSet = new Map();
  for (const e of music) {
    const uri = e.spotify_track_uri;
    if (!uri) continue;
    const d = parseTS(e.ts);
    if (!d) continue;
    if (!trackYearSet.has(uri)) trackYearSet.set(uri, new Set());
    trackYearSet.get(uri).add(d.getUTCFullYear());
  }
  const activeYearsCount = years.length;
  const comfortFood = [...trackYearSet.entries()]
    .filter(([, yrs]) => yrs.size >= Math.max(3, Math.floor(activeYearsCount * 0.6)))
    .map(([uri, yrs]) => {
      const t = trackMap.get(uri);
      return { uri, name: t?.name, artist: t?.artist, yearsPlayed: yrs.size, plays: t?.plays };
    })
    .filter(t => t.name)
    .sort((a, b) => b.yearsPlayed - a.yearsPlayed)
    .slice(0, 10);

  // Ghost tracks
  const ghostTracks = [...trackMap.entries()]
    .map(([uri, t]) => {
      const trackPlays = music.filter(e => e.spotify_track_uri === uri);
      const shufflePlays = trackPlays.filter(e => e.shuffle === true || e.reason_start === 'autoplay').length;
      const shuffleRatio = trackPlays.length ? shufflePlays / trackPlays.length : 0;
      return { uri, name: t.name, artist: t.artist, plays: t.plays, shuffleRatio };
    })
    .filter(t => t.plays >= 30 && t.shuffleRatio >= 0.7)
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 10);

  // Most patient / instant skip
  const trackAvgMs = new Map();
  for (const e of music) {
    const uri = e.spotify_track_uri;
    if (!uri) continue;
    const obj = trackAvgMs.get(uri) || { total: 0, count: 0, name: e.master_metadata_track_name, artist: e.master_metadata_album_artist_name };
    obj.total += e.ms_played; obj.count++;
    trackAvgMs.set(uri, obj);
  }
  const patientTracks = [...trackAvgMs.entries()]
    .filter(([, v]) => v.count >= 5)
    .map(([uri, v]) => ({ uri, name: v.name, artist: v.artist, avgMin: msToMinutes(v.total / v.count), plays: v.count }))
    .sort((a, b) => b.avgMin - a.avgMin)
    .slice(0, 10);

  const instantSkip = [...trackAvgMs.entries()]
    .filter(([, v]) => v.count >= 5)
    .map(([uri, v]) => ({ uri, name: v.name, artist: v.artist, avgSec: (v.total / v.count) / 1000, plays: v.count }))
    .sort((a, b) => a.avgSec - b.avgSec)
    .slice(0, 10);

  // Podcasts vs music ratio over time
  const podcastMusicByYear = years.map(y => {
    const musicMs = music.filter(e => { const d = parseTS(e.ts); return d && d.getUTCFullYear() === y; }).reduce((s, e) => s + e.ms_played, 0);
    const podMs = podcasts.filter(e => { const d = parseTS(e.ts); return d && d.getUTCFullYear() === y; }).reduce((s, e) => s + e.ms_played, 0);
    return { year: y, music: msToHours(musicMs), podcast: msToHours(podMs) };
  });

  // One-hit wonders
  const artistMonthMap = new Map();
  for (const e of music) {
    const a = e.master_metadata_album_artist_name;
    if (!a) continue;
    if (!artistMonthMap.has(a)) artistMonthMap.set(a, new Map());
    const m = e.ts.slice(0, 7);
    const mm = artistMonthMap.get(a);
    mm.set(m, (mm.get(m) || 0) + e.ms_played);
  }
  const oneHitWonders = [...artistMonthMap.entries()]
    .filter(([, months]) => months.size === 1)
    .map(([artist, months]) => {
      const [[month, ms]] = [...months.entries()];
      return { artist, month, hours: msToHours(ms) };
    })
    .filter(x => x.hours >= 1)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  // Rabbit holes
  const rabbitHoles = detectRabbitHoles(music);

  // Obsession phases
  const obsessionPhases = detectObsessionPhases(music);

  // Top 5 artists per year for bump chart
  const top5ByYear = years.map(y => {
    const ym = yearMap.get(y);
    const top5 = [...ym.artistMap.entries()]
      .sort((a, b) => b[1].ms - a[1].ms)
      .slice(0, 5)
      .map(([artist, v], i) => ({ artist, rank: i + 1, ms: v.ms }));
    return { year: y, artists: top5 };
  });

  return {
    // Meta
    totalEntries: entries.length,
    musicEntries: music.length,
    podcastEntries: podcasts.length,
    totalMs,
    totalMsMusic,
    totalMsPodcast,
    totalHours: msToHours(totalMs),
    workweeksCount: workweeks(totalMs),
    firstDate,
    lastDate,
    uniqueArtistsCount: uniqueArtists.size,
    uniqueTracksCount: uniqueTracks.size,
    uniqueAlbumsCount: uniqueAlbums.size,
    years,

    // All-time tops
    topArtists,
    topAlbums,
    topTracks,

    // Per-year
    yearlyHours,
    yearlyTop1Artist,
    yearlyTop1Track,

    // Loyalty
    loyaltyScores,

    // Streak
    longestStreak,
    bestStreakStart,
    bestStreakEnd,
    bestDay,
    bestDayHours: msToHours(bestDayMs),
    bestDayTracks,

    // Time series
    monthlySeries,

    // Heatmap
    heatmap,

    // Platform
    platformByYear,
    allPlatforms: [...allPlatforms],

    // Behavioral
    offlineByYear,
    shuffleByYear,
    skipRates,
    mostSkipped,
    leastSkipped,
    reasonStartBreakdown,
    reasonEndBreakdown,
    lateNightByYear,
    weekendHours: msToHours(weekendMs),
    weekdayHours: msToHours(weekdayMs),
    seasonalData,
    countryData,
    incognitoByYear,

    // Fun stats
    topLateNightArtist,
    comfortFood,
    ghostTracks,
    patientTracks,
    instantSkip,
    podcastMusicByYear,
    oneHitWonders,
    rabbitHoles,
    obsessionPhases,

    // For search
    artistMap,
    trackMap,
    raw: { music, podcasts },
    top5ByYear,
  };
}

// ── Session detection helpers ────────────────────────────────────────────────

function detectRabbitHoles(music) {
  const sorted = [...music]
    .filter(e => !!parseTS(e.ts))
    .sort((a, b) => parseTS(a.ts) - parseTS(b.ts));
  const holes = [];
  let i = 0;
  while (i < sorted.length) {
    const artist = sorted[i].master_metadata_album_artist_name;
    let j = i;
    while (j < sorted.length && sorted[j].master_metadata_album_artist_name === artist) {
      if (j > i) {
        const gap = parseTS(sorted[j].ts) - parseTS(sorted[j - 1].ts);
        if (gap > 30 * 60_000) break;
      }
      j++;
    }
    const length = j - i;
    if (length >= 10) {
      holes.push({
        artist,
        count: length,
        startDate: sorted[i].ts.slice(0, 10),
        hours: msToHours(sorted.slice(i, j).reduce((s, e) => s + e.ms_played, 0)),
      });
    }
    i = j > i ? j : i + 1;
  }
  return holes.sort((a, b) => b.count - a.count).slice(0, 10);
}

function detectObsessionPhases(music) {
  const artistMonthPlays = new Map();
  const artistTotalMonths = new Map();

  for (const e of music) {
    const artist = e.master_metadata_album_artist_name;
    if (!artist) continue;
    const key = `${artist}|${e.ts.slice(0, 7)}`;
    artistMonthPlays.set(key, (artistMonthPlays.get(key) || 0) + e.ms_played);
    if (!artistTotalMonths.has(artist)) artistTotalMonths.set(artist, new Set());
    artistTotalMonths.get(artist).add(e.ts.slice(0, 7));
  }

  const phases = [];
  for (const [key, ms] of artistMonthPlays) {
    const [artist, month] = key.split('|');
    const totalMonths = artistTotalMonths.get(artist)?.size || 1;
    const totalMs = [...artistMonthPlays.entries()]
      .filter(([k]) => k.startsWith(artist + '|'))
      .reduce((s, [, v]) => s + v, 0);
    const avgMonthlyMs = totalMs / totalMonths;
    if (ms >= avgMonthlyMs * 3 && msToHours(ms) >= 5) {
      phases.push({ artist, month, hours: msToHours(ms), ratio: ms / avgMonthlyMs });
    }
  }
  return phases.sort((a, b) => b.ratio - a.ratio).slice(0, 15);
}

// ── Platform normalizer ──────────────────────────────────────────────────────
function normalizePlatform(p) {
  if (!p) return 'Unknown';
  const l = p.toLowerCase();
  if (l.includes('android')) return 'Android';
  if (l.includes('ios') || l.includes('iphone') || l.includes('ipad')) return 'iOS';
  if (l.includes('windows')) return 'Windows';
  if (l.includes('mac') || l.includes('osx') || l.includes('os x')) return 'Mac';
  if (l.includes('web') || l.includes('browser')) return 'Web';
  if (l.includes('chromecast') || l.includes('cast')) return 'Chromecast';
  if (l.includes('linux')) return 'Linux';
  if (l.includes('smart') || l.includes('tv')) return 'Smart TV';
  return 'Other';
}
