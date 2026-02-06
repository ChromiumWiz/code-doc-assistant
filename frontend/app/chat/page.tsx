"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ChatBox from "../../components/ChatBox";
import { getRepo } from "../../lib/storage";

export default function ChatPage() {
  const [hasRepo, setHasRepo] = useState<boolean | null>(null);

  useEffect(() => {
    setHasRepo(!!getRepo());
  }, []);

  if (hasRepo === null) {
    return (
      <div className="stack">
        <h1>Chat</h1>
        <div className="card">Loading...</div>
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>Chat</h1>
      {!hasRepo ? (
        <div className="card stack">
          <div className="notice">No repo selected.</div>
          <Link href="/">Back to create repo</Link>
        </div>
      ) : (
        <ChatBox />
      )}
    </div>
  );
}
