from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import AppUser, Insight, InsightEdge
from ..schemas import EdgeCreate, EdgeOut

router = APIRouter(prefix="/edges", tags=["edges"])


@router.get("", response_model=list[EdgeOut])
def list_edges(db: Session = Depends(get_db), current_user: AppUser = Depends(get_current_user)):
    return db.query(InsightEdge).filter(InsightEdge.user_id == current_user.id).all()


@router.post("", response_model=EdgeOut, status_code=status.HTTP_201_CREATED)
def create_edge(payload: EdgeCreate, db: Session = Depends(get_db), current_user: AppUser = Depends(get_current_user)):
    if payload.source_id == payload.target_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Um insight não pode se conectar a si mesmo")
    count = (
        db.query(Insight)
        .filter(Insight.id.in_([payload.source_id, payload.target_id]), Insight.user_id == current_user.id)
        .count()
    )
    if count != 2:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Insight não encontrado")
    edge = InsightEdge(
        user_id=current_user.id,
        source_id=payload.source_id,
        target_id=payload.target_id,
        kind=payload.kind,
        description=payload.description,
    )
    db.add(edge)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Essa conexão já existe")
    db.refresh(edge)
    return edge
