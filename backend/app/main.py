import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Repo
from app.services.github import validate_github_url
from app.services.indexing import index_repo
from app.services.rag import answer_question


app = FastAPI(title="Code Documentation Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RepoCreate(BaseModel):
    name: str | None = None
    github_url: str | None = None


class RepoResponse(BaseModel):
    repo_id: uuid.UUID
    name: str | None
    github_url: str | None


class IndexRequest(BaseModel):
    github_url: str | None = None


class ChatRequest(BaseModel):
    question: str


@app.post("/repos", response_model=RepoResponse)
def create_repo(payload: RepoCreate):
    if payload.github_url:
        repo_info = validate_github_url(payload.github_url)
        github_url = repo_info.url
    else:
        github_url = None

    with SessionLocal() as session:
        repo = Repo(name=payload.name, github_url=github_url)
        session.add(repo)
        session.commit()
        session.refresh(repo)

        return RepoResponse(repo_id=repo.id, name=repo.name, github_url=repo.github_url)


@app.post("/repos/{repo_id}/index")
def index_repo_endpoint(repo_id: uuid.UUID, payload: IndexRequest | None = None):
    with SessionLocal() as session:
        repo = session.get(Repo, repo_id)
        if not repo:
            raise HTTPException(status_code=404, detail="Repo not found")

        github_url = payload.github_url if payload else None
        files_indexed, chunks_indexed = index_repo(session, repo, github_url)
        return {
            "status": "ok",
            "files_indexed": files_indexed,
            "chunks_indexed": chunks_indexed,
        }


@app.post("/repos/{repo_id}/chat")
def chat_repo(repo_id: uuid.UUID, payload: ChatRequest):
    with SessionLocal() as session:
        repo = session.get(Repo, repo_id)
        if not repo:
            raise HTTPException(status_code=404, detail="Repo not found")

        answer, sources = answer_question(session, repo, payload.question)
        return {"answer": answer, "sources": sources}
