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
        import traceback
        tb = traceback.format_exc()
        print(f"[DEBUG SEARCH_TERM ERROR] {repr(e)}\n{tb}")
        return {"error": str(e), "repr": repr(e), "traceback": tb}


@router.get("/debug/search_term")
async def debug_search_term(term: str):
    """Deterministic substring search for a term across stored documents.
    Use for quick presence checks (case-insensitive). Returns matching chunk indexes,
    snippets and optional metadata.
    """
    from app.vectorstore import chromadb_store
    client = chromadb_store.get_chroma_client()
    print(f"[DEBUG SEARCH_TERM] term={term!r}, client={type(client)!r}")
    try:
        collection = client.get_or_create_collection(chromadb_store.COLLECTION_NAME)
        print(f"[DEBUG SEARCH_TERM] collection obtained: {collection!r}")
        results = collection.get(include=["documents", "metadatas"], limit=1000)
        print(f"[DEBUG SEARCH_TERM] raw results keys: {list(results.keys())}")
        stored_docs = results.get("documents", [])
        stored_metas = results.get("metadatas", [])
        # Normalize if Chroma returns nested lists (e.g., [ [doc1, doc2, ...] ])
        if stored_docs and isinstance(stored_docs[0], list):
            print("[DEBUG SEARCH_TERM] normalizing nested stored_docs")
            stored_docs = stored_docs[0]
        if stored_metas and isinstance(stored_metas[0], list):
            print("[DEBUG SEARCH_TERM] normalizing nested stored_metas")
            stored_metas = stored_metas[0]

        term_l = term.lower()
        found = []
        for idx, doc in enumerate(stored_docs):
            try:
                if not doc:
                    continue
                text = doc.lower()
                pos = text.find(term_l)
                if pos >= 0:
                    snippet = doc[max(0, pos-80):pos+80]
                    meta = stored_metas[idx] if stored_metas and len(stored_metas) > idx else {}
                    found.append({"chunk_index": idx, "snippet": snippet, "meta": meta})
            except Exception as inner_e:
                print(f"[DEBUG SEARCH_TERM] error inspecting doc idx={idx}: {inner_e}")

        resp = {"term": term, "matches": found, "match_count": len(found), "doc_count": len(stored_docs)}
        print(f"[DEBUG SEARCH_TERM] response: match_count={len(found)}, doc_count={len(stored_docs)}")
        return resp
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"[DEBUG SEARCH_TERM ERROR] {repr(e)}\n{tb}")
        return {"error": str(e), "repr": repr(e), "traceback": tb}

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
    metadatas = [{"filename": file.filename, "chunk": i, "text": chunk} for i, chunk in enumerate(chunks)]
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
    metadatas = [{"url": url, "chunk": i, "text": chunk} for i, chunk in enumerate(chunks)]
    chromadb_store.add_embeddings(collection, embeddings, metadatas)

    return {"status": "success", "url": url, "chunks": len(chunks)}
