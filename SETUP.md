# Setup instructions for Universal Enterprise RAG Platform

# 1. Create and activate a virtual environment (recommended)
python3 -m venv .venv
source .venv/bin/activate

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Start the backend server
uvicorn app.main:app --reload

# 4. (Optional) Start the frontend
cd frontend
npm install
npm start

# 5. Make sure Ollama is installed and the required model (llama2:7b) is available
ollama pull llama2:7b

# 6. Delete the chroma_db directory if switching models or starting fresh
rm -rf chroma_db

# 7. Ingest documents via the API or UI

# 8. Ask questions via the API or UI
