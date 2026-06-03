from fastapi import APIRouter, HTTPException
from google.cloud import bigquery
from app.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/models", tags=["models"])

def get_bigquery_client():
    return bigquery.Client(project=settings.gcp_project_id)

def ensure_models_table_exists():
    client = get_bigquery_client()
    table_id = f"{settings.gcp_project_id}.{settings.gcp_dataset}.{settings.bq_models_table}"

    try:
        client.get_table(table_id)
    except Exception:
        schema = [
            bigquery.SchemaField("model_id", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("provider", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("display_name", "STRING", mode="REQUIRED"),
            bigquery.SchemaField("use_case", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("speed_score", "INTEGER", mode="NULLABLE"),
            bigquery.SchemaField("cost_tier", "INTEGER", mode="NULLABLE"),
            bigquery.SchemaField("is_default", "BOOLEAN", mode="NULLABLE"),
            bigquery.SchemaField("is_active", "BOOLEAN", mode="NULLABLE"),
            bigquery.SchemaField("notes", "STRING", mode="NULLABLE"),
        ]
        table = bigquery.Table(table_id, schema=schema)
        table = client.create_table(table)
        logger.info(f"Created table {table_id}")

        seed_models()

def seed_models():
    client = get_bigquery_client()
    table_id = f"{settings.gcp_project_id}.{settings.gcp_dataset}.{settings.bq_models_table}"

    rows_to_insert = [
        # Google / Gemini
        {"model_id": "models/gemini-2.5-flash", "provider": "google", "display_name": "Gemini 2.5 Flash",
         "use_case": "chat,realtime,feed,digest,suggestions", "speed_score": 3, "cost_tier": 1, "is_default": True, "is_active": True, "notes": "Real-time apps, chat, APIs — DEFAULT"},
        {"model_id": "models/gemini-2.5-pro", "provider": "google", "display_name": "Gemini 2.5 Pro",
         "use_case": "enterprise,complex,research", "speed_score": 2, "cost_tier": 2, "is_default": False, "is_active": True, "notes": "Enterprise apps, scalable workloads"},
        {"model_id": "models/gemini-2.0-flash", "provider": "google", "display_name": "Gemini 2.0 Flash",
         "use_case": "realtime,lightweight", "speed_score": 3, "cost_tier": 1, "is_default": False, "is_active": True, "notes": "Lightweight real-time processing"},
        {"model_id": "models/gemini-2.0-flash-lite", "provider": "google", "display_name": "Gemini 2.0 Flash-Lite",
         "use_case": "cost,fast", "speed_score": 3, "cost_tier": 1, "is_default": False, "is_active": True, "notes": "Cost-efficient fast inference"},
        {"model_id": "models/gemini-3-pro-preview", "provider": "google", "display_name": "Gemini 3 Pro Preview",
         "use_case": "reasoning,agents,enterprise", "speed_score": 1, "cost_tier": 3, "is_default": False, "is_active": True, "notes": "Advanced reasoning, AI agents"},
        {"model_id": "models/gemini-3.1-pro-preview", "provider": "google", "display_name": "Gemini 3.1 Pro Preview",
         "use_case": "coding,complex,enterprise", "speed_score": 1, "cost_tier": 3, "is_default": False, "is_active": True, "notes": "Complex workflows, coding"},
        {"model_id": "models/gemini-3-flash-preview", "provider": "google", "display_name": "Gemini 3 Flash Preview",
         "use_case": "fast,nextgen", "speed_score": 3, "cost_tier": 2, "is_default": False, "is_active": True, "notes": "Fast next-gen responses"},
        {"model_id": "models/imagen-4.0-generate-001", "provider": "google", "display_name": "Imagen 4",
         "use_case": "images,creative", "speed_score": 2, "cost_tier": 2, "is_default": False, "is_active": True, "notes": "Image generation"},
        {"model_id": "models/imagen-4.0-ultra-generate-001", "provider": "google", "display_name": "Imagen 4 Ultra",
         "use_case": "images,highquality", "speed_score": 1, "cost_tier": 3, "is_default": False, "is_active": True, "notes": "High-quality creative images"},
        {"model_id": "models/veo-2.0-generate-001", "provider": "google", "display_name": "Veo 2",
         "use_case": "video", "speed_score": 2, "cost_tier": 2, "is_default": False, "is_active": True, "notes": "Video generation"},
        {"model_id": "models/veo-3.0-generate-001", "provider": "google", "display_name": "Veo 3",
         "use_case": "video,advanced", "speed_score": 1, "cost_tier": 3, "is_default": False, "is_active": True, "notes": "Advanced video creation"},
        {"model_id": "models/gemini-2.5-flash-native-audio-latest", "provider": "google", "display_name": "Gemini 2.5 Flash Audio",
         "use_case": "voice,audio,speech", "speed_score": 3, "cost_tier": 1, "is_default": False, "is_active": True, "notes": "Voice AI, TTS"},
        {"model_id": "models/gemma-3-27b-it", "provider": "google", "display_name": "Gemma 3 27B",
         "use_case": "local,reasoning", "speed_score": 2, "cost_tier": 1, "is_default": False, "is_active": True, "notes": "High-performance local LLM"},
        {"model_id": "models/gemini-2.5-computer-use-preview-10-2025", "provider": "google", "display_name": "Computer Use Preview",
         "use_case": "agents,automation", "speed_score": 2, "cost_tier": 2, "is_default": False, "is_active": True, "notes": "AI agents interacting with systems"},
        {"model_id": "models/deep-research-pro-preview-12-2025", "provider": "google", "display_name": "Deep Research Pro",
         "use_case": "research,analysis", "speed_score": 1, "cost_tier": 3, "is_default": False, "is_active": True, "notes": "Deep analysis, research workflows"},

        # Anthropic / Claude
        {"model_id": "claude-sonnet-4-20250514", "provider": "anthropic", "display_name": "Claude Sonnet 4",
         "use_case": "chat,suggestions,digest,balanced", "speed_score": 2, "cost_tier": 2, "is_default": False, "is_active": True, "notes": "Best balance of speed and quality"},
        {"model_id": "claude-opus-4-5", "provider": "anthropic", "display_name": "Claude Opus 4",
         "use_case": "complex,research,reasoning", "speed_score": 1, "cost_tier": 3, "is_default": False, "is_active": True, "notes": "Highest quality, complex research"},
        {"model_id": "claude-haiku-4-5-20251001", "provider": "anthropic", "display_name": "Claude Haiku 4",
         "use_case": "fast,drafts,lightweight", "speed_score": 3, "cost_tier": 1, "is_default": False, "is_active": True, "notes": "Ultra-fast drafts"},

        # OpenAI (placeholder)
        {"model_id": "gpt-4o", "provider": "openai", "display_name": "GPT-4o",
         "use_case": "chat,vision,balanced", "speed_score": 2, "cost_tier": 2, "is_default": False, "is_active": False, "notes": "OpenAI multimodal — requires OPENAI_API_KEY"},
        {"model_id": "gpt-4o-mini", "provider": "openai", "display_name": "GPT-4o Mini",
         "use_case": "fast,cost", "speed_score": 3, "cost_tier": 1, "is_default": False, "is_active": False, "notes": "OpenAI fast low-cost"},
        {"model_id": "o3", "provider": "openai", "display_name": "OpenAI o3",
         "use_case": "reasoning,complex", "speed_score": 1, "cost_tier": 3, "is_default": False, "is_active": False, "notes": "OpenAI advanced reasoning"},
    ]

    try:
        errors = client.insert_rows_json(table_id, rows_to_insert)
        if errors:
            logger.warning(f"Insert errors: {errors}")
        else:
            logger.info(f"Seeded {len(rows_to_insert)} models")
    except Exception as e:
        logger.error(f"Error seeding models: {e}")

@router.on_event("startup")
async def startup_event():
    try:
        ensure_models_table_exists()
    except Exception as e:
        logger.error(f"Failed to ensure models table: {e}")

@router.get("")
async def list_models():
    try:
        client = get_bigquery_client()
        query = f"""
        SELECT * FROM `{settings.gcp_project_id}.{settings.gcp_dataset}.{settings.bq_models_table}`
        WHERE is_active = TRUE
        ORDER BY provider, is_default DESC, speed_score DESC
        """
        results = client.query(query).result()

        models_by_provider = {"google": [], "anthropic": [], "openai": []}
        for row in results:
            provider = row.provider
            if provider not in models_by_provider:
                models_by_provider[provider] = []
            models_by_provider[provider].append({
                "model_id": row.model_id,
                "display_name": row.display_name,
                "provider": provider,
                "use_case": row.use_case or "",
                "speed_score": row.speed_score,
                "cost_tier": row.cost_tier,
                "is_default": row.is_default,
                "notes": row.notes or ""
            })

        return models_by_provider
    except Exception as e:
        logger.error(f"Error listing models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recommend")
async def recommend_model(use_case: str):
    try:
        client = get_bigquery_client()
        query = f"""
        SELECT * FROM `{settings.gcp_project_id}.{settings.gcp_dataset}.{settings.bq_models_table}`
        WHERE is_active = TRUE AND use_case LIKE '%{use_case}%'
        ORDER BY is_default DESC, speed_score DESC, cost_tier ASC
        LIMIT 1
        """
        results = client.query(query).result()

        rows = list(results)
        if rows:
            row = rows[0]
            return {
                "model_id": row.model_id,
                "display_name": row.display_name,
                "provider": row.provider,
                "reason": f"Recommended for {use_case}",
                "speed_score": row.speed_score,
                "cost_tier": row.cost_tier
            }

        return {
            "model_id": "models/gemini-2.5-flash",
            "display_name": "Gemini 2.5 Flash",
            "provider": "google",
            "reason": "Default high-speed model",
            "speed_score": 3,
            "cost_tier": 1
        }
    except Exception as e:
        logger.error(f"Error recommending model: {e}")
        return {
            "model_id": "models/gemini-2.5-flash",
            "display_name": "Gemini 2.5 Flash",
            "provider": "google",
            "reason": "Default fallback",
            "speed_score": 3,
            "cost_tier": 1
        }

@router.post("/update")
async def update_model(model_id: str, is_default: bool = None, is_active: bool = None):
    try:
        client = get_bigquery_client()
        table_id = f"{settings.gcp_project_id}.{settings.gcp_dataset}.{settings.bq_models_table}"

        updates = []
        if is_default is not None:
            if is_default:
                client.query(f"UPDATE `{table_id}` SET is_default = FALSE WHERE provider != (SELECT provider FROM `{table_id}` WHERE model_id = '{model_id}')").result()
            updates.append(f"is_default = {is_default}")
        if is_active is not None:
            updates.append(f"is_active = {is_active}")

        if updates:
            query = f"UPDATE `{table_id}` SET {', '.join(updates)} WHERE model_id = '{model_id}'"
            client.query(query).result()

        return {"model_id": model_id, "updated": True}
    except Exception as e:
        logger.error(f"Error updating model: {e}")
        raise HTTPException(status_code=500, detail=str(e))
