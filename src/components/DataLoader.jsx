import { useState, useRef, useCallback } from 'react';

const S = {
  page: {
    minHeight: '100vh', background: '#191414',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '32px 16px',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 },
  title: { fontSize: '2.5rem', fontWeight: 700, color: '#FFFFFF', margin: 0 },
  sub: { color: '#B3B3B3', marginTop: 8, fontSize: '1.05rem' },
  zone: (active) => ({
    width: '100%', maxWidth: 600,
    border: `2px dashed ${active ? '#1DB954' : '#3E3E3E'}`,
    borderRadius: 16,
    background: active ? 'rgba(29,185,84,0.07)' : '#282828',
    padding: '56px 32px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: 8,
  }),
  btn: {
    background: '#1DB954', color: '#000000',
    border: 'none', borderRadius: 24,
    padding: '12px 32px', fontSize: '1rem', fontWeight: 700,
    cursor: 'pointer', marginTop: 8,
  },
  hint: { color: '#B3B3B3', fontSize: '0.85rem', marginTop: 4 },
  fileList: {
    width: '100%', maxWidth: 600, marginTop: 16,
    background: '#282828', borderRadius: 8, padding: '12px 16px',
  },
  fileItem: {
    display: 'flex', justifyContent: 'space-between',
    color: '#B3B3B3', fontSize: '0.875rem', padding: '4px 0',
    borderBottom: '1px solid #3E3E3E',
  },
};

export default function DataLoader({ onFiles, error }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const inputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const files = [...e.dataTransfer.files].filter(f => f.name.endsWith('.json'));
    if (files.length) setSelectedFiles(files);
  }, []);

  const handleChange = useCallback((e) => {
    const files = [...e.target.files].filter(f => f.name.endsWith('.json'));
    if (files.length) setSelectedFiles(files);
  }, []);

  return (
    <div style={S.page}>
      <div style={S.logo}>
        <svg viewBox="0 0 24 24" style={{ width: 48, height: 48 }} fill="#1DB954">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
        <h1 style={S.title}>Spotify History</h1>
      </div>
      <p style={{ color: '#B3B3B3', marginBottom: 24, fontSize: '1rem', textAlign: 'center', maxWidth: 500 }}>
        Drop your <strong style={{ color: '#FFFFFF' }}>Extended Streaming History</strong> JSON files here — all at once. Everything runs locally in your browser. Nothing is uploaded.
      </p>

      <div
        style={S.zone(dragActive)}
        onDragOver={e => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <svg viewBox="0 0 24 24" style={{ width: 48, height: 48, color: dragActive ? '#1DB954' : '#B3B3B3' }} fill="currentColor">
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
        </svg>
        <p style={{ color: dragActive ? '#1DB954' : '#B3B3B3', fontWeight: 600, margin: 0, fontSize: '1.1rem' }}>
          {dragActive ? 'Release to load files' : 'Drag & drop your JSON files here'}
        </p>
        <p style={S.hint}>or click to browse — select all Streaming_History_Audio_*.json files</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleChange}
        />
      </div>

      {error && (
        <div style={{ width: '100%', maxWidth: 600, marginTop: 16, background: 'rgba(255,107,107,0.12)', border: '1px solid rgba(255,107,107,0.4)', borderRadius: 8, padding: '12px 16px' }}>
          <p style={{ color: '#ff6b6b', margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Error loading files</p>
          <p style={{ color: '#ffaaaa', margin: '4px 0 0', fontSize: '0.8rem' }}>{error}</p>
          <p style={{ color: '#B3B3B3', margin: '8px 0 0', fontSize: '0.75rem' }}>Make sure you're dropping the <strong style={{ color: '#FFFFFF' }}>Streaming_History_Audio_*.json</strong> files from your Spotify data export.</p>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <>
          <div style={S.fileList}>
            <p style={{ color: '#FFFFFF', fontWeight: 600, marginBottom: 8, fontSize: '0.9rem' }}>
              {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
            </p>
            {selectedFiles.slice(0, 8).map((f, i) => (
              <div key={i} style={{ ...S.fileItem, borderBottom: i < selectedFiles.length - 1 ? '1px solid #3E3E3E' : 'none' }}>
                <span>{f.name}</span>
                <span>{(f.size / 1024 / 1024).toFixed(1)} MB</span>
              </div>
            ))}
            {selectedFiles.length > 8 && (
              <p style={{ color: '#B3B3B3', fontSize: '0.8rem', marginTop: 4 }}>
                +{selectedFiles.length - 8} more files
              </p>
            )}
          </div>
          <button style={S.btn} onClick={() => onFiles(selectedFiles)}>
            Analyze my history →
          </button>
        </>
      )}
    </div>
  );
}
