#!/usr/bin/env python3
import json, os, sys, time, datetime as dt
from typing import Dict, Any, List
import requests

GITHUB_API = "https://api.github.com"

TOKEN = os.environ.get("GITHUB_TOKEN", "").strip()
OWNER = os.environ.get("OWNER", "").strip()
INCLUDE_PRIVATE = os.environ.get("INCLUDE_PRIVATE", "false").lower() == "true"
INCLUDE_FORKS = os.environ.get("INCLUDE_FORKS", "false").lower() == "true"
REPOS_WHITELIST = [r.strip() for r in os.environ.get("REPOS_WHITELIST", "").split(",") if r.strip()]

SESSION = requests.Session()
SESSION.headers.update({
    "Accept": "application/vnd.github+json",
    "Authorization": f"Bearer {TOKEN}" if TOKEN else "",
    "X-GitHub-Api-Version": "2022-11-28",
})


def die(msg: str):
    print(f"ERROR: {msg}")
    sys.exit(1)


def get(url: str, params: Dict[str, Any] | None = None, retries: int = 3, backoff: float = 1.5):
    for i in range(retries):
        r = SESSION.get(url, params=params or {})
        if r.status_code == 202:
            # GitHub is computing stats; wait briefly
            time.sleep(min(5 + i * 2, 15))
            continue
        if r.ok:
            return r
        time.sleep(backoff ** i)
    r.raise_for_status()


def safe_stats_json(r):
    if r is None:
        return []
    # GitHub may return 204 No Content or an empty body while warming stats
    if getattr(r, "status_code", None) == 204 or not getattr(r, "content", b""):
        return []
    try:
        return r.json()
    except Exception:
        return []


def owner_type(owner: str) -> str:
    r = get(f"{GITHUB_API}/users/{owner}")
    return r.json().get("type", "User")


def list_repos(owner: str, include_private: bool, include_forks: bool) -> List[Dict[str, Any]]:
    typ = owner_type(owner)
    endpoint = f"{GITHUB_API}/users/{owner}/repos" if typ == "User" else f"{GITHUB_API}/orgs/{owner}/repos"
    page = 1
    out = []
    while True:
        r = get(endpoint, params={"per_page": 100, "page": page, "type": "all"})
        repos = r.json()
        if not repos:
            break
        for repo in repos:
            if not include_forks and repo.get("fork"):
                continue
            if REPOS_WHITELIST and repo["name"] not in REPOS_WHITELIST:
                continue
            if (not include_private) and repo.get("private"):
                continue
            out.append({
                "name": repo["name"],
                "private": repo.get("private", False),
                "fork": repo.get("fork", False),
                "default_branch": repo.get("default_branch", "main"),
            })
        page += 1
    return out


def weekly_commit_activity(owner: str, repo: str) -> List[Dict[str, Any]]:
    # Returns list of {week, total, days}
    r = get(f"{GITHUB_API}/repos/{owner}/{repo}/stats/commit_activity", retries=8)
    return safe_stats_json(r)


def weekly_code_frequency(owner: str, repo: str) -> List[List[int]]:
    # Returns list of [week_epoch, additions, deletions_negative]
    r = get(f"{GITHUB_API}/repos/{owner}/{repo}/stats/code_frequency", retries=8)
    return safe_stats_json(r)


def epoch_to_date(epoch_secs: int) -> str:
    # GitHub weeks start on Sunday
    return dt.datetime.utcfromtimestamp(epoch_secs).date().isoformat()


def merge_weekly(commits: List[Dict[str, Any]], codefreq: List[List[int]]):
    by_week: Dict[str, Dict[str, int]] = {}
    for entry in commits:
        wk = epoch_to_date(entry["week"])  # Sunday week start
        by_week.setdefault(wk, {"commits": 0, "additions": 0, "deletions": 0})
        by_week[wk]["commits"] += entry.get("total", 0)
    for w, add, delneg in codefreq:
        wk = epoch_to_date(w)
        by_week.setdefault(wk, {"commits": 0, "additions": 0, "deletions": 0})
        by_week[wk]["additions"] += max(0, int(add))
        by_week[wk]["deletions"] += abs(int(delneg))
    # Canonicalize into sorted list
    weekly = [
        {"week_start": wk, **vals, "churn": vals["additions"] + vals["deletions"]}
        for wk, vals in sorted(by_week.items(), key=lambda kv: kv[0])
    ]
    return weekly


def sum_last_n_weeks(weekly: List[Dict[str, int]], n: int) -> Dict[str, int]:
    tail = weekly[-n:] if n <= len(weekly) else weekly
    commits = sum(w.get("commits", 0) for w in tail)
    adds = sum(w.get("additions", 0) for w in tail)
    dels = sum(w.get("deletions", 0) for w in tail)
    return {"commits": commits, "additions": adds, "deletions": dels, "churn": adds + dels}


def main():
    if not OWNER:
        die("OWNER env var is required (user or org login)")
    repos = list_repos(OWNER, INCLUDE_PRIVATE, INCLUDE_FORKS)
    print(f"Discovered repos: {[r['name'] for r in repos]}")

    aggregate_by_week: Dict[str, Dict[str, int]] = {}
    repos_out: Dict[str, Any] = {}

    for repo in repos:
        name = repo["name"]
        try:
            commits = weekly_commit_activity(OWNER, name)
            codefreq = weekly_code_frequency(OWNER, name)
            weekly = merge_weekly(commits, codefreq)
            repos_out[name] = {
                "private": repo["private"],
                "fork": repo["fork"],
                "weekly": weekly,
                "totals_13w": sum_last_n_weeks(weekly, 13),  # ~90 days
                "totals_52w": sum_last_n_weeks(weekly, 52),  # ~1 year
            }
            # fold into aggregate
            for w in weekly:
                wk = w["week_start"]
                agg = aggregate_by_week.setdefault(wk, {"commits": 0, "additions": 0, "deletions": 0})
                agg["commits"] += w.get("commits", 0)
                agg["additions"] += w.get("additions", 0)
                agg["deletions"] += w.get("deletions", 0)
        except requests.HTTPError as e:
            print(f"WARN: {name} failed: {e}")
            continue

    aggregate_weekly = [
        {"week_start": wk, **vals, "churn": vals["additions"] + vals["deletions"]}
        for wk, vals in sorted(aggregate_by_week.items(), key=lambda kv: kv[0])
    ]

    out = {
        "generated_at": dt.datetime.utcnow().isoformat() + "Z",
        "owner": OWNER,
        "repo_count": len(repos_out),
        "aggregate": {
            "weekly": aggregate_weekly,
            "totals_13w": sum_last_n_weeks(aggregate_weekly, 13),
            "totals_52w": sum_last_n_weeks(aggregate_weekly, 52),
        },
        "repos": repos_out,
    }

    os.makedirs("site", exist_ok=True)
    with open("site/metrics.json", "w") as f:
        json.dump(out, f, indent=2)
    print("Wrote site/metrics.json")

if __name__ == "__main__":
    main()


