"""Data export and import endpoints."""

import json
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import Book, Category, Tag
from schemas import ExportData

router = APIRouter(prefix="/api", tags=["export"])


@router.get("/export", response_class=JSONResponse)
async def export_data(db: AsyncSession = Depends(get_db)):
    categories = (await db.execute(select(Category))).scalars().all()
    tags = (await db.execute(select(Tag))).scalars().all()
    books_result = await db.execute(
        select(Book).options(selectinload(Book.category), selectinload(Book.tags))
    )
    books = books_result.scalars().all()

    export = ExportData(categories=categories, tags=tags, books=books)
    return JSONResponse(
        content=export.model_dump(mode="json"),
        headers={"Content-Disposition": "attachment; filename=books_export.json"},
    )
