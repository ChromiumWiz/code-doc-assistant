from __future__ import annotations

import ast
from typing import TypedDict


class Chunk(TypedDict):
    content: str
    file_path: str
    language: str
    symbol: str | None
    start_line: int
    end_line: int


def sliding_window_chunks(
    code_text: str,
    file_path: str,
    language: str,
    chunk_size: int = 1000,
    overlap: int = 200,
) -> list[Chunk]:
    chunks: list[Chunk] = []
    step = max(1, chunk_size - overlap)
    for start in range(0, len(code_text), step):
        end = min(len(code_text), start + chunk_size)
        if start >= end:
            break
        start_line = 1 + code_text[:start].count("\n")
        end_line = 1 + code_text[:end].count("\n")
        chunks.append(
            {
                "content": code_text[start:end],
                "file_path": file_path,
                "language": language,
                "symbol": None,
                "start_line": start_line,
                "end_line": end_line,
            }
        )
        if end >= len(code_text):
            break
    return chunks


def _slice_lines(code_text: str, start_line: int, end_line: int) -> str:
    lines = code_text.splitlines()
    if not lines:
        return ""
    start = max(1, start_line)
    end = max(start, end_line)
    end = min(end, len(lines))
    return "\n".join(lines[start - 1 : end])


def chunk_python(code_text: str, file_path: str) -> list[Chunk] | None:
    try:
        tree = ast.parse(code_text)
    except SyntaxError:
        return None

    chunks: list[Chunk] = []

    def add_chunk(symbol: str, lineno: int, end_lineno: int) -> None:
        if lineno <= 0 or end_lineno <= 0 or end_lineno < lineno:
            return
        chunks.append(
            {
                "content": _slice_lines(code_text, lineno, end_lineno),
                "file_path": file_path,
                "language": "python",
                "symbol": symbol,
                "start_line": lineno,
                "end_line": end_lineno,
            }
        )

    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            add_chunk(f"func:{node.name}", node.lineno, node.end_lineno or node.lineno)
        elif isinstance(node, ast.ClassDef):
            add_chunk(f"class:{node.name}", node.lineno, node.end_lineno or node.lineno)
            for child in node.body:
                if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    add_chunk(
                        f"method:{node.name}.{child.name}",
                        child.lineno,
                        child.end_lineno or child.lineno,
                    )

    return chunks or None


def chunk_code(
    code_text: str,
    file_path: str,
    language: str,
    chunk_size: int = 1000,
    overlap: int = 200,
) -> list[Chunk]:
    if language == "python":
        chunks = chunk_python(code_text, file_path)
        if chunks:
            return chunks
        return sliding_window_chunks(code_text, file_path, language, chunk_size, overlap)

    return sliding_window_chunks(code_text, file_path, language, chunk_size, overlap)
