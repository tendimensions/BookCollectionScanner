"""ISBN metadata lookup service.

Strategy: Try Google Books API first; fall back to Open Library.
"""

import json
from typing import Any, Dict, Optional

import httpx

from config import settings

GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes"
OPEN_LIBRARY_URL = "https://openlibrary.org/api/books"


def _normalize_isbn13(isbn: str) -> str:
    """Strip non-digit characters and return the ISBN."""
    return "".join(c for c in isbn if c.isdigit())


async def lookup_isbn(isbn: str) -> Optional[Dict[str, Any]]:
    """Return normalized book metadata dict or None if not found."""
    isbn = _normalize_isbn13(isbn)
    result = await _google_books(isbn)
    if result is None:
        result = await _open_library(isbn)
    return result


async def _google_books(isbn: str) -> Optional[Dict[str, Any]]:
    params: Dict[str, str] = {"q": f"isbn:{isbn}"}
    if settings.google_books_api_key:
        params["key"] = settings.google_books_api_key

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(GOOGLE_BOOKS_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        if data.get("totalItems", 0) == 0:
            return None

        item = data["items"][0]
        info = item.get("volumeInfo", {})

        return {
            "source": "google_books",
            "raw": data,
            "title": info.get("title"),
            "authors": info.get("authors", []),
            "publisher": info.get("publisher"),
            "published_date": info.get("publishedDate"),
            "description": info.get("description"),
            "page_count": info.get("pageCount"),
            "thumbnail_url": info.get("imageLinks", {}).get("thumbnail"),
            "language": info.get("language"),
        }
    except Exception:
        return None


async def _open_library(isbn: str) -> Optional[Dict[str, Any]]:
    params = {
        "bibkeys": f"ISBN:{isbn}",
        "format": "json",
        "jscmd": "data",
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(OPEN_LIBRARY_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        key = f"ISBN:{isbn}"
        if key not in data:
            return None

        book = data[key]
        authors = [a.get("name") for a in book.get("authors", []) if "name" in a]
        cover = book.get("cover", {})
        thumbnail = cover.get("medium") or cover.get("small") or cover.get("large")

        publishers = book.get("publishers", [])
        publisher = publishers[0].get("name") if publishers else None

        publish_date = book.get("publish_date")

        return {
            "source": "open_library",
            "raw": data,
            "title": book.get("title"),
            "authors": authors,
            "publisher": publisher,
            "published_date": publish_date,
            "description": None,
            "page_count": book.get("number_of_pages"),
            "thumbnail_url": thumbnail,
            "language": None,
        }
    except Exception:
        return None
