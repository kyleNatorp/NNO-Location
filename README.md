# NNO Location

A mobile-first Progressive Web App (PWA) for finding plant locations by genus or common name.

## Features

- Search by **Genus** or **Common Name** with autocomplete
- Shows botanical name, common name, size, outlet location and nursery location
- Card layout on phones, table layout on desktop
- **Installable** — "Add to Home Screen" on iOS/Android for a native app feel
- Data updated via CSV/JSON file upload or direct API push from your SQL export

---

## Running the app

### 1. Install dependencies
```bash
npm run install:all
```

### 2. Development (two terminals)
```bash
# Terminal 1 – API server on port 3001
npm run start:server

# Terminal 2 – React dev server on port 3000
npm run start:client
```

### 3. Production (single server, single port)
```bash
# Build the React app
npm run build:client

# Start the Express server — serves both API and React UI
PORT=3001 npm run start:server
```
Open `http://your-server-ip:3001` from any phone on the same network.

---

## Data update

### Option A — Upload a file (CSV or JSON)
1. Open the app → tap **Update Data** → **CSV / JSON File Upload**
2. Select your file and tap **Upload & Replace Data**

CSV column names match your SQL query aliases:
```
PullGroup, ProductID, ProductSize, Genus, BotanicalName, CommonName, CommonNameAlpha,
Outlet Location, Nursery Location
```

### Option B — Push from your SQL export script
```bash
# Your script exports JSON, then POST it directly:
curl -X POST http://your-server:3001/api/data \
  -H 'Content-Type: application/json' \
  -d @your-export.json
```

The JSON body should be an array of plant objects:
```json
[
  {
    "PullGroup": "TREES",
    "ProductID": "T001",
    "ProductSize": "3 gal",
    "Genus": "Acer",
    "BotanicalName": "Acer palmatum",
    "CommonName": "Japanese Maple",
    "CommonNameAlpha": "Maple Japanese",
    "Outlet Location": "A-12",
    "Nursery Location": "NB-04"
  }
]
```

A `sample-data.json` file is included to test the upload.

---

## Installing on a phone

### iPhone / iPad (Safari)
1. Open the app URL in Safari
2. Tap the **Share** button → **Add to Home Screen**
3. Tap **Add** — the app appears on your home screen

### Android (Chrome)
1. Open the app URL in Chrome
2. Tap the **⋮ menu** → **Add to Home Screen** (or tap the install banner)
3. The app installs as a standalone app

---

## API reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/plants?q=&by=genus\|common&page=&limit=` | GET | Search plants |
| `/api/genera` | GET | All genus names (for autocomplete) |
| `/api/common-names` | GET | All common names (for autocomplete) |
| `/api/stats` | GET | Total plant count |
| `/api/data` | POST | Replace all data (JSON array body) |
| `/api/upload` | POST | Replace all data (multipart CSV/JSON file) |
