import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, Cell, PieChart, Pie,
} from 'recharts';
import Card, { SectionHeader, RankList, COLORS, tooltipStyle } from './Card';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ ...tooltipStyle, padding: '10px 14px' }}>
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#FFFFFF' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '2px 0', color: p.color || '#1DB954', fontSize: '0.85rem' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}{p.unit || ''}
        </p>
      ))}
    </div>
  );
};

const REASON_LABELS = {
  trackdone: 'Track finished',
  fwdbtn: 'Forward button',
  endplay: 'End of playlist',
  clickrow: 'Manual click',
  backbtn: 'Back button',
  remote: 'Remote control',
  logout: 'Logout',
  autoplay: 'Autoplay',
  playbtn: 'Play button',
  appload: 'App load',
  unknown: 'Unknown',
};

export default function BehaviorSection({ data }) {
  const {
    mostSkipped, leastSkipped,
    reasonStartBreakdown, reasonEndBreakdown,
    lateNightByYear,
    weekendHours, weekdayHours,
    seasonalData,
    countryData,
    rabbitHoles,
  } = data;

  const weekData = [
    { label: 'Weekdays', hours: weekdayHours, fill: '#1DB954' },
    { label: 'Weekends', hours: weekendHours, fill: '#ffd93d' },
  ];

  const topCountries = countryData.slice(0, 15);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <SectionHeader
        title="Behavioral Insights"
        subtitle="Your listening habits, patterns, and unexpected correlations"
      />

      {/* Skip rate */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card title="Most skipped artists (min 20 plays)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mostSkipped.map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#FFFFFF', fontSize: '0.875rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.artist}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                  <div style={{ width: 80, height: 4, background: '#3E3E3E', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${a.skipRate}%`, background: '#ff6b6b', borderRadius: 2 }} />
                  </div>
                  <span style={{ color: '#ff6b6b', fontSize: '0.75rem', width: 36, textAlign: 'right' }}>{a.skipRate.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Least skipped artists (min 20 plays)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {leastSkipped.map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#FFFFFF', fontSize: '0.875rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.artist}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                  <div style={{ width: 80, height: 4, background: '#3E3E3E', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${a.skipRate}%`, background: '#1DB954', borderRadius: 2 }} />
                  </div>
                  <span style={{ color: '#1DB954', fontSize: '0.75rem', width: 36, textAlign: 'right' }}>{a.skipRate.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Reason start / end */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card title="How tracks start">
          <p style={{ color: '#B3B3B3', fontSize: '0.75rem', margin: '0 0 12px' }}>
            Are you algorithm-driven or intentional?
          </p>
          {reasonStartBreakdown.slice(0, 8).map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ color: '#B3B3B3', fontSize: '0.75rem', width: 110, flexShrink: 0 }}>
                {REASON_LABELS[r.reason] || r.reason}
              </span>
              <div style={{ flex: 1, height: 4, background: '#3E3E3E', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${r.pct}%`, background: COLORS[i % COLORS.length], borderRadius: 2 }} />
              </div>
              <span style={{ color: '#B3B3B3', fontSize: '0.75rem', width: 40, textAlign: 'right' }}>
                {r.pct.toFixed(1)}%
              </span>
            </div>
          ))}
        </Card>
        <Card title="How tracks end">
          <p style={{ color: '#B3B3B3', fontSize: '0.75rem', margin: '0 0 12px' }}>
            Do you actually finish songs?
          </p>
          {reasonEndBreakdown.slice(0, 8).map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ color: '#B3B3B3', fontSize: '0.75rem', width: 110, flexShrink: 0 }}>
                {REASON_LABELS[r.reason] || r.reason}
              </span>
              <div style={{ flex: 1, height: 4, background: '#3E3E3E', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${r.pct}%`, background: COLORS[i % COLORS.length], borderRadius: 2 }} />
              </div>
              <span style={{ color: '#B3B3B3', fontSize: '0.75rem', width: 40, textAlign: 'right' }}>
                {r.pct.toFixed(1)}%
              </span>
            </div>
          ))}
        </Card>
      </div>

      {/* Late night index */}
      <Card title="Late Night Index — % of listening between midnight–5am per year">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={lateNightByYear} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="#3E3E3E" />
            <XAxis dataKey="year" tick={{ fill: '#B3B3B3', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#B3B3B3', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(0)}%`} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div style={{ ...tooltipStyle, padding: '10px 14px' }}>
                    <p style={{ margin: 0, color: '#FFFFFF', fontWeight: 600 }}>{label}</p>
                    <p style={{ margin: '4px 0 0', color: '#cc5de8' }}>{payload[0]?.value?.toFixed(1)}% late night</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="pct" fill="#cc5de8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Weekend vs weekday + seasonal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card title="Weekend vs Weekday listening">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekData} layout="vertical" barCategoryGap="30%">
              <XAxis type="number" tick={{ fill: '#B3B3B3', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v)}h`} />
              <YAxis type="category" dataKey="label" tick={{ fill: '#B3B3B3', fontSize: 12 }} axisLine={false} tickLine={false} width={75} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div style={{ ...tooltipStyle, padding: '8px 12px' }}>
                      <p style={{ margin: 0, color: '#FFFFFF' }}>{label}</p>
                      <p style={{ margin: '4px 0 0', color: '#1DB954' }}>{payload[0]?.value?.toFixed(0)} hrs total</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                {weekData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ color: '#B3B3B3', fontSize: '0.75rem', margin: '8px 0 0' }}>
            Weekend = Sat & Sun (UTC). Weekday = Mon–Fri.
          </p>
        </Card>
        <Card title="Seasonal listening patterns">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={seasonalData} barCategoryGap="30%">
              <XAxis dataKey="season" tick={{ fill: '#B3B3B3', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#B3B3B3', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v)}h`} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div style={{ ...tooltipStyle, padding: '8px 12px' }}>
                      <p style={{ margin: 0, color: '#FFFFFF' }}>{label}</p>
                      <p style={{ margin: '4px 0 0', color: '#1DB954' }}>{payload[0]?.value?.toFixed(0)} hrs total</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                {seasonalData.map((d, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Country breakdown */}
      <Card title="Listening by country">
        <p style={{ color: '#B3B3B3', fontSize: '0.8rem', margin: '0 0 16px' }}>Where in the world you were streaming from.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topCountries.map((c, i) => {
            const maxH = topCountries[0].hours;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#B3B3B3', fontSize: '0.8rem', width: 32, textAlign: 'right', fontWeight: i === 0 ? 700 : 400, color: i === 0 ? '#1DB954' : '#B3B3B3' }}>
                  {c.country}
                </span>
                <div style={{ flex: 1, height: 6, background: '#3E3E3E', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${(c.hours / maxH) * 100}%`, background: i === 0 ? '#1DB954' : '#535353', borderRadius: 3 }} />
                </div>
                <span style={{ color: '#B3B3B3', fontSize: '0.75rem', width: 60, textAlign: 'right' }}>
                  {c.hours.toFixed(0)}h
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Rabbit holes */}
      <Card title="Rabbit Holes — sessions of 10+ consecutive plays of the same artist">
        {rabbitHoles.length === 0 ? (
          <p style={{ color: '#B3B3B3' }}>No rabbit holes detected.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rabbitHoles.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1a1a1a', borderRadius: 8, padding: '10px 16px', border: '1px solid #3E3E3E' }}>
                <div>
                  <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{r.artist}</span>
                  <span style={{ color: '#B3B3B3', fontSize: '0.8rem', marginLeft: 12 }}>{r.startDate}</span>
                </div>
                <span style={{ color: '#1DB954', fontWeight: 700 }}>{r.count} tracks in a row</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
