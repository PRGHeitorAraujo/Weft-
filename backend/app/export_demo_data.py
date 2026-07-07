"""Dump one seeded user's full reading graph as JSON for the frontend's
static demo mode (see frontend/src/demo-data/). Run with:
    python -m app.export_demo_data <email>
Prints JSON to stdout; the caller redirects it to a file.
"""
import json
import sys

from .db import SessionLocal
from .models import AppUser, Book, Insight, InsightEdge, Theme


def serialize_theme(t: Theme) -> dict:
    return {"id": str(t.id), "slug": t.slug, "label": t.label}


def serialize_chapter(c) -> dict:
    return {"id": str(c.id), "book_id": str(c.book_id), "label": c.label, "position": c.position}


def serialize_book(b: Book) -> dict:
    return {
        "id": str(b.id),
        "title": b.title,
        "author": b.author,
        "cover_url": b.cover_url,
        "reading_status": b.reading_status,
        "created_at": b.created_at.isoformat(),
        "chapters": [serialize_chapter(c) for c in b.chapters],
    }


def serialize_insight(i: Insight) -> dict:
    return {
        "id": str(i.id),
        "book_id": str(i.book_id),
        "chapter_id": str(i.chapter_id) if i.chapter_id else None,
        "title": i.title,
        "body": i.body,
        "kind": i.kind,
        "free_tags": i.free_tags,
        "created_at": i.created_at.isoformat(),
        "themes": [serialize_theme(t) for t in i.themes],
    }


def serialize_edge(e: InsightEdge) -> dict:
    return {
        "id": str(e.id),
        "source_id": str(e.source_id),
        "target_id": str(e.target_id),
        "kind": e.kind,
        "description": e.description,
        "created_at": e.created_at.isoformat(),
    }


def export_user(db, email: str) -> dict:
    user = db.query(AppUser).filter(AppUser.email == email).first()
    if not user:
        raise SystemExit(f"No user with email {email}")

    books = db.query(Book).filter(Book.user_id == user.id).all()
    insights = db.query(Insight).filter(Insight.user_id == user.id).all()
    edges = db.query(InsightEdge).filter(InsightEdge.user_id == user.id).all()
    themes = db.query(Theme).all()

    return {
        "user": {"id": str(user.id), "email": user.email, "display_name": user.display_name},
        "books": [serialize_book(b) for b in books],
        "themes": [serialize_theme(t) for t in themes],
        "insights": [serialize_insight(i) for i in insights],
        "edges": [serialize_edge(e) for e in edges],
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python -m app.export_demo_data <email>")
    db = SessionLocal()
    try:
        data = export_user(db, sys.argv[1])
    finally:
        db.close()
    print(json.dumps(data, ensure_ascii=False, indent=2))
