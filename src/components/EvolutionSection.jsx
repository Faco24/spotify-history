import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, BarChart, Bar,
} from 'recharts';
import Card, { SectionHeader, COLORS, tooltipStyle } from './Card';

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

  // Only show artists who appeared in top 5 at least twice
  const filtered = [...artistSet].filter(artist => {
    return top5ByYear.filter(y => y.artists.find(a => a.artist === artist)).length >= 2;
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
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
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
              connectNulls={false}
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

export default function EvolutionSection({ data }) {
  const { heatmap, monthlySeries, top5ByYear, obsessionPhases } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <SectionHeader
        title="Evolution Over Time"
        subtitle="How your listening patterns have shifted across the years"
      />

      {/* Bump chart */}
      <Card title="Top 5 Artists — Rank over time">
        <p style={{ color: '#B3B3B3', fontSize: '0.8rem', margin: '0 0 16px' }}>
          Y-axis = rank (#1 at top). Artists shown if they appeared in top 5 in at least 2 years.
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
