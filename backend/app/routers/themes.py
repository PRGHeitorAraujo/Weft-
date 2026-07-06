from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..models import AppUser, Theme
from ..schemas import ThemeOut

router = APIRouter(prefix="/themes", tags=["themes"])


@router.get("", response_model=list[ThemeOut])
def list_themes(db: Session = Depends(get_db), _: AppUser = Depends(get_current_user)):
    return db.query(Theme).order_by(Theme.label).all()
