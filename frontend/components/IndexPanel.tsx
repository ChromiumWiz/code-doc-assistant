"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { indexRepo } from "../lib/api";
import { getRepo } from "../lib/storage";
import { IndexResult, RepoInfo } from "../lib/types";

export default function IndexPanel() {
  const [repo, setRepo] = useState<RepoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IndexResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRepo(getRepo());
  }, []);

  async function onIndex() {
    if (!repo) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await indexRepo(repo.repo_id);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  if (!repo) {
    return (
      <div className="card stack">
        <div className="notice">No repo selected.</div>
        <Link href="/">Back to create repo</Link>
      </div>
    );
  }

  return (
    <div className="card stack">
      <div className="notice">Repo: {repo.github_url}</div>
      <button onClick={onIndex} disabled={loading}>
        {loading ? "Indexing..." : "Index Now"}
      </button>
      {error ? <div className="notice">{error}</div> : null}
      {result ? (
        <div className="stack">
          <div className="badge">Result</div>
          <div className="row">
            {typeof result.files_indexed === "number" ? (
              <div className="badge">Files: {result.files_indexed}</div>
            ) : null}
            {typeof result.chunks_indexed === "number" ? (
              <div className="badge">Chunks: {result.chunks_indexed}</div>
            ) : null}
            {typeof result.files === "number" ? (
              <div className="badge">Files: {result.files}</div>
            ) : null}
            {typeof result.chunks === "number" ? (
              <div className="badge">Chunks: {result.chunks}</div>
            ) : null}
          </div>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  );
}
