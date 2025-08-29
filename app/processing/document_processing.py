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
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks



def embed_chunks(chunks):
    """
    Calls Ollama's embedding API via LangChain for real embeddings.
    """
    try:
        from langchain_community.embeddings import OllamaEmbeddings
    except ImportError:
        raise ImportError("Please install langchain-community: pip install langchain-community")
    embedder = OllamaEmbeddings(model="all-minilm:22m")
    embeddings = embedder.embed_documents(chunks)
    if embeddings and len(embeddings) > 0:
        print(f"[DEBUG] Embedding dimension: {len(embeddings[0])}")
    else:
        print("[DEBUG] No embeddings generated.")
    return embeddings
