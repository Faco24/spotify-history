import { useState, useCallback } from 'react';
import { processData, computeGenreData } from './utils/dataProcessor';
import DataLoader from './components/DataLoader';
import WrappedDashboard from './components/WrappedDashboard';
import EvolutionSection from './components/EvolutionSection';
import DeviceSection from './components/DeviceSection';
import BehaviorSection from './components/BehaviorSection';
import SearchSection from './components/SearchSection';
import FunStatsSection from './components/FunStatsSection';

const TABS = [
  { id: 'wrapped', label: 'All-Time Wrapped' },
  { id: 'evolution', label: 'Evolution' },
  { id: 'devices', label: 'Devices & Platforms' },
  { id: 'behavior', label: 'Behavior' },
  { id: 'search', label: 'Search & Explore' },
  { id: 'fun', label: 'Fun Stats' },
];

async function fetchGenreMap(artists, apiKey) {
  const prompt = `You are a music genre expert. For each artist listed below, assign the most specific genre label that a music fan would actually use.
Avoid vague labels like "Rock", "Pop", "Electronic", "Hip-Hop", "Alternative".
Use specific ones like: "Britpop", "Shoegaze", "Neo Soul", "Argentine Rock", "Indie Folk", "Synthwave", "Post-Hardcore", "New Wave", "MPB", "Nu-Disco", "Trip-Hop", "French House", "Cumbia", "Reggaeton", "Grunge", "Art Rock", "Psychedelic Pop", "Deep House", "Neoclassical", etc.

Return ONLY a valid JSON object mapping each artist name exactly as given to a single genre string. No markdown fences, no explanation — just the raw JSON object.

Artists:
${artists.join('\n')}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic API error ${res.status}`);
  }

  const json = await res.json();
  const text = json.content?.[0]?.text || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse genre map from API response');
  return JSON.parse(match[0]);
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('wrapped');
  const [genreStatus, setGenreStatus] = useState('idle'); // 'idle'|'loading'|'ready'|'error'
  const [genreError, setGenreError] = useState(null);

  const handleFiles = useCallback(async (files) => {
    setLoading(true);
    setError(null);
    setGenreStatus('idle');
    setGenreError(null);
    setProgress('Reading files…');
    try {
      const allEntries = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`Parsing file ${i + 1} / ${files.length}: ${file.name}`);
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) allEntries.push(...parsed);
      }
      setProgress(`Processing ${allEntries.length.toLocaleString()} entries…`);
      await new Promise(r => setTimeout(r, 20));
      const result = processData(allEntries);
      setData(result);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
      setProgress('');
    }
  }, []);

  const handleFetchGenres = useCallback(async (apiKey) => {
    setGenreStatus('loading');
    setGenreError(null);
    try {
      const top50 = [...data.artistMap.entries()]
        .sort((a, b) => b[1].ms - a[1].ms)
        .slice(0, 50)
        .map(([name]) => name);
      const genreMap = await fetchGenreMap(top50, apiKey);
      const genreData = computeGenreData(data, genreMap);
      setData(prev => ({ ...prev, ...genreData }));
      setGenreStatus('ready');
    } catch (gErr) {
      console.error('Genre fetch failed:', gErr);
      setGenreError(gErr.message);
      setGenreStatus('error');
    }
  }, [data]);

  if (!data && !loading) {
    return <DataLoader onFiles={handleFiles} error={error} />;
  }

  if (loading) {
    return (
      <div style={{ background: '#191414', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          border: '4px solid #3E3E3E', borderTopColor: '#1DB954',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#B3B3B3', fontSize: '1rem' }}>{progress}</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#191414', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ background: '#121212', borderBottom: '1px solid #282828', position: 'sticky', top: 0, zIndex: 50, padding: '12px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg viewBox="0 0 24 24" style={{ width: 32, height: 32 }} fill="#1DB954">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            <span style={{ fontWeight: 700, fontSize: '1.2rem', color: '#FFFFFF' }}>Spotify History</span>
          </div>
          <button
            onClick={() => setData(null)}
            style={{ color: '#B3B3B3', background: '#282828', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Load new files
          </button>
        </div>
      </header>

      {/* Tab navigation */}
      <nav style={{ background: '#121212', borderBottom: '1px solid #282828', position: 'sticky', top: 57, zIndex: 40, overflowX: 'auto' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px',
                fontSize: '0.875rem',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #1DB954' : '2px solid transparent',
                color: activeTab === tab.id ? '#FFFFFF' : '#B3B3B3',
                cursor: 'pointer',
                transition: 'color 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 16px' }}>
        {activeTab === 'wrapped' && <WrappedDashboard data={data} />}
        {activeTab === 'evolution' && <EvolutionSection data={data} genreStatus={genreStatus} genreError={genreError} onFetchGenres={handleFetchGenres} />}
        {activeTab === 'devices' && <DeviceSection data={data} />}
        {activeTab === 'behavior' && <BehaviorSection data={data} />}
        {activeTab === 'search' && <SearchSection data={data} />}
        {activeTab === 'fun' && <FunStatsSection data={data} />}
      </main>
    </div>
  );
}
