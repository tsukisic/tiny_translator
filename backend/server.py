"""
Backend startup script.
Run this to start the FastAPI server.
"""

import sys
from pathlib import Path

# Add parent directory to path so we can import backend module
sys.path.insert(0, str(Path(__file__).parent.parent))

import uvicorn
from backend.app import app  # noqa: F401
from backend.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "backend.app:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info",
    )
