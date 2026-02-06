export type RepoInfo = {
  repo_id: string;
  name?: string | null;
  github_url: string;
};

export type IndexResult = {
  files_indexed?: number;
  chunks_indexed?: number;
  files?: number;
  chunks?: number;
  [key: string]: unknown;
};

export type ChatSource = {
  path: string;
  start_line?: number;
  end_line?: number;
  start?: number;
  end?: number;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
};

export type ChatResponse = {
  answer: string;
  sources?: ChatSource[];
};
