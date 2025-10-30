"""Translation route - handles translation requests."""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from ..services.translator import translator

logger = logging.getLogger(__name__)

router = APIRouter()


class TranslateRequest(BaseModel):
    """Request model for translation."""

    text: str
    source_lang: str = "auto"
    target_lang: str = "zh-CN"
    mode: str = "translate"  # translate or dictionary


class TranslateResponse(BaseModel):
    """Response model for translation endpoint."""

    success: bool
    original_text: str
    translated_text: Optional[str] = None
    source_lang: str
    target_lang: str
    model: Optional[str] = None
    error: Optional[str] = None


@router.post("/translate", response_model=TranslateResponse)
async def translate_text(request: TranslateRequest):
    """
    Translate text using OpenRouter API.
    
    Args:
        request: Translation request containing text and language settings
        
    Returns:
        Translation response with translated text or error message
    """
    try:
        logger.info(
            f"Translation request ({request.mode}): {request.source_lang} -> {request.target_lang}, "
            f"text length: {len(request.text)}"
        )

        # Call translation service
        result = await translator.translate(
            text=request.text,
            target_lang=request.target_lang,
            source_lang=request.source_lang,
            mode=request.mode,
        )

        if not result["success"]:
            return TranslateResponse(
                success=False,
                original_text=request.text,
                source_lang=request.source_lang,
                target_lang=request.target_lang,
                error=result.get("error", "Translation failed"),
            )

        return TranslateResponse(
            success=True,
            original_text=result["original_text"],
            translated_text=result["translated_text"],
            source_lang=result["source_lang"],
            target_lang=result["target_lang"],
            model=result.get("model"),
        )

    except Exception as e:
        logger.error(f"Error in translate_text: {e}")
        raise HTTPException(status_code=500, detail=str(e))
