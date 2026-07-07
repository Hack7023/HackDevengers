import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from rag_engine import CivicDocRAGEngine

# Load configuration settings
load_dotenv()

app = FastAPI(title="Civic Platform AI Engine", version="1.0.0")

# Setup engine with custom directory
DB_DIR = os.environ.get("CHROMA_DB_DIR", "./chroma_db")
engine = CivicDocRAGEngine(db_dir=DB_DIR)

class QueryPayload(BaseModel):
    query: str
    limit: Optional[int] = 3

class IngestPayload(BaseModel):
    doc_id: str
    title: str
    text_content: str
    category: str

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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ingest")
def run_ingest(payload: IngestPayload):
    try:
        num_chunks = engine.ingest_document(
            doc_id=payload.doc_id,
            title=payload.title,
            text_content=payload.text_content,
            category=payload.category
        )
        return {"status": "success", "chunks_ingested": num_chunks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
