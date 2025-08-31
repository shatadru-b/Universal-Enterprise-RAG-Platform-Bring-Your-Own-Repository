# Document normalization, chunking, embedding stubs


import io
import mimetypes
try:
    import PyPDF2
except ImportError:
    PyPDF2 = None
try:
    import docx
except ImportError:
    docx = None

def normalize_document(doc_bytes, filetype):
    """
    Extracts text from supported file types (PDF, DOCX, TXT). Returns text.
    """
    if filetype in ["application/pdf", ".pdf"] and PyPDF2:
        reader = PyPDF2.PdfReader(io.BytesIO(doc_bytes))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        return text
    elif filetype in ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"] and docx:
        doc = docx.Document(io.BytesIO(doc_bytes))
        return "\n".join([p.text for p in doc.paragraphs])
    else:
        # Assume utf-8 text file
        try:
            return doc_bytes.decode("utf-8")
        except Exception:
            return doc_bytes.decode(errors="ignore")


def chunk_document(text, chunk_size=512, overlap=64):
    """
    Splits text into overlapping chunks for embedding.
    """
    chunk_size = 1024  # Increased chunk size for better context
    overlap = 128      # Slightly increased overlap
    chunks = []
    start = 0
    import re
    control_re = re.compile(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+")
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end]
        # Remove control/binary characters which may appear from bad decoding
        chunk = control_re.sub(" ", chunk)
        # Trim whitespace
        chunk = chunk.strip()
        if not chunk:
            start += chunk_size - overlap
            continue
        chunks.append(chunk)
        print(f"[INGEST DEBUG] Chunk {len(chunks)-1}: {repr(chunk[:100])} ...")
        start += chunk_size - overlap
    print(f"[INGEST DEBUG] Total chunks created: {len(chunks)}")
    return chunks



def embed_chunks(chunks):
    """
    Calls Ollama's embedding API via LangChain for real embeddings.
    """
    # Prefer the official langchain-ollama if available
    try:
        from langchain_ollama import OllamaEmbeddings as OllamaEmbeddingsOfficial
        embedder = OllamaEmbeddingsOfficial(model="all-minilm:22m")
    except Exception:
        try:
            from langchain_community.embeddings import OllamaEmbeddings
            embedder = OllamaEmbeddings(model="all-minilm:22m")
        except Exception:
            raise ImportError("Please install langchain-ollama or langchain-community: pip install langchain-ollama or pip install langchain-community")
    embeddings = embedder.embed_documents(chunks)
    if embeddings and len(embeddings) > 0:
        print(f"[DEBUG] Embedding dimension: {len(embeddings[0])}")
    else:
        print("[DEBUG] No embeddings generated.")
    return embeddings
