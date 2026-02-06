import { RepoInfo } from "./types";

const KEY = "code-doc-assistant.repo";

export function getRepo(): RepoInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RepoInfo;
  } catch {
    return null;
  }
}

export function saveRepo(repo: RepoInfo) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(repo));
}

export function clearRepo() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
