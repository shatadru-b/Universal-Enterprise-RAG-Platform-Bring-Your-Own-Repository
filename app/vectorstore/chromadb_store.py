# ChromaDB vector store integration

import chromadb
import os
from pathlib import Path

# Default persistence directory; can be overridden by env var CHROMA_PERSIST_DIR
PERSIST_PATH = os.environ.get("CHROMA_PERSIST_DIR", "./chroma_db")
COLLECTION_NAME = "documents2"


def _ensure_writable_dir(path: str) -> str:
    """Create the directory if needed and verify write permissions. Returns absolute path."""
    p = Path(path).expanduser().resolve()
    p.mkdir(parents=True, exist_ok=True)
    # Probe write
    try:
        test_file = p / ".write_test"
        with open(test_file, "w", encoding="utf-8") as f:
            f.write("ok")
        try:
            test_file.unlink()
        except Exception:
            pass
    except Exception as e:
        raise RuntimeError(f"Chroma persist dir '{p}' is not writable: {e}")
    return str(p)


def get_chroma_client():
    """
    Returns a persistent, writable ChromaDB client instance.
    """
    persist_dir = _ensure_writable_dir(PERSIST_PATH)
    return chromadb.PersistentClient(path=persist_dir)


def add_embeddings(collection, embeddings, metadatas):
    """
    Adds embeddings and metadata to the ChromaDB collection.
    Each embedding must be a list of floats.
    Generates unique IDs using UUID to avoid collisions.
    """
    import uuid
    from datetime import datetime
    
    # Generate unique IDs for each document chunk
    ids = [f"{metadatas[i].get('filename', 'unknown')}_{uuid.uuid4().hex[:8]}_{i}" for i in range(len(embeddings))]
    documents = [meta["text"] for meta in metadatas]
    
    # Add timestamp to metadata for tracking
    for meta in metadatas:
        if "timestamp" not in meta:
            meta["timestamp"] = datetime.now().isoformat()
    
    print(f"[CHROMADB] Adding {len(ids)} documents with unique IDs")
    
    # Chroma expects: ids, embeddings, metadatas, documents
    collection.add(
        ids=ids,
        embeddings=embeddings,
        metadatas=metadatas,
        documents=documents
    )


def hybrid_search(collection, query_embeddings, k=5):
    """
    Performs a vector search in ChromaDB collection using pre-computed embeddings.
    """
    results = collection.query(query_embeddings=query_embeddings, n_results=k)
    return results
