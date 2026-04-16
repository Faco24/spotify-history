import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, LineChart, Line, Legend,
} from 'recharts';
import Card, { SectionHeader, COLORS, tooltipStyle } from './Card';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ ...tooltipStyle, padding: '10px 14px' }}>
      <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#FFFFFF' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '2px 0', color: p.color || '#1DB954', fontSize: '0.8rem' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
          {p.unit || ''}
        </p>
      ))}
    </div>
  );
};

export default function DeviceSection({ data }) {
  const { platformByYear, allPlatforms, offlineByYear, shuffleByYear, incognitoByYear } = data;

  // Assign colors to platforms
  const platformColors = {};
  allPlatforms.forEach((p, i) => { platformColors[p] = COLORS[i % COLORS.length]; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <SectionHeader
        title="Devices & Platforms"
        subtitle="Your device migration story told through listening data"
      />

      {/* Platform stacked area */}
      <Card title="Platform breakdown over time (hours/year)">
        <p style={{ color: '#B3B3B3', fontSize: '0.8rem', margin: '0 0 16px' }}>
          Stacked area showing your shift between devices across years.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={platformByYear}>
            <CartesianGrid vertical={false} stroke="#3E3E3E" />
            <XAxis dataKey="year" tick={{ fill: '#B3B3B3', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#B3B3B3', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            {allPlatforms.map(p => (
              <Area
                key={p}
                type="monotone"
                dataKey={p}
                stackId="1"
                stroke={platformColors[p]}
                fill={platformColors[p]}
                fillOpacity={0.6}
                name={p}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 12 }}>
          {allPlatforms.map(p => (
            <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#B3B3B3' }}>
              <span style={{ width: 10, height: 10, background: platformColors[p], borderRadius: 2, flexShrink: 0 }} />
              {p}
            </span>
          ))}
        </div>
      </Card>

      {/* Offline ratio */}
      <Card title="Offline vs Online listening — % per year">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={offlineByYear} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="#3E3E3E" />
            <XAxis dataKey="year" tick={{ fill: '#B3B3B3', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#B3B3B3', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(0)}%`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="offline" name="Offline %" fill="#1DB954" radius={[4, 4, 0, 0]} stackId="a" unit="%" />
            <Bar dataKey="online" name="Online %" fill="#3E3E3E" radius={[4, 4, 0, 0]} stackId="a" unit="%" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Shuffle trend */}
      <Card title="Shuffle mode usage — % of tracks started on shuffle per year">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={shuffleByYear}>
            <CartesianGrid vertical={false} stroke="#3E3E3E" />
            <XAxis dataKey="year" tick={{ fill: '#B3B3B3', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#B3B3B3', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(0)}%`} domain={[0, 100]} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div style={{ ...tooltipStyle, padding: '10px 14px' }}>
                    <p style={{ margin: 0, color: '#FFFFFF', fontWeight: 600 }}>{label}</p>
                    <p style={{ margin: '4px 0 0', color: '#1DB954' }}>{payload[0]?.value?.toFixed(1)}% on shuffle</p>
                  </div>
                );
              }}
            />
            <Line type="monotone" dataKey="shufflePct" stroke="#1DB954" dot={{ r: 4, fill: '#1DB954' }} strokeWidth={2} name="Shuffle %" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Incognito */}
      <Card title="Incognito mode usage over time">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={incognitoByYear} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="#3E3E3E" />
            <XAxis dataKey="year" tick={{ fill: '#B3B3B3', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#B3B3B3', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v.toFixed(0)}%`} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div style={{ ...tooltipStyle, padding: '10px 14px' }}>
                    <p style={{ margin: 0, color: '#FFFFFF', fontWeight: 600 }}>{label}</p>
                    <p style={{ margin: '4px 0 0', color: '#ff6b6b' }}>{payload[0]?.value?.toFixed(2)}% incognito</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="incognito" name="Incognito %" fill="#ff6b6b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
