import React, { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';

const DATA_URL = process.env.PUBLIC_URL + '/plants.json';
const PAGE_SIZE = 50;

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function App() {
  const [tab, setTab] = useState('search');
  const [allPlants, setAllPlants] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [searchBy, setSearchBy] = useState('genus');
  const [query, setQuery] = useState('');
  const [showSugg, setShowSugg] = useState(false);
  const [page, setPage] = useState(1);
  const inputRef = useRef(null);
  const debouncedQuery = useDebounce(query, 200);

  // Load plant data once
  useEffect(() => {
    fetch(DATA_URL)
      .then(r => { if (!r.ok) throw new Error('Failed to load data'); return r.json(); })
      .then(data => setAllPlants(data))
      .catch(err => setLoadError(err.message));
  }, []);

  // Filtered results (client-side)
  const filtered = useMemo(() => {
    if (!allPlants) return [];
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return allPlants;
    if (searchBy === 'genus') {
      return allPlants.filter(p => p.Genus && p.Genus.toLowerCase().includes(q));
    }
    return allPlants.filter(p =>
      (p.CommonName && p.CommonName.toLowerCase().includes(q)) ||
      (p.CommonNameAlpha && p.CommonNameAlpha.toLowerCase().includes(q))
    );
  }, [allPlants, debouncedQuery, searchBy]);

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [debouncedQuery, searchBy]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!allPlants || debouncedQuery.length < 2) return [];
    const q = debouncedQuery.toLowerCase();
    const seen = new Set();
    const results = [];
    for (const p of allPlants) {
      const val = searchBy === 'genus' ? p.Genus : p.CommonName;
      if (val && val.toLowerCase().includes(q) && !seen.has(val)) {
        seen.add(val);
        results.push(val);
        if (results.length >= 8) break;
      }
    }
    return results;
  }, [allPlants, debouncedQuery, searchBy]);

  function pickSuggestion(s) {
    setQuery(s);
    setShowSugg(false);
    inputRef.current?.blur();
  }

  function switchSearchBy(mode) {
    setSearchBy(mode);
    setQuery('');
    setShowSugg(false);
  }

  const searched = debouncedQuery.trim().length > 0;

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-leaf">🌿</span>
            <span className="logo-text">NNO Location</span>
          </div>
          {allPlants && (
            <span className="stat-badge">{allPlants.length.toLocaleString()} plants</span>
          )}
          <nav className="nav">
            <button className={tab === 'search' ? 'nav-btn active' : 'nav-btn'} onClick={() => setTab('search')}>Search</button>
            <button className={tab === 'update' ? 'nav-btn active' : 'nav-btn'} onClick={() => setTab('update')}>Update Data</button>
          </nav>
        </div>
      </header>

      <main className="main">
        {tab === 'search' && (
          <div className="search-panel">
            <div className="search-bar-card">
              <h1 className="search-title">Find a Plant</h1>
              <div className="mode-buttons">
                <button className={searchBy === 'genus' ? 'mode-btn active' : 'mode-btn'} onClick={() => switchSearchBy('genus')}>
                  Search by Genus
                </button>
                <button className={searchBy === 'common' ? 'mode-btn active' : 'mode-btn'} onClick={() => switchSearchBy('common')}>
                  Search by Common Name
                </button>
              </div>
              <div className="search-input-wrap">
                <input
                  ref={inputRef}
                  className="search-input"
                  type="text"
                  placeholder={searchBy === 'genus' ? 'e.g. Acer, Malus…' : 'e.g. Apple, Maple…'}
                  value={query}
                  onChange={e => { setQuery(e.target.value); setShowSugg(true); }}
                  onFocus={() => setShowSugg(true)}
                  onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                  autoComplete="off"
                  disabled={!allPlants}
                />
                {showSugg && suggestions.length > 0 && (
                  <ul className="suggestions">
                    {suggestions.map(s => (
                      <li key={s} onMouseDown={() => pickSuggestion(s)}>{s}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {loadError && (
              <div className="status-err">Could not load plant data: {loadError}</div>
            )}

            {!allPlants && !loadError && (
              <div className="spinner-wrap"><div className="spinner" /></div>
            )}

            {allPlants && !searched && (
              <div className="placeholder">
                <div className="placeholder-icon">🌱</div>
                <p>Search by genus or common name to find plant locations.</p>
              </div>
            )}

            {allPlants && searched && (
              <>
                <div className="results-header">
                  <span>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
                      <span>Page {page} of {totalPages}</span>
                      <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
                    </div>
                  )}
                </div>

                {filtered.length === 0
                  ? <div className="empty">No plants found. Try a different search term.</div>
                  : <>
                    {/* Card view — mobile */}
                    <div className="result-cards">
                      {pageRows.map((r, i) => (
                        <div className="result-card" key={i}>
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
                            {r['Outlet Location'] && (
                              <span className="card-pill location">
                                <span className="card-pill-label">Outlet</span>
                                <span className="card-pill-value">{r['Outlet Location']}</span>
                              </span>
                            )}
                            {r['Nursery Location'] && (
                              <span className="card-pill location">
                                <span className="card-pill-label">Nursery</span>
                                <span className="card-pill-value">{r['Nursery Location']}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Table view — desktop */}
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
                          {pageRows.map((r, i) => (
                            <tr key={i}>
                              <td className="genus-cell">{r.Genus}</td>
                              <td className="botanical-cell"><em>{r.BotanicalName}</em></td>
                              <td>{r.CommonName}</td>
                              <td className="size-cell">{r.ProductSize}</td>
                              <td className="location-cell">{r['Outlet Location']}</td>
                              <td className="location-cell nursery">{r['Nursery Location']}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                }
              </>
            )}
          </div>
        )}

        {tab === 'update' && <UpdatePanel />}
      </main>
    </div>
  );
}

function UpdatePanel() {
  return (
    <div className="upload-panel">
      <h2>Update Plant Data</h2>
      <p className="upload-note">
        This app is hosted on GitHub Pages. To update the plant data, replace the
        <code> client/public/plants.json</code> file in the repository and push — the site
        rebuilds automatically within a minute.
      </p>

      <div className="update-steps">
        <div className="update-step">
          <div className="step-num">1</div>
          <div className="step-body">
            <strong>Export your data</strong>
            <p>Run your SQL query and export the results as a JSON array. Each record should include:
              <code> PullGroup, ProductID, ProductSize, Genus, BotanicalName, CommonName, CommonNameAlpha, Outlet Location, Nursery Location</code>
            </p>
          </div>
        </div>
        <div className="update-step">
          <div className="step-num">2</div>
          <div className="step-body">
            <strong>Replace plants.json</strong>
            <p>In the GitHub repository, navigate to <code>client/public/plants.json</code>, click the pencil icon, paste your new data, and commit.</p>
          </div>
        </div>
        <div className="update-step">
          <div className="step-num">3</div>
          <div className="step-body">
            <strong>Wait ~1 minute</strong>
            <p>GitHub Actions rebuilds the site automatically. Refresh the app and your new data will be live.</p>
          </div>
        </div>
      </div>

      <div className="api-doc" style={{marginTop: '1.5rem'}}>
        <strong>Automate it:</strong> POST your JSON directly to the GitHub Contents API to update
        <code> plants.json</code> without touching GitHub manually — contact your developer to set this up.
      </div>
    </div>
  );
}
