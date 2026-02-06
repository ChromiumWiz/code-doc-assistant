import { RepoInfo } from "./types";

const KEY = "code-doc-assistant.repo";
const LIST_KEY = "code-doc-assistant.repos";

function normalizeRepo(repo: RepoInfo): RepoInfo {
  if (!repo.status) return { ...repo, status: "not_indexed" };
  return repo;
}

export function getRepo(): RepoInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const repos = getRepos();
    return repos[0] || null;
  } catch {
    return null;
  }
}

export function saveRepo(repo: RepoInfo) {
  if (typeof window === "undefined") return;
  const repos = getRepos();
  const normalized = normalizeRepo(repo);
  const next = upsertRepo(repos, normalized);
  window.localStorage.setItem(LIST_KEY, JSON.stringify(next));
  window.localStorage.setItem(KEY, JSON.stringify(normalized));
}

export function clearRepo() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function getRepos(): RepoInfo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RepoInfo[];
      return parsed.map(normalizeRepo);
    }
    const legacy = window.localStorage.getItem(KEY);
    if (!legacy) return [];
    const parsedLegacy = normalizeRepo(JSON.parse(legacy) as RepoInfo);
    const migrated = [parsedLegacy];
    window.localStorage.setItem(LIST_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return [];
  }
}

export function saveRepos(repos: RepoInfo[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LIST_KEY, JSON.stringify(repos.map(normalizeRepo)));
}

function upsertRepo(list: RepoInfo[], repo: RepoInfo): RepoInfo[] {
  const idx = list.findIndex((r) => r.repo_id === repo.repo_id);
  if (idx === -1) return [repo, ...list];
  const next = [...list];
  next[idx] = repo;
  return next;
}
