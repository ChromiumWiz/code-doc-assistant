"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ChatBox from "../../components/ChatBox";
import { getRepos } from "../../lib/storage";
import { RepoInfo } from "../../lib/types";

export default function ChatPage() {
  const [repo, setRepo] = useState<RepoInfo | null>(null);
  const searchParams = useSearchParams();
  const repoId = useMemo(() => searchParams.get("repo_id"), [searchParams]);

  useEffect(() => {
    const repos = getRepos();
    if (!repoId) {
      setRepo(null);
      return;
    }
    const match = repos.find((r) => r.repo_id === repoId) || null;
    setRepo(match);
  }, [repoId]);

  if (repo === null) {
    return (
      <div className="stack">
        <h1>Chat</h1>
        <div className="card stack">
          <div className="notice">No repo selected.</div>
          <Link href="/">Back to repos</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>Chat</h1>
      {repo.status !== "done" ? (
        <div className="card stack">
          <div className="notice">
            Repo is not indexed yet. Current status: {repo.status}
          </div>
          <Link href="/">Back to repos</Link>
        </div>
      ) : (
        <ChatBox repo={repo} />
      )}
    </div>
  );
}
