import os
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from typing import Optional
from dotenv import load_dotenv
from rag_engine import CivicDocRAGEngine

# Load configuration settings
load_dotenv()

app = FastAPI(title="Civic Platform AI Engine", version="1.0.0")

# ─── CORS – Restrict to allowed frontend origins ────────────────────────────
ALLOWED_ORIGINS = list(filter(None, [
    "http://localhost:5173",
    "http://localhost:4173",
    "https://hackdevengers.vercel.app",  
    "https://civic-backend-rm2c.onrender.com",        # Update with deployed frontend URL
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

# ─── Request Models with Pydantic V2 Validation ──────────────────────────────
class QueryPayload(BaseModel):
    query: str
    limit: Optional[int] = 3

    @field_validator("query")
    @classmethod
    def query_not_empty_and_max_length(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Query cannot be empty")
        if len(v) > 1000:
            raise ValueError("Query must be under 1000 characters")
        return v

    @field_validator("limit")
    @classmethod
    def limit_in_range(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (1 <= v <= 10):
            raise ValueError("Limit must be between 1 and 10")
        return v

class IngestPayload(BaseModel):
    doc_id: str
    title: str
    text_content: str
    category: str

    @field_validator("doc_id", "title", "category")
    @classmethod
    def no_empty_strings(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Field cannot be empty")
        return v

    @field_validator("title")
    @classmethod
    def title_max_length(cls, v: str) -> str:
        if len(v) > 200:
            raise ValueError("Title must be under 200 characters")
        return v

    @field_validator("text_content")
    @classmethod
    def text_content_max_length(cls, v: str) -> str:
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
