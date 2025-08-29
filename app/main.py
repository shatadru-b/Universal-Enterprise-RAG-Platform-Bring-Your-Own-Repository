from fastapi import FastAPI
from app.api import ingest, ask
from app.db import init_db
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

app.include_router(ingest.router, prefix="/api")
app.include_router(ask.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Universal Enterprise RAG Platform API is running."}
