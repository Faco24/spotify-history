import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import Card, { SectionHeader, StatNumber, RankList, COLORS, tooltipStyle } from './Card';

function ShowGrid({ podcastTop5ByYear }) {
  const [tip, setTip] = useState(null);

  const colorMap = {};
  let ci = 0;
  for (const { shows } of podcastTop5ByYear) {
    for (const s of shows) {
      if (!(s.show in colorMap)) {
        colorMap[s.show] = COLORS[ci % COLORS.length];
        ci++;
      }
    }
  }

  const hasData = podcastTop5ByYear.some(y => y.shows.length > 0);
  if (!hasData) return <p style={{ color: '#B3B3B3' }}>No podcast data found.</p>;

  return (
    <div style={{ overflowX: 'auto', position: 'relative' }}>
      {tip && (
        <div style={{
          position: 'fixed', left: tip.x + 12, top: tip.y - 8,
          background: '#1a1a1a', border: `1px solid ${tip.color}`,
          borderRadius: 8, padding: '6px 12px',
          color: '#FFFFFF', fontSize: '0.8rem', fontWeight: 600,
          pointerEvents: 'none', zIndex: 9999, whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        }}>
          <span style={{ color: tip.color }}>{tip.show}</span>
          <span style={{ color: '#B3B3B3', marginLeft: 8 }}>{tip.hours}h</span>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: `40px repeat(${podcastTop5ByYear.length}, minmax(90px, 1fr))`, gap: 0 }}>
        <div />
        {podcastTop5ByYear.map(({ year }) => (
          <div key={year} style={{ textAlign: 'center', color: '#B3B3B3', fontSize: '0.8rem', fontWeight: 600, padding: '0 4px 10px' }}>
            {year}
          </div>
        ))}
        {[1, 2, 3, 4, 5].map(rank => (
          <>
            <div key={`label-${rank}`} style={{ color: '#B3B3B3', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              #{rank}
            </div>
            {podcastTop5ByYear.map(({ year, shows }) => {
              const entry = shows.find(s => s.rank === rank);
              return (
                <div key={`${year}-${rank}`} style={{ padding: '3px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {entry ? (
                    <span
                      onMouseEnter={e => setTip({ show: entry.show, hours: entry.hours.toFixed(1), color: colorMap[entry.show], x: e.clientX, y: e.clientY })}
                      onMouseMove={e => setTip(t => ({ ...t, x: e.clientX, y: e.clientY }))}
                      onMouseLeave={() => setTip(null)}
                      style={{
                        background: colorMap[entry.show],
                        color: '#000', fontWeight: 600, fontSize: '0.68rem',
                        padding: '4px 8px', borderRadius: 12,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        maxWidth: '100%', display: 'block', textAlign: 'center', cursor: 'default',
                      }}
                    >
                      {entry.show}
                    </span>
                  ) : (
                    <span style={{ color: '#3E3E3E', fontSize: '0.7rem' }}>—</span>
                  )}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

export default function PodcastSection({ data }) {
  const {
    totalMsPodcast, uniqueShows, uniqueEpisodes, firstPodcast,
    topShows, podcastTop5ByYear, hourComparison,
    longestPodcastDay, oneAndDone, rideOrDie,
  } = data;

  const totalPodcastHours = totalMsPodcast / 3_600_000;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <SectionHeader
        title="Podcasts"
        subtitle="Your podcast listening habits across the years"
      />

      {/* Overview stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
        <Card>
          <StatNumber value={Math.round(totalPodcastHours).toLocaleString()} label="Total podcast hours" green />
        </Card>
        <Card>
          <StatNumber value={uniqueShows.toLocaleString()} label="Unique shows" />
        </Card>
        <Card>
          <StatNumber value={uniqueEpisodes.toLocaleString()} label="Episodes played" />
        </Card>
        <Card>
          {firstPodcast ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '0.8rem', color: '#B3B3B3', fontWeight: 500 }}>First podcast ever</span>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>{firstPodcast.show}</span>
              <span style={{ fontSize: '0.75rem', color: '#B3B3B3' }}>
                {firstPodcast.date?.toISOString().slice(0, 10)}
              </span>
            </div>
          ) : (
            <StatNumber value="—" label="No podcast data" />
          )}
        </Card>
      </div>

      {/* Top 5 shows by year */}
      <Card title="Top 5 Podcast Shows — by year">
        <p style={{ color: '#B3B3B3', fontSize: '0.8rem', margin: '0 0 16px' }}>
          Your most-played podcast shows each year, ranked by total listening hours.
        </p>
        <ShowGrid podcastTop5ByYear={podcastTop5ByYear} />
      </Card>

      {/* All-time top 10 shows */}
      {topShows.length > 0 && (
        <Card title="All-time top 10 shows">
          <RankList items={topShows} valueKey="hours" valueFormat={v => `${v.toFixed(0)}h`} />
        </Card>
      )}

      {/* When do I podcast? — hour-of-day comparison */}
      <Card title="When do you podcast vs. listen to music?">
        <p style={{ color: '#B3B3B3', fontSize: '0.8rem', margin: '0 0 16px' }}>
          Total hours by hour of day (UTC). Green = music, purple = podcasts.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={hourComparison} barCategoryGap="15%">
            <CartesianGrid vertical={false} stroke="#3E3E3E" />
            <XAxis dataKey="hour" tick={{ fill: '#B3B3B3', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#B3B3B3', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${Math.round(v)}h`} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div style={{ ...tooltipStyle, padding: '10px 14px' }}>
                    <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#FFFFFF' }}>{label}</p>
                    {payload.map((p, i) => (
                      <p key={i} style={{ margin: '2px 0', color: p.fill, fontSize: '0.85rem' }}>
                        {p.dataKey}: {p.value.toFixed(0)}h
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Bar dataKey="music" fill="#1DB954" radius={[2, 2, 0, 0]} />
            <Bar dataKey="podcast" fill="#cc5de8" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#B3B3B3' }}>
            <span style={{ width: 10, height: 10, background: '#1DB954', borderRadius: 2 }} /> Music
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#B3B3B3' }}>
            <span style={{ width: 10, height: 10, background: '#cc5de8', borderRadius: 2 }} /> Podcasts
          </span>
        </div>
      </Card>

      {/* Fun stats */}
      <SectionHeader title="Fun Stats" subtitle="Podcast quirks and loyalties" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {/* Longest podcast day */}
        {longestPodcastDay && (
          <Card title="Longest podcast day">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <span style={{ fontSize: '2rem', fontWeight: 700, color: '#cc5de8' }}>
                  {longestPodcastDay.hours.toFixed(1)}h
                </span>
                <span style={{ color: '#B3B3B3', fontSize: '0.85rem', marginLeft: 12 }}>
                  on {longestPodcastDay.date}
                </span>
              </div>
              <p style={{ color: '#B3B3B3', fontSize: '0.8rem', margin: 0 }}>
                Listening to: {longestPodcastDay.shows.join(', ')}
              </p>
            </div>
          </Card>
        )}

        {/* Ride or die */}
        {rideOrDie.length > 0 && (
          <Card title="Ride or die — shows across the most years">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rideOrDie.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#1a1a1a', borderRadius: 8, padding: '8px 14px',
                  border: '1px solid #3E3E3E',
                }}>
                  <span style={{ color: '#FFFFFF', fontWeight: 500, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {s.name}
                  </span>
                  <div style={{ display: 'flex', gap: 12, flexShrink: 0, marginLeft: 12 }}>
                    <span style={{ color: '#1DB954', fontWeight: 700, fontSize: '0.8rem' }}>{s.years} yrs</span>
                    <span style={{ color: '#B3B3B3', fontSize: '0.75rem' }}>{s.hours.toFixed(0)}h</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* One and done */}
        {oneAndDone.length > 0 && (
          <Card title="One and done — shows you tried once">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {oneAndDone.map((name, i) => (
                <span key={i} style={{
                  background: '#3E3E3E', color: '#B3B3B3',
                  fontSize: '0.75rem', padding: '4px 10px',
                  borderRadius: 12, whiteSpace: 'nowrap',
                }}>
                  {name}
                </span>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
