import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "PRISM Backend"
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"

    backend_port: int = int(os.getenv("BACKEND_PORT", "8001"))
    backend_host: str = os.getenv("BACKEND_HOST", "0.0.0.0")

    # GCP
    gcp_project_id: str = os.getenv("GOOGLE_CLOUD_PROJECT", "ctoteam")
    gcp_dataset: str = os.getenv("BQ_DATASET", "linkedin_studio")
    gcp_region: str = os.getenv("VERTEX_AI_LOCATION", "us-central1")

    # BigQuery table names
    bq_models_table: str = "ai_models"
    bq_usage_table: str = os.getenv("BQ_USAGE_TABLE", "prism_usage")

    # API Keys
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    google_api_key: str = os.getenv("GOOGLE_API_KEY", "")
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")

    # Frontend
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    class Config:
        env_file = ".env.local"
        case_sensitive = False

settings = Settings()
