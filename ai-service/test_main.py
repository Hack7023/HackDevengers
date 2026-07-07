import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

@patch("rag_engine.CivicDocRAGEngine.query_pipeline")
def test_query_endpoint(mock_query_pipeline):
    # Arrange
    mock_query_pipeline.return_value = {
        "answer": "You need to submit proof of address to renew.",
        "sources": ["Address Guide"],
        "confidence_score": 0.9,
        "retrieved_sources": []
    }

    # Act
    response = client.post("/query", json={"query": "How to renew license?", "limit": 2})

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["answer"] == "You need to submit proof of address to renew."
    mock_query_pipeline.assert_called_once_with("How to renew license?", limit=2)

@patch("rag_engine.CivicDocRAGEngine.ingest_document")
def test_ingest_endpoint(mock_ingest):
    # Arrange
    mock_ingest.return_value = 5

    # Act
    response = client.post("/ingest", json={
        "doc_id": "guide-123",
        "title": "Business Registration Policy",
        "text_content": "Apply for permit. Fill Form A.",
        "category": "Permits"
    })

    # Assert
    assert response.status_code == 200
    assert response.json() == {"status": "success", "chunks_ingested": 5}
    mock_ingest.assert_called_once_with(
        doc_id="guide-123",
        title="Business Registration Policy",
        text_content="Apply for permit. Fill Form A.",
        category="Permits"
    )
