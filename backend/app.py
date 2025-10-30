"""Tiny Translator - FastAPI Backend Server."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import capture, translate
from .config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info(f"🚀 {settings.APP_NAME} backend starting...")
    logger.info(f"   Host: {settings.HOST}")
    logger.info(f"   Port: {settings.PORT}")
    yield
    logger.info("👋 Backend shutting down...")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Local translation and text processing API",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for localhost Electron app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(capture.router, prefix="/api", tags=["capture"])
app.include_router(translate.router, prefix="/api", tags=["translate"])


@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {
        "app": settings.APP_NAME,
        "status": "running",
        "version": "1.0.0",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.app:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
