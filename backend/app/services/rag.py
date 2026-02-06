import json
import logging
import uuid

from openai import OpenAI
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Chunk, Repo
from app.prompts import SYSTEM_PROMPT, user_prompt

logger = logging.getLogger(__name__)


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


def _extract_answer_and_sources(
    raw_answer: str,
    sources: list[dict[str, int | str]],
    rag_debug: bool = False,
    rag_trace_id: str | None = None,
    repo_id: str | None = None,
    provided_sources: list[str] | None = None,
):
    answer = raw_answer
    cited_sources: list[dict[str, int | str]] = []
    try:
        parsed = json.loads(raw_answer)
        if isinstance(parsed, dict):
            if isinstance(parsed.get("answer"), str):
                answer = parsed["answer"]
            citations_used = parsed.get("citations_used", [])
            if isinstance(citations_used, list):
                seen = set()
                for item in citations_used:
                    if not isinstance(item, int):
                        continue
                    idx = item - 1
                    if 0 <= idx < len(sources) and idx not in seen:
                        cited_sources.append(sources[idx])
                        seen.add(idx)
    except json.JSONDecodeError:
        cited_sources = []

    if rag_debug and rag_trace_id and repo_id and provided_sources is not None:
        used_deduped = []
        try:
            parsed = json.loads(raw_answer)
            citations_used = []
            if isinstance(parsed, dict) and isinstance(parsed.get("citations_used"), list):
                citations_used = parsed["citations_used"]

            seen = set()
            for item in citations_used:
                if not isinstance(item, int):
                    continue
                idx = item - 1
                if 0 <= idx < len(provided_sources) and idx not in seen:
                    used_deduped.append(provided_sources[idx])
                    seen.add(idx)
        except json.JSONDecodeError:
            used_deduped = []

        logger.info(
            json.dumps(
                {
                    "event": "rag_sources_used",
                    "rag_trace_id": rag_trace_id,
                    "repo_id": repo_id,
                    "count": len(used_deduped),
                    "sources": used_deduped,
                }
            )
        )

    return answer, cited_sources


def _format_sources(sources: list[dict[str, int | str]]) -> list[str]:
    return [f"{s['path']}:{s['start_line']}-{s['end_line']}" for s in sources]


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

    rag_trace_id = None
    provided_sources = None
    if settings.rag_debug:
        if not logger.handlers:
            handler = logging.StreamHandler()
            handler.setLevel(logging.INFO)
            logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        rag_trace_id = uuid.uuid4().hex
        provided_sources = _format_sources(sources)
        logger.info(
            json.dumps(
                {
                    "event": "rag_sources_provided",
                    "rag_trace_id": rag_trace_id,
                    "repo_id": str(repo.id),
                    "count": len(provided_sources),
                    "sources": provided_sources,
                }
            )
        )

    response = client.chat.completions.create(
        model=settings.chat_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=settings.chat_temperature,
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "rag_answer",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "answer": {"type": "string"},
                        "citations_used": {
                            "type": "array",
                            "items": {"type": "integer"},
                        },
                    },
                    "required": ["answer", "citations_used"],
                    "additionalProperties": False,
                },
            },
        },
    )

    raw_answer = response.choices[0].message.content.strip()

    return _extract_answer_and_sources(
        raw_answer,
        sources,
        rag_debug=settings.rag_debug,
        rag_trace_id=rag_trace_id,
        repo_id=str(repo.id),
        provided_sources=provided_sources,
    )
