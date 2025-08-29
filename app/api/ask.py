from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.vectorstore import chromadb_store
import os
try:
    from langchain.llms import Ollama
    from langchain.prompts import PromptTemplate
except ImportError:
    Ollama = None

router = APIRouter()

class AskRequest(BaseModel):
    question: str
    tenant_id: str = None

@router.post("/ask")
async def ask(request: AskRequest):
    question = request.question
    tenant_id = request.tenant_id
    # 1. Retrieve relevant chunks from ChromaDB using correct collection name
    client = chromadb_store.get_chroma_client()
    collection = client.get_or_create_collection(chromadb_store.COLLECTION_NAME)
    results = chromadb_store.hybrid_search(collection, question, k=5)
    docs = []
    metadatas = []
    if results and "documents" in results and results["documents"]:
        docs = results["documents"][0]
        metadatas = results.get("metadatas", [[]])[0]
    context = "\n".join(docs) if docs else "No relevant context found in the uploaded documents."

    # 2. Generate answer using Ollama (LangChain) with all-minilm:22m
    if Ollama is None:
        raise HTTPException(status_code=500, detail="LangChain or Ollama not installed.")
    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template="""
        You are an enterprise assistant. Use the following context to answer the user's question. Cite sources by chunk number if relevant.\n\nContext:\n{context}\n\nQuestion: {question}\n\nAnswer as helpfully as possible:
        """
    )
    llm = Ollama(model="llama2:7b")
    answer = llm(prompt.format(context=context, question=question))
    return {
        "answer": answer,
        "chunks": docs,
        "citations": [m.get("chunk") for m in metadatas],
        "question": question,
        "tenant_id": tenant_id
    }
