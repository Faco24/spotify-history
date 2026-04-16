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
    ghostTracks,
    patientTracks,
    instantSkip,
    podcastMusicByYear,
    oneHitWonders,
    rabbitHoles,
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

        {/* Ghost tracks */}
        <StatBadge emoji="👻" title="Ghost Tracks — 30+ plays, mostly via shuffle/autoplay">
          <p style={{ color: '#B3B3B3', fontSize: '0.75rem', margin: '0 0 8px' }}>
            You've heard these dozens of times but probably couldn't name them.
          </p>
          <TrackList items={ghostTracks} mainKey="name" subKey="artist" valueKey="plays" valueLabel="plays" />
        </StatBadge>

        {/* Most patient listener */}
        <StatBadge emoji="⏳" title="Most Patient — tracks you always let finish (avg listen time)">
          <TrackList items={patientTracks} mainKey="name" subKey="artist" valueKey="avgMin" valueLabel="min avg" />
        </StatBadge>

        {/* Instant skip */}
        <StatBadge emoji="⏭️" title="Instant Skip — tracks you always abandon immediately">
          {instantSkip.length > 0 ? (
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {instantSkip.map((t, i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                    <p style={{ margin: 0, color: '#FFFFFF', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                    <p style={{ margin: '2px 0 0', color: '#B3B3B3', fontSize: '0.75rem' }}>{t.artist}</p>
                  </div>
                  <span style={{ color: '#ff6b6b', fontSize: '0.8rem', fontWeight: 600 }}>
                    {t.avgSec.toFixed(0)}s avg
                  </span>
                </li>
              ))}
            </ol>
          ) : <p style={{ color: '#B3B3B3', fontSize: '0.85rem' }}>Not enough data.</p>}
        </StatBadge>

        {/* One-hit wonders */}
        <StatBadge emoji="☄️" title="One-Hit Wonders — played heavily for exactly one month, then gone">
          {oneHitWonders.length > 0 ? (
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {oneHitWonders.map((w, i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, color: '#FFFFFF', fontSize: '0.875rem' }}>{w.artist}</p>
                    <p style={{ margin: '2px 0 0', color: '#B3B3B3', fontSize: '0.75rem' }}>{w.month}</p>
                  </div>
                  <span style={{ color: '#ffd93d', fontWeight: 600, fontSize: '0.8rem' }}>{w.hours.toFixed(1)}h</span>
                </li>
              ))}
            </ol>
          ) : <p style={{ color: '#B3B3B3', fontSize: '0.85rem' }}>No one-hit wonders found.</p>}
        </StatBadge>

      </div>

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
