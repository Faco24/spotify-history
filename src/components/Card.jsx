export default function Card({ title, children, accent, style = {} }) {
  return (
    <div style={{
      background: '#282828',
      borderRadius: 12,
      padding: '20px 24px',
      border: accent ? `1px solid rgba(29,185,84,0.3)` : '1px solid #3E3E3E',
      ...style,
    }}>
      {title && (
        <h3 style={{
          fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: '#B3B3B3', margin: '0 0 16px 0',
        }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

export function StatNumber({ value, label, green }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '2.2rem', fontWeight: 700, color: green ? '#1DB954' : '#FFFFFF', lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: '0.8rem', color: '#B3B3B3', fontWeight: 500 }}>{label}</span>
    </div>
  );
}

export function RankList({ items, valueKey = 'hours', valueFormat = v => `${v.toFixed(1)}h`, labelKey = 'name' }) {
  const max = Math.max(...items.map(i => i[valueKey]));
  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 24, textAlign: 'right',
            fontSize: '0.75rem', fontWeight: 700,
            color: i === 0 ? '#1DB954' : '#B3B3B3',
            flexShrink: 0,
          }}>
            {i + 1}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item[labelKey]}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#B3B3B3', flexShrink: 0, marginLeft: 8 }}>
                {valueFormat(item[valueKey])}
              </span>
            </div>
            <div style={{ height: 3, background: '#3E3E3E', borderRadius: 2 }}>
              <div style={{
                height: '100%',
                width: `${(item[valueKey] / max) * 100}%`,
                background: i === 0 ? '#1DB954' : '#535353',
                borderRadius: 2,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 6px 0' }}>
        {title}
      </h2>
      {subtitle && <p style={{ color: '#B3B3B3', margin: 0, fontSize: '0.9rem' }}>{subtitle}</p>}
    </div>
  );
}

export const COLORS = [
  '#1DB954', '#1ed760', '#ff6b6b', '#ffd93d', '#6bcb77',
  '#4d96ff', '#ff922b', '#cc5de8', '#20c997', '#f783ac',
  '#94d82d', '#74c0fc',
];

export const tooltipStyle = {
  background: '#282828',
  border: '1px solid #3E3E3E',
  borderRadius: 8,
  color: '#FFFFFF',
  fontSize: '0.85rem',
};
