"use client";

import { useEffect, useState } from "react";
import { chat } from "../lib/api";
import { ChatMessage, RepoInfo } from "../lib/types";
import { getRepo } from "../lib/storage";
import SourceList from "./SourceList";

export default function ChatBox() {
  const [repo, setRepo] = useState<RepoInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRepo(getRepo());
  }, []);

  async function onSend() {
    if (!repo) return;
    const trimmed = question.trim();
    if (!trimmed) return;

    setError(null);
    setLoading(true);
    setQuestion("");

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);

    try {
      const res = await chat(repo.repo_id, trimmed);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.answer, sources: res.sources }
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card stack">
      {!repo ? (
        <div className="notice">No repo selected.</div>
      ) : (
        <div className="stack">
          <div className="notice">Chatting on: {repo.github_url}</div>
          <div className="stack">
            {messages.length === 0 ? (
              <div className="notice">Ask a question about the repo.</div>
            ) : (
              messages.map((msg, idx) => (
                <div key={`${msg.role}-${idx}`} className={`message ${msg.role}`}>
                  <div>{msg.content}</div>
                  {msg.role === "assistant" ? <SourceList sources={msg.sources} /> : null}
                </div>
              ))
            )}
          </div>
          {error ? <div className="notice">{error}</div> : null}
          <div className="stack">
            <textarea
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about architecture, API usage, or files..."
            />
            <button onClick={onSend} disabled={loading}>
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
