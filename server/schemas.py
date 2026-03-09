from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, field_validator


# ── Category ──────────────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str


class CategoryUpdate(BaseModel):
    name: str


class CategoryOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Tag ───────────────────────────────────────────────────────────────────────

class TagCreate(BaseModel):
    name: str


class TagUpdate(BaseModel):
    name: str


class TagOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Book ──────────────────────────────────────────────────────────────────────

class BookCreate(BaseModel):
    isbn: str
    title: Optional[str] = None
    authors: Optional[List[str]] = None
    publisher: Optional[str] = None
    published_date: Optional[str] = None
    description: Optional[str] = None
    page_count: Optional[int] = None
    thumbnail_url: Optional[str] = None
    language: Optional[str] = None
    category_id: int
    tag_ids: List[int] = []
    isbn_raw_data: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

    @field_validator("tag_ids")
    @classmethod
    def max_ten_tags(cls, v: List[int]) -> List[int]:
        if len(v) > 10:
            raise ValueError("A book may have at most 10 tags")
        return v


class BookUpdate(BaseModel):
    category_id: Optional[int] = None
    tag_ids: Optional[List[int]] = None
    notes: Optional[str] = None

    @field_validator("tag_ids")
    @classmethod
    def max_ten_tags(cls, v: Optional[List[int]]) -> Optional[List[int]]:
        if v is not None and len(v) > 10:
            raise ValueError("A book may have at most 10 tags")
        return v


class BookOut(BaseModel):
    id: int
    isbn: str
    title: Optional[str]
    authors: Optional[str]  # JSON string
    publisher: Optional[str]
    published_date: Optional[str]
    description: Optional[str]
    page_count: Optional[int]
    thumbnail_url: Optional[str]
    language: Optional[str]
    category_id: int
    category: CategoryOut
    tags: List[TagOut]
    isbn_raw_data: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BookListOut(BaseModel):
    """Lightweight book representation for list/table views."""

    id: int
    isbn: str
    title: Optional[str]
    authors: Optional[str]
    publisher: Optional[str]
    published_date: Optional[str]
    page_count: Optional[int]
    thumbnail_url: Optional[str]
    language: Optional[str]
    category: CategoryOut
    tags: List[TagOut]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BookListResponse(BaseModel):
    items: List[BookListOut]
    total: int


# ── Export / Import ───────────────────────────────────────────────────────────

class ExportData(BaseModel):
    categories: List[CategoryOut]
    tags: List[TagOut]
    books: List[BookOut]
