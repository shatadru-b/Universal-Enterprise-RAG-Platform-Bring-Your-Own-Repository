# Universal Enterprise RAG Platform (Bring‑Your‑Own‑Repository)

## Overview
This project is a secure, multi-tenant Retrieval-Augmented Generation (RAG) platform designed for enterprises. It enables ingestion, normalization, chunking, embedding, and indexing of documents from a wide variety of sources (SharePoint, internal websites, file shares, Azure Blob/S3, Confluence, Git, and more). Users can query the system via an LLM-powered API and receive grounded, citation-rich answers with access controls.

**Key Goals:**
- Bring-your-own-repository: Connect to any enterprise data source.
- Secure, multi-tenant: Each tenant’s data and access policies are isolated.
- Local LLM support: Use Ollama for private, cost-effective inference.
- No subscription or premium dependencies: 100% open-source stack.

## Architecture
```
┌────────────┐   ┌──────────────┐   ┌─────────────┐   ┌─────────────┐
│ Ingestion  │→ │ Normalization │→ │ Chunk/Embed │→ │ Vector DB    │
└────────────┘   └──────────────┘   └─────────────┘   └─────────────┘
      │                │                  │                 │
      ▼                ▼                  ▼                 ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ Hybrid Retrieval (vector + keyword + reranking)              │
 └──────────────────────────────────────────────────────────────┘
      │
      ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ LLM-powered Ask API (Ollama, LangChain)                      │
 └──────────────────────────────────────────────────────────────┘
      │
      ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ Access Control, Citations, Multi-Tenant Security             │
 └──────────────────────────────────────────────────────────────┘
```

## Features
- **Self-service ingestion API:** Accepts repository link + authentication profile.
- **Policy-aware connectors:** SSO-enabled, supports SharePoint, S3, Confluence, Git, and more.
- **Document normalization & chunking:** Handles PDFs, Office docs, HTML, markdown, etc.
- **Embeddings & vector storage:** Uses ChromaDB or FAISS for open-source vector search.
- **Hybrid retrieval:** Combines vector, keyword, and reranking for best results.
- **LLM-powered Ask API:** Uses local LLMs (Ollama) for privacy and cost control.
- **Grounded, citation-rich answers:** Every answer is traceable to its source.
- **Multi-tenant & access control:** Each tenant’s data and policies are isolated.
- **Extensible:** Add new connectors, chunkers, or LLMs as needed.

## Tech Stack
- Python 3.8+
- FastAPI (API framework)
- LangChain (RAG orchestration)
- ChromaDB or FAISS (vector DB)
- Ollama (local LLM)
- python-dotenv (config)
- pydantic (validation)

## Quickstart
1. **Create and activate a virtual environment:**
   ```sh
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. **Install dependencies:**
   ```sh
   pip install fastapi uvicorn langchain chromadb pydantic[dotenv] python-dotenv
   ```
3. **Run the API:**
   ```sh
   uvicorn app.main:app --reload
   ```

## Usage
- **Ingestion:**
  - POST to `/ingest` with repository link and auth profile.
- **Ask API:**
  - POST to `/ask` with a question; receive a grounded, citation-rich answer.

## Extending the Platform
- Add new connectors in the `connectors/` directory.
- Add new chunkers or normalizers in the `processing/` directory.
- Swap out vector DBs or LLMs as needed (Ollama, Llama.cpp, etc.).

## Security & Privacy
- All data stays on your infrastructure.
- No cloud APIs or paid services required.
- Multi-tenant isolation and access control.

## Roadmap
- [ ] Add more connectors (SharePoint, Confluence, etc.)
- [ ] Add UI for self-service ingestion and querying
- [ ] Add admin dashboard for monitoring and policy management

## License
MIT
