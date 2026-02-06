"use client";

import RepoForm from "../components/RepoForm";

export default function HomePage() {
  return (
    <div className="stack">
      <h1>Code Documentation Assistant</h1>
      <p className="notice">
        Connect a GitHub repository, index it, and chat with your codebase.
      </p>
      <RepoForm />
    </div>
  );
}
