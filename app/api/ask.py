from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.vectorstore import chromadb_store
import os
import re
try:
    # Prefer the official langchain-ollama integration (new package)
    from langchain_ollama import OllamaLLM
    from langchain.prompts import PromptTemplate
    LLMClass = OllamaLLM
except Exception:
    try:
        # Fallback to older community/langchain imports if langchain-ollama is not installed
        from langchain.llms import Ollama
        from langchain.prompts import PromptTemplate
        LLMClass = Ollama
    except Exception:
        LLMClass = None

router = APIRouter()

# In-memory per-tenant last-answer cache for simple refinement chaining.
import threading
_LAST_ANSWERS: dict = {}
_LAST_ANSWERS_LOCK = threading.Lock()

class AskRequest(BaseModel):
    question: str
    tenant_id: str = None
    prev_answer: str | None = None

@router.post("/ask")
async def ask(request: AskRequest):
    question = request.question
    tenant_id = request.tenant_id
    prev_answer = request.prev_answer

    # Detect summary intent (avoid misclassifying "summarise in 100 words" as refinement)
    is_summary_intent = bool(re.search(r"\bsummary\b|\bsummarize\b|\bsummarise\b|tl;dr", question, re.I))
    # Detect short refinement prompts like "in 100 words"/"in 50 words" only if not summarization
    m_refine = re.search(r"in\s+(\d+)\s+words?", question.strip(), re.I) if not is_summary_intent else None
    if m_refine:
        word_target = int(m_refine.group(1))
        # determine the source answer: explicit prev_answer or last cached answer for tenant
        tenant_key = tenant_id or "default"
        source_answer = prev_answer
        if not source_answer:
            with _LAST_ANSWERS_LOCK:
                source_answer = _LAST_ANSWERS.get(tenant_key)

        if not source_answer:
            # No previous answer supplied — inform the client how to request a rewrite.
            raise HTTPException(status_code=400, detail="Refinement requested (e.g. 'in 100 words') but no previous answer supplied. Resend the original answer in 'prev_answer' or perform the original question first.")

        # Heuristic: if original already shorter than target, return it unchanged with a note
        orig_word_count = len([w for w in source_answer.split() if w.strip()])
        if orig_word_count <= word_target:
            return {
                "answer": source_answer,
                "rewritten_from": source_answer,
                "word_limit": word_target,
                "note": f"Original answer already {orig_word_count} words; no shortening performed.",
                "question": question,
                "tenant_id": tenant_id,
            }

        # Prepare rewrite prompt
        if LLMClass is None:
            raise HTTPException(status_code=500, detail="LLM not available for rewrite.")
        llm_for_rewrite = LLMClass(model="llama2:7b")
        rewrite_prompt = (
            f"Rewrite the following answer to be at most {word_target} words. "
            "Do not add new information; only rephrase and shorten while preserving facts.\n\n"
            "Original answer:\n" + source_answer + "\n\nRewritten answer:\n"
        )
        if hasattr(llm_for_rewrite, "invoke"):
            try:
                rewritten = llm_for_rewrite.invoke(rewrite_prompt)
            except Exception:
                rewritten = llm_for_rewrite(rewrite_prompt)
        else:
            rewritten = llm_for_rewrite(rewrite_prompt)

        # cache rewritten answer as the last answer for tenant
        with _LAST_ANSWERS_LOCK:
            _LAST_ANSWERS[tenant_key] = rewritten

        return {
            "answer": rewritten,
            "rewritten_from": source_answer,
            "word_limit": word_target,
            "question": question,
            "tenant_id": tenant_id,
        }
    # 1. Retrieve relevant chunks from ChromaDB using correct collection name
    client = chromadb_store.get_chroma_client()
    collection = client.get_or_create_collection(chromadb_store.COLLECTION_NAME)
    results = chromadb_store.hybrid_search(collection, question, k=10)  # Increase k for more context
    docs = []
    metadatas = []
    if results and "documents" in results and results["documents"]:
        docs = results["documents"][0]
        metadatas = results.get("metadatas", [[]])[0]
    context = "\n".join(docs) if docs else "No relevant context found in the uploaded documents."

    # Debug logging for troubleshooting chunking and retrieval
    print("[RETRIEVAL DEBUG] Retrieved docs (first 2 shown):")
    for i, doc in enumerate(docs[:2]):
        print(f"[RETRIEVAL DEBUG] Doc {i}: {repr(doc[:200])} ...")
    print(f"[RETRIEVAL DEBUG] Total docs retrieved: {len(docs)}")
    print(f"[RETRIEVAL DEBUG] Context passed to LLM (first 500 chars): {repr(context[:500])}")

    # Removed special-case surname handler to keep logic generic

    # Fallback: deterministic substring search in stored documents when retrieval fails
    # or when retrieved docs look like placeholders (e.g., 'Chunk 0') or the question
    # explicitly asks about a mention. This helps with yes/no and mention queries
    # (e.g., "Is there any mention of 'tridion'?").
    # Keep fallback generic; do not key off specific phrasing
    presence_query = False
    # detect placeholder docs (common when persistent DB had placeholder entries)
    def docs_look_like_placeholders(ds):
        if not ds:
            return False
        check = ds[:min(len(ds), 5)]
        for d in check:
            if not d:
                continue
            s = d.strip()
            if re.match(r"^Chunk\s*\d+", s, re.I):
                return True
        return False

    trigger_fallback = (not docs) or context.startswith("No relevant context") or docs_look_like_placeholders(docs) or presence_query
    if trigger_fallback:
        try:
            all_results = collection.get(include=["documents", "metadatas"], limit=1000)
            stored_docs = all_results.get("documents", [])
            stored_metas = all_results.get("metadatas", [])
            # Normalize nested lists returned by Chroma (e.g., [[doc1, doc2...]])
            if stored_docs and isinstance(stored_docs[0], list):
                stored_docs = stored_docs[0]
            if stored_metas and isinstance(stored_metas[0], list):
                stored_metas = stored_metas[0]

            # Normalize question and try to extract quoted term
            q = question
            m = re.search(r"['\"“”](.+?)['\"“”]", q)
            terms = []
            if m:
                terms = [m.group(1).strip()]
            else:
                # fallback: use words longer than 3 chars
                terms = [w for w in re.findall(r"\w+", q) if len(w) > 3]

            found = []
            for idx, doc in enumerate(stored_docs):
                text = (doc or "").lower()
                for term in terms:
                    if term.lower() in text:
                        meta = stored_metas[idx] if stored_metas and len(stored_metas) > idx else {}
                        snippet_start = text.find(term.lower())
                        snippet = doc[max(0, snippet_start-60):snippet_start+60] if snippet_start >=0 else doc[:120]
                        found.append({"term": term, "chunk_index": idx, "snippet": snippet, "meta": meta})
            print(f"[FALLBACK DEBUG] Terms searched: {terms}")
            print(f"[FALLBACK DEBUG] Found: {found}")
            if found:
                # Return concise grounded answer for presence queries
                first = found[0]
                return {
                    "answer": f"Yes — found '{first['term']}' in the uploaded documents (chunk {first['chunk_index']}). Snippet: {first['snippet']}",
                    "chunks": docs,
                    "citations": [m.get("chunk") for m in metadatas],
                    "question": question,
                    "tenant_id": tenant_id,
                    "debug_found": found
                }
        except Exception as e:
            print(f"[FALLBACK DEBUG] fallback search error: {e}")

    # If the user asked for a summary, produce one from available docs (or stored docs)
    m_summary = re.search(r"\bsummary\b|\bsummarize\b|\bsummarize the document\b", question, re.I)
    if m_summary:
        # Select top-K chunks for summarization to keep prompts focused and small
        TOP_K = 5
        MAX_CHARS = 4000
        selected_chunks = []
        if docs:
            selected_chunks = docs[:TOP_K]
        else:
            try:
                all_results = collection.get(include=["documents"], limit=1000)
                stored_docs = all_results.get("documents", [])
                if stored_docs and isinstance(stored_docs[0], list):
                    stored_docs = stored_docs[0]
                selected_chunks = stored_docs[:TOP_K] if stored_docs else []
            except Exception as e:
                print(f"[SUMMARY DEBUG] failed to pull stored docs: {e}")

        if not selected_chunks:
            return {
                "answer": "The answer to your question is not found in the provided document. No document text available to summarize.",
                "chunks": docs,
                "citations": [m.get("chunk") for m in metadatas],
                "question": question,
                "tenant_id": tenant_id
            }

        summary_text = "\n".join(selected_chunks)
        if len(summary_text) > MAX_CHARS:
            summary_text = summary_text[:MAX_CHARS]
            print(f"[SUMMARY DEBUG] summary_text truncated to {MAX_CHARS} chars")

        # Build a safe summarization prompt
        summary_prompt = (
            "You are an assistant. Summarize the following document content concisely. "
            "Use ONLY the content provided. Do not add new facts or outside knowledge.\n\n"
            "Content:\n" + summary_text + "\n\nSummary:\n"
        )

        if LLMClass is None:
            raise HTTPException(status_code=500, detail="LLM not available for summarization.")
        llm_sum = LLMClass(model="llama2:7b")
        if hasattr(llm_sum, "invoke"):
            try:
                summary_answer = llm_sum.invoke(summary_prompt)
            except Exception:
                summary_answer = llm_sum(summary_prompt)
        else:
            summary_answer = llm_sum(summary_prompt)

        # Cache summary for tenant
        tenant_key = tenant_id or "default"
        try:
            with _LAST_ANSWERS_LOCK:
                _LAST_ANSWERS[tenant_key] = summary_answer
        except Exception:
            pass

        return {
            "answer": summary_answer,
            "chunks": docs,
            "citations": [m.get("chunk") for m in metadatas],
            "question": question,
            "tenant_id": tenant_id
        }

    # 2. Generate answer using Ollama (LangChain) with all-minilm:22m
    if LLMClass is None:
        raise HTTPException(status_code=500, detail="LangChain or Ollama LLM not installed. Install 'langchain-ollama' or ensure langchain community Ollama is available.")
    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template="""
You are an enterprise assistant. Use ONLY the following context to answer the user's question. If the answer is not in the context, say 'The answer is not found in the provided document.' Do NOT use any outside knowledge.

Context:
{context}

Question: {question}

Answer as concisely as possible. Do not invent question numbers or sections. If not found, reply exactly: The answer is not found in the provided document.
        """
    )
    # Instantiate the LLM - class may be OllamaLLM or legacy Ollama
    llm = LLMClass(model="llama2:7b")
    # Use .invoke() if available (langchain-core new API), else fall back to calling
    if hasattr(llm, "invoke"):
        # .invoke expects a PromptValue or plain string depending on implementation
        try:
            answer = llm.invoke(prompt.format(context=context, question=question))
        except Exception:
            # fallback to legacy call
            answer = llm(prompt.format(context=context, question=question))
    else:
        answer = llm(prompt.format(context=context, question=question))

    # Cache the last answer for this tenant to support refinement chaining
    tenant_key = tenant_id or "default"
    try:
        with _LAST_ANSWERS_LOCK:
            _LAST_ANSWERS[tenant_key] = answer
    except Exception:
        pass

    return {
        "answer": answer,
        "chunks": docs,
        "citations": [m.get("chunk") for m in metadatas],
        "question": question,
        "tenant_id": tenant_id
    }
