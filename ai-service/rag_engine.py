import os
import json
import traceback
from typing import Dict, List, Any
import google.generativeai as genai
import chromadb
from dotenv import load_dotenv

# Explicitly load .env file
load_dotenv()

class CivicDocRAGEngine:
    def __init__(self, db_dir: str = "./chroma_db", model_name: str = None):
        if model_name is None:
            model_name = os.environ.get("GEMINI_MODEL_NAME", "gemini-2.5-flash")
        self.model_name = model_name
        
        # Configure Gemini
        api_key = os.environ.get("GEMINI_API_KEY", "mock-key")
        genai.configure(api_key=api_key)
        
        # Configure ChromaDB
        self.chroma_client = chromadb.PersistentClient(path=db_dir)
        # Use a simple collection without a default embedding function to avoid downloading heavy local ONNX files.
        self.collection = self.chroma_client.get_or_create_collection("civic_documents")

    def _get_embedding(self, text: str, is_query: bool = False) -> List[float]:
        """
        Generates embedding vector from Google Gemini API.
        """
        task_type = "retrieval_query" if is_query else "retrieval_document"
        try:
            response = genai.embed_content(
                model="models/embedding-001",
                content=text,
                task_type=task_type
            )
            return response["embedding"]
        except Exception as e:
            # Return a dummy vector if API key is not ready or fails (allows local prototyping)
            print(f"Embedding generation warning: {e}. Using dummy vectors.")
            return [0.1] * 768

    def ingest_document(self, doc_id: str, title: str, text_content: str, category: str):
        """
        Chunks text content, generates Gemini embeddings, and loads it into ChromaDB.
        """
        chunk_size = 300
        chunks = [text_content[i:i+chunk_size] for i in range(0, len(text_content), chunk_size)]
        
        documents = []
        embeddings = []
        metadatas = []
        ids = []
        
        for index, chunk in enumerate(chunks):
            embedding = self._get_embedding(chunk, is_query=False)
            documents.append(chunk)
            embeddings.append(embedding)
            metadatas.append({
                "doc_id": doc_id,
                "title": title,
                "category": category,
                "chunk_index": index
            })
            ids.append(f"{doc_id}_chunk_{index}")
            
        # Add with explicit embeddings
        self.collection.add(
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        return len(chunks)

    def query_pipeline(self, user_query: str, limit: int = 3) -> Dict[str, Any]:
        """
        Queries ChromaDB for relevant context using Gemini embeddings, builds prompt, and queries Gemini LLM.
        """
        if not user_query.strip():
            raise ValueError("Query cannot be empty")

        # Generate query embedding vector
        query_embedding = self._get_embedding(user_query, is_query=True)

        # Query Vector Store with the embedding
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=limit
        )
        
        context_chunks = []
        sources = []
        if results and results.get("documents") and len(results["documents"]) > 0:
            for idx, doc in enumerate(results["documents"][0]):
                if idx < len(results["metadatas"][0]):
                    meta = results["metadatas"][0][idx]
                    context_chunks.append(doc)
                    sources.append({
                        "title": meta.get("title", "Unknown"),
                        "category": meta.get("category", "General"),
                        "snippet": doc[:100] + "..."
                    })

        context_str = "\n".join([f"[{i}] {chunk}" for i, chunk in enumerate(context_chunks)])
        
        prompt = f"""
        You are a supportive, knowledgeable AI companion designed to assist citizens with government inquiries.
        Answer the citizen's query clearly and in plain terms.
        If the provided context does not help, state clearly that you do not know.

        Context:
        {context_str}

        Citizen Query: {user_query}

        Provide your response in strict JSON format:
        {{
          "answer": "Simple, polite explanation summarizing policies and requirements.",
          "sources": ["List of titles referenced in context"],
          "confidence_score": 0.0 to 1.0 (float)
        }}
        """

        try:
            model = genai.GenerativeModel(self.model_name)
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            data = json.loads(response.text)
            data["retrieved_sources"] = sources
            return data
        except Exception as e:
            print(f"Generative AI Exception: {e}")
            traceback.print_exc()
            # Graceful local fallback
            return {
                "answer": f"I received your question: '{user_query}'. I searched local resources but couldn't reach the AI model.",
                "sources": [s["title"] for s in sources],
                "confidence_score": 0.5,
                "retrieved_sources": sources
            }
