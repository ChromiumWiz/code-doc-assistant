const GITHUB_REPO_REGEX = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/;

export function isValidGithubRepoUrl(url: string): boolean {
  return GITHUB_REPO_REGEX.test(url.trim());
}
