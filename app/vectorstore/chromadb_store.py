# ChromaDB vector store integration stub

import chromadb

PERSIST_PATH = "./chroma_db"
COLLECTION_NAME = "documents2"

def get_chroma_client():
    """
    Returns a persistent ChromaDB client instance.
    """
    return chromadb.PersistentClient(path=PERSIST_PATH)


def add_embeddings(collection, embeddings, metadatas):
    """
    Adds embeddings and metadata to the ChromaDB collection.
    Each embedding must be a list of floats.
    """
    ids = [f"doc_{i}" for i in range(len(embeddings))]
    documents = [meta.get("text", f"Chunk {i}") for i, meta in enumerate(metadatas)]
    # Chroma expects: ids, embeddings, metadatas, documents
    collection.add(
        ids=ids,
        embeddings=embeddings,
        metadatas=metadatas,
        documents=documents
    )


def hybrid_search(collection, query, k=5):
    """
    Performs a vector search in ChromaDB collection.
    """
    results = collection.query(query_texts=[query], n_results=k)
    return results
