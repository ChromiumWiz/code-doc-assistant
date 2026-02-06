import re
import subprocess
import tempfile
from dataclasses import dataclass

import httpx
from fastapi import HTTPException


GITHUB_REPO_RE = re.compile(r"^https://github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)\/?$")


@dataclass
class GithubRepo:
    owner: str
    repo: str
    url: str


def validate_github_url(url: str) -> GithubRepo:
    match = GITHUB_REPO_RE.match(url or "")
    if not match:
        raise HTTPException(status_code=400, detail="Invalid GitHub URL format")

    owner, repo = match.group(1), match.group(2)
    api_url = f"https://api.github.com/repos/{owner}/{repo}"

    try:
        response = httpx.head(
            api_url,
            headers={"Accept": "application/vnd.github+json"},
            timeout=10,
        )
    except httpx.RequestError:
        raise HTTPException(status_code=400, detail="GitHub API request failed")

    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="GitHub repo not found")

    normalized = f"https://github.com/{owner}/{repo}"
    return GithubRepo(owner=owner, repo=repo, url=normalized)


def shallow_clone(repo_url: str) -> str:
    temp_dir = tempfile.mkdtemp(prefix="repo_")
    cmd = ["git", "clone", "--depth", "1", repo_url, temp_dir]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise HTTPException(status_code=400, detail=f"Git clone failed: {result.stderr.strip()}")
    return temp_dir
