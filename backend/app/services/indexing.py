import os
import shutil
from typing import Iterable

from fastapi import HTTPException
from openai import OpenAI
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Chunk, Repo
from app.services.github import shallow_clone, validate_github_url


INCLUDE_EXTS = {".py", ".ts", ".js", ".java", ".md", ".json", ".yml", ".yaml"}
EXCLUDE_DIRS = {"node_modules", "dist", "build", ".git", "__pycache__", ".next"}
MAX_FILE_BYTES = 1_000_000


def _iter_files(root: str) -> Iterable[str]:
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for name in filenames:
            _, ext = os.path.splitext(name)
            if ext.lower() not in INCLUDE_EXTS:
                continue
            path = os.path.join(dirpath, name)
            try:
                if os.path.getsize(path) > MAX_FILE_BYTES:
                    continue
            except OSError:
                continue
            yield path


def _chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200):
    step = max(1, chunk_size - overlap)
    for start in range(0, len(text), step):
        end = min(len(text), start + chunk_size)
        yield start, end, text[start:end]
        if end >= len(text):
            break


def _line_range(text: str, start: int, end: int) -> tuple[int, int]:
    start_line = 1 + text[:start].count("\n")
    end_line = 1 + text[:end].count("\n")
    return start_line, end_line


def _language_from_path(path: str) -> str:
    _, ext = os.path.splitext(path)
    return ext.lstrip(".").lower() or "text"


def _embed_texts(client: OpenAI, texts: list[str]) -> list[list[float]]:
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is required")
    if not texts:
        return []
    response = client.embeddings.create(model=settings.embedding_model, input=texts)
    return [item.embedding for item in response.data]


def index_repo(session: Session, repo: Repo, github_url: str | None):
    if github_url:
        repo_info = validate_github_url(github_url)
        repo.github_url = repo_info.url
        session.commit()

    if not repo.github_url:
        raise HTTPException(status_code=400, detail="github_url is required")

    repo_path = None
    files_indexed = 0
    chunks_indexed = 0
    client = OpenAI(api_key=settings.openai_api_key)

    try:
        repo_path = shallow_clone(repo.github_url)
        session.execute(delete(Chunk).where(Chunk.repo_id == repo.id))
        session.commit()

        for file_path in _iter_files(repo_path):
            rel_path = os.path.relpath(file_path, repo_path)
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
            except OSError:
                continue

            file_chunks = []
            language = _language_from_path(rel_path)
            for start, end, chunk_text in _chunk_text(content):
                start_line, end_line = _line_range(content, start, end)
                file_chunks.append(
                    {
                        "path": rel_path.replace("\\", "/"),
                        "language": language,
                        "start_line": start_line,
                        "end_line": end_line,
                        "content": chunk_text,
                    }
                )

            if not file_chunks:
                continue

            embeddings = _embed_texts(client, [c["content"] for c in file_chunks])
            for chunk_data, embedding in zip(file_chunks, embeddings):
                session.add(
                    Chunk(
                        repo_id=repo.id,
                        path=chunk_data["path"],
                        language=chunk_data["language"],
                        start_line=chunk_data["start_line"],
                        end_line=chunk_data["end_line"],
                        content=chunk_data["content"],
                        embedding=embedding,
                    )
                )
                chunks_indexed += 1

            session.commit()
            files_indexed += 1

    finally:
        if repo_path:
            shutil.rmtree(repo_path, ignore_errors=True)

    return files_indexed, chunks_indexed
