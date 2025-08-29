from fastapi import APIRouter, UploadFile, File, HTTPException
import os
from app.processing import document_processing
from app.vectorstore import chromadb_store


router = APIRouter()

# Debug endpoint to inspect ChromaDB contents (safe for JSON)
@router.get("/debug/chromadb")
async def debug_chromadb():
    """Return summary of chunks and vectors in the ChromaDB 'documents' collection for debugging."""
    from app.vectorstore import chromadb_store
    client = chromadb_store.get_chroma_client()
    try:
        collection = client.get_or_create_collection(chromadb_store.COLLECTION_NAME)
        results = collection.get(include=["embeddings", "metadatas", "documents"], limit=100)
        embeddings = results.get("embeddings", [])
        docs = results.get("documents", [])
        metadatas = results.get("metadatas", [])
        # Only show count and shape for embeddings
        emb_count = len(embeddings)
        emb_dim = len(embeddings[0]) if emb_count > 0 else 0
        return {
            "embedding_count": emb_count,
            "embedding_dim": emb_dim,
            "documents": docs,
            "metadatas": metadatas
        }
    except Exception as e:
        return {"error": str(e)}

@router.post("/reset_vectorstore")
async def reset_vectorstore():
    """Delete the ChromaDB 'documents' collection to fix embedding dimension mismatches."""
    from app.vectorstore import chromadb_store
    client = chromadb_store.get_chroma_client()
    try:
        client.delete_collection(chromadb_store.COLLECTION_NAME)
        return {"status": "success", "message": f"ChromaDB '{chromadb_store.COLLECTION_NAME}' collection deleted."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

UPLOAD_DIR = "/tmp/rag_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/ingest/file")
async def ingest_file(file: UploadFile = File(...)):
    # 1. Save file
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb") as f:
        content = await file.read()
        f.write(content)

    # 2. Normalize
    normalized = document_processing.normalize_document(content, file.content_type)

    # 3. Chunk
    if isinstance(normalized, bytes):
        text = normalized.decode(errors="ignore")
    else:
        text = str(normalized)
    chunks = document_processing.chunk_document(text)

    # 4. Embed
    embeddings = document_processing.embed_chunks(chunks)

    # 5. Store in ChromaDB
    client = chromadb_store.get_chroma_client()
    collection = client.get_or_create_collection(chromadb_store.COLLECTION_NAME)
    metadatas = [{"filename": file.filename, "chunk": i} for i in range(len(chunks))]
    chromadb_store.add_embeddings(collection, embeddings, metadatas)

    return {"status": "success", "filename": file.filename, "chunks": len(chunks)}


import requests

@router.post("/ingest/url")
async def ingest_url(url: str):
    # 1. Download file
    try:
        response = requests.get(url)
        response.raise_for_status()
        content = response.content
        # Guess filetype from URL or headers
        if 'content-type' in response.headers:
            filetype = response.headers['content-type']
        else:
            filetype = os.path.splitext(url)[-1]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to download: {e}")

    # 2. Normalize
    normalized = document_processing.normalize_document(content, filetype)

    # 3. Chunk
    if isinstance(normalized, bytes):
        text = normalized.decode(errors="ignore")
    else:
        text = str(normalized)
    chunks = document_processing.chunk_document(text)

    # 4. Embed
    embeddings = document_processing.embed_chunks(chunks)

    # 5. Store in ChromaDB
    client = chromadb_store.get_chroma_client()
    collection = client.get_or_create_collection(chromadb_store.COLLECTION_NAME)
    metadatas = [{"url": url, "chunk": i} for i in range(len(chunks))]
    chromadb_store.add_embeddings(collection, embeddings, metadatas)

    return {"status": "success", "url": url, "chunks": len(chunks)}
