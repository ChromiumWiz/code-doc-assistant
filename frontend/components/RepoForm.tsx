"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createRepo, indexRepo, listRepos } from "../lib/api";
import { getRepos, saveRepo, saveRepos } from "../lib/storage";
import { isValidGithubRepoUrl } from "../lib/validate";
import { RepoInfo } from "../lib/types";

export default function RepoForm() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [repos, setRepos] = useState<RepoInfo[]>([]);
  const [indexing, setIndexing] = useState(false);

  useEffect(() => {
    const local = getRepos();
    setRepos(local);
    listRepos()
      .then((remote) => {
        const next = remote || [];
        saveRepos(next);
        setRepos(next);
      })
      .catch(() => {
        // fall back to local storage if backend is unavailable
      });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidGithubRepoUrl(url)) {
      setError("Enter a valid GitHub repo URL: https://github.com/owner/repo");
      return;
    }

    setLoading(true);
    try {
      const created = await createRepo(name.trim() || null, url.trim());
      const saved = {
        repo_id: created.repo_id,
        github_url: created.github_url || url.trim(),
        name: created.name ?? (name.trim() || null),
        status: created.status || "not_indexed"
      } as RepoInfo;
      saveRepo(saved);
      setRepos(getRepos());
      setName(saved.name || "");
      setUrl(saved.github_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function onIndex(target: RepoInfo) {
    if (target.status === "done" || target.status === "processing") return;
    setError(null);
    setIndexing(true);
    const next = { ...target, status: "processing" as const };
    updateRepo(next);
    try {
      await indexRepo(target.repo_id);
      const done = { ...target, status: "done" as const };
      updateRepo(done);
    } catch (err) {
      const failed = { ...target, status: "not_indexed" as const };
      updateRepo(failed);
      setError(err instanceof Error ? err.message : "Indexing failed");
    } finally {
      setIndexing(false);
    }
  }

  function updateRepo(next: RepoInfo) {
    saveRepo(next);
    setRepos(getRepos());
  }

  return (
    <div className="card stack">
      <form onSubmit={onSubmit} className="stack">
        <div className="stack">
          <label htmlFor="repo-name">Repo name (optional)</label>
          <input
            id="repo-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Friendly name"
          />
        </div>
        <div className="stack">
          <label htmlFor="repo-url">GitHub repo URL</label>
          <input
            id="repo-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            required
          />
          <div className="notice">Format: https://github.com/owner/repo</div>
        </div>
        {error ? <div className="notice">{error}</div> : null}
        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Repo"}
        </button>
      </form>

      <div className="divider" />

      {repos.length > 0 ? (
        <div className="stack">
          {repos.map((item) => (
            <div key={item.repo_id} className="repo-card stack">

              <div>
                <strong>{item.name || "(no name)"}</strong>
              </div>
              <div className="notice">{item.github_url}</div>
              <div className="row">
                <button
                  type="button"
                  onClick={() => onIndex(item)}
                  disabled={
                    indexing || item.status === "processing" || item.status === "done"
                  }
                >
                  {item.status === "processing"
                    ? "Processing..."
                    : item.status === "done"
                    ? "Indexed"
                    : indexing
                    ? "Indexing..."
                    : "Index Now"}
                </button>
                {item.status === "done" ? (
                  <Link
                    href={`/chat?repo_id=${encodeURIComponent(item.repo_id)}`}
                    className="button-link"
                  >
                    Go to chat
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="notice">No repo selected yet.</div>
      )}
    </div>
  );
}
