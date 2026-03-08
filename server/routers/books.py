import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models import Book, BookTag, Category, Tag
from schemas import BookCreate, BookListOut, BookOut, BookUpdate

router = APIRouter(prefix="/api/books", tags=["books"])


def _apply_search(stmt, search: str):
    term = f"%{search}%"
    return stmt.where(
        or_(
            Book.title.ilike(term),
            Book.authors.ilike(term),
            Book.isbn.ilike(term),
        )
    )


@router.get("", response_model=List[BookListOut])
async def list_books(
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    tag_id: Optional[int] = Query(None),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Book).options(
        selectinload(Book.category), selectinload(Book.tags)
    )
    if search:
        stmt = _apply_search(stmt, search)
    if category_id:
        stmt = stmt.where(Book.category_id == category_id)
    if tag_id:
        stmt = stmt.join(BookTag).where(BookTag.tag_id == tag_id)

    sort_col = getattr(Book, sort_by, Book.created_at)
    if sort_dir == "asc":
        stmt = stmt.order_by(sort_col.asc())
    else:
        stmt = stmt.order_by(sort_col.desc())

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=BookOut, status_code=status.HTTP_201_CREATED)
async def create_book(body: BookCreate, db: AsyncSession = Depends(get_db)):
    category = await db.get(Category, body.category_id)
    if not category:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Category not found")

    tags = []
    for tag_id in body.tag_ids:
        tag = await db.get(Tag, tag_id)
        if not tag:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, detail=f"Tag {tag_id} not found"
            )
        tags.append(tag)

    book = Book(
        isbn=body.isbn,
        title=body.title,
        authors=json.dumps(body.authors) if body.authors else None,
        publisher=body.publisher,
        published_date=body.published_date,
        description=body.description,
        page_count=body.page_count,
        thumbnail_url=body.thumbnail_url,
        language=body.language,
        category_id=body.category_id,
        isbn_raw_data=json.dumps(body.isbn_raw_data) if body.isbn_raw_data else None,
        tags=tags,
    )
    db.add(book)
    await db.commit()
    await db.refresh(book, attribute_names=["category", "tags"])
    return book


@router.get("/{book_id}", response_model=BookOut)
async def get_book(book_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Book)
        .where(Book.id == book_id)
        .options(selectinload(Book.category), selectinload(Book.tags))
    )
    result = await db.execute(stmt)
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Book not found")
    return book


@router.put("/{book_id}", response_model=BookOut)
async def update_book(
    book_id: int, body: BookUpdate, db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Book)
        .where(Book.id == book_id)
        .options(selectinload(Book.category), selectinload(Book.tags))
    )
    result = await db.execute(stmt)
    book = result.scalar_one_or_none()
    if not book:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Book not found")

    if body.category_id is not None:
        category = await db.get(Category, body.category_id)
        if not category:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Category not found")
        book.category_id = body.category_id

    if body.tag_ids is not None:
        tags = []
        for tag_id in body.tag_ids:
            tag = await db.get(Tag, tag_id)
            if not tag:
                raise HTTPException(
                    status.HTTP_404_NOT_FOUND, detail=f"Tag {tag_id} not found"
                )
            tags.append(tag)
        book.tags = tags

    await db.commit()
    await db.refresh(book, attribute_names=["category", "tags"])
    return book


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(book_id: int, db: AsyncSession = Depends(get_db)):
    book = await db.get(Book, book_id)
    if not book:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Book not found")
    await db.delete(book)
    await db.commit()
