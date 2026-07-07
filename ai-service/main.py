import os
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from rag_engine import CivicDocRAGEngine

# Load configuration settings
load_dotenv()

app = FastAPI(title="Civic Platform AI Engine", version="1.0.0")

# ─── CORS – Restrict to allowed frontend origins ────────────────────────────
ALLOWED_ORIGINS = list(filter(None, [
    "http://localhost:5173",
    "http://localhost:4173",
    "https://hackdevengers.vercel.app",          # Update with deployed frontend URL
    os.environ.get("FRONTEND_URL"),               # Allow override via env var
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key"],
)

# ─── Setup RAG Engine ────────────────────────────────────────────────────────
DB_DIR = os.environ.get("CHROMA_DB_DIR", "./chroma_db")
engine = CivicDocRAGEngine(db_dir=DB_DIR)

# ─── Ingest API Key Guard ────────────────────────────────────────────────────
INGEST_API_KEY = os.environ.get("INGEST_API_KEY", "")

def verify_ingest_api_key(request: Request):
    """Dependency that enforces an API key on write/ingest operations."""
    provided_key = request.headers.get("X-API-Key", "")
    if not INGEST_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Ingest endpoint not configured (INGEST_API_KEY not set)"
        )
    if provided_key != INGEST_API_KEY:
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Invalid or missing X-API-Key header"
        )

# ─── Request Models with Validation ─────────────────────────────────────────
class QueryPayload(BaseModel):
    query: str
    limit: Optional[int] = 3

    @validator("query")
    def query_not_empty_and_max_length(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Query cannot be empty")
        if len(v) > 1000:
            raise ValueError("Query must be under 1000 characters")
        return v

    @validator("limit")
    def limit_in_range(cls, v):
        if v is not None and not (1 <= v <= 10):
            raise ValueError("Limit must be between 1 and 10")
        return v

class IngestPayload(BaseModel):
    doc_id: str
    title: str
    text_content: str
    category: str

    @validator("doc_id", "title", "category")
    def no_empty_strings(cls, v, field):
        v = v.strip()
        if not v:
            raise ValueError(f"{field.name} cannot be empty")
        return v

    @validator("title")
    def title_max_length(cls, v):
        if len(v) > 200:
            raise ValueError("Title must be under 200 characters")
        return v

    @validator("text_content")
    def text_content_max_length(cls, v):
        if len(v) > 100_000:
            raise ValueError("text_content must be under 100,000 characters")
        return v

# ─── Routes ──────────────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/query")
def run_query(payload: QueryPayload):
    try:
        response = engine.query_pipeline(payload.query, limit=payload.limit)
        return response
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception:
        # Never expose raw exception detail to clients
        raise HTTPException(status_code=500, detail="An internal error occurred while processing your query.")

@app.post("/ingest", dependencies=[Depends(verify_ingest_api_key)])
def run_ingest(payload: IngestPayload):
    try:
        num_chunks = engine.ingest_document(
            doc_id=payload.doc_id,
            title=payload.title,
            text_content=payload.text_content,
            category=payload.category
        )
        return {"status": "success", "chunks_ingested": num_chunks}
    except Exception:
        # Never expose raw exception detail to clients
        raise HTTPException(status_code=500, detail="An internal error occurred during document ingestion.")

# ─── Global Exception Handler ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected internal error occurred."}
    )
