import pytest
import os
import json
from fastapi import HTTPException
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from main import app, engine
from rag_engine import CivicDocRAGEngine

client = TestClient(app)

# ---------------------------------------------------------
# FastAPI Endpoints Tests
# ---------------------------------------------------------

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


@patch("rag_engine.CivicDocRAGEngine.query_pipeline")
def test_query_endpoint_success(mock_query_pipeline):
    mock_query_pipeline.return_value = {
        "answer": "You need to submit proof of address to renew.",
        "sources": ["Address Guide"],
        "confidence_score": 0.9,
        "retrieved_sources": []
    }

    response = client.post("/query", json={"query": "How to renew license?", "limit": 2})

    assert response.status_code == 200
    data = response.json()
    assert data["answer"] == "You need to submit proof of address to renew."
    mock_query_pipeline.assert_called_once_with("How to renew license?", limit=2)


@patch("rag_engine.CivicDocRAGEngine.query_pipeline")
def test_query_endpoint_value_error(mock_query_pipeline):
    mock_query_pipeline.side_effect = ValueError("Query cannot be empty")

    response = client.post("/query", json={"query": ""})
    assert response.status_code == 400
    assert response.json()["detail"] == "Query cannot be empty"


@patch("rag_engine.CivicDocRAGEngine.query_pipeline")
def test_query_endpoint_generic_error(mock_query_pipeline):
    mock_query_pipeline.side_effect = Exception("Unexpected database failure")

    response = client.post("/query", json={"query": "valid query"})
    assert response.status_code == 500
    assert response.json()["detail"] == "Unexpected database failure"


@patch("rag_engine.CivicDocRAGEngine.ingest_document")
def test_ingest_endpoint_success(mock_ingest):
    mock_ingest.return_value = 5

    response = client.post("/ingest", json={
        "doc_id": "guide-123",
        "title": "Business Registration Policy",
        "text_content": "Apply for permit. Fill Form A.",
        "category": "Permits"
    })

    assert response.status_code == 200
    assert response.json() == {"status": "success", "chunks_ingested": 5}
    mock_ingest.assert_called_once_with(
        doc_id="guide-123",
        title="Business Registration Policy",
        text_content="Apply for permit. Fill Form A.",
        category="Permits"
    )


@patch("rag_engine.CivicDocRAGEngine.ingest_document")
def test_ingest_endpoint_error(mock_ingest):
    mock_ingest.side_effect = Exception("Write permission denied")

    response = client.post("/ingest", json={
        "doc_id": "guide-123",
        "title": "Business",
        "text_content": "Apply",
        "category": "Permits"
    })

    assert response.status_code == 500
    assert response.json()["detail"] == "Write permission denied"


# ---------------------------------------------------------
# CivicDocRAGEngine Unit Tests
# ---------------------------------------------------------

@patch("chromadb.PersistentClient")
@patch("google.generativeai.configure")
def test_engine_init(mock_genai_configure, mock_chroma_client):
    # Mocking chroma client's sub-methods
    mock_client_instance = MagicMock()
    mock_chroma_client.return_value = mock_client_instance
    mock_collection = MagicMock()
    mock_client_instance.get_or_create_collection.return_value = mock_collection

    # 1. Initialize with default model (uses env or default)
    with patch.dict(os.environ, {"GEMINI_MODEL_NAME": "test-env-model", "GEMINI_API_KEY": "test-api-key"}):
        engine_default = CivicDocRAGEngine(db_dir="./test_chroma_db")
        assert engine_default.model_name == "test-env-model"
        mock_genai_configure.assert_called_with(api_key="test-api-key")
        mock_chroma_client.assert_called_with(path="./test_chroma_db")
        mock_client_instance.get_or_create_collection.assert_called_with("civic_documents")

    # 2. Initialize with custom parameters and default env missing keys
    with patch.dict(os.environ, {}):
        if "GEMINI_MODEL_NAME" in os.environ:
            del os.environ["GEMINI_MODEL_NAME"]
        if "GEMINI_API_KEY" in os.environ:
            del os.environ["GEMINI_API_KEY"]
        
        engine_custom = CivicDocRAGEngine(db_dir="./custom_dir", model_name="custom-model")
        assert engine_custom.model_name == "custom-model"
        mock_genai_configure.assert_called_with(api_key="mock-key")
        mock_chroma_client.assert_called_with(path="./custom_dir")


@patch("chromadb.PersistentClient")
@patch("google.generativeai.embed_content")
def test_get_embedding_success(mock_embed_content, mock_chroma_client):
    mock_embed_content.return_value = {"embedding": [0.2] * 768}
    
    # Initialize engine
    mock_client_instance = MagicMock()
    mock_chroma_client.return_value = mock_client_instance
    engine_instance = CivicDocRAGEngine()

    # 1. Query Embedding
    emb_query = engine_instance._get_embedding("query text", is_query=True)
    assert emb_query == [0.2] * 768
    mock_embed_content.assert_called_with(
        model="models/embedding-001",
        content="query text",
        task_type="retrieval_query"
    )

    # 2. Document Embedding
    emb_doc = engine_instance._get_embedding("document chunk", is_query=False)
    assert emb_doc == [0.2] * 768
    mock_embed_content.assert_called_with(
        model="models/embedding-001",
        content="document chunk",
        task_type="retrieval_document"
    )


@patch("chromadb.PersistentClient")
@patch("google.generativeai.embed_content")
def test_get_embedding_exception_fallback(mock_embed_content, mock_chroma_client):
    mock_embed_content.side_effect = Exception("API quota limit reached")
    
    mock_client_instance = MagicMock()
    mock_chroma_client.return_value = mock_client_instance
    engine_instance = CivicDocRAGEngine()

    # Verify fallback dummy vector return
    emb = engine_instance._get_embedding("error text")
    assert emb == [0.1] * 768


@patch("chromadb.PersistentClient")
@patch("rag_engine.CivicDocRAGEngine._get_embedding")
def test_ingest_document(mock_get_embedding, mock_chroma_client):
    mock_get_embedding.return_value = [0.5] * 768
    
    mock_client_instance = MagicMock()
    mock_chroma_client.return_value = mock_client_instance
    mock_collection = MagicMock()
    mock_client_instance.get_or_create_collection.return_value = mock_collection
    
    engine_instance = CivicDocRAGEngine()

    text = "Short doc. " * 50  # 550 characters, chunks into 2 parts (300 character chunks)
    num_chunks = engine_instance.ingest_document(
        doc_id="doc-999",
        title="Ingestion Test",
        text_content=text,
        category="TestCategory"
    )

    assert num_chunks == 2
    mock_collection.add.assert_called_once()
    kwargs = mock_collection.add.call_args[1]
    
    assert len(kwargs["embeddings"]) == 2
    assert kwargs["embeddings"][0] == [0.5] * 768
    assert len(kwargs["documents"]) == 2
    assert kwargs["metadatas"][0]["doc_id"] == "doc-999"
    assert kwargs["metadatas"][0]["title"] == "Ingestion Test"
    assert kwargs["metadatas"][0]["category"] == "TestCategory"
    assert kwargs["metadatas"][0]["chunk_index"] == 0
    assert kwargs["metadatas"][1]["chunk_index"] == 1
    assert kwargs["ids"] == ["doc-999_chunk_0", "doc-999_chunk_1"]


@patch("chromadb.PersistentClient")
def test_query_pipeline_empty_validation(mock_chroma_client):
    engine_instance = CivicDocRAGEngine()
    
    with pytest.raises(ValueError, match="Query cannot be empty"):
        engine_instance.query_pipeline("")

    with pytest.raises(ValueError, match="Query cannot be empty"):
        engine_instance.query_pipeline("   ")


@patch("chromadb.PersistentClient")
@patch("google.generativeai.GenerativeModel")
@patch("rag_engine.CivicDocRAGEngine._get_embedding")
def test_query_pipeline_success(mock_get_embedding, mock_gen_model, mock_chroma_client):
    mock_get_embedding.return_value = [0.3] * 768
    
    mock_client_instance = MagicMock()
    mock_chroma_client.return_value = mock_client_instance
    mock_collection = MagicMock()
    mock_client_instance.get_or_create_collection.return_value = mock_collection
    
    # Mock Chroma DB query output
    mock_collection.query.return_value = {
        "documents": [["Water line connection requires form B."]],
        "metadatas": [[{"title": "Water Manual", "category": "Utilities"}]]
    }

    # Mock Gemini LLM output
    mock_model_instance = MagicMock()
    mock_gen_model.return_value = mock_model_instance
    mock_response = MagicMock()
    mock_response.text = json.dumps({
        "answer": "Form B is required to renew water connections.",
        "sources": ["Water Manual"],
        "confidence_score": 0.95
    })
    mock_model_instance.generate_content.return_value = mock_response

    engine_instance = CivicDocRAGEngine()
    result = engine_instance.query_pipeline("How to connect water?")

    assert result["answer"] == "Form B is required to renew water connections."
    assert result["sources"] == ["Water Manual"]
    assert result["confidence_score"] == 0.95
    assert len(result["retrieved_sources"]) == 1
    assert result["retrieved_sources"][0]["title"] == "Water Manual"
    assert result["retrieved_sources"][0]["category"] == "Utilities"


@patch("chromadb.PersistentClient")
@patch("google.generativeai.GenerativeModel")
@patch("rag_engine.CivicDocRAGEngine._get_embedding")
def test_query_pipeline_empty_db_results(mock_get_embedding, mock_gen_model, mock_chroma_client):
    mock_get_embedding.return_value = [0.3] * 768
    
    mock_client_instance = MagicMock()
    mock_chroma_client.return_value = mock_client_instance
    mock_collection = MagicMock()
    mock_client_instance.get_or_create_collection.return_value = mock_collection
    
    # Mock empty collection query results
    mock_collection.query.return_value = {
        "documents": [[]],
        "metadatas": [[]]
    }

    mock_model_instance = MagicMock()
    mock_gen_model.return_value = mock_model_instance
    mock_response = MagicMock()
    mock_response.text = json.dumps({
        "answer": "I do not know because there is no local context.",
        "sources": [],
        "confidence_score": 0.2
    })
    mock_model_instance.generate_content.return_value = mock_response

    engine_instance = CivicDocRAGEngine()
    result = engine_instance.query_pipeline("How to connect water?")
    
    assert result["answer"] == "I do not know because there is no local context."
    assert result["sources"] == []
    assert result["confidence_score"] == 0.2
    assert len(result["retrieved_sources"]) == 0


@patch("chromadb.PersistentClient")
@patch("google.generativeai.GenerativeModel")
@patch("rag_engine.CivicDocRAGEngine._get_embedding")
def test_query_pipeline_llm_exception_fallback(mock_get_embedding, mock_gen_model, mock_chroma_client):
    mock_get_embedding.return_value = [0.3] * 768
    
    mock_client_instance = MagicMock()
    mock_chroma_client.return_value = mock_client_instance
    mock_collection = MagicMock()
    mock_client_instance.get_or_create_collection.return_value = mock_collection
    
    mock_collection.query.return_value = {
        "documents": [["Permit rules are complex."]],
        "metadatas": [[{"title": "Permit Guide", "category": "Permits"}]]
    }

    # Make LLM throw exception
    mock_model_instance = MagicMock()
    mock_gen_model.return_value = mock_model_instance
    mock_model_instance.generate_content.side_effect = Exception("Model service is overloaded")

    engine_instance = CivicDocRAGEngine()
    result = engine_instance.query_pipeline("Can I get a permit?")

    # Verify fallback response is returned
    assert "couldn't reach the AI model" in result["answer"]
    assert result["sources"] == ["Permit Guide"]
    assert result["confidence_score"] == 0.5
    assert len(result["retrieved_sources"]) == 1
    assert result["retrieved_sources"][0]["title"] == "Permit Guide"
