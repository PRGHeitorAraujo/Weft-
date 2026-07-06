import os

from dotenv import load_dotenv

load_dotenv()


def _normalize_database_url(url: str) -> str:
    # Managed Postgres providers (e.g. Railway) commonly hand out
    # "postgres://" URLs; SQLAlchemy 1.4+ only recognizes "postgresql://".
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    return url


class Settings:
    database_url: str = _normalize_database_url(os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://marginalia:marginalia@localhost:5432/marginalia",
    ))
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-only-secret-change-me")
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))  # 7 days
    cors_origins: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    ]


settings = Settings()
