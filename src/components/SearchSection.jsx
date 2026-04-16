import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import Card, { SectionHeader, tooltipStyle } from './Card';

// Parse timestamp safely — handles both "YYYY-MM-DD HH:MM:SS" and "YYYY-MM-DDTHH:MM:SSZ"
function tsToDate(ts) {
  if (!ts) return null;
  const withT = ts.trim().replace(' ', 'T');
  const iso = withT.endsWith('Z') ? withT : withT + 'Z';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function formatHour(h) {
  if (h == null || isNaN(h)) return '—';
  const hour = Math.floor(h);
  const period = hour >= 12 ? 'PM' : 'AM';
  return ((hour % 12) || 12) + ' ' + period;
}

function ResultCard({ result, type }) {
  if (!result) return null;
  const title = type === 'artist' ? result.artist : `${result.name} — ${result.artist}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#282828', borderRadius: 12, padding: '20px 24px', border: '1px solid #1DB954' }}>
        <h3 style={{ color: '#1DB954', margin: '0 0 16px', fontSize: '1.25rem', fontWeight: 700 }}>{title}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 20 }}>
          {[
            { label: 'Total plays', value: result.totalPlays.toLocaleString() },
            { label: 'Total hours', value: result.totalHours.toFixed(1) + 'h' },
            { label: 'First listen', value: result.firstListen?.slice(0, 10) },
            { label: 'Avg time of day', value: formatHour(result.avgHour) },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF' }}>{s.value}</span>
              <span style={{ fontSize: '0.75rem', color: '#B3B3B3' }}>{s.label}</span>
            </div>
          ))}
        </div>
        <h4 style={{ color: '#B3B3B3', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Plays per year</h4>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={result.playsByYear} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="#3E3E3E" />
            <XAxis dataKey="year" tick={{ fill: '#B3B3B3', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#B3B3B3', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div style={{ ...tooltipStyle, padding: '8px 12px' }}>
                    <p style={{ margin: 0, color: '#FFFFFF', fontWeight: 600 }}>{label}</p>
                    <p style={{ margin: '4px 0 0', color: '#1DB954' }}>{payload[0]?.value} plays</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="plays" fill="#1DB954" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {result.platforms && (
          <>
            <h4 style={{ color: '#B3B3B3', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '16px 0 8px' }}>Platforms used</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {result.platforms.slice(0, 6).map((p, i) => (
                <span key={i} style={{ background: '#3E3E3E', color: '#FFFFFF', borderRadius: 12, padding: '4px 12px', fontSize: '0.8rem' }}>
                  {p.platform} ({p.count})
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchSection({ data }) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('artist');
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);

  const { raw } = data;

  function doSearch() {
    if (!query.trim()) return;
    const q = query.toLowerCase();

    if (searchType === 'artist') {
      const matches = raw.music.filter(e =>
        e.master_metadata_album_artist_name?.toLowerCase().includes(q)
      );
      if (!matches.length) { setResult(null); setSearched(true); return; }
      const artist = matches[0].master_metadata_album_artist_name;
      const exact = raw.music.filter(e => e.master_metadata_album_artist_name === artist);
      const totalMs = exact.reduce((s, e) => s + e.ms_played, 0);
      const firstListen = exact.reduce((min, e) => e.ts < min ? e.ts : min, exact[0].ts);
      const lastListen = exact.reduce((max, e) => e.ts > max ? e.ts : max, exact[0].ts);
      const yearMap = new Map();
      for (const e of exact) {
        const y = e.ts.slice(0, 4);
        yearMap.set(y, (yearMap.get(y) || 0) + 1);
      }
      const validHours = exact.map(e => tsToDate(e.ts)?.getUTCHours()).filter(h => h != null);
      const avgHourValue = validHours.length ? validHours.reduce((s, h) => s + h, 0) / validHours.length : null;
      const platformMap = new Map();
      for (const e of exact) {
        const p = e.platform || 'Unknown';
        platformMap.set(p, (platformMap.get(p) || 0) + 1);
      }
      setResult({
        artist,
        totalPlays: exact.length,
        totalHours: totalMs / 3_600_000,
        firstListen,
        lastListen,
        playsByYear: [...yearMap.entries()].sort().map(([year, plays]) => ({ year, plays })),
        avgHour: avgHourValue,
        platforms: [...platformMap.entries()].sort((a, b) => b[1] - a[1]).map(([p, c]) => ({ platform: p, count: c })),
      });
    } else {
      const matches = raw.music.filter(e =>
        e.master_metadata_track_name?.toLowerCase().includes(q)
      );
      if (!matches.length) { setResult(null); setSearched(true); return; }
      const uriMap = new Map();
      for (const e of matches) {
        const uri = e.spotify_track_uri || e.master_metadata_track_name;
        if (!uriMap.has(uri)) uriMap.set(uri, { entries: [], name: e.master_metadata_track_name, artist: e.master_metadata_album_artist_name });
        uriMap.get(uri).entries.push(e);
      }
      const [, best] = [...uriMap.entries()].sort((a, b) => b[1].entries.length - a[1].entries.length)[0];
      const exact = best.entries;
      const totalMs = exact.reduce((s, e) => s + e.ms_played, 0);
      const firstListen = exact.reduce((min, e) => e.ts < min ? e.ts : min, exact[0].ts);
      const yearMap = new Map();
      for (const e of exact) yearMap.set(e.ts.slice(0, 4), (yearMap.get(e.ts.slice(0, 4)) || 0) + 1);
      const validHoursT = exact.map(e => tsToDate(e.ts)?.getUTCHours()).filter(h => h != null);
      const avgHourT = validHoursT.length ? validHoursT.reduce((s, h) => s + h, 0) / validHoursT.length : null;
      setResult({
        name: best.name, artist: best.artist,
        totalPlays: exact.length,
        totalHours: totalMs / 3_600_000,
        firstListen,
        playsByYear: [...yearMap.entries()].sort().map(([year, plays]) => ({ year, plays })),
        avgHour: avgHourT,
      });
    }
    setSearched(true);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <SectionHeader
        title="Search & Explore"
        subtitle="Deep-dive into any artist or track in your history"
      />

      <Card>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {/* Type toggle */}
          <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: 8, padding: 4, gap: 4 }}>
            {['artist', 'track'].map(t => (
              <button
                key={t}
                onClick={() => { setSearchType(t); setResult(null); setSearched(false); }}
                style={{
                  padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: searchType === t ? '#1DB954' : 'transparent',
                  color: searchType === t ? '#000' : '#B3B3B3',
                  fontWeight: 600, fontSize: '0.85rem',
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          {/* Input */}
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder={`Search ${searchType}…`}
            style={{
              flex: 1, minWidth: 200, background: '#1a1a1a', border: '1px solid #3E3E3E',
              borderRadius: 8, padding: '8px 16px', color: '#FFFFFF', fontSize: '0.95rem',
              outline: 'none',
            }}
          />
          <button
            onClick={doSearch}
            style={{
              background: '#1DB954', color: '#000', border: 'none',
              borderRadius: 8, padding: '8px 24px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Search
          </button>
        </div>
      </Card>

      {searched && !result && (
        <p style={{ color: '#B3B3B3', textAlign: 'center' }}>No results found for "{query}".</p>
      )}

      {result && <ResultCard result={result} type={searchType} />}
    </div>
  );
}
