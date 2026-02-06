import { ChatResponse, IndexResult, RepoInfo } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

function requireBaseUrl(): string {
  if (!API_BASE) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
  }
  return API_BASE.replace(/\/$/, "");
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export async function createRepo(name: string | null, github_url: string): Promise<RepoInfo> {
  const base = requireBaseUrl();
  const res = await fetch(`${base}/repos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name || null, github_url })
  });
  return handleResponse<RepoInfo>(res);
}

export async function listRepos(): Promise<RepoInfo[]> {
  const base = requireBaseUrl();
  const res = await fetch(`${base}/repos`, {
    method: "GET"
  });
  return handleResponse<RepoInfo[]>(res);
}

export async function indexRepo(repoId: string): Promise<IndexResult> {
  const base = requireBaseUrl();
  const res = await fetch(`${base}/repos/${encodeURIComponent(repoId)}/index`, {
    method: "POST"
  });
  return handleResponse<IndexResult>(res);
}

export async function chat(repoId: string, question: string): Promise<ChatResponse> {
  const base = requireBaseUrl();
  const res = await fetch(`${base}/repos/${encodeURIComponent(repoId)}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question })
  });
  return handleResponse<ChatResponse>(res);
}
