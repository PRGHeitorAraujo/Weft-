"""Recompute every insight's embedding with the local sentence-transformers
model (all-MiniLM-L6-v2), overwriting stale or stubbed vectors.
Run with: python -m app.reembed
"""
from .db import SessionLocal
from .embeddings import embed_texts
from .models import Insight


def reembed():
    db = SessionLocal()
    try:
        insights = db.query(Insight).all()
        if not insights:
            print("No insights to reembed.")
            return
        vectors = embed_texts([insight.body for insight in insights])
        for insight, vector in zip(insights, vectors):
            insight.embedding = vector
        db.commit()
        print(f"Reembedded {len(insights)} insights.")
    finally:
        db.close()


if __name__ == "__main__":
    reembed()
