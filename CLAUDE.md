# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Two-component personal book cataloging system:
- **`server/`** — Python FastAPI backend + React admin UI (served as static files from `server/admin/dist/`)
- **`mobile/`** — Flutter app (barcode scanning, create-only; requires Flutter SDK installed separately)

The mobile app is **create-only**: it creates books, categories, and tags. All editing and deleting is done exclusively through the admin web interface.

## Development Commands

### Server (FastAPI)

```bash
# Activate venv (Windows)
server/.venv/Scripts/activate

# Run dev server (auto-reloads, API docs at http://localhost:8000/docs)
cd server && python -m uvicorn main:app --reload

# The server auto-creates the SQLite DB (books.db) on first run via init_db()
```

### Admin UI (React + Vite)

```bash
cd server/admin

npm run dev      # Dev server on :5173, proxies /api → localhost:8000
npm run build    # Outputs to server/admin/dist/ (served by FastAPI in production)
npm run lint     # ESLint
```

### Flutter Mobile

```bash
# Flutter SDK must be installed first: https://flutter.dev/docs/get-started/install/windows
cd mobile
flutter pub get
flutter run      # Requires connected device or emulator
flutter build apk
```

### Docker

```bash
# Build and run the full server (FastAPI + bundled admin dist)
docker-compose up --build

# Database persisted to ./data/books.db on the host
```

## Architecture

### Server (`server/`)

- **`main.py`** — App entrypoint. Registers routers, CORS middleware, mounts `admin/dist/` as static files if it exists. DB is initialized via `lifespan`.
- **`database.py`** — Async SQLAlchemy engine (`aiosqlite`). `init_db()` runs `Base.metadata.create_all`. All routes receive an `AsyncSession` via `Depends(get_db)`.
- **`models.py`** — ORM models: `Category`, `Tag`, `Book`, `BookTag` (junction). `authors` and `isbn_raw_data` on `Book` are JSON stored as plain text columns.
- **`schemas.py`** — Pydantic I/O schemas. `BookCreate` takes `authors: List[str]` and serializes to JSON for the DB. `BookOut` returns `authors` as the raw JSON string — callers must `JSON.parse` it. Max 10 tags enforced here.
- **`isbn_lookup.py`** — Server-side ISBN lookup (used if the server ever needs to resolve ISBNs). Primary: Google Books API; fallback: Open Library. Note: in the current flow, ISBN lookup is done **on the mobile device**, not the server.
- **`routers/`** — One file per resource (`categories.py`, `tags.py`, `books.py`, `export.py`). All routes are prefixed `/api/...`.
  - Delete of a category/tag is blocked if any books reference it (returns 409).
  - Books list endpoint supports `search`, `category_id`, `tag_id`, `sort_by`, `sort_dir`, `page`, `page_size` query params.
- **`config.py`** — `pydantic-settings` reads from `.env`. Key vars: `GOOGLE_BOOKS_API_KEY`, `SERVER_PORT` (default 8000), `DATABASE_URL`.

### Admin UI (`server/admin/`)

- Vite + React + TypeScript + MUI v6 + react-router-dom
- **`src/api/client.ts`** — All API calls; typed with local interfaces mirroring server schemas.
- **`src/App.tsx`** — Three routes: `/books`, `/categories`, `/tags` inside a persistent `Layout` sidebar.
- Page components in `src/pages/` are currently stubs — implement feature logic there.
- In production, `npm run build` outputs to `dist/`, which FastAPI serves at `/`. The `/api` prefix keeps API routes from colliding with the SPA.

### Mobile (`mobile/`)

- **`lib/main.dart`** — Entry point. `_serverUrl` constant must be updated to the server's local IP before running.
- **`lib/screens/setup_screen.dart`** — Initial screen: category dropdown (required) + tag multi-select checkboxes. Inline creation of new categories/tags via dialog.
- **`lib/screens/scan_screen.dart`** — Camera screen using `mobile_scanner`. Scans EAN-13/EAN-8 only. On detect: plays beep → calls `IsbnLookupService` → posts to server. 2-second debounce on same ISBN. Multiple simultaneous barcodes trigger error beep.
- **`lib/services/isbn_lookup_service.dart`** — Dart-side Google Books → Open Library fallback (mirrors server logic).
- **`lib/services/api_service.dart`** — HTTP client wrapping all server endpoints the mobile app uses.
- **Sound files required**: `assets/sounds/beep_success.mp3` and `assets/sounds/beep_error.mp3` must be added before the app can run.

## Key Design Decisions

- **`authors` field**: stored as a JSON string in SQLite (e.g. `'["Author A", "Author B"]'`). `BookCreate` accepts `List[str]`, serializes with `json.dumps`. Admin UI receives the raw string and must parse it.
- **Duplicate ISBNs allowed**: each scan creates a new record. ISBN is indexed but not unique.
- **No authentication**: designed for local network use only.
- **Export**: `GET /api/export` returns full JSON dump as a file download attachment.
