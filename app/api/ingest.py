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

@router.get("/files")
async def list_files():
    """Get list of all unique filenames stored in ChromaDB."""
    from app.vectorstore import chromadb_store
    client = chromadb_store.get_chroma_client()
    try:
        collection = client.get_or_create_collection(chromadb_store.COLLECTION_NAME)
        results = collection.get(include=["metadatas"], limit=10000)
        metadatas = results.get("metadatas", [])
        
        # Extract unique filenames
        filenames = set()
        for meta in metadatas:
            if meta and "filename" in meta:
                filenames.add(meta["filename"])
        
        return {"status": "success", "files": sorted(list(filenames))}
    except Exception as e:
        return {"status": "error", "message": str(e), "files": []}

@router.delete("/file/{filename}")
async def delete_file(filename: str):
    """Delete all chunks associated with a specific filename from ChromaDB."""
    from app.vectorstore import chromadb_store
    client = chromadb_store.get_chroma_client()
    try:
        collection = client.get_or_create_collection(chromadb_store.COLLECTION_NAME)
        
        # Get all documents with their IDs and metadata
        results = collection.get(include=["metadatas"], limit=10000)
        ids = results.get("ids", [])
        metadatas = results.get("metadatas", [])
        
        # Find IDs that match the filename
        ids_to_delete = []
        for i, meta in enumerate(metadatas):
            if meta and meta.get("filename") == filename:
                ids_to_delete.append(ids[i])
        
        if ids_to_delete:
            collection.delete(ids=ids_to_delete)
            return {
                "status": "success", 
                "message": f"Deleted {len(ids_to_delete)} chunks for file: {filename}",
                "deleted_count": len(ids_to_delete)
            }
        else:
            return {
                "status": "success", 
                "message": f"No chunks found for file: {filename}",
                "deleted_count": 0
            }
    except Exception as e:
        import traceback
        return {"status": "error", "message": str(e), "traceback": traceback.format_exc()}

UPLOAD_DIR = "/tmp/rag_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/ingest/file")
async def ingest_file(file: UploadFile = File(...)):
    try:
        print(f"\n[INGEST] Starting ingestion for file: {file.filename}")
        
        # 1. Save file
        file_location = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_location, "wb") as f:
            content = await file.read()
            f.write(content)
        print(f"[INGEST] File saved: {file_location} ({len(content)} bytes)")

        # 2. Normalize
        print(f"[INGEST] Normalizing document, content_type: {file.content_type}")
        normalized = document_processing.normalize_document(content, file.content_type)
        
        # 3. Chunk
        if isinstance(normalized, bytes):
            text = normalized.decode(errors="ignore")
        else:
            text = str(normalized)
        
        print(f"[INGEST] Extracted text length: {len(text)} chars")
        chunks = document_processing.chunk_document(text)
        print(f"[INGEST] Created {len(chunks)} chunks")
        
        if len(chunks) == 0:
            return {"status": "error", "message": "No text could be extracted from the file", "filename": file.filename, "chunks": 0}

        # 4. Embed
        print(f"[INGEST] Generating embeddings for {len(chunks)} chunks")
        embeddings = document_processing.embed_chunks(chunks)
        print(f"[INGEST] Generated {len(embeddings)} embeddings")

        # 5. Store in ChromaDB
        print(f"[INGEST] Storing in ChromaDB")
        client = chromadb_store.get_chroma_client()
        collection = client.get_or_create_collection(chromadb_store.COLLECTION_NAME)
        metadatas = [{"filename": file.filename, "chunk": i, "text": chunk} for i, chunk in enumerate(chunks)]
        chromadb_store.add_embeddings(collection, embeddings, metadatas)
        
        print(f"[INGEST] ✓ Successfully ingested {file.filename}: {len(chunks)} chunks stored")
        return {"status": "success", "filename": file.filename, "chunks": len(chunks)}
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[INGEST ERROR] Failed to ingest {file.filename}:")
        print(error_trace)
        return {"status": "error", "message": str(e), "filename": file.filename, "chunks": 0, "traceback": error_trace}


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
