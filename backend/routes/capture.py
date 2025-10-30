"""Capture route - handles text capture requests."""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter()


class CaptureRequest(BaseModel):
    """Request model for text capture."""

    text: str
    source: str = "clipboard"  # clipboard, manual, etc.


class CaptureResponse(BaseModel):
    """Response model for capture endpoint."""

    success: bool
    text: str
    length: int
    message: Optional[str] = None


@router.post("/capture", response_model=CaptureResponse)
async def capture_text(request: CaptureRequest):
    """
    Process captured text.

    This endpoint receives text captured by the frontend.
    Currently, it just echoes back the text for display.
    Future: Can add preprocessing, validation, etc.
    """
    try:
        text = request.text.strip()

        if not text:
            raise HTTPException(status_code=400, detail="Empty text provided")

        logger.info(f"Captured text from {request.source}: {len(text)} chars")

        return CaptureResponse(
            success=True,
            text=text,
            length=len(text),
            message="Text captured successfully",
        )

    except Exception as e:
        logger.error(f"Error in capture_text: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/capture/test")
async def test_capture():
    """Test endpoint to verify capture route is working."""
    return {
        "status": "ok",
        "message": "Capture route is operational",
    }
