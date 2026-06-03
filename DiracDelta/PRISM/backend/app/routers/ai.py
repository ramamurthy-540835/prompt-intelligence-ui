from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import settings
import google.generativeai as genai
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["ai"])

class GenerateRequest(BaseModel):
    model: str
    prompt: str
    system: str = ""

def configure_gemini():
    if not settings.gemini_api_key:
        if not settings.google_api_key:
            raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY not set")
        genai.configure(api_key=settings.google_api_key)
    else:
        genai.configure(api_key=settings.gemini_api_key)

@router.post("/generate")
async def generate(request: GenerateRequest):
    try:
        configure_gemini()

        model = genai.GenerativeModel(
            model_name=request.model,
            system_instruction=request.system if request.system else None
        )

        response = model.generate_content(request.prompt)

        return {
            "status": "success",
            "text": response.text,
            "model": request.model
        }
    except Exception as e:
        logger.error(f"Error generating content: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test")
async def test_gemini():
    try:
        configure_gemini()
        model = genai.GenerativeModel(model_name="models/gemini-2.5-flash")
        response = model.generate_content("Say OK")

        return {
            "status": "success",
            "message": response.text,
            "model": "models/gemini-2.5-flash"
        }
    except Exception as e:
        logger.error(f"Error testing Gemini: {e}")
        return {
            "status": "error",
            "message": str(e),
            "model": "models/gemini-2.5-flash"
        }
