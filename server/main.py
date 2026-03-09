from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import settings
from database import init_db
from routers import books, categories, export, tags

_VERSION = (Path(__file__).parent / "VERSION").read_text().strip()
_ADMIN_BUILD = Path(__file__).parent / "admin" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Book Collection Scanner API",
    version=_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categories.router)
app.include_router(tags.router)
app.include_router(books.router)
app.include_router(export.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": _VERSION}


# Serve React admin SPA (when present).
# Mount /assets for hashed JS/CSS bundles, then catch-all for SPA routes so
# that a hard refresh on /books doesn't return a JSON 404.
if _ADMIN_BUILD.exists():
    app.mount("/assets", StaticFiles(directory=str(_ADMIN_BUILD / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Serve an exact file if it exists (favicon.ico, etc.), otherwise SPA shell.
        candidate = _ADMIN_BUILD / full_path
        if candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(_ADMIN_BUILD / "index.html"))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=settings.server_port, reload=True)
