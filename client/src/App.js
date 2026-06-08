import React, { useState, useEffect, useMemo, useRef } from 'react';
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

export default function App() {
  const [allPlants, setAllPlants] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // Browse state
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [sortBy, setSortBy] = useState('botanical'); // 'botanical' | 'common'
  const [groupSearch, setGroupSearch] = useState('');
  const debouncedGroupSearch = useDebounce(groupSearch, 150);

  useEffect(() => {
    fetch(DATA_URL)
      .then(r => { if (!r.ok) throw new Error('Failed to load data'); return r.json(); })
      .then(data => setAllPlants(data))
      .catch(err => setLoadError(err.message));
  }, []);

  // Unique groups in a consistent order
  const groups = useMemo(() => {
    if (!allPlants) return [];
    const seen = new Set();
    allPlants.forEach(p => p.PullGroup && seen.add(p.PullGroup));
    return [...seen].sort();
  }, [allPlants]);

  // Plants for the selected group, sorted
  const groupPlants = useMemo(() => {
    if (!allPlants || !selectedGroup) return [];
    const filtered = allPlants.filter(p => p.PullGroup === selectedGroup);
    if (sortBy === 'common') {
      return [...filtered].sort((a, b) =>
        (a.CommonName || '').localeCompare(b.CommonName || '')
      );
    }
    return [...filtered].sort((a, b) =>
      (a.BotanicalName || '').localeCompare(b.BotanicalName || '')
    );
  }, [allPlants, selectedGroup, sortBy]);

  // Filter within the group by the inline search box
  const groupFiltered = useMemo(() => {
    const q = debouncedGroupSearch.trim().toLowerCase();
    if (!q) return groupPlants;
    return groupPlants.filter(p =>
      (p.BotanicalName && p.BotanicalName.toLowerCase().includes(q)) ||
      (p.CommonName && p.CommonName.toLowerCase().includes(q))
    );
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

  return (
    <div className="app">
      {/* ===== HEADER: group controls when viewing a group, logo otherwise ===== */}
      {selectedGroup ? (
        <header className="header header-group">
          <div className="group-controls">
            <div className="group-controls-row1">
              <button className="back-btn" onClick={clearGroup}>← Groups</button>
              <div className="sort-toggle">
                <button
                  className={sortBy === 'botanical' ? 'sort-btn active' : 'sort-btn'}
                  onClick={() => setSortBy('botanical')}
                >Botanical</button>
                <button
                  className={sortBy === 'common' ? 'sort-btn active' : 'sort-btn'}
                  onClick={() => setSortBy('common')}
                >Common</button>
              </div>
            </div>
            <div className="group-controls-name">{selectedGroup}</div>
            <div className="group-search-wrap">
              <input
                className="group-search-input"
                type="text"
                placeholder="Filter plants in this group…"
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

        {/* ===== GROUP GRID ===== */}
        {allPlants && !selectedGroup && (
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

        {/* ===== GROUP DETAIL ===== */}
        {allPlants && selectedGroup && (
          <div className="group-detail">
            {groupFiltered.length === 0
              ? <div className="empty">No plants match "{groupSearch}".</div>
              : <div className="plant-list-wrap">
                  <table className="plant-list-table">
                    <thead>
                      <tr>
                        <th className="col-name">Variety</th>
                        <th className="col-loc">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupFiltered.map((r, i) => {
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
                              {r.ProductSize && (
                                <div className="name-size">{r.ProductSize}</div>
                              )}
                            </td>
                            <td className="col-loc">
                              {r['Outlet Location'] && (
                                <div className="loc-outlet">
                                  <span className="loc-value">{r['Outlet Location']}</span>
                                </div>
                              )}
                              {r['Nursery Location'] && (
                                <div className="loc-nursery">
                                  <span className="loc-value">{r['Nursery Location']}</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        )}
      </main>
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
