from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import auth, books, edges, insights, reading_sessions, themes

app = FastAPI(title="Weft API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(books.router)
app.include_router(themes.router)
app.include_router(insights.router)
app.include_router(edges.router)
app.include_router(reading_sessions.router)


@app.get("/health")
def health():
    return {"status": "ok"}
