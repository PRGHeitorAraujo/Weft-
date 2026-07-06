import logging

from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 384
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        try:
            _model = SentenceTransformer(EMBEDDING_MODEL)
        except Exception:
            logger.exception("Failed to load sentence-transformers model %s", EMBEDDING_MODEL)
            raise
    return _model


def embed_text(text: str) -> list[float]:
    return embed_texts([text])[0]


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    try:
        vectors = _get_model().encode(texts, convert_to_numpy=True)
    except Exception:
        logger.exception("Local embedding failed for %d text(s)", len(texts))
        raise
    return [vector.tolist() for vector in vectors]
