# Book Collection Scanner

A personal ISBN barcode scanning and book cataloging system. Scan physical books with your phone, automatically retrieve metadata from Google Books, and manage your collection through a web interface.

## Components

```
BookCollectionScanner/
├── server/          # Python FastAPI backend + React admin UI
│   └── admin/       # Vite + React + MUI admin interface
├── mobile/          # Flutter app (Android & iOS)
├── docker-compose.yml
└── codemagic.yaml   # CI/CD for the Flutter app
```

### Server (`server/`)

FastAPI REST API with a SQLite database, plus a bundled React admin UI served as static files.

- **API**: all routes prefixed `/api/`
- **Admin UI**: served at `/` in production; dev server runs on `:5173` and proxies `/api` to `:8000`
- **Database**: SQLite (`books.db`), auto-created on first run

### Mobile (`mobile/`)

Flutter app for rapid barcode scanning. Scans EAN-13/EAN-8 barcodes, looks up ISBNs via Google Books → Open Library fallback, and posts books to the server. **Create-only** — all editing and deleting is done in the admin UI.

---

## Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.13+ |
| Node.js | 18+ |
| Flutter SDK | 3.3+ |
| Docker (optional) | 24+ |

### Server

```bash
# Create and activate virtual environment
cd server
python -m venv .venv
.venv/Scripts/activate          # Windows
# source .venv/bin/activate     # macOS/Linux

pip install -r requirements.txt

# (Optional) copy and configure environment
cp .env.example .env            # add GOOGLE_BOOKS_API_KEY if you have one

# Run dev server — API docs at http://localhost:8000/docs
python -m uvicorn main:app --reload
```

### Admin UI

```bash
cd server/admin
npm install
npm run dev     # http://localhost:5173 (proxies /api → localhost:8000)
```

Build for production (output bundled into `server/admin/dist/`, served by FastAPI):

```bash
npm run build
```

### Mobile App

```bash
# Install Flutter SDK first: https://flutter.dev/docs/get-started/install
cd mobile
flutter pub get
flutter run     # requires a connected device or running emulator
```

> **Note:** Update `_serverUrl` in `mobile/lib/main.dart` to your server's local IP address before running.

> **Note:** Add `assets/sounds/beep_success.mp3` and `assets/sounds/beep_error.mp3` before building.

### Docker (server only)

```bash
docker-compose up --build
```

The server runs on port `8000`. The SQLite database is persisted to `./data/books.db` on the host.

---

## Configuration

### Server environment variables (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite+aiosqlite:///./books.db` | SQLite path |
| `SERVER_PORT` | `8000` | Listening port |
| `GOOGLE_BOOKS_API_KEY` | _(empty)_ | Optional — increases rate limits |
| `CORS_ORIGINS` | `*` | CORS allowed origins |

### Mobile

Edit `mobile/lib/main.dart` and set `_serverUrl` to your server's IP:

```dart
const _serverUrl = 'http://192.168.1.x:8000';
```

---

## Architecture

### Data flow

```
[Phone camera]
     ↓  EAN-13 barcode
[Flutter app]
     ↓  ISBN lookup (Google Books → Open Library fallback)
     ↓  POST /api/books
[FastAPI server]
     ↓  SQLite (books.db)
[Admin UI]  ←  browse, filter, edit, delete, export
```

### API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/books` | List books (search, filter, sort, paginate) |
| `POST` | `/api/books` | Create book (mobile) |
| `GET` | `/api/books/{id}` | Get book detail |
| `PUT` | `/api/books/{id}` | Update category/tags (admin) |
| `DELETE` | `/api/books/{id}` | Delete book (admin) |
| `GET` | `/api/categories` | List categories |
| `POST` | `/api/categories` | Create category |
| `PUT` | `/api/categories/{id}` | Rename category (admin) |
| `DELETE` | `/api/categories/{id}` | Delete category (admin) |
| `GET` | `/api/tags` | List tags |
| `POST` | `/api/tags` | Create tag |
| `PUT` | `/api/tags/{id}` | Rename tag (admin) |
| `DELETE` | `/api/tags/{id}` | Delete tag (admin) |
| `GET` | `/api/export` | Full JSON export (file download) |

Interactive API docs: `http://localhost:8000/docs`

### Key design decisions

- **Mobile is create-only.** The mobile app scans and creates. The admin UI handles all editing and deletion.
- **ISBN lookup on device.** The Flutter app calls Google Books / Open Library directly; the server stores whatever metadata is sent to it.
- **Duplicate ISBNs allowed.** Scanning the same book twice creates two records (useful for multiple copies).
- **Authors stored as JSON.** The `authors` column is a JSON string (`'["Author A", "Author B"]'`). The admin UI parses it client-side.
- **Max 10 tags per book.** Enforced in both the Pydantic schema and the Flutter validator.
- **No authentication.** Designed for local network / personal use only.

---

## CI/CD

The Flutter mobile app is built and distributed via [Codemagic](https://codemagic.io) using `codemagic.yaml`.

**`preview` workflow** — triggered on tags matching `v*.*.*` on the `preview` branch:
1. Runs `flutter test`
2. Builds Android APK (release, signed)
3. Builds iOS IPA (ad-hoc, manual signing)
4. Distributes both to the `testers` group via Firebase App Distribution

### Required Codemagic environment variable groups

| Group | Variables |
|-------|-----------|
| `android_signing` | `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` |
| `ios_signing` | `CM_CERTIFICATE`, `CM_CERTIFICATE_PASSWORD`, `CM_PROVISIONING_PROFILE` |
| `firebase_credentials` | `FIREBASE_APP_ID_ANDROID`, `FIREBASE_APP_ID_IOS`, `FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_SERVICE_ACCOUNT_KEY` |
| _(any group)_ | `NOTIFICATION_EMAIL` — recipient for build result emails |

---

## Development Notes

- The admin UI is in `server/admin/` and has its own `package.json`. Run `npm install` there separately from the root.
- `npm run lint` in `server/admin/` runs ESLint.
- The Flutter project root is `mobile/`, not the repository root.
- SQLite DB is auto-created in the working directory (`books.db`) when the server first starts. Docker mounts it to `./data/books.db`.
