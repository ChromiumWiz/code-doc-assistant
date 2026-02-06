"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createRepo } from "../lib/api";
import { getRepo, saveRepo } from "../lib/storage";
import { isValidGithubRepoUrl } from "../lib/validate";
import { RepoInfo } from "../lib/types";

export default function RepoForm() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [repo, setRepo] = useState<RepoInfo | null>(null);

  useEffect(() => {
    setRepo(getRepo());
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
        name: created.name ?? (name.trim() || null)
      } as RepoInfo;
      saveRepo(saved);
      setRepo(saved);
      setName(saved.name || "");
      setUrl(saved.github_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
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

      {repo ? (
        <div className="stack">
          <div className="badge">Selected repo</div>
          <div>
            <strong>{repo.name || "(no name)"}</strong>
          </div>
          <div className="notice">{repo.github_url}</div>
          <div className="row">
            <Link href="/index">Go to indexing</Link>
            <Link href="/chat">Go to chat</Link>
          </div>
        </div>
      ) : (
        <div className="notice">No repo selected yet.</div>
      )}
    </div>
  );
}
