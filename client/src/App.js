import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';

const API = process.env.REACT_APP_API_URL || '';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function App() {
  const [tab, setTab] = useState('search'); // 'search' | 'upload'
  const [searchBy, setSearchBy] = useState('genus');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState(null);
  const inputRef = useRef(null);
  const debouncedQuery = useDebounce(query, 300);

  const LIMIT = 50;

  useEffect(() => {
    fetch(`${API}/api/stats`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  // Autocomplete suggestions
  useEffect(() => {
    if (debouncedQuery.length < 2) { setSuggestions([]); return; }
    const endpoint = searchBy === 'genus' ? '/api/genera' : '/api/common-names';
    fetch(`${API}${endpoint}`)
      .then(r => r.json())
      .then(list => {
        const q = debouncedQuery.toLowerCase();
        setSuggestions(list.filter(s => s.toLowerCase().includes(q)).slice(0, 8));
      })
      .catch(() => {});
  }, [debouncedQuery, searchBy]);

  const search = useCallback((q = query, p = 1) => {
    setShowSugg(false);
    setLoading(true);
    setPage(p);
    fetch(`${API}/api/plants?q=${encodeURIComponent(q)}&by=${searchBy}&page=${p}&limit=${LIMIT}`)
      .then(r => r.json())
      .then(data => { setResults(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [query, searchBy]);

  function handleKeyDown(e) {
    if (e.key === 'Enter') search();
  }

  function pickSuggestion(s) {
    setQuery(s);
    setSuggestions([]);
    setShowSugg(false);
    search(s, 1);
  }

  function switchSearchBy(mode) {
    setSearchBy(mode);
    setQuery('');
    setResults(null);
    setSuggestions([]);
  }

  const totalPages = results ? Math.ceil(results.total / LIMIT) : 0;

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-leaf">🌿</span>
            <span className="logo-text">NNO Location</span>
          </div>
          {stats && (
            <span className="stat-badge">{stats.totalPlants.toLocaleString()} plants in database</span>
          )}
          <nav className="nav">
            <button className={tab === 'search' ? 'nav-btn active' : 'nav-btn'} onClick={() => setTab('search')}>Search</button>
            <button className={tab === 'upload' ? 'nav-btn active' : 'nav-btn'} onClick={() => setTab('upload')}>Update Data</button>
          </nav>
        </div>
      </header>

      <main className="main">
        {tab === 'search' && (
          <div className="search-panel">
            <div className="search-bar-card">
              <h1 className="search-title">Find a Plant</h1>
              <div className="mode-buttons">
                <button
                  className={searchBy === 'genus' ? 'mode-btn active' : 'mode-btn'}
                  onClick={() => switchSearchBy('genus')}
                >Search by Genus</button>
                <button
                  className={searchBy === 'common' ? 'mode-btn active' : 'mode-btn'}
                  onClick={() => switchSearchBy('common')}
                >Search by Common Name</button>
              </div>
              <div className="search-input-wrap">
                <input
                  ref={inputRef}
                  className="search-input"
                  type="text"
                  placeholder={searchBy === 'genus' ? 'e.g. Acer, Quercus…' : 'e.g. Maple, Oak…'}
                  value={query}
                  onChange={e => { setQuery(e.target.value); setShowSugg(true); }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setShowSugg(true)}
                  onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                  autoComplete="off"
                />
                <button className="search-btn" onClick={() => search()}>Search</button>
                {showSugg && suggestions.length > 0 && (
                  <ul className="suggestions">
                    {suggestions.map(s => (
                      <li key={s} onMouseDown={() => pickSuggestion(s)}>{s}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {loading && <div className="spinner-wrap"><div className="spinner" /></div>}

            {!loading && results && (
              <>
                <div className="results-header">
                  <span>{results.total} result{results.total !== 1 ? 's' : ''}</span>
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button disabled={page <= 1} onClick={() => search(query, page - 1)}>‹ Prev</button>
                      <span>Page {page} of {totalPages}</span>
                      <button disabled={page >= totalPages} onClick={() => search(query, page + 1)}>Next ›</button>
                    </div>
                  )}
                </div>

                {results.rows.length === 0
                  ? <div className="empty">No plants found. Try a different search term.</div>
                  : <>
                    {/* Card view — shown on mobile */}
                    <div className="result-cards">
                      {results.rows.map(r => (
                        <div className="result-card" key={r.id}>
                          <div className="card-genus">{r.Genus}</div>
                          <div className="card-botanical">{r.BotanicalName}</div>
                          {r.CommonName && <div className="card-common">{r.CommonName}</div>}
                          <div className="card-row">
                            {r.ProductSize && (
                              <span className="card-pill">
                                <span className="card-pill-label">Size</span>
                                <span className="card-pill-value">{r.ProductSize}</span>
                              </span>
                            )}
                            {r.OutletLocation && (
                              <span className="card-pill location">
                                <span className="card-pill-label">Outlet</span>
                                <span className="card-pill-value">{r.OutletLocation}</span>
                              </span>
                            )}
                            {r.NurseryLocation && (
                              <span className="card-pill location">
                                <span className="card-pill-label">Nursery</span>
                                <span className="card-pill-value">{r.NurseryLocation}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Table view — shown on desktop */}
                    <div className="table-wrap">
                      <table className="results-table">
                        <thead>
                          <tr>
                            <th>Genus</th>
                            <th>Botanical Name</th>
                            <th>Common Name</th>
                            <th>Size</th>
                            <th>Outlet Location</th>
                            <th>Nursery Location</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.rows.map(r => (
                            <tr key={r.id}>
                              <td className="genus-cell">{r.Genus}</td>
                              <td className="botanical-cell"><em>{r.BotanicalName}</em></td>
                              <td>{r.CommonName}</td>
                              <td className="size-cell">{r.ProductSize}</td>
                              <td className="location-cell">{r.OutletLocation}</td>
                              <td className="location-cell nursery">{r.NurseryLocation}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                }
              </>
            )}

            {!loading && !results && (
              <div className="placeholder">
                <div className="placeholder-icon">🌱</div>
                <p>Search by genus or common name to find plant locations.</p>
              </div>
            )}
          </div>
        )}

        {tab === 'upload' && <UploadPanel onSuccess={() => {
          fetch(`${API}/api/stats`).then(r => r.json()).then(setStats).catch(() => {});
          setTab('search');
        }} />}
      </main>
    </div>
  );
}

function UploadPanel({ onSuccess }) {
  const [mode, setMode] = useState('file'); // 'file' | 'api'
  const [file, setFile] = useState(null);
  const [apiJson, setApiJson] = useState('');
  const [status, setStatus] = useState(null); // {ok, message}
  const [busy, setBusy] = useState(false);

  async function handleFileUpload(e) {
    e.preventDefault();
    if (!file) return;
    setBusy(true); setStatus(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${API}/api/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        setStatus({ ok: true, message: `Successfully loaded ${data.inserted} plant records.` });
        setTimeout(onSuccess, 1500);
      } else {
        setStatus({ ok: false, message: data.error });
      }
    } catch (err) {
      setStatus({ ok: false, message: err.message });
    }
    setBusy(false);
  }

  async function handleApiPush(e) {
    e.preventDefault();
    setBusy(true); setStatus(null);
    try {
      const parsed = JSON.parse(apiJson);
      const res = await fetch(`${API}/api/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ ok: true, message: `Successfully loaded ${data.inserted} plant records.` });
        setTimeout(onSuccess, 1500);
      } else {
        setStatus({ ok: false, message: data.error });
      }
    } catch (err) {
      setStatus({ ok: false, message: err.message });
    }
    setBusy(false);
  }

  return (
    <div className="upload-panel">
      <h2>Update Plant Data</h2>
      <p className="upload-note">
        Uploading new data <strong>replaces</strong> the entire plant database.
      </p>

      <div className="mode-buttons" style={{ marginBottom: '1.5rem' }}>
        <button className={mode === 'file' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('file')}>
          CSV / JSON File Upload
        </button>
        <button className={mode === 'api' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('api')}>
          API / JSON Push
        </button>
      </div>

      {mode === 'file' && (
        <form className="upload-form" onSubmit={handleFileUpload}>
          <label className="file-label">
            <input
              type="file"
              accept=".csv,.json"
              onChange={e => setFile(e.target.files[0])}
            />
            {file ? file.name : 'Choose a CSV or JSON file…'}
          </label>
          <div className="upload-hint">
            CSV columns: <code>PullGroup, ProductID, ProductSize, Genus, BotanicalName, CommonName, CommonNameAlpha, Outlet Location, Nursery Location</code>
          </div>
          <button className="upload-btn" type="submit" disabled={!file || busy}>
            {busy ? 'Uploading…' : 'Upload & Replace Data'}
          </button>
        </form>
      )}

      {mode === 'api' && (
        <form className="upload-form" onSubmit={handleApiPush}>
          <p className="upload-hint">
            Paste a JSON array of plant records, or send a <code>POST /api/data</code> with the array as the request body from your SQL export script.
          </p>
          <textarea
            className="json-input"
            rows={12}
            placeholder={'[\n  {\n    "Genus": "Acer",\n    "BotanicalName": "Acer palmatum",\n    "CommonName": "Japanese Maple",\n    "ProductSize": "3gal",\n    "Outlet Location": "A-12",\n    "Nursery Location": "B-04"\n  }\n]'}
            value={apiJson}
            onChange={e => setApiJson(e.target.value)}
          />
          <button className="upload-btn" type="submit" disabled={!apiJson.trim() || busy}>
            {busy ? 'Sending…' : 'Push Data'}
          </button>
          <div className="api-doc">
            <strong>Direct API endpoint:</strong><br />
            <code>POST /api/data</code> — JSON body: array of plant objects<br />
            <code>POST /api/upload</code> — multipart form, field name <code>file</code>, CSV or JSON file
          </div>
        </form>
      )}

      {status && (
        <div className={status.ok ? 'status-ok' : 'status-err'}>{status.message}</div>
      )}
    </div>
  );
}
