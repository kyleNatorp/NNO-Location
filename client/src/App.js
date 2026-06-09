import React, { useState, useEffect, useMemo } from 'react';
import './App.css';

const DATA_URL = process.env.PUBLIC_URL + '/plants.json';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// Supports * as wildcard; case-insensitive
function matchesWildcard(text, pattern) {
  if (!text) return false;
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp('^' + escaped + '$', 'i').test(text) ||
    new RegExp(escaped, 'i').test(text);
}

function plantMatchesQuery(plant, q) {
  if (!q) return true;
  return matchesWildcard(plant.BotanicalName || '', q) ||
    matchesWildcard(plant.CommonName || '', q) ||
    matchesWildcard(plant.Genus || '', q);
}

export default function App() {
  const [allPlants, setAllPlants] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // Group browse state
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [sortBy, setSortBy] = useState('botanical');
  const [groupSearch, setGroupSearch] = useState('');
  const debouncedGroupSearch = useDebounce(groupSearch, 150);

  // Global search state (groups page)
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalSortBy, setGlobalSortBy] = useState('botanical');
  const debouncedGlobalQuery = useDebounce(globalQuery, 150);

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

  // Global search results
  const globalResults = useMemo(() => {
    if (!allPlants || !debouncedGlobalQuery.trim()) return [];
    const q = debouncedGlobalQuery.trim();
    const results = allPlants.filter(p => plantMatchesQuery(p, q));
    if (globalSortBy === 'common') {
      return [...results].sort((a, b) => (a.CommonName || '').localeCompare(b.CommonName || ''));
    }
    return [...results].sort((a, b) => (a.BotanicalName || '').localeCompare(b.BotanicalName || ''));
  }, [allPlants, debouncedGlobalQuery, globalSortBy]);

  // Plants for the selected group, sorted
  const groupPlants = useMemo(() => {
    if (!allPlants || !selectedGroup) return [];
    const filtered = allPlants.filter(p => p.PullGroup === selectedGroup);
    if (sortBy === 'common') {
      return [...filtered].sort((a, b) => (a.CommonName || '').localeCompare(b.CommonName || ''));
    }
    return [...filtered].sort((a, b) => (a.BotanicalName || '').localeCompare(b.BotanicalName || ''));
  }, [allPlants, selectedGroup, sortBy]);

  // Filter within the group (wildcard-aware)
  const groupFiltered = useMemo(() => {
    const q = debouncedGroupSearch.trim();
    if (!q) return groupPlants;
    return groupPlants.filter(p => plantMatchesQuery(p, q));
  }, [groupPlants, debouncedGroupSearch]);

  function selectGroup(g) {
    setSelectedGroup(g);
    setGroupSearch('');
    setSortBy('botanical');
  }

  function clearGroup() {
    setSelectedGroup(null);
    setGroupSearch('');
  }

  const showingGlobalResults = !!debouncedGlobalQuery.trim();

  return (
    <div className="app">
      {selectedGroup ? (
        <header className="header header-group">
          <div className="group-controls">
            <div className="group-controls-row1">
              <button className="back-btn" onClick={clearGroup}>← Groups</button>
              <div className="sort-toggle">
                <button className={sortBy === 'botanical' ? 'sort-btn active' : 'sort-btn'} onClick={() => setSortBy('botanical')}>Botanical</button>
                <button className={sortBy === 'common' ? 'sort-btn active' : 'sort-btn'} onClick={() => setSortBy('common')}>Common</button>
              </div>
            </div>
            <div className="group-controls-name">{selectedGroup}</div>
            <div className="group-search-wrap">
              <input
                className="group-search-input"
                type="text"
                placeholder="Filter plants… (* wildcard)"
                value={groupSearch}
                onChange={e => setGroupSearch(e.target.value)}
                autoComplete="off"
              />
              {groupSearch && (
                <button className="group-search-clear" onClick={() => setGroupSearch('')}>✕</button>
              )}
            </div>
          </div>
        </header>
      ) : (
        <header className="header">
          <div className="header-inner">
            <div className="logo">
              <span className="logo-leaf">🌿</span>
              <span className="logo-text">NNO Location</span>
            </div>
          </div>
        </header>
      )}

      <main className="main">
        {loadError && <div className="status-err">Could not load plant data: {loadError}</div>}
        {!allPlants && !loadError && <div className="spinner-wrap"><div className="spinner" /></div>}

        {/* ===== GROUPS PAGE ===== */}
        {allPlants && !selectedGroup && (
          <div className="groups-panel">
            {/* Global search box */}
            <div className="global-search-bar">
              <div className="global-search-row">
                <div className="group-search-wrap" style={{flex: 1}}>
                  <input
                    className="group-search-input"
                    type="text"
                    placeholder="Search all plants… (* wildcard)"
                    value={globalQuery}
                    onChange={e => setGlobalQuery(e.target.value)}
                    autoComplete="off"
                  />
                  {globalQuery && (
                    <button className="group-search-clear" onClick={() => setGlobalQuery('')}>✕</button>
                  )}
                </div>
                {showingGlobalResults && (
                  <div className="sort-toggle sort-toggle-light">
                    <button className={globalSortBy === 'botanical' ? 'sort-btn active' : 'sort-btn'} onClick={() => setGlobalSortBy('botanical')}>Botanical</button>
                    <button className={globalSortBy === 'common' ? 'sort-btn active' : 'sort-btn'} onClick={() => setGlobalSortBy('common')}>Common</button>
                  </div>
                )}
              </div>
            </div>

            {/* Group grid or search results */}
            {!showingGlobalResults && (
              <>
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
              </>
            )}

            {showingGlobalResults && (
              globalResults.length === 0
                ? <div className="empty">No plants match "{globalQuery}".</div>
                : <PlantTable rows={globalResults} sortBy={globalSortBy} />
            )}
          </div>
        )}

        {/* ===== GROUP DETAIL ===== */}
        {allPlants && selectedGroup && (
          <div className="group-detail">
            {groupFiltered.length === 0
              ? <div className="empty">No plants match "{groupSearch}".</div>
              : <PlantTable rows={groupFiltered} sortBy={sortBy} />
            }
          </div>
        )}
      </main>
    </div>
  );
}

function PlantTable({ rows, sortBy }) {
  return (
    <div className="plant-list-wrap">
      <table className="plant-list-table">
        <thead>
          <tr>
            <th className="col-name">Variety</th>
            <th className="col-loc">Location</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const primary = sortBy === 'botanical' ? r.BotanicalName : r.CommonName;
            const secondary = sortBy === 'botanical' ? r.CommonName : r.BotanicalName;
            return (
              <tr key={i} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                <td className="col-name">
                  <div className="name-primary">
                    {sortBy === 'botanical' ? <em>{primary}</em> : primary}
                  </div>
                  {secondary && (
                    <div className="name-secondary">
                      {sortBy === 'botanical' ? secondary : <em>{secondary}</em>}
                    </div>
                  )}
                  {r.ProductSize && <div className="name-size">{r.ProductSize}</div>}
                </td>
                <td className="col-loc">
                  {r['Outlet Location'] && (
                    <div className="loc-outlet"><span className="loc-value">{r['Outlet Location']}</span></div>
                  )}
                  {r['Nursery Location'] && (
                    <div className="loc-nursery"><span className="loc-value">{r['Nursery Location']}</span></div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function groupIcon(group) {
  const g = group.toLowerCase();
  if (g === 'large tree') return '🌳';
  if (g === 'small tree') return '🌲';
  if (g.includes('shrub')) return '🌿';
  if (g.includes('fruit')) return '🍎';
  if (g.includes('perennial')) return '🌸';
  if (g.includes('annual')) return '🌼';
  if (g.includes('grass')) return '🌾';
  if (g.includes('groundcover')) return '🍃';
  if (g.includes('herb')) return '🌱';
  if (g.includes('rose')) return '🌹';
  if (g.includes('vegetable')) return '🥦';
  if (g.includes('vine')) return '🍃';
  if (g.includes('bulb')) return '🌷';
  if (g.includes('cactus') || g.includes('succulent')) return '🌵';
  return '🪴';
}
