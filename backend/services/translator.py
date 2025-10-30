"""Translation service using OpenRouter API."""

import logging
from typing import Optional
from openai import OpenAI
from ..config import settings

logger = logging.getLogger(__name__)


class TranslationService:
    """Handle text translation using OpenRouter API."""

    def __init__(self):
        """Initialize the translation service."""
        self.client: Optional[OpenAI] = None
        self._initialize_client()

    def _initialize_client(self) -> None:
        """Initialize OpenAI client for OpenRouter."""
        if not settings.OPENROUTER_API_KEY:
            logger.warning("OPENROUTER_API_KEY not set. Translation will not work.")
            return

        try:
            self.client = OpenAI(
                base_url=settings.OPENROUTER_BASE_URL,
                api_key=settings.OPENROUTER_API_KEY,
                timeout=30.0,  # 30 second timeout
                max_retries=2,  # Only retry twice
            )
            logger.info("OpenRouter client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OpenRouter client: {e}")
            self.client = None

    def _build_translation_prompt(
        self, text: str, target_lang: str, source_lang: str = "auto", mode: str = "translate"
    ) -> str:
        """Build translation prompt for the AI model.
        
        Args:
            text: Text to translate
            target_lang: Target language code (e.g., 'zh-CN', 'en', 'ja', 'auto')
            source_lang: Source language code ('auto' for auto-detection)
            mode: Translation mode ('translate' or 'dictionary')
            
        Returns:
            Translation prompt
        """
        # Language code mapping
        lang_names = {
            "zh-CN": "简体中文",
            "zh-TW": "繁體中文",
            "en": "English",
            "ja": "日本語",
            "ko": "한국어",
            "es": "Español",
            "fr": "Français",
            "de": "Deutsch",
            "ru": "Русский",
            "auto": "自动检测",
        }

        # Dictionary mode
        if mode == "dictionary":
            prompt = f"""Please provide a dictionary-style explanation in Chinese (简体中文) for the following word/phrase:

Format your response as follows:
1. 【词性】(Part of Speech) - e.g., n. v. adj. adv. etc.
2. 【发音】(Pronunciation) - phonetic symbols if applicable
3. 【释义】(Meanings) - list all common meanings, numbered
4. 【例句】(Example Sentences) - provide 2-3 bilingual examples
5. 【搭配】(Collocations) - common phrases using this word (if applicable)
6. 【同义词】(Synonyms) - similar words (if applicable)

Word/Phrase:
{text}"""
        # Smart auto translation
        elif target_lang == "auto":
            prompt = f"""Please translate the following text intelligently:

Rules:
1. Detect the source language automatically
2. If source is Chinese (简体中文/繁體中文) → translate to English
3. If source is English → translate to 简体中文
4. If source is other languages → translate to 简体中文
5. Only output the translated text, no explanations
6. Preserve formatting (line breaks, punctuation)

Text to translate:
{text}"""
        elif source_lang == "auto":
            target_name = lang_names.get(target_lang, target_lang)
            prompt = f"""Please translate the following text to {target_name}.

Requirements:
1. Only output the translated text, no explanations or notes
2. Preserve the original formatting (line breaks, punctuation)
3. Keep technical terms and proper nouns when appropriate

Text to translate:
{text}"""
        else:
            source_name = lang_names.get(source_lang, source_lang)
            target_name = lang_names.get(target_lang, target_lang)
            prompt = f"""Please translate the following text from {source_name} to {target_name}.

Requirements:
1. Only output the translated text, no explanations or notes
2. Preserve the original formatting (line breaks, punctuation)
3. Keep technical terms and proper nouns when appropriate

Text to translate:
{text}"""

        return prompt

    async def translate(
        self,
        text: str,
        target_lang: Optional[str] = None,
        source_lang: str = "auto",
        mode: str = "translate",
    ) -> dict:
        """Translate text using OpenRouter API.
        
        Args:
            text: Text to translate
            target_lang: Target language code (defaults to config setting)
            source_lang: Source language code ('auto' for auto-detection)
            mode: Translation mode ('translate' or 'dictionary')
            
        Returns:
            Dictionary with translation result containing:
                - success: bool
                - translated_text: str
                - original_text: str
                - source_lang: str
                - target_lang: str
                - model: str
                - error: str (if failed)
        """
        if not self.client:
            return {
                "success": False,
                "error": "Translation service not initialized. Please set OPENROUTER_API_KEY.",
                "original_text": text,
            }

        if not text or not text.strip():
            return {
                "success": False,
                "error": "Empty text provided",
                "original_text": text,
            }

        target_lang = target_lang or settings.DEFAULT_TARGET_LANG

        try:
            logger.info(f"Translating text ({len(text)} chars) to {target_lang}, mode: {mode}")

            # Build prompt
            prompt = self._build_translation_prompt(text, target_lang, source_lang, mode)

            # Call OpenRouter API
            completion = self.client.chat.completions.create(
                model=settings.MODEL_NAME,
                extra_headers={
                    "HTTP-Referer": settings.OPENROUTER_SITE_URL,
                    "X-Title": settings.OPENROUTER_SITE_NAME,
                },
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
                temperature=0.3,  # Lower temperature for more consistent translations
                max_tokens=2000,
            )

            translated_text = completion.choices[0].message.content.strip()

            logger.info(f"Translation successful: {len(translated_text)} chars")

            return {
                "success": True,
                "translated_text": translated_text,
                "original_text": text,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "model": settings.MODEL_NAME,
            }

        except Exception as e:
            logger.error(f"Translation failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "original_text": text,
                "source_lang": source_lang,
                "target_lang": target_lang,
            }


# Global translator instance
translator = TranslationService()
