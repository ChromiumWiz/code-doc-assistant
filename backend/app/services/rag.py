from openai import OpenAI
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Chunk, Repo
from app.prompts import SYSTEM_PROMPT, user_prompt


def _embed_query(client: OpenAI, text: str) -> list[float]:
    response = client.embeddings.create(model=settings.embedding_model, input=[text])
    return response.data[0].embedding


def retrieve_chunks(session: Session, repo_id, query_embedding, top_k: int = 10):
    stmt = (
        select(Chunk)
        .where(Chunk.repo_id == repo_id)
        .order_by(Chunk.embedding.l2_distance(query_embedding))
        .limit(top_k)
    )
    return session.execute(stmt).scalars().all()


def answer_question(session: Session, repo: Repo, question: str):
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is required")

    client = OpenAI(api_key=settings.openai_api_key)
    query_embedding = _embed_query(client, question)
    chunks = retrieve_chunks(session, repo.id, query_embedding, top_k=10)

    context_lines = []
    sources = []
    for i, chunk in enumerate(chunks, start=1):
        label = f"[{i}] {chunk.path}:{chunk.start_line}-{chunk.end_line}"
        context_lines.append(f"{label}\n{chunk.content}")
        sources.append(
            {"path": chunk.path, "start_line": chunk.start_line, "end_line": chunk.end_line}
        )

    context = "\n\n".join(context_lines)
    prompt = user_prompt(context=context, question=question)

    response = client.chat.completions.create(
        model=settings.chat_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
    )

    answer = response.choices[0].message.content.strip()
    return answer, sources
