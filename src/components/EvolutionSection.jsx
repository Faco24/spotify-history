import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, BarChart, Bar,
  PieChart, Pie, AreaChart, Area,
} from 'recharts';
import Card, { SectionHeader, COLORS, tooltipStyle } from './Card';

const GENRE_COLORS = [
  '#E91E8C', '#FF6B2B', '#FFD93D', '#1DB954', '#4ECDC4',
  '#45B7D1', '#A78BFA', '#FB923C', '#34D399', '#F472B6',
  '#60A5FA', '#94A3B8',
];

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return '12am';
  if (i === 12) return '12pm';
  return i < 12 ? `${i}am` : `${i - 12}pm`;
});

function HeatmapCell({ value, max }) {
  const intensity = max ? value / max : 0;
  const alpha = 0.05 + intensity * 0.95;
  return (
    <div
      title={`${value.toFixed(1)} hrs`}
      style={{
        width: '100%', paddingBottom: '100%', position: 'relative',
        borderRadius: 2,
        background: `rgba(29, 185, 84, ${alpha})`,
      }}
    />
  );
}

function Heatmap({ heatmap }) {
  const max = Math.max(...heatmap.flat());
  const cellSize = 'calc((100% - 48px) / 24)';

  return (
    <div>
      {/* Hour axis */}
      <div style={{ display: 'grid', gridTemplateColumns: `48px repeat(24, 1fr)`, gap: 2, marginBottom: 2 }}>
        <div />
        {HOURS.map((h, i) => (
          <div key={i} style={{ fontSize: '0.6rem', color: '#B3B3B3', textAlign: 'center', overflow: 'hidden' }}>{i % 3 === 0 ? h : ''}</div>
        ))}
      </div>
      {/* Grid */}
      {heatmap.map((row, dow) => (
        <div key={dow} style={{ display: 'grid', gridTemplateColumns: `48px repeat(24, 1fr)`, gap: 2, marginBottom: 2 }}>
          <div style={{ fontSize: '0.7rem', color: '#B3B3B3', display: 'flex', alignItems: 'center' }}>{DOW[dow]}</div>
          {row.map((val, hour) => (
            <HeatmapCell key={hour} value={val} max={max} />
          ))}
        </div>
      ))}
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '0.7rem', color: '#B3B3B3' }}>Less</span>
        {[0.05, 0.25, 0.5, 0.75, 1].map(a => (
          <div key={a} style={{ width: 12, height: 12, borderRadius: 2, background: `rgba(29,185,84,${a})` }} />
        ))}
        <span style={{ fontSize: '0.7rem', color: '#B3B3B3' }}>More</span>
      </div>
    </div>
  );
}

function BumpChart({ top5ByYear }) {
  // Build series: for each artist that ever appeared in top 5, track their rank per year
  const artistSet = new Set();
  for (const { artists } of top5ByYear) {
    for (const a of artists) artistSet.add(a.artist);
  }

  // Only show artists who appeared in top 5 at least 3 times (reduces isolated-dot noise)
  const filtered = [...artistSet].filter(artist => {
    return top5ByYear.filter(y => y.artists.find(a => a.artist === artist)).length >= 3;
  });

  // Build data: one row per year
  const data = top5ByYear.map(({ year, artists }) => {
    const obj = { year };
    for (const artist of filtered) {
      const found = artists.find(a => a.artist === artist);
      obj[artist] = found ? found.rank : null;
    }
    return obj;
  });

  const artistColors = {};
  filtered.forEach((a, i) => { artistColors[a] = COLORS[i % COLORS.length]; });

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 24, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#3E3E3E" />
          <XAxis dataKey="year" tick={{ fill: '#B3B3B3', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            reversed domain={[1, 5]} ticks={[1, 2, 3, 4, 5]}
            tick={{ fill: '#B3B3B3', fontSize: 11 }} axisLine={false} tickLine={false}
            tickFormatter={v => `#${v}`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const validPayload = payload.filter(p => p.value != null).sort((a, b) => a.value - b.value);
              return (
                <div style={{ ...tooltipStyle, padding: '10px 14px', minWidth: 160 }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#FFFFFF' }}>{label}</p>
                  {validPayload.map((p, i) => (
                    <p key={i} style={{ margin: '2px 0', color: p.color, fontSize: '0.8rem' }}>
                      #{p.value} {p.dataKey}
                    </p>
                  ))}
                </div>
              );
            }}
          />
          {filtered.map(artist => (
            <Line
              key={artist}
              type="monotone"
              dataKey={artist}
              stroke={artistColors[artist]}
              strokeWidth={2}
              dot={{ r: 4, fill: artistColors[artist] }}
              connectNulls={true}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 12 }}>
        {filtered.map(artist => (
          <span key={artist} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#B3B3B3' }}>
            <span style={{ width: 12, height: 3, background: artistColors[artist], borderRadius: 2, flexShrink: 0 }} />
            {artist}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function EvolutionSection({ data, genreStatus, genreError, onFetchGenres }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('anthropic_api_key') || '');

  const handleUnlock = () => {
    if (!apiKey.trim()) return;
    localStorage.setItem('anthropic_api_key', apiKey.trim());
    onFetchGenres(apiKey.trim());
  };
  const { heatmap, monthlySeries, top5ByYear, obsessionPhases,
    genreBreakdown, genreByYear, topGenreByYear, allChartGenres } = data;

  // Map each genre to a stable color by its index in genreBreakdown
  const genreColorMap = {};
  (genreBreakdown || []).forEach((g, i) => {
    genreColorMap[g.genre] = GENRE_COLORS[i % GENRE_COLORS.length];
  });
  // "Mixed" always grey
  genreColorMap['Mixed'] = '#535353';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <SectionHeader
        title="Evolution Over Time"
        subtitle="How your listening patterns have shifted across the years"
      />

      {/* Bump chart */}
      <Card title="Top 5 Artists — Rank over time">
        <p style={{ color: '#B3B3B3', fontSize: '0.8rem', margin: '0 0 16px' }}>
          Y-axis = rank (#1 at top). Artists shown if they reached top 5 in at least 3 years. Lines connect across gaps.
        </p>
        <BumpChart top5ByYear={top5ByYear} />
      </Card>

      {/* Heatmap */}
      <Card title="Listening heatmap — hour of day × day of week">
        <p style={{ color: '#B3B3B3', fontSize: '0.8rem', margin: '0 0 16px' }}>
          All time. Color intensity = total hours listened. Times are UTC.
        </p>
        <Heatmap heatmap={heatmap} />
      </Card>

      {/* ── Genre Analysis ─────────────────────────────── */}
      <SectionHeader
        title="Genre Breakdown"
        subtitle="Based on your top 50 artists — powered by Claude"
      />

      {(genreStatus === 'idle' || (genreStatus === 'error' && !genreError)) && (
        <Card title="Unlock genre analysis">
          <p style={{ color: '#B3B3B3', fontSize: '0.875rem', margin: '0 0 16px', lineHeight: 1.6 }}>
            Enter your <strong style={{ color: '#FFFFFF' }}>Anthropic API key</strong> and Claude will classify your top 50 artists into specific genres — Britpop, Neo Soul, Grunge, Synthwave, and more.
            Your key is saved locally and never leaves your browser.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              placeholder="sk-ant-…"
              style={{
                flex: 1, background: '#282828', border: '1px solid #3E3E3E',
                borderRadius: 6, padding: '8px 12px',
                color: '#FFFFFF', fontSize: '0.875rem', outline: 'none',
              }}
            />
            <button
              onClick={handleUnlock}
              disabled={!apiKey.trim()}
              style={{
                background: apiKey.trim() ? '#1DB954' : '#3E3E3E',
                color: apiKey.trim() ? '#000' : '#B3B3B3',
                border: 'none', borderRadius: 6, padding: '8px 20px',
                fontWeight: 700, fontSize: '0.875rem',
                cursor: apiKey.trim() ? 'pointer' : 'default',
                whiteSpace: 'nowrap', transition: 'background 0.15s',
              }}
            >
              Analyze genres
            </button>
          </div>
        </Card>
      )}

      {genreStatus === 'loading' && (
        <Card title="Fetching genre labels…">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #3E3E3E', borderTopColor: '#1DB954', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: '#B3B3B3', margin: 0, fontSize: '0.9rem' }}>Asking Claude to classify your top 50 artists…</p>
          </div>
        </Card>
      )}

      {genreStatus === 'error' && genreError && (
        <Card title="Genre analysis failed">
          <p style={{ color: '#ff6b6b', fontSize: '0.85rem', margin: '0 0 16px' }}>{genreError}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUnlock()}
              placeholder="sk-ant-…"
              style={{
                flex: 1, background: '#282828', border: '1px solid rgba(255,107,107,0.4)',
                borderRadius: 6, padding: '8px 12px',
                color: '#FFFFFF', fontSize: '0.875rem', outline: 'none',
              }}
            />
            <button
              onClick={handleUnlock}
              disabled={!apiKey.trim()}
              style={{
                background: apiKey.trim() ? '#1DB954' : '#3E3E3E',
                color: apiKey.trim() ? '#000' : '#B3B3B3',
                border: 'none', borderRadius: 6, padding: '8px 20px',
                fontWeight: 700, fontSize: '0.875rem',
                cursor: apiKey.trim() ? 'pointer' : 'default',
                whiteSpace: 'nowrap', transition: 'background 0.15s',
              }}
            >
              Retry
            </button>
          </div>
        </Card>
      )}

      {genreStatus === 'ready' && genreBreakdown?.length > 0 && (
        <>
          {/* Genre mix — donut + ranked list */}
          <Card title="All-time genre mix">
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'center' }}>
              <ResponsiveContainer width={240} height={240}>
                <PieChart>
                  <Pie
                    data={genreBreakdown}
                    dataKey="hours"
                    nameKey="genre"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {genreBreakdown.map((entry) => (
                      <Cell key={entry.genre} fill={genreColorMap[entry.genre]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ ...tooltipStyle, padding: '8px 12px' }}>
                          <p style={{ margin: 0, color: genreColorMap[d.genre], fontWeight: 700 }}>{d.genre}</p>
                          <p style={{ margin: '2px 0 0', color: '#B3B3B3', fontSize: '0.8rem' }}>
                            {d.hours.toFixed(0)}h · {d.pct.toFixed(1)}%
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {genreBreakdown.map((g) => (
                  <div key={g.genre} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: genreColorMap[g.genre], flexShrink: 0 }} />
                    <span style={{ color: '#FFFFFF', fontSize: '0.82rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.genre}</span>
                    <div style={{ width: 80, height: 3, background: '#3E3E3E', borderRadius: 2, flexShrink: 0 }}>
                      <div style={{ height: '100%', width: `${Math.min(g.pct, 100)}%`, background: genreColorMap[g.genre], borderRadius: 2 }} />
                    </div>
                    <span style={{ color: '#B3B3B3', fontSize: '0.75rem', width: 38, textAlign: 'right', flexShrink: 0 }}>
                      {g.pct.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Genre evolution over time */}
          {genreByYear?.length > 0 && (
            <Card title="Genre evolution over time (hours/year)">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={genreByYear}>
                  <CartesianGrid vertical={false} stroke="#3E3E3E" />
                  <XAxis dataKey="year" tick={{ fill: '#B3B3B3', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#B3B3B3', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const sorted = [...payload].sort((a, b) => b.value - a.value).filter(p => p.value > 0);
                      return (
                        <div style={{ ...tooltipStyle, padding: '10px 14px' }}>
                          <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#FFFFFF' }}>{label}</p>
                          {sorted.map((p, i) => (
                            <p key={i} style={{ margin: '2px 0', color: p.fill, fontSize: '0.8rem' }}>
                              {p.dataKey}: {p.value.toFixed(0)}h
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  {(allChartGenres || []).map(genre => (
                    <Area
                      key={genre}
                      type="monotone"
                      dataKey={genre}
                      stackId="1"
                      stroke={genreColorMap[genre]}
                      fill={genreColorMap[genre]}
                      fillOpacity={0.7}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 12 }}>
                {(allChartGenres || []).map(genre => (
                  <span key={genre} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#B3B3B3' }}>
                    <span style={{ width: 10, height: 10, background: genreColorMap[genre], borderRadius: 2, flexShrink: 0 }} />
                    {genre}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Genre winner per year */}
          {topGenreByYear?.length > 0 && (
            <Card title="Genre that dominated each year">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {topGenreByYear.map(({ year, genre }) => (
                  <div key={year} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ color: '#B3B3B3', fontSize: '0.7rem' }}>{year}</span>
                    <span style={{
                      background: genreColorMap[genre] || '#535353',
                      color: '#000',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      padding: '3px 8px',
                      borderRadius: 20,
                      whiteSpace: 'nowrap',
                    }}>
                      {genre}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Obsession phases */}
      <Card title="Obsession Phases — when you went deep on one artist">
        <p style={{ color: '#B3B3B3', fontSize: '0.8rem', margin: '0 0 16px' }}>
          Months where you played an artist 3× more than your usual monthly average for them.
        </p>
        {obsessionPhases.length === 0 ? (
          <p style={{ color: '#B3B3B3' }}>No strong obsession phases detected.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {obsessionPhases.map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#1a1a1a', borderRadius: 8, padding: '10px 16px',
                border: '1px solid #3E3E3E',
              }}>
                <div>
                  <span style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '0.9rem' }}>{p.artist}</span>
                  <span style={{ color: '#B3B3B3', fontSize: '0.8rem', marginLeft: 12 }}>{p.month}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: '#1DB954', fontWeight: 700 }}>{p.hours.toFixed(1)}h</span>
                  <span style={{ color: '#B3B3B3', fontSize: '0.75rem', marginLeft: 8 }}>
                    {p.ratio.toFixed(1)}× avg
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
