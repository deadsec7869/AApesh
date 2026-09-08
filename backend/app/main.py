import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.db.database import init_db
from backend.app.api.routes import (
    home,
    search,
    songs,
    albums,
    artists,
    playlists,
    library,
    history,
    charts,
    moods,
    lyrics,
    recommendations,
    auth,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("aurora.api")


# Ensure database tables exist
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Aurora Music database...")
    init_db()
    logger.info("Database initialized successfully.")
    yield
    logger.info("Aurora Music API shutting down.")


app = FastAPI(
    title="Aurora Music API",
    description="High-performance music streaming backend powered by YouTube Music and SQLite.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration
origins = settings.CORS_ORIGINS
if isinstance(origins, str):
    origins = [o.strip() for o in origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error processing %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred",
            "path": request.url.path
        },
    )


# Health Check
@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "database": "connected",
    }


# Register Routes
app.include_router(home.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(songs.router, prefix="/api")
app.include_router(albums.router, prefix="/api")
app.include_router(artists.router, prefix="/api")
app.include_router(playlists.router, prefix="/api")
app.include_router(library.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(charts.router, prefix="/api")
app.include_router(moods.router, prefix="/api")
app.include_router(lyrics.router, prefix="/api")
app.include_router(recommendations.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
