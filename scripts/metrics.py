#!/usr/bin/env python3
"""Build schema-v3 engineering metrics from the checked-out git histories."""
from __future__ import annotations

import datetime as dt
import json
import os
import re
import subprocess
import urllib.error
import urllib.request
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable

PROJECT_ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = PROJECT_ROOT / "config" / "metrics.json"
DEFAULT_OUTPUT = PROJECT_ROOT / "site" / "metrics.json"
COMMIT_TYPES = ("feature", "fix", "refactor", "test", "docs", "chore", "other")
NUMERIC_FIELDS = (
    "commits", "local_commits", "merge_commits", "additions", "deletions",
    "updated_lines", "lines_added", "lines_deleted", "changed_lines", "files_changed",
)
LANGUAGE_BY_EXTENSION = {
    ".css": "CSS", ".go": "Go", ".html": "HTML", ".java": "Java",
    ".js": "JavaScript", ".jsx": "JavaScript", ".kt": "Kotlin", ".kts": "Kotlin",
    ".md": "Markdown", ".php": "PHP", ".py": "Python", ".rb": "Ruby",
    ".rs": "Rust", ".scss": "SCSS", ".sh": "Shell", ".sql": "SQL",
    ".svelte": "Svelte", ".swift": "Swift", ".ts": "TypeScript", ".tsx": "TypeScript",
    ".vue": "Vue", ".yml": "YAML", ".yaml": "YAML",
}
LANGUAGE_BY_FILENAME = {"Dockerfile": "Dockerfile", "Makefile": "Makefile"}
IGNORED_LANGUAGE_FILES = {
    "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "poetry.lock", "Pipfile.lock",
}


def slug(value: str) -> str:
    result = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return result or "unknown"


def load_config(path: Path = CONFIG_PATH) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def normalize_identity(
    author_name: str,
    author_email: str,
    config: dict[str, Any],
) -> dict[str, str]:
    """Return a safe public identity; config aliases may contain private emails."""
    needle = {author_name.strip().lower(), author_email.strip().lower()}
    for person in config.get("people", []):
        aliases = {str(item).strip().lower() for item in person.get("aliases", [])}
        if needle & aliases:
            return {
                key: person.get(key, "")
                for key in ("id", "name", "login", "avatar_url", "kind")
            }
    candidate = " ".join(needle)
    automation_patterns = config.get("automation", {}).get("patterns", [])
    if any(word.lower() in candidate for word in automation_patterns):
        automation = config.get("automation", {})
        return {
            "id": automation.get("id", "automation"),
            "name": automation.get("name", "Automation"),
            "login": automation.get("login", "automation"),
            "avatar_url": "",
            "kind": "automation",
        }
    return {
        "id": slug(author_name),
        "name": author_name.strip() or "Unknown",
        "login": slug(author_name),
        "avatar_url": "",
        "kind": "human",
    }


def classify_subject(subject: str) -> str:
    match = re.match(r"^([a-z]+)(?:\([^)]*\))?!?:", subject.strip(), re.I)
    name = match.group(1).lower() if match else ""
    aliases = {
        "feat": "feature", "feature": "feature", "fix": "fix", "bugfix": "fix",
        "refactor": "refactor", "test": "test", "tests": "test", "docs": "docs",
        "doc": "docs", "chore": "chore", "build": "chore", "ci": "chore",
    }
    return aliases.get(name, "other")


def line_metrics(additions: int, deletions: int) -> dict[str, int]:
    updated = min(additions, deletions)
    return {
        "additions": additions,
        "deletions": deletions,
        "updated_lines": updated,
        "lines_added": additions - updated,
        "lines_deleted": deletions - updated,
        "changed_lines": additions + deletions,
    }


def public_commit_record(
    commit: dict[str, Any],
    repo_id: str,
    config: dict[str, Any],
) -> dict[str, Any]:
    """Return the privacy-safe, commit-level record used for dashboard drilldowns."""
    timestamp = commit["timestamp"]
    metric = line_metrics(commit["additions"], commit["deletions"])
    return {
        "sha": commit["sha"],
        "timestamp": timestamp,
        "date": timestamp[:10],
        "hour": int(timestamp[11:13]),
        "repo": repo_id,
        "person": normalize_identity(
            commit["author_name"], commit["author_email"], config,
        )["id"],
        "subject": commit["subject"],
        "type": classify_subject(commit["subject"]),
        "merge": len(commit["parents"]) > 1,
        **metric,
        "files_changed": commit["files_changed"],
    }


def parse_git_log(text: str, local_only: set[str]) -> list[dict[str, Any]]:
    """Parse `git log --numstat` text using a control-character commit header."""
    commits: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    # str.splitlines treats the record separator used by git's format as a newline.
    for line in text.split("\n"):
        if line.startswith("\x1e"):
            if current is not None:
                commits.append(current)
            parts = line[1:].split("\x1f")
            if len(parts) != 6:
                raise ValueError("unexpected git log header")
            sha, timestamp, name, email, parents, subject = parts
            current = {
                "sha": sha,
                "timestamp": timestamp,
                "author_name": name,
                "author_email": email,
                "parents": parents.split() if parents else [],
                "subject": subject,
                "additions": 0,
                "deletions": 0,
                "files_changed": 0,
                "local_only": sha in local_only,
            }
        elif current is not None and "\t" in line:
            additions, deletions, _filename = line.split("\t", 2)
            if additions.isdigit() and deletions.isdigit():
                current["additions"] += int(additions)
                current["deletions"] += int(deletions)
            current["files_changed"] += 1
    if current is not None:
        commits.append(current)
    return commits


def empty_metrics() -> dict[str, Any]:
    return {
        **{field: 0 for field in NUMERIC_FIELDS},
        "commit_types": {kind: 0 for kind in COMMIT_TYPES},
    }


def aggregate_commits(
    commits: Iterable[dict[str, Any]],
    repo_id: str,
    config: dict[str, Any],
) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]], dict[str, Any]]:
    commits = list(commits)
    rows: dict[tuple[str, str, str], dict[str, Any]] = {}
    people: dict[str, dict[str, Any]] = {}
    totals = empty_metrics()
    for commit in commits:
        person = normalize_identity(commit["author_name"], commit["author_email"], config)
        date = commit["timestamp"][:10]
        key = (date, repo_id, person["id"])
        row = rows.setdefault(
            key,
            {"date": date, "repo": repo_id, "person": person["id"], **empty_metrics()},
        )
        metric = line_metrics(commit["additions"], commit["deletions"])
        is_merge = len(commit["parents"]) > 1
        for target in (row, totals):
            target["commits"] += 1
            target["local_commits"] += int(commit["local_only"])
            target["merge_commits"] += int(is_merge)
            target["files_changed"] += commit["files_changed"]
            for field, value in metric.items():
                target[field] += value
            target["commit_types"][classify_subject(commit["subject"])] += 1
        public = people.setdefault(
            person["id"],
            {**person, "commits": 0, "local_commits": 0},
        )
        public["commits"] += 1
        public["local_commits"] += int(commit["local_only"])
    totals["active_days"] = len({commit["timestamp"][:10] for commit in commits})
    ordered_rows = sorted(
        rows.values(),
        key=lambda row: (row["date"], row["repo"], row["person"]),
    )
    return ordered_rows, people, totals


def git(repo: Path, *args: str, check: bool = True, input_text: str | None = None) -> str:
    completed = subprocess.run(
        ["git", "-C", str(repo), *args],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        input=input_text,
        check=False,
    )
    if check and completed.returncode:
        raise RuntimeError(completed.stderr.strip() or f"git {' '.join(args)} failed")
    return completed.stdout


def first_existing_ref(repo: Path, refs: Iterable[str]) -> str | None:
    for ref in refs:
        if ref and git(repo, "rev-parse", "--verify", "--quiet", ref, check=False).strip():
            return ref
    return None


def collect_repo_commits(repo: Path) -> tuple[str, list[dict[str, Any]]]:
    origin_head = git(
        repo, "symbolic-ref", "--quiet", "refs/remotes/origin/HEAD", check=False,
    ).strip()
    default_ref = first_existing_ref(
        repo,
        [origin_head, "refs/remotes/origin/main", "main", "refs/remotes/origin/master", "master"],
    )
    if not default_ref:
        raise RuntimeError("no supported default branch ref found")
    local_only = set(git(repo, "rev-list", "--branches", "--not", "--remotes").split())
    selected = set(git(repo, "rev-list", default_ref).split()) | local_only
    header = "%x1e%H%x1f%aI%x1f%an%x1f%ae%x1f%P%x1f%s"
    log_output = git(
        repo,
        "log",
        "--stdin",
        "--no-walk",
        f"--format={header}",
        "--numstat",
        input_text="\n".join(sorted(selected)) + "\n",
    )
    commits = parse_git_log(log_output, local_only)
    return default_ref, list({commit["sha"]: commit for commit in commits}.values())


def api_get(url: str, token: str) -> tuple[Any, dict[str, str]] | None:
    if not token:
        return None
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=3) as response:
            return json.loads(response.read().decode("utf-8")), dict(response.headers.items())
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError):
        return None


def api_count(owner: str, name: str, endpoint: str, state: str, token: str) -> int | None:
    if endpoint == "issues":
        response = api_get(
            f"https://api.github.com/search/issues?q=repo:{owner}/{name}+is:issue+is:{state}",
            token,
        )
        return response[0].get("total_count") if response and isinstance(response[0], dict) else None
    response = api_get(
        f"https://api.github.com/repos/{owner}/{name}/{endpoint}?state={state}&per_page=1",
        token,
    )
    if not response:
        return None
    body, headers = response
    match = re.search(r"[?&]page=(\d+)>;\s*rel=\"last\"", headers.get("Link", ""))
    return int(match.group(1)) if match else len(body)


def optional_metadata(
    owner: str,
    name: str,
    token: str,
) -> tuple[dict[str, int], dict[str, int], dict[str, int]]:
    response = api_get(f"https://api.github.com/repos/{owner}/{name}/languages", token)
    languages = response[0] if response and isinstance(response[0], dict) else {}
    prs = {
        state: api_count(owner, name, "pulls", state, token)
        for state in ("open", "closed")
    }
    issues = {
        state: api_count(owner, name, "issues", state, token)
        for state in ("open", "closed")
    }
    return (
        languages,
        {key: value for key, value in prs.items() if value is not None},
        {key: value for key, value in issues.items() if value is not None},
    )


def language_for_path(path: Path) -> str | None:
    """Return a small, deterministic language classification for a tracked file."""
    if path.name in IGNORED_LANGUAGE_FILES:
        return None
    return LANGUAGE_BY_FILENAME.get(path.name) or LANGUAGE_BY_EXTENSION.get(path.suffix.lower())


def local_languages(repo: Path) -> dict[str, int]:
    """Estimate the current codebase language footprint from tracked file bytes."""
    totals: dict[str, int] = defaultdict(int)
    for relative in git(repo, "ls-files", "-z").split("\0"):
        if not relative:
            continue
        relative_path = Path(relative)
        language = language_for_path(relative_path)
        if not language:
            continue
        try:
            totals[language] += (repo / relative_path).stat().st_size
        except OSError:
            continue
    return dict(sorted(totals.items(), key=lambda pair: pair[1], reverse=True))


def merge_totals(target: dict[str, Any], source: dict[str, Any]) -> None:
    for field in NUMERIC_FIELDS:
        target[field] += source[field]
    for kind in COMMIT_TYPES:
        target["commit_types"][kind] += source["commit_types"][kind]


def main() -> None:
    config = load_config()
    root = Path(os.environ.get("METRICS_REPOS_ROOT", PROJECT_ROOT.parent)).resolve()
    output_env = os.environ.get("METRICS_OUTPUT")
    output = Path(output_env).expanduser().resolve() if output_env else DEFAULT_OUTPUT
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    activity: list[dict[str, Any]] = []
    commit_log: list[dict[str, Any]] = []
    people: dict[str, dict[str, Any]] = {}
    repos: dict[str, Any] = {}
    warnings: list[str] = []
    aggregate = empty_metrics()
    languages_total: dict[str, int] = defaultdict(int)
    prs_total: dict[str, int] = defaultdict(int)
    issues_total: dict[str, int] = defaultdict(int)
    found = 0

    for repo_config in config["repositories"]:
        repo_id = repo_config["id"]
        directory = root / repo_config.get("directory", repo_id)
        if not directory.is_dir() or not (directory / ".git").exists():
            if not repo_config.get("local_repository"):
                warnings.append(f"{repo_id}: configured repository directory not found")
            continue
        found += 1
        try:
            default_ref, commits = collect_repo_commits(directory)
        except RuntimeError as error:
            warnings.append(f"{repo_id}: {error}")
            continue

        rows, repo_people, totals = aggregate_commits(commits, repo_id, config)
        activity.extend(rows)
        commit_log.extend(public_commit_record(commit, repo_id, config) for commit in commits)
        merge_totals(aggregate, totals)
        for person_id, person in repo_people.items():
            existing = people.setdefault(
                person_id,
                {**person, "commits": 0, "local_commits": 0},
            )
            existing["commits"] += person["commits"]
            existing["local_commits"] += person["local_commits"]

        owner = repo_config.get("github_owner", config["owner"])
        github_name = repo_config.get("github_name", repo_id)
        if owner:
            languages, pr_counts, issue_counts = optional_metadata(owner, github_name, token)
        else:
            languages, pr_counts, issue_counts = {}, {}, {}
        if not languages:
            languages = local_languages(directory)
        for key, value in languages.items():
            languages_total[key] += value
        for key, value in pr_counts.items():
            prs_total[key] += value
        for key, value in issue_counts.items():
            issues_total[key] += value
        repos[repo_id] = {
            "display_name": repo_config["display_name"],
            "github": {
                "owner": owner,
                "name": github_name,
                "historical_owners": repo_config["historical_owners"],
            },
            "default_ref": default_ref,
            "totals": totals,
            "languages": languages,
            "pr_counts": pr_counts,
            "issue_counts": issue_counts,
            "warnings": [],
        }

    if not found:
        raise SystemExit(f"ERROR: no configured repositories found below {root}")
    aggregate["active_days"] = len({row["date"] for row in activity})
    aggregate_payload: dict[str, Any] = {
        "totals": aggregate,
        "languages": dict(sorted(languages_total.items(), key=lambda pair: pair[1], reverse=True)),
    }
    if prs_total:
        aggregate_payload["pr_counts"] = dict(prs_total)
    if issues_total:
        aggregate_payload["issue_counts"] = dict(issues_total)
    dates = [row["date"] for row in activity]
    payload = {
        "schema_version": 3,
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z"),
        "owner": config["owner"],
        "repo_count": len(repos),
        "data_range": {
            "earliest_date": min(dates) if dates else None,
            "latest_date": max(dates) if dates else None,
        },
        "data_source": (
            "local git history; optional GitHub API metadata"
            if token else "local git history"
        ),
        "line_metric_note": (
            "updated_lines is estimated per commit as min(additions, deletions); "
            "remaining additions/deletions are lines_added/lines_deleted."
        ),
        "people": sorted(
            people.values(), key=lambda item: (-item["commits"], item["id"]),
        ),
        "activity": sorted(
            activity, key=lambda row: (row["date"], row["repo"], row["person"]),
        ),
        "commit_log": sorted(
            commit_log, key=lambda commit: (commit["timestamp"], commit["repo"], commit["sha"]),
        ),
        "aggregate": aggregate_payload,
        "repos": repos,
        "warnings": warnings,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    if not output_env:
        mirror = PROJECT_ROOT / "dashboard" / "public" / "metrics.json"
        mirror.parent.mkdir(parents=True, exist_ok=True)
        mirror.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {output}")


if __name__ == "__main__":
    main()
