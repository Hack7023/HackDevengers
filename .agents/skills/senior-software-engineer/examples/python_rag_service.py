import os
import json
from typing import Dict, List, Any
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Civic AI Query Pipeline")

# Initialize genai configuration
API_KEY = os.environ.get("GEMINI_API_KEY", "mock-api-key")
genai.configure(api_key=API_KEY)

class QueryRequest(BaseModel):
    query: str
    context_documents: List[str]

class QueryResponse(BaseModel):
    answer: str
    sources_used: List[int]
    confidence_score: float

class CivicQueryEngine:
    def __init__(self, model_name: str = "gemini-1.5-flash"):
        self.model_name = model_name

    def query_with_context(self, user_query: str, documents: List[str]) -> Dict[str, Any]:
        if not user_query.strip():
            raise ValueError("Query cannot be empty")
        
        # Build prompt using Retrieval Augmented Generation (RAG) format
        context_str = "\n".join([f"[{i}] {doc}" for i, doc in enumerate(documents)])
        
        prompt = f"""
        You are an intelligent government service assistant. Use the following context documents to answer the user query accurately and concisely.
        If the documents do not contain the answer, state that you do not know.

        Context:
        {context_str}

        User Query: {user_query}

        Respond in strict JSON format matching this structure:
        {{
          "answer": "Clear explanation in plain language",
          "sources_used": [index numbers of documents referenced],
          "confidence_score": 0.0 to 1.0 depending on information availability
        }}
        """

        try:
            model = genai.GenerativeModel(self.model_name)
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            result = json.loads(response.text)
            return result
        except json.JSONDecodeError as jde:
            raise RuntimeError("GenAI did not return valid JSON structure") from jde
        except Exception as e:
            raise RuntimeError(f"GenAI pipeline error: {str(e)}") from e


@app.post("/query", response_model=QueryResponse)
def process_civic_query(payload: QueryRequest):
    engine = CivicQueryEngine()
    try:
        result = engine.query_with_context(payload.query, payload.context_documents)
        return QueryResponse(
            answer=result["answer"],
            sources_used=result["sources_used"],
            confidence_score=result["confidence_score"]
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# Unit Tests (Pytest / unittest.mock style)
# ==========================================
# To run: pytest python_rag_service.py

import pytest
from unittest.mock import MagicMock, patch

def test_civic_query_engine_success():
    engine = CivicQueryEngine()
    
    mock_response = MagicMock()
    mock_response.text = json.dumps({
        "answer": "Citizens can apply for a permit online via the civic portal.",
        "sources_used": [0],
        "confidence_score": 0.95
    })
    
    with patch("google.generativeai.GenerativeModel") as mock_model_class:
        mock_model_instance = MagicMock()
        mock_model_instance.generate_content.return_value = mock_response
        mock_model_class.return_value = mock_model_instance
        
        result = engine.query_with_context(
            user_query="How do I get a permit?",
            documents=["Apply online via the civic portal.", "In-person applications are suspended."]
        )
        
        assert result["answer"] == "Citizens can apply for a permit online via the civic portal."
        assert result["sources_used"] == [0]
        assert result["confidence_score"] == 0.95
        mock_model_instance.generate_content.assert_called_once()

def test_civic_query_engine_empty_query():
    engine = CivicQueryEngine()
    with pytest.raises(ValueError, match="Query cannot be empty"):
        engine.query_with_context("", ["Doc 1"])
