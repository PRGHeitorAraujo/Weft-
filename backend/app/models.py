import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    ARRAY,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base

InsightKind = Enum(
    "observacao", "hipotese", "pergunta", "discordancia", "conexao",
    name="insight_kind",
)
EdgeKind = Enum(
    "conflita_com", "e_precondicao_de", "desenvolve", "mesma_ideia",
    name="edge_kind",
)
ReadingStatus = Enum(
    "quero_ler", "lendo", "lido",
    name="reading_status",
)


class AppUser(Base):
    __tablename__ = "app_user"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(Text)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Book(Base):
    __tablename__ = "book"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    author: Mapped[str | None] = mapped_column(Text)
    cover_url: Mapped[str | None] = mapped_column(Text)
    reading_status: Mapped[str] = mapped_column(ReadingStatus, nullable=False, default="quero_ler")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    chapters: Mapped[list["Chapter"]] = relationship(back_populates="book", cascade="all, delete-orphan")


class Chapter(Base):
    __tablename__ = "chapter"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    book_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("book.id", ondelete="CASCADE"), nullable=False)
    label: Mapped[str | None] = mapped_column(Text)
    position: Mapped[int | None] = mapped_column(Integer)

    book: Mapped["Book"] = relationship(back_populates="chapters")


class Theme(Base):
    __tablename__ = "theme"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    slug: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Insight(Base):
    __tablename__ = "insight"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False)
    book_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("book.id", ondelete="CASCADE"), nullable=False)
    chapter_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("chapter.id", ondelete="SET NULL"))

    title: Mapped[str | None] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(InsightKind, nullable=False, default="observacao")

    free_tags: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(384))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    book: Mapped["Book"] = relationship()
    chapter: Mapped["Chapter | None"] = relationship()
    themes: Mapped[list["Theme"]] = relationship(secondary="insight_theme")


class InsightTheme(Base):
    __tablename__ = "insight_theme"

    insight_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("insight.id", ondelete="CASCADE"), primary_key=True)
    theme_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("theme.id", ondelete="CASCADE"), primary_key=True)


class InsightEdge(Base):
    __tablename__ = "insight_edge"
    __table_args__ = (
        CheckConstraint("source_id <> target_id", name="insight_edge_source_id_check"),
        UniqueConstraint("source_id", "target_id", "kind"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False)
    source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("insight.id", ondelete="CASCADE"), nullable=False)
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("insight.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(EdgeKind, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ReadingSession(Base):
    __tablename__ = "reading_session"
    __table_args__ = (
        CheckConstraint("duration_seconds > 0", name="reading_session_duration_seconds_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.uuid_generate_v4())
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_user.id", ondelete="CASCADE"), nullable=False)
    book_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("book.id", ondelete="CASCADE"), nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
