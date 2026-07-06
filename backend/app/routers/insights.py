import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from ..db import get_db
from ..deps import get_current_user
from ..embeddings import embed_text
from ..models import AppUser, Book, Insight, Theme
from ..schemas import InsightCreate, InsightOut, InsightUpdate, SuggestionOut

router = APIRouter(prefix="/insights", tags=["insights"])


def _load(db: Session, insight_id, user_id):
    insight = (
        db.query(Insight)
        .options(joinedload(Insight.themes))
        .filter(Insight.id == insight_id, Insight.user_id == user_id)
        .first()
    )
    if not insight:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Insight não encontrado")
    return insight


@router.get("", response_model=list[InsightOut])
def list_insights(
    kind: str | None = Query(default=None),
    book_id: uuid.UUID | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(get_current_user),
):
    q = db.query(Insight).options(joinedload(Insight.themes)).filter(Insight.user_id == current_user.id)
    if kind:
        q = q.filter(Insight.kind == kind)
    if book_id:
        q = q.filter(Insight.book_id == book_id)
    return q.order_by(Insight.created_at.desc()).all()


@router.get("/{insight_id}", response_model=InsightOut)
def get_insight(insight_id: uuid.UUID, db: Session = Depends(get_db), current_user: AppUser = Depends(get_current_user)):
    return _load(db, insight_id, current_user.id)


def _validate_book_and_themes(db: Session, user_id, book_id, theme_ids):
    book = db.query(Book).filter(Book.id == book_id, Book.user_id == user_id).first()
    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Livro não encontrado")
    themes = db.query(Theme).filter(Theme.id.in_(theme_ids)).all() if theme_ids else []
    if theme_ids and len(themes) != len(set(theme_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tema inválido")
    return themes


@router.post("", response_model=InsightOut, status_code=status.HTTP_201_CREATED)
def create_insight(payload: InsightCreate, db: Session = Depends(get_db), current_user: AppUser = Depends(get_current_user)):
    themes = _validate_book_and_themes(db, current_user.id, payload.book_id, payload.theme_ids)
    insight = Insight(
        user_id=current_user.id,
        book_id=payload.book_id,
        chapter_id=payload.chapter_id,
        title=payload.title,
        body=payload.body,
        kind=payload.kind,
        free_tags=payload.free_tags,
        embedding=embed_text(payload.body),
        themes=themes,
    )
    db.add(insight)
    db.commit()
    db.refresh(insight)
    return insight


@router.patch("/{insight_id}", response_model=InsightOut)
def update_insight(insight_id: uuid.UUID, payload: InsightUpdate, db: Session = Depends(get_db), current_user: AppUser = Depends(get_current_user)):
    insight = _load(db, insight_id, current_user.id)
    data = payload.model_dump(exclude_unset=True)

    if "book_id" in data:
        _validate_book_and_themes(db, current_user.id, data["book_id"], [])
        insight.book_id = data["book_id"]
    if "chapter_id" in data:
        insight.chapter_id = data["chapter_id"]
    if "title" in data:
        insight.title = data["title"]
    if "kind" in data:
        insight.kind = data["kind"]
    if "free_tags" in data:
        insight.free_tags = data["free_tags"]
    if "theme_ids" in data:
        themes = db.query(Theme).filter(Theme.id.in_(data["theme_ids"])).all() if data["theme_ids"] else []
        insight.themes = themes
    if "body" in data:
        insight.body = data["body"]
        insight.embedding = embed_text(data["body"])

    db.commit()
    db.refresh(insight)
    return insight


@router.delete("/{insight_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_insight(insight_id: uuid.UUID, db: Session = Depends(get_db), current_user: AppUser = Depends(get_current_user)):
    insight = _load(db, insight_id, current_user.id)
    db.delete(insight)
    db.commit()


@router.get("/{insight_id}/suggestions", response_model=list[SuggestionOut])
def suggest_connections(
    insight_id: uuid.UUID,
    limit: int = Query(default=4, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: AppUser = Depends(get_current_user),
):
    target = _load(db, insight_id, current_user.id)
    if target.embedding is None:
        return []
    rows = (
        db.query(Insight, Insight.embedding.cosine_distance(target.embedding).label("distance"))
        .options(joinedload(Insight.themes))
        .filter(Insight.user_id == current_user.id, Insight.id != insight_id)
        .order_by("distance")
        .limit(limit)
        .all()
    )
    out = []
    for insight, distance in rows:
        book = db.get(Book, insight.book_id)
        out.append(SuggestionOut(insight=InsightOut.model_validate(insight), book_title=book.title if book else "", distance=float(distance)))
    return out
