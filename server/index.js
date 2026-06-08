const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'plants.db');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- Database setup ---
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS plants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    PullGroup TEXT,
    ProductID TEXT,
    ProductSize TEXT,
    Genus TEXT,
    BotanicalName TEXT,
    CommonName TEXT,
    CommonNameAlpha TEXT,
    OutletLocation TEXT,
    NurseryLocation TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_genus ON plants(Genus);
  CREATE INDEX IF NOT EXISTS idx_common ON plants(CommonName);
  CREATE INDEX IF NOT EXISTS idx_common_alpha ON plants(CommonNameAlpha);
`);

const upload = multer({ storage: multer.memoryStorage() });

// --- CSV / JSON column name normalisers ---
function normalise(row) {
  const get = (...keys) => {
    for (const k of keys) {
      const found = Object.keys(row).find(
        rk => rk.trim().toLowerCase() === k.toLowerCase()
      );
      if (found !== undefined && row[found] !== undefined) return row[found] ?? '';
    }
    return '';
  };
  return {
    PullGroup: get('PullGroup'),
    ProductID: get('ProductID'),
    ProductSize: get('ProductSize'),
    Genus: get('Genus'),
    BotanicalName: get('BotanicalName'),
    CommonName: get('CommonName'),
    CommonNameAlpha: get('CommonNameAlpha'),
    OutletLocation: get('OutletLocation', 'Outlet Location', 'Location1'),
    NurseryLocation: get('NurseryLocation', 'Nursery Location', 'RatingListPrime'),
  };
}

const insertStmt = db.prepare(`
  INSERT INTO plants
    (PullGroup, ProductID, ProductSize, Genus, BotanicalName, CommonName, CommonNameAlpha, OutletLocation, NurseryLocation)
  VALUES
    (@PullGroup, @ProductID, @ProductSize, @Genus, @BotanicalName, @CommonName, @CommonNameAlpha, @OutletLocation, @NurseryLocation)
`);

function bulkInsert(rows) {
  const insert = db.transaction(rows => {
    db.prepare('DELETE FROM plants').run();
    for (const r of rows) insertStmt.run(normalise(r));
  });
  insert(rows);
}

// --- Search endpoints ---

// GET /api/plants?q=&by=genus|common&page=1&limit=50
app.get('/api/plants', (req, res) => {
  const { q = '', by = 'genus', page = 1, limit = 50 } = req.query;
  const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
  const like = `%${q}%`;

  let where;
  if (by === 'common') {
    where = 'WHERE CommonName LIKE ? OR CommonNameAlpha LIKE ?';
  } else {
    where = 'WHERE Genus LIKE ?';
  }

  const params = by === 'common' ? [like, like] : [like];

  const total = db
    .prepare(`SELECT COUNT(*) as n FROM plants ${where}`)
    .get(...params).n;

  const rows = db
    .prepare(
      `SELECT * FROM plants ${where} ORDER BY Genus, BotanicalName, ProductSize LIMIT ? OFFSET ?`
    )
    .all(...params, Number(limit), offset);

  res.json({ total, page: Number(page), limit: Number(limit), rows });
});

// GET /api/genera  – distinct genus list for autocomplete
app.get('/api/genera', (_req, res) => {
  const rows = db
    .prepare("SELECT DISTINCT Genus FROM plants WHERE Genus != '' ORDER BY Genus")
    .all();
  res.json(rows.map(r => r.Genus));
});

// GET /api/common-names – distinct common names for autocomplete
app.get('/api/common-names', (_req, res) => {
  const rows = db
    .prepare("SELECT DISTINCT CommonName FROM plants WHERE CommonName != '' ORDER BY CommonName")
    .all();
  res.json(rows.map(r => r.CommonName));
});

// --- Data upload: POST /api/upload  (multipart CSV or JSON file) ---
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const name = req.file.originalname.toLowerCase();
    let rows;

    if (name.endsWith('.json')) {
      const content = req.file.buffer.toString('utf8');
      rows = JSON.parse(content);
      if (!Array.isArray(rows)) rows = rows.data ?? rows.plants ?? Object.values(rows);
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    } else {
      const content = req.file.buffer.toString('utf8');
      rows = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    }

    bulkInsert(rows);
    res.json({ inserted: rows.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Data API push: POST /api/data  (JSON body) ---
app.post('/api/data', (req, res) => {
  try {
    let rows = req.body;
    if (!Array.isArray(rows)) rows = rows.data ?? rows.plants ?? Object.values(rows);
    if (!Array.isArray(rows)) return res.status(400).json({ error: 'Expected array of plant records' });

    bulkInsert(rows);
    res.json({ inserted: rows.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Stats ---
app.get('/api/stats', (_req, res) => {
  const { n } = db.prepare('SELECT COUNT(*) as n FROM plants').get();
  res.json({ totalPlants: n });
});

// Serve built React app in production
const clientBuild = path.join(__dirname, '..', 'client', 'build');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('*', (_req, res) => res.sendFile(path.join(clientBuild, 'index.html')));
}

app.listen(PORT, () => console.log(`NNO Location API running on port ${PORT}`));
