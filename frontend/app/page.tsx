"use client";

import RepoForm from "../components/RepoForm";

export default function HomePage() {
  return (
    <div className="stack">
      <h1>Create Repo</h1>
      <p className="notice">
        Connect a GitHub repo to the Code Documentation Assistant backend.
      </p>
      <RepoForm />
    </div>
  );
}
