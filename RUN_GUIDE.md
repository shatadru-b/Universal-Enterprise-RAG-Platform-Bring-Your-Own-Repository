# Step-by-Step Run Guide: Universal Enterprise RAG Platform

## Prerequisites Check ✓
- ✅ Python 3.8+ installed
- ✅ Ollama installed and running
- ✅ Required models: llama2:7b, all-minilm:22m
- ✅ Virtual environment (.venv) exists

---

## Step 1: Activate Virtual Environment

```bash
cd "/Volumes/DRIVE D/Universal Enterprise RAG Platform Bring‑Your‑Own‑Repository"
source .venv/bin/activate
```

You should see `(.venv)` prefix in your terminal prompt.

---

## Step 2: Install/Update Dependencies

```bash
pip install -r requirements.txt
```

This installs:
- FastAPI (web framework)
- LangChain (RAG orchestration)
- ChromaDB (vector database)
- Ollama integration
- Other required packages

---

## Step 3: Verify Ollama Models

```bash
ollama list
```

Expected output should include:
- `llama2:7b` (for question answering)
- `all-minilm:22m` (for embeddings)

If missing, pull them:
```bash
ollama pull llama2:7b
ollama pull all-minilm:22m
```

---

## Step 4: Start the Backend Server

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

The API will be available at: **http://127.0.0.1:8000**
- API Docs (Swagger): http://127.0.0.1:8000/docs
- Alternative Docs (ReDoc): http://127.0.0.1:8000/redoc

---

## Step 5: (Optional) Start the Frontend

Open a **new terminal window** and run:

```bash
cd "/Volumes/DRIVE D/Universal Enterprise RAG Platform Bring‑Your‑Own‑Repository/frontend"
npm install
npm start
```

The frontend will be available at: **http://localhost:3000**

---

## Step 6: Test the Platform

### 6.1 Check API Health

```bash
curl http://127.0.0.1:8000/
```

Expected response:
```json
{"message": "Universal Enterprise RAG Platform API is running."}
```

### 6.2 Ingest a Document

Create a test file:
```bash
echo "Python is a high-level programming language. It was created by Guido van Rossum." > testfile.txt
```

Ingest via API:
```bash
curl -X POST "http://127.0.0.1:8000/api/ingest" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@testfile.txt"
```

### 6.3 Ask a Question

```bash
curl -X POST "http://127.0.0.1:8000/api/ask" \
  -H "Content-Type: application/json" \
  -d '{"question": "Who created Python?"}'
```

Expected response will include:
- `answer`: The generated answer
- `chunks`: Relevant document chunks
- `citations`: Source references

---

## Step 7: Access the UI

Visit http://127.0.0.1:8000/docs for the interactive API documentation where you can:
- Upload documents via `/api/ingest`
- Ask questions via `/api/ask`
- Test all endpoints interactively

---

## Common Issues & Solutions

### Issue: "ModuleNotFoundError"
**Solution:** Make sure virtual environment is activated and dependencies are installed:
```bash
source .venv/bin/activate
pip install -r requirements.txt
```

### Issue: "Connection refused" when asking questions
**Solution:** Ensure Ollama is running:
```bash
ollama serve
```
(Usually runs automatically on macOS)

### Issue: Vector DB errors
**Solution:** Clear the ChromaDB database and re-ingest:
```bash
rm -rf chroma_db
```

### Issue: Port 8000 already in use
**Solution:** Use a different port:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

---

## Quick Start Commands (All-in-One)

```bash
# Terminal 1: Backend
cd "/Volumes/DRIVE D/Universal Enterprise RAG Platform Bring‑Your‑Own‑Repository"
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Terminal 2 (Optional): Frontend
cd "/Volumes/DRIVE D/Universal Enterprise RAG Platform Bring‑Your‑Own‑Repository/frontend"
npm install
npm start
```

---

## Next Steps

1. **Ingest your documents:** Use the `/api/ingest` endpoint to upload your documents
2. **Query the system:** Use the `/api/ask` endpoint to ask questions
3. **Explore connectors:** Check `app/connectors/` for enterprise source integrations
4. **Customize:** Modify chunking strategies, embedding models, or LLM settings

---

## Architecture Overview

```
User → FastAPI → [Ingest Pipeline] → ChromaDB (Vector Store)
                       ↓
              Document Processing
              (Parse, Chunk, Embed)
                       ↓
User → FastAPI → [Ask Pipeline] → Ollama LLM → Response with Citations
                       ↑
              Hybrid Retrieval
              (Vector + Keyword)
```

---

## Support

For issues or questions, check:
- README.md - Project overview
- SETUP.md - Setup instructions
- API Docs: http://127.0.0.1:8000/docs
