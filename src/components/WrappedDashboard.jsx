import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, ReferenceLine,
} from 'recharts';
import Card, { StatNumber, RankList, SectionHeader, COLORS, tooltipStyle } from './Card';

function fmt(n) { return n?.toLocaleString() ?? '—'; }
function fmtH(h) { return h >= 10000 ? `${(h / 1000).toFixed(1)}k` : h.toFixed(0); }
function fmtHoursLabel(h) { return `${h.toFixed(1)} hrs`; }

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function HourLabel({ hour }) {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const period = h >= 12 ? 'PM' : 'AM';
  const display = ((h % 12) || 12) + (m ? `:${m.toString().padStart(2, '0')}` : '') + ' ' + period;
  return <span>{display}</span>;
}

const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ ...tooltipStyle, padding: '10px 14px' }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#FFFFFF' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '2px 0', color: p.color || '#1DB954' }}>
          {formatter ? formatter(p.value) : `${p.value?.toFixed(1)} hrs`}
        </p>
      ))}
    </div>
  );
};

export default function WrappedDashboard({ data }) {
  const {
    totalEntries, musicEntries, podcastEntries,
    totalHours, workweeksCount,
    firstDate, lastDate,
    uniqueArtistsCount, uniqueTracksCount, uniqueAlbumsCount,
    topArtists, topAlbums, topTracks,
    loyaltyScores,
    yearlyHours, yearlyTop1Artist, yearlyTop1Track,
    longestStreak, bestStreakStart, bestStreakEnd,
    bestDay, bestDayHours, bestDayTracks,
    monthlySeries,
  } = data;

  // Trend line for monthly series (simple moving average, 3-month)
  const monthlyWithTrend = monthlySeries.map((m, i) => {
    const window = monthlySeries.slice(Math.max(0, i - 2), i + 3);
    const avg = window.reduce((s, w) => s + w.hours, 0) / window.length;
    return { ...m, trend: avg };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <SectionHeader
        title="Your All-Time Wrapped"
        subtitle={`${formatDate(firstDate)} — ${formatDate(lastDate)}`}
      />

      {/* ── Summary stats ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
        <Card accent>
          <StatNumber value={fmt(Math.round(totalHours))} label="Total hours listened" green />
        </Card>
        <Card>
          <StatNumber value={fmt(musicEntries + podcastEntries)} label="Total streams (30s+)" />
        </Card>
        <Card>
          <StatNumber value={fmt(uniqueArtistsCount)} label="Unique artists" />
        </Card>
        <Card>
          <StatNumber value={fmt(uniqueTracksCount)} label="Unique tracks" />
        </Card>
        <Card>
          <StatNumber value={fmt(uniqueAlbumsCount)} label="Unique albums" />
        </Card>
        <Card>
          <StatNumber value={workweeksCount.toFixed(1)} label="Work weeks of music" />
        </Card>
      </div>

      {/* ── "If this were a job" fun fact ─────────────────────────────── */}
      <Card accent style={{ background: 'linear-gradient(135deg, #282828 0%, #1a2a1a 100%)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
          <div>
            <p style={{ color: '#1DB954', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>
              If this were a job
            </p>
            <p style={{ color: '#FFFFFF', fontSize: '1.05rem', margin: 0, lineHeight: 1.6 }}>
              You've listened to <strong style={{ color: '#1DB954' }}>{Math.round(totalHours).toLocaleString()} hours</strong> of music since {new Date(firstDate).getUTCFullYear()}.
              That's <strong style={{ color: '#1DB954' }}>{workweeksCount.toFixed(1)} 40-hour work weeks</strong> — about {(workweeksCount / 52).toFixed(1)} years of full-time employment.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1DB954' }}>{Math.round(totalHours / Math.max(1, yearlyHours.length)).toLocaleString()}</div>
              <div style={{ fontSize: '0.75rem', color: '#B3B3B3' }}>avg hours/year</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1DB954' }}>{Math.round(totalHours / Math.max(1, yearlyHours.length) / 365).toLocaleString()}</div>
              <div style={{ fontSize: '0.75rem', color: '#B3B3B3' }}>avg hours/day</div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Top artists / albums / tracks ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        <Card title="Top 10 Artists — All Time">
          <RankList
            items={topArtists}
            labelKey="name"
            valueKey="ms"
            valueFormat={ms => fmtHoursLabel(ms / 3_600_000)}
          />
        </Card>
        <Card title="Top 10 Albums — All Time">
          <RankList
            items={topAlbums.map(a => ({ ...a, displayName: a.album }))}
            labelKey="album"
            valueKey="ms"
            valueFormat={ms => fmtHoursLabel(ms / 3_600_000)}
          />
        </Card>
        <Card title="Top 10 Tracks — All Time">
          <RankList
            items={topTracks.map(t => ({ ...t, displayName: `${t.name} – ${t.artist}` }))}
            labelKey="displayName"
            valueKey="ms"
            valueFormat={ms => fmtHoursLabel(ms / 3_600_000)}
          />
        </Card>
      </div>

      {/* ── Listening hours per year (bar chart) ──────────────────────── */}
      <Card title="Listening hours per year">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={yearlyHours} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="#3E3E3E" />
            <XAxis dataKey="year" tick={{ fill: '#B3B3B3', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#B3B3B3', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtH} />
            <Tooltip
              content={<CustomTooltip formatter={v => `${v.toFixed(0)} hrs`} />}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
            <Bar dataKey="hours" fill="#1DB954" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* ── Monthly time series with trend ────────────────────────────── */}
      <Card title="Monthly listening hours — all time">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={monthlyWithTrend}>
            <CartesianGrid vertical={false} stroke="#3E3E3E" />
            <XAxis
              dataKey="month"
              tick={{ fill: '#B3B3B3', fontSize: 10 }}
              axisLine={false} tickLine={false}
              interval={Math.floor(monthlyWithTrend.length / 12)}
              tickFormatter={m => m.slice(0, 7)}
            />
            <YAxis tick={{ fill: '#B3B3B3', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtH} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div style={{ ...tooltipStyle, padding: '10px 14px' }}>
                    <p style={{ margin: '0 0 4px', color: '#FFFFFF', fontWeight: 600 }}>{label}</p>
                    <p style={{ margin: 0, color: '#1DB954' }}>{payload[0]?.value?.toFixed(1)} hrs</p>
                  </div>
                );
              }}
            />
            <Line type="monotone" dataKey="hours" stroke="#3E3E3E" dot={false} strokeWidth={1} />
            <Line type="monotone" dataKey="trend" stroke="#1DB954" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
        <p style={{ color: '#B3B3B3', fontSize: '0.75rem', margin: '8px 0 0' }}>
          Green = 3-month moving average
        </p>
      </Card>

      {/* ── Year-by-year #1 artist & #1 track timeline ────────────────── */}
      <Card title="#1 Artist & Track by year">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #3E3E3E' }}>
                {['Year', 'Hours', '#1 Artist (by time)', '#1 Track'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#B3B3B3', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {yearlyHours.map((y, i) => {
                const a = yearlyTop1Artist[i];
                const t = yearlyTop1Track[i];
                // Show track artist inline only when it differs from #1 artist
                const showTrackArtist = t?.artist && t.artist !== a?.artist;
                return (
                  <tr key={y.year} style={{ borderBottom: '1px solid #3E3E3E' }}>
                    <td style={{ padding: '10px 12px', color: '#1DB954', fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{y.year}</td>
                    <td style={{ padding: '10px 12px', color: '#FFFFFF', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{y.hours.toFixed(0)}h</td>
                    <td style={{ padding: '10px 12px', color: '#FFFFFF', fontSize: '0.875rem', fontWeight: 600 }}>{a?.artist || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ color: '#FFFFFF', fontSize: '0.875rem', display: 'block' }}>{t?.track || '—'}</span>
                      {showTrackArtist && (
                        <span style={{ color: '#B3B3B3', fontSize: '0.75rem' }}>{t.artist}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Loyalty scores ─────────────────────────────────────────────── */}
      <Card title="Loyalty Score — Artists you've stuck with the longest">
        <p style={{ color: '#B3B3B3', fontSize: '0.8rem', margin: '0 0 16px' }}>
          Combines years active × total listening volume. High score = you never fell out of love.
        </p>
        <RankList
          items={loyaltyScores}
          labelKey="artist"
          valueKey="yearsActive"
          valueFormat={y => `${y} years`}
        />
      </Card>

      {/* ── Streak & best day ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        <Card title="Longest listening streak" accent>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: '3rem', fontWeight: 700, color: '#1DB954', lineHeight: 1 }}>
              {longestStreak} days
            </span>
            <span style={{ color: '#B3B3B3', fontSize: '0.875rem' }}>
              {formatDate(bestStreakStart)} → {formatDate(bestStreakEnd)}
            </span>
          </div>
        </Card>
        <Card title="Most listened day ever">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: '2rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>
              {bestDayHours.toFixed(1)} hrs
            </span>
            <span style={{ color: '#1DB954', fontSize: '0.9rem', fontWeight: 600 }}>
              {formatDate(bestDay)}
            </span>
            <div style={{ marginTop: 8 }}>
              <p style={{ color: '#B3B3B3', fontSize: '0.75rem', margin: '0 0 6px' }}>Top plays that day:</p>
              {bestDayTracks.map((t, i) => (
                <p key={i} style={{ color: '#FFFFFF', fontSize: '0.8rem', margin: '2px 0' }}>• {t}</p>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
