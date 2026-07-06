from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from ..db import get_db
from ..deps import get_current_user
from ..models import AppUser, Book, Chapter
from ..schemas import BookCreate, BookOut, BookUpdate, ChapterCreate, ChapterOut

router = APIRouter(prefix="/books", tags=["books"])


@router.get("", response_model=list[BookOut])
def list_books(db: Session = Depends(get_db), current_user: AppUser = Depends(get_current_user)):
    return (
        db.query(Book)
        .options(joinedload(Book.chapters))
        .filter(Book.user_id == current_user.id)
        .order_by(Book.created_at)
        .all()
    )


@router.post("", response_model=BookOut, status_code=status.HTTP_201_CREATED)
def create_book(payload: BookCreate, db: Session = Depends(get_db), current_user: AppUser = Depends(get_current_user)):
    book = Book(user_id=current_user.id, title=payload.title, author=payload.author, cover_url=payload.cover_url)
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


@router.patch("/{book_id}", response_model=BookOut)
def update_book(book_id: str, payload: BookUpdate, db: Session = Depends(get_db), current_user: AppUser = Depends(get_current_user)):
    book = db.query(Book).options(joinedload(Book.chapters)).filter(Book.id == book_id, Book.user_id == current_user.id).first()
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Livro não encontrado")
    data = payload.model_dump(exclude_unset=True)
    if "title" in data:
        book.title = data["title"]
    if "author" in data:
        book.author = data["author"]
    if "cover_url" in data:
        book.cover_url = data["cover_url"]
    if "reading_status" in data:
        book.reading_status = data["reading_status"]
    db.commit()
    db.refresh(book)
    return book


@router.post("/{book_id}/chapters", response_model=ChapterOut, status_code=status.HTTP_201_CREATED)
def create_chapter(book_id: str, payload: ChapterCreate, db: Session = Depends(get_db), current_user: AppUser = Depends(get_current_user)):
    book = db.query(Book).filter(Book.id == book_id, Book.user_id == current_user.id).first()
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Livro não encontrado")
    chapter = Chapter(book_id=book.id, label=payload.label, position=payload.position)
    db.add(chapter)
    db.commit()
    db.refresh(chapter)
    return chapter
