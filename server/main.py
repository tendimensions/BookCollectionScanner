from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from database import init_db
from routers import books, categories, export, tags


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Book Collection Scanner API",
    version="1.0.0",
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
    return {"status": "ok"}


# Serve React admin build (when present)
admin_build = Path(__file__).parent / "admin" / "dist"
if admin_build.exists():
    app.mount("/", StaticFiles(directory=str(admin_build), html=True), name="admin")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=settings.server_port, reload=True)
