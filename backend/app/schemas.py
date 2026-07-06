import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

InsightKind = str  # observacao | hipotese | pergunta | discordancia | conexao
EdgeKind = str  # conflita_com | e_precondicao_de | desenvolve | mesma_ideia
ReadingStatus = str  # quero_ler | lendo | lido


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str | None

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    user: UserOut


class ChapterOut(BaseModel):
    id: uuid.UUID
    book_id: uuid.UUID
    label: str | None
    position: int | None

    class Config:
        from_attributes = True


class ChapterCreate(BaseModel):
    label: str | None = None
    position: int | None = None


class BookOut(BaseModel):
    id: uuid.UUID
    title: str
    author: str | None
    cover_url: str | None
    reading_status: ReadingStatus
    created_at: datetime
    chapters: list[ChapterOut] = []

    class Config:
        from_attributes = True


class BookCreate(BaseModel):
    title: str
    author: str | None = None
    cover_url: str | None = None


class BookUpdate(BaseModel):
    title: str | None = None
    author: str | None = None
    cover_url: str | None = None
    reading_status: ReadingStatus | None = None


class ThemeOut(BaseModel):
    id: uuid.UUID
    slug: str
    label: str

    class Config:
        from_attributes = True


class InsightOut(BaseModel):
    id: uuid.UUID
    book_id: uuid.UUID
    chapter_id: uuid.UUID | None
    title: str | None
    body: str
    kind: InsightKind
    free_tags: list[str]
    created_at: datetime
    themes: list[ThemeOut] = []

    class Config:
        from_attributes = True


class InsightCreate(BaseModel):
    book_id: uuid.UUID
    chapter_id: uuid.UUID | None = None
    title: str | None = None
    body: str
    kind: InsightKind = "observacao"
    free_tags: list[str] = []
    theme_ids: list[uuid.UUID] = []


class InsightUpdate(BaseModel):
    book_id: uuid.UUID | None = None
    chapter_id: uuid.UUID | None = None
    title: str | None = None
    body: str | None = None
    kind: InsightKind | None = None
    free_tags: list[str] | None = None
    theme_ids: list[uuid.UUID] | None = None


class SuggestionOut(BaseModel):
    insight: InsightOut
    book_title: str
    distance: float


class EdgeOut(BaseModel):
    id: uuid.UUID
    source_id: uuid.UUID
    target_id: uuid.UUID
    kind: EdgeKind
    description: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class EdgeCreate(BaseModel):
    source_id: uuid.UUID
    target_id: uuid.UUID
    kind: EdgeKind
    description: str | None = None


class ReadingSessionOut(BaseModel):
    id: uuid.UUID
    book_id: uuid.UUID
    duration_seconds: int
    started_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class ReadingSessionCreate(BaseModel):
    book_id: uuid.UUID
    duration_seconds: int = Field(gt=0)
    started_at: datetime
