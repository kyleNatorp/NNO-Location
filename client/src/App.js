import React, { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';

const DATA_URL = process.env.PUBLIC_URL + '/plants.json';
const PAGE_SIZE = 75;

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function App() {
  const [tab, setTab] = useState('browse');
  const [allPlants, setAllPlants] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [sortBy, setSortBy] = useState('botanical');
  const [browsePage, setBrowsePage] = useState(1);
  const [groupSearch, setGroupSearch] = useState('');
  const debouncedGroupSearch = useDebounce(groupSearch, 150);

  const [searchBy, setSearchBy] = useState('genus');
  const [query, setQuery] = useState('');
  const [showSugg, setShowSugg] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const inputRef = useRef(null);
  const debouncedQuery = useDebounce(query, 200);

  useEffect(() => {
    fetch(DATA_URL)
      .then(r => { if (!r.ok) throw new Error('Failed to load data'); return r.json(); })
      .then(data => setAllPlants(data))
      .catch(err => setLoadError(err.message));
  }, []);

  const groups = useMemo(() => {
    if (!allPlants) return [];
    const seen = new Set();
    allPlants.forEach(p => p.PullGroup && seen.add(p.PullGroup));
    return [...seen].sort();
  }, [allPlants]);

  const groupPlants = useMemo(() => {
    if (!allPlants || !selectedGroup) return [];
    const filtered = allPlants.filter(p => p.PullGroup === selectedGroup);
    if (sortBy === 'common') {
      return [...filtered].sort((a, b) => (a.CommonName || '').localeCompare(b.CommonName || ''));
    }
    return [...filtered].sort((a, b) => (a.BotanicalName || '').localeCompare(b.BotanicalName || ''));
  }, [allPlants, selectedGroup, sortBy]);

  const groupFiltered = useMemo(() => {
    const q = debouncedGroupSearch.trim().toLowerCase();
    if (!q) return groupPlants;
    return groupPlants.filter(p =>
      (p.BotanicalName && p.BotanicalName.toLowerCase().includes(q)) ||
      (p.CommonName && p.CommonName.toLowerCase().includes(q))
    );
  }, [groupPlants, debouncedGroupSearch]);

  const browsePages = Math.ceil(groupFiltered.length / PAGE_SIZE);
  const browseRows = groupFiltered.slice((browsePage - 1) * PAGE_SIZE, browsePage * PAGE_SIZE);

  function selectGroup(g) { setSelectedGroup(g); setBrowsePage(1); setGroupSearch(''); }
  function clearGroup() { setSelectedGroup(null); setGroupSearch(''); }

  const filtered = useMemo(() => {
    if (!allPlants) return [];
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return [];
    if (searchBy === 'genus') return allPlants.filter(p => p.Genus && p.Genus.toLowerCase().includes(q));
    return allPlants.filter(p =>
      (p.CommonName && p.CommonName.toLowerCase().includes(q)) ||
      (p.CommonNameAlpha && p.CommonNameAlpha.toLowerCase().includes(q))
    );
  }, [allPlants, debouncedQuery, searchBy]);

  useEffect(() => { setBrowsePage(1); }, [debouncedGroupSearch]);
  useEffect(() => { setSearchPage(1); }, [debouncedQuery, searchBy]);

  const searchPages = Math.ceil(filtered.length / PAGE_SIZE);
  const searchRows = filtered.slice((searchPage - 1) * PAGE_SIZE, searchPage * PAGE_SIZE);

  const suggestions = useMemo(() => {
    if (!allPlants || debouncedQuery.length < 2) return [];
    const q = debouncedQuery.toLowerCase();
    const seen = new Set();
    const results = [];
    for (const p of allPlants) {
      const val = searchBy === 'genus' ? p.Genus : p.CommonName;
      if (val && val.toLowerCase().includes(q) && !seen.has(val)) { seen.add(val); results.push(val); if (results.length >= 8) break; }
    }
    return results;
  }, [allPlants, debouncedQuery, searchBy]);

  function switchTab(t) { setTab(t); if (t === 'browse') setSelectedGroup(null); }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-leaf">🌿</span>
            <span className="logo-text">NNO Location</span>
          </div>
          {allPlants && <span className="stat-badge">{allPlants.length.toLocaleString()} plants</span>}
          <nav className="nav">
            <button className={tab === 'browse' ? 'nav-btn active' : 'nav-btn'} onClick={() => switchTab('browse')}>Browse</button>
            <button className={tab === 'search' ? 'nav-btn active' : 'nav-btn'} onClick={() => switchTab('search')}>Search</button>
            <button className={tab === 'update' ? 'nav-btn active' : 'nav-btn'} onClick={() => switchTab('update')}>Update Data</button>
          </nav>
        </div>
      </header>

      <main className="main">
        {loadError && <div className="status-err">Could not load plant data: {loadError}</div>}
        {!allPlants && !loadError && <div className="spinner-wrap"><div className="spinner" /></div>}

        {tab === 'browse' && allPlants && !selectedGroup && (
          <div className="groups-panel">
            <h1 className="page-title">Select a Plant Group</h1>
            <div className="group-grid">
              {groups.map(g => (
                <button key={g} className="group-btn" onClick={() => selectGroup(g)}>
                  <span className="group-icon">{groupIcon(g)}</span>
                  <span className="group-label">{g}</span>
                  <span className="group-count">{allPlants.filter(p => p.PullGroup === g).length}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'browse' && allPlants && selectedGroup && (
          <div className="group-detail">
            <div className="detail-header">
              <button className="back-btn" onClick={clearGroup}>← Groups</button>
              <h2 className="detail-title">{selectedGroup}</h2>
              <div className="sort-toggle">
                <button className={sortBy === 'botanical' ? 'sort-btn active' : 'sort-btn'} onClick={() => { setSortBy('botanical'); setBrowsePage(1); }}>Botanical</button>
                <button className={sortBy === 'common' ? 'sort-btn active' : 'sort-btn'} onClick={() => { setSortBy('common'); setBrowsePage(1); }}>Common</button>
              </div>
            </div>

            <div className="group-search-wrap">
              <input
                className="group-search-input"
                type="text"
                placeholder="Filter plants in this group…"
                value={groupSearch}
                onChange={e => setGroupSearch(e.target.value)}
                autoComplete="off"
              />
              {groupSearch && <button className="group-search-clear" onClick={() => setGroupSearch('')}>✕</button>}
            </div>

            <div className="results-header">
              <span>
                {groupFiltered.length !== groupPlants.length
                  ? `${groupFiltered.length} of ${groupPlants.length} plants`
                  : `${groupPlants.length} plant${groupPlants.length !== 1 ? 's' : ''}`}
              </span>
              {browsePages > 1 && (
                <div className="pagination">
                  <button disabled={browsePage <= 1} onClick={() => setBrowsePage(p => p - 1)}>‹</button>
                  <span>{browsePage} / {browsePages}</span>
                  <button disabled={browsePage >= browsePages} onClick={() => setBrowsePage(p => p + 1)}>›</button>
                </div>
              )}
            </div>

            {groupFiltered.length === 0
              ? <div className="empty">No plants match "{groupSearch}".</div>
              : <div className="plant-list-wrap">
                  <table className="plant-list-table">
                    <thead>
                      <tr>
                        <th className="col-name">
                          {sortBy === 'botanical' ? 'Botanical Name' : 'Common Name'}
                          <span className="col-name-sub">{sortBy === 'botanical' ? ' / Common Name' : ' / Botanical Name'}</span>
                        </th>
                        <th className="col-size">Size</th>
                        <th className="col-loc">Outlet</th>
                        <th className="col-loc">Nursery</th>
                      </tr>
                    </thead>
                    <tbody>
                      {browseRows.map((r, i) => {
                        const primary = sortBy === 'botanical' ? r.BotanicalName : r.CommonName;
                        const secondary = sortBy === 'botanical' ? r.CommonName : r.BotanicalName;
                        return (
                          <tr key={i}>
                            <td className="col-name">
                              <div className="name-primary">{sortBy === 'botanical' ? <em>{primary}</em> : primary}</div>
                              {secondary && <div className="name-secondary">{sortBy === 'botanical' ? secondary : <em>{secondary}</em>}</div>}
                            </td>
                            <td className="col-size">{r.ProductSize}</td>
                            <td className="col-loc outlet">{r['Outlet Location']}</td>
                            <td className="col-loc nursery">{r['Nursery Location']}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        )}

        {tab === 'search' && allPlants && (
          <div className="search-panel">
            <div className="search-bar-card">
              <h1 className="search-title">Find a Plant</h1>
              <div className="mode-buttons">
                <button className={searchBy === 'genus' ? 'mode-btn active' : 'mode-btn'} onClick={() => { setSearchBy('genus'); setQuery(''); }}>Search by Genus</button>
                <button className={searchBy === 'common' ? 'mode-btn active' : 'mode-btn'} onClick={() => { setSearchBy('common'); setQuery(''); }}>Search by Common Name</button>
              </div>
              <div className="search-input-wrap">
                <input ref={inputRef} className="search-input" type="text"
                  placeholder={searchBy === 'genus' ? 'e.g. Acer, Malus…' : 'e.g. Apple, Maple…'}
                  value={query}
                  onChange={e => { setQuery(e.target.value); setShowSugg(true); }}
                  onFocus={() => setShowSugg(true)}
                  onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                  autoComplete="off" />
                {showSugg && suggestions.length > 0 && (
                  <ul className="suggestions">
                    {suggestions.map(s => <li key={s} onMouseDown={() => { setQuery(s); setShowSugg(false); }}>{s}</li>)}
                  </ul>
                )}
              </div>
            </div>
            {!debouncedQuery.trim() && (
              <div className="placeholder"><div className="placeholder-icon">🔍</div><p>Type a genus or common name to find plants.</p></div>
            )}
            {debouncedQuery.trim() && (
              <>
                <div className="results-header">
                  <span>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
                  {searchPages > 1 && (
                    <div className="pagination">
                      <button disabled={searchPage <= 1} onClick={() => setSearchPage(p => p - 1)}>‹ Prev</button>
                      <span>Page {searchPage} of {searchPages}</span>
                      <button disabled={searchPage >= searchPages} onClick={() => setSearchPage(p => p + 1)}>Next ›</button>
                    </div>
                  )}
                </div>
                {filtered.length === 0
                  ? <div className="empty">No plants found.</div>
                  : <>
                    <div className="result-cards">{searchRows.map((r, i) => <PlantCard key={i} r={r} sortBy="botanical" />)}</div>
                    <div className="table-wrap">
                      <table className="results-table">
                        <thead><tr><th>Genus</th><th>Botanical Name</th><th>Common Name</th><th>Size</th><th>Outlet Location</th><th>Nursery Location</th></tr></thead>
                        <tbody>{searchRows.map((r, i) => (
                          <tr key={i}>
                            <td className="genus-cell">{r.Genus}</td>
                            <td className="botanical-cell"><em>{r.BotanicalName}</em></td>
                            <td>{r.CommonName}</td>
                            <td className="size-cell">{r.ProductSize}</td>
                            <td className="location-cell">{r['Outlet Location']}</td>
                            <td className="location-cell nursery">{r['Nursery Location']}</td>
                          </tr>
                        ))}</tbody>
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

function PlantCard({ r, sortBy }) {
  const primary = sortBy === 'common' ? r.CommonName : r.BotanicalName;
  const secondary = sortBy === 'common' ? r.BotanicalName : r.CommonName;
  return (
    <div className="result-card">
      <div className="card-primary">{sortBy === 'botanical' ? <em>{primary}</em> : primary}</div>
      {secondary && <div className="card-secondary">{sortBy === 'botanical' ? secondary : <em>{secondary}</em>}</div>}
      <div className="card-row">
        {r.ProductSize && (<span className="card-pill"><span className="card-pill-label">Size</span><span className="card-pill-value">{r.ProductSize}</span></span>)}
        {r['Outlet Location'] && (<span className="card-pill location"><span className="card-pill-label">Outlet</span><span className="card-pill-value">{r['Outlet Location']}</span></span>)}
        {r['Nursery Location'] && (<span className="card-pill location"><span className="card-pill-label">Nursery</span><span className="card-pill-value">{r['Nursery Location']}</span></span>)}
      </div>
    </div>
  );
}

function groupIcon(group) {
  const g = group.toLowerCase();
  if (g.includes('tree')) return '🌳';
  if (g.includes('shrub')) return '🌿';
  if (g.includes('fruit')) return '🍎';
  if (g.includes('perennial')) return '🌸';
  if (g.includes('annual')) return '🌼';
  if (g.includes('grass')) return '🌾';
  if (g.includes('fern')) return '🌿';
  if (g.includes('vine')) return '🍃';
  if (g.includes('herb')) return '🌱';
  if (g.includes('rose')) return '🌹';
  if (g.includes('bulb')) return '🌷';
  if (g.includes('cactus') || g.includes('succulent')) return '🌵';
  return '🪴';
}

function UpdatePanel() {
  return (
    <div className="upload-panel">
      <h2>Update Plant Data</h2>
      <p className="upload-note">Replace <code>client/public/plants.json</code> in the repository and push — the site rebuilds automatically within a minute.</p>
      <div className="update-steps">
        <div className="update-step"><div className="step-num">1</div><div className="step-body"><strong>Export your data</strong><p>Run your SQL query and export as a JSON array with fields: <code>PullGroup, ProductID, ProductSize, Genus, BotanicalName, CommonName, CommonNameAlpha, Outlet Location, Nursery Location</code></p></div></div>
        <div className="update-step"><div className="step-num">2</div><div className="step-body"><strong>Replace plants.json</strong><p>Navigate to <code>client/public/plants.json</code> in the GitHub repo, click the pencil icon, paste your new data, and commit.</p></div></div>
        <div className="update-step"><div className="step-num">3</div><div className="step-body"><strong>Wait ~1 minute</strong><p>GitHub Actions rebuilds the site automatically. Refresh the app and the new data will be live.</p></div></div>
      </div>
    </div>
  );
}
