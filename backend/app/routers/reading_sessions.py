import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import AppUser, Book, ReadingSession
from ..schemas import ReadingSessionCreate, ReadingSessionOut

router = APIRouter(prefix="/reading-sessions", tags=["reading-sessions"])


@router.get("", response_model=list[ReadingSessionOut])
def list_reading_sessions(
    book_id: uuid.UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(get_current_user),
):
    q = db.query(ReadingSession).filter(ReadingSession.user_id == current_user.id)
    if book_id:
        q = q.filter(ReadingSession.book_id == book_id)
    return q.order_by(ReadingSession.started_at.desc()).all()


@router.post("", response_model=ReadingSessionOut, status_code=status.HTTP_201_CREATED)
def create_reading_session(payload: ReadingSessionCreate, db: Session = Depends(get_db), current_user: AppUser = Depends(get_current_user)):
    book = db.query(Book).filter(Book.id == payload.book_id, Book.user_id == current_user.id).first()
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Livro não encontrado")
    session = ReadingSession(
        user_id=current_user.id,
        book_id=payload.book_id,
        duration_seconds=payload.duration_seconds,
        started_at=payload.started_at,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session
