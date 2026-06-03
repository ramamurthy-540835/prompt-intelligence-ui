from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import models, ai
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title=settings.app_name, debug=settings.debug)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://localhost:3001",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    logger.info(f"Starting {settings.app_name}")
    logger.info(f"GCP Project: {settings.gcp_project_id}")
    logger.info(f"BigQuery Dataset: {settings.gcp_dataset}")

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": settings.app_name,
        "gcp_project": settings.gcp_project_id,
        "gemini_configured": bool(settings.gemini_api_key or settings.google_api_key)
    }

app.include_router(models.router)
app.include_router(ai.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.backend_host,
        port=settings.backend_port
    )
