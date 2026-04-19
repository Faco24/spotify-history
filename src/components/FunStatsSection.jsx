import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import Card, { SectionHeader, COLORS, tooltipStyle } from './Card';

function StatBadge({ emoji, title, children }) {
  return (
    <div style={{ background: '#282828', borderRadius: 12, padding: '20px 24px', border: '1px solid #3E3E3E', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.5rem' }}>{emoji}</span>
        <h3 style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#B3B3B3' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function TrackList({ items, mainKey = 'name', subKey = 'artist', valueKey, valueLabel }) {
  if (!items?.length) return <p style={{ color: '#B3B3B3', fontSize: '0.85rem' }}>Not enough data.</p>;
  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
            <p style={{ margin: 0, color: '#FFFFFF', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item[mainKey]}
            </p>
            {subKey && item[subKey] && (
              <p style={{ margin: '2px 0 0', color: '#B3B3B3', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item[subKey]}
              </p>
            )}
          </div>
          {valueKey && (
            <span style={{ color: '#1DB954', fontSize: '0.8rem', fontWeight: 600, flexShrink: 0 }}>
              {typeof item[valueKey] === 'number' ? item[valueKey].toFixed(1) : item[valueKey]} {valueLabel}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

export default function FunStatsSection({ data }) {
  const {
    topLateNightArtist,
    comfortFood,
    patientTracks,
    podcastMusicByYear,
    autoInsights,
  } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <SectionHeader
        title="Fun Stats"
        subtitle="The weird, wonderful corners of your listening history"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>

        {/* 3am artist */}
        <StatBadge emoji="🌙" title="The 3am Artist — who you listen to between 2–5am">
          <TrackList items={topLateNightArtist} mainKey="artist" subKey={null} valueKey="hours" valueLabel="hrs" />
        </StatBadge>

        {/* Comfort food */}
        <StatBadge emoji="🍕" title="Comfort Food — tracks you return to every year">
          <p style={{ color: '#B3B3B3', fontSize: '0.75rem', margin: '0 0 8px' }}>
            Present in {Math.floor(data.years?.length * 0.6)}+ of your {data.years?.length} active years.
          </p>
          <TrackList items={comfortFood} mainKey="name" subKey="artist" valueKey="yearsPlayed" valueLabel="yrs" />
        </StatBadge>

        {/* Most patient listener */}
        <StatBadge emoji="⏳" title="Most Patient — tracks you always let finish (avg listen time)">
          <TrackList items={patientTracks} mainKey="name" subKey="artist" valueKey="avgMin" valueLabel="min avg" />
        </StatBadge>

      </div>

      {/* The Algorithm Has Read You */}
      {autoInsights?.length > 0 && (
        <div style={{ background: '#1a1a1a', borderRadius: 16, padding: '28px 32px', border: '1px solid #3E3E3E' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <span style={{ fontSize: '1.4rem' }}>🔍</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                The Algorithm Has Read You
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#B3B3B3' }}>
                Real insights extracted from your data — no astrology required
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
            {autoInsights.map((insight, i) => (
              <div key={i} style={{ borderLeft: '3px solid #1DB954', paddingLeft: 16 }}>
                <p style={{ margin: '0 0 6px', color: '#FFFFFF', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.4 }}>
                  {insight.headline}
                </p>
                <p style={{ margin: 0, color: '#B3B3B3', fontSize: '0.82rem', lineHeight: 1.6 }}>
                  {insight.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Podcasts vs music over time */}
      <Card title="Podcasts vs Music — hours per year">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={podcastMusicByYear} barCategoryGap="20%">
            <CartesianGrid vertical={false} stroke="#3E3E3E" />
            <XAxis dataKey="year" tick={{ fill: '#B3B3B3', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#B3B3B3', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v)}h`} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div style={{ ...tooltipStyle, padding: '10px 14px' }}>
                    <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#FFFFFF' }}>{label}</p>
                    {payload.map((p, i) => (
                      <p key={i} style={{ margin: '2px 0', color: p.fill || p.color, fontSize: '0.85rem' }}>
                        {p.name}: {p.value?.toFixed(1)}h
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Bar dataKey="music" name="Music" fill="#1DB954" radius={[4, 4, 0, 0]} stackId="a" />
            <Bar dataKey="podcast" name="Podcasts" fill="#4d96ff" radius={[4, 4, 0, 0]} stackId="a" />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
          {[['#1DB954', 'Music'], ['#4d96ff', 'Podcasts']].map(([color, label]) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#B3B3B3' }}>
              <span style={{ width: 10, height: 10, background: color, borderRadius: 2 }} />
              {label}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
