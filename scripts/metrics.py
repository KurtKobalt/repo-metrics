#!/usr/bin/env python3
import json, os, re, sys, time, datetime as dt
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

DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]


def die(msg: str):
    print(f"ERROR: {msg}")
    sys.exit(1)


def check_rate_limit():
    try:
        r = SESSION.get(f"{GITHUB_API}/rate_limit")
        if r.ok:
            core = r.json().get("resources", {}).get("core", {})
            remaining = core.get("remaining", 999)
            reset_at = core.get("reset", 0)
            if remaining < 10:
                wait = max(0, reset_at - int(time.time())) + 2
                print(f"Rate limit low ({remaining} remaining), sleeping {wait}s")
                time.sleep(wait)
    except Exception:
        pass


def get(url: str, params: Dict[str, Any] | None = None, retries: int = 3, backoff: float = 1.5):
    r = None
    for i in range(retries):
        try:
            r = SESSION.get(url, params=params or {}, timeout=30)
        except (requests.ConnectionError, requests.Timeout) as e:
            wait = min(5 + i * 3, 30)
            print(f"  network error on {url}: {e} (retry {i+1}/{retries}, sleep {wait}s)", flush=True)
            time.sleep(wait)
            continue
        if r.status_code == 202:
            wait = min(5 + i * 3, 30)
            print(f"  202 warming cache for {url} (retry {i+1}/{retries}, sleep {wait}s)", flush=True)
            time.sleep(wait)
            continue
        if r.status_code == 403 and r.headers.get("X-RateLimit-Remaining") == "0":
            reset_at = int(r.headers.get("X-RateLimit-Reset", 0))
            wait = max(0, reset_at - int(time.time())) + 2
            print(f"Rate limited, sleeping {wait}s", flush=True)
            time.sleep(wait)
            continue
        if r.status_code == 404:
            return None
        if r.ok:
            return r
        time.sleep(backoff ** i)
    if r is None:
        print(f"  GAVE UP on {url} (network errors throughout)", flush=True)
        return None
    if r.status_code == 202:
        print(f"  GAVE UP on {url} (still 202 after {retries} retries — endpoint cache not warm)", flush=True)
        return None
    r.raise_for_status()


def safe_stats_json(r):
    if r is None:
        return []
    if getattr(r, "status_code", None) == 204 or not getattr(r, "content", b""):
        return []
    try:
        return r.json()
    except Exception:
        return []


def owner_type(owner: str) -> str:
    r = get(f"{GITHUB_API}/users/{owner}")
    if r is None:
        return "User"
    return r.json().get("type", "User")


def list_repos(owner: str, include_private: bool, include_forks: bool) -> List[Dict[str, Any]]:
    if REPOS_WHITELIST:
        out = []
        for name in REPOS_WHITELIST:
            r = get(f"{GITHUB_API}/repos/{owner}/{name}")
            if r is None:
                print(f"WARN: {owner}/{name} not found or not accessible")
                continue
            repo = r.json()
            if not include_forks and repo.get("fork"):
                continue
            if (not include_private) and repo.get("private"):
                continue
            out.append({
                "name": repo["name"],
                "private": repo.get("private", False),
                "fork": repo.get("fork", False),
                "default_branch": repo.get("default_branch", "main"),
            })
        return out

    typ = owner_type(owner)
    endpoint = f"{GITHUB_API}/users/{owner}/repos" if typ == "User" else f"{GITHUB_API}/orgs/{owner}/repos"
    page = 1
    out = []
    while True:
        r = get(endpoint, params={"per_page": 100, "page": page, "type": "all"})
        if r is None:
            break
        repos = r.json()
        if not repos:
            break
        for repo in repos:
            if not include_forks and repo.get("fork"):
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
    r = get(f"{GITHUB_API}/repos/{owner}/{repo}/stats/commit_activity", retries=15)
    return safe_stats_json(r)


def weekly_code_frequency(owner: str, repo: str) -> List[List[int]]:
    r = get(f"{GITHUB_API}/repos/{owner}/{repo}/stats/code_frequency", retries=15)
    return safe_stats_json(r)


def punch_card(owner, repo):
    r = get(f"{GITHUB_API}/repos/{owner}/{repo}/stats/punch_card", retries=15)
    return safe_stats_json(r)


def contributors(owner, repo):
    r = get(f"{GITHUB_API}/repos/{owner}/{repo}/stats/contributors", retries=15)
    data = safe_stats_json(r)
    return [{"login": c["author"]["login"], "avatar_url": c["author"]["avatar_url"], "commits": c["total"]} for c in data if c.get("author")]


def languages(owner, repo):
    r = get(f"{GITHUB_API}/repos/{owner}/{repo}/languages")
    if r is None:
        return {}
    return r.json() if r.ok else {}


def count_items(owner, repo, endpoint, state):
    r = get(f"{GITHUB_API}/repos/{owner}/{repo}/{endpoint}", params={"state": state, "per_page": 1})
    if r is None:
        return 0
    link = r.headers.get("Link", "")
    m = re.search(r'[?&]page=(\d+)>;\s*rel="last"', link)
    if m:
        return int(m.group(1))
    return len(r.json()) if r.ok else 0


def epoch_to_date(epoch_secs: int) -> str:
    return dt.datetime.utcfromtimestamp(epoch_secs).date().isoformat()


def merge_weekly(commits: List[Dict[str, Any]], codefreq: List[List[int]]):
    by_week: Dict[str, Dict[str, Any]] = {}
    for entry in commits:
        wk = epoch_to_date(entry["week"])
        by_week.setdefault(wk, {"commits": 0, "additions": 0, "deletions": 0, "daily_commits": {d: 0 for d in DAY_NAMES}})
        by_week[wk]["commits"] += entry.get("total", 0)
        days = entry.get("days", [])
        for idx, count in enumerate(days):
            if idx < len(DAY_NAMES):
                by_week[wk]["daily_commits"][DAY_NAMES[idx]] += count
    for w, add, delneg in codefreq:
        wk = epoch_to_date(w)
        by_week.setdefault(wk, {"commits": 0, "additions": 0, "deletions": 0, "daily_commits": {d: 0 for d in DAY_NAMES}})
        by_week[wk]["additions"] += max(0, int(add))
        by_week[wk]["deletions"] += abs(int(delneg))
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


def aggregate_punch_card(all_punch_cards):
    merged = {}
    for pc in all_punch_cards:
        for day, hour, commits in pc:
            key = (day, hour)
            merged[key] = merged.get(key, 0) + commits
    return [[d, h, c] for (d, h), c in sorted(merged.items())]


def aggregate_contributors(all_contributors):
    merged = {}
    for contribs in all_contributors:
        for c in contribs:
            login = c["login"]
            if login not in merged:
                merged[login] = {"login": login, "avatar_url": c["avatar_url"], "commits": 0}
            merged[login]["commits"] += c["commits"]
    return sorted(merged.values(), key=lambda x: x["commits"], reverse=True)


def aggregate_languages(all_languages):
    merged = {}
    for langs in all_languages:
        for lang, bytes_count in langs.items():
            merged[lang] = merged.get(lang, 0) + bytes_count
    return dict(sorted(merged.items(), key=lambda x: x[1], reverse=True))


def prewarm_stats(owner: str, repos: List[Dict[str, Any]]):
    """Fire-and-forget every stats endpoint so GitHub starts computing all caches in parallel."""
    endpoints = ["commit_activity", "code_frequency", "punch_card", "contributors"]
    print(f"Prewarming {len(repos) * len(endpoints)} stats endpoints in parallel...", flush=True)
    for repo in repos:
        for ep in endpoints:
            try:
                SESSION.get(f"{GITHUB_API}/repos/{owner}/{repo['name']}/stats/{ep}", timeout=10)
            except Exception:
                pass


def main():
    if not OWNER:
        die("OWNER env var is required (user or org login)")
    repos = list_repos(OWNER, INCLUDE_PRIVATE, INCLUDE_FORKS)
    print(f"Discovered repos: {[r['name'] for r in repos]}")

    prewarm_stats(OWNER, repos)
    check_rate_limit()

    aggregate_by_week: Dict[str, Dict[str, Any]] = {}
    repos_out: Dict[str, Any] = {}
    all_punch_cards: List[Any] = []
    all_contributors: List[Any] = []
    all_languages: List[Any] = []
    agg_pr_open = 0
    agg_pr_closed = 0
    agg_issue_open = 0
    agg_issue_closed = 0

    for idx, repo in enumerate(repos):
        name = repo["name"]

        if idx > 0 and idx % 5 == 0:
            check_rate_limit()

        try:
            print(f"[{idx+1}/{len(repos)}] {name}: commit_activity...", flush=True)
            commits = weekly_commit_activity(OWNER, name)
            print(f"[{idx+1}/{len(repos)}] {name}: code_frequency...", flush=True)
            codefreq = weekly_code_frequency(OWNER, name)
            weekly = merge_weekly(commits, codefreq)

            print(f"[{idx+1}/{len(repos)}] {name}: punch_card + contributors + languages + counts...", flush=True)
            pc = punch_card(OWNER, name)
            contribs = contributors(OWNER, name)
            langs = languages(OWNER, name)
            pr_open = count_items(OWNER, name, "pulls", "open")
            pr_closed = count_items(OWNER, name, "pulls", "closed")
            issue_open = count_items(OWNER, name, "issues", "open")
            issue_closed = count_items(OWNER, name, "issues", "closed")
            print(f"[{idx+1}/{len(repos)}] {name}: done ({len(weekly)} weeks, {sum(w.get('commits',0) for w in weekly)} commits)", flush=True)

            repos_out[name] = {
                "private": repo["private"],
                "fork": repo["fork"],
                "weekly": weekly,
                "totals_13w": sum_last_n_weeks(weekly, 13),
                "totals_52w": sum_last_n_weeks(weekly, 52),
                "punch_card": pc,
                "contributors": contribs,
                "languages": langs,
                "pr_counts": {"open": pr_open, "closed": pr_closed},
                "issue_counts": {"open": issue_open, "closed": issue_closed},
            }

            for w in weekly:
                wk = w["week_start"]
                agg = aggregate_by_week.setdefault(wk, {"commits": 0, "additions": 0, "deletions": 0, "daily_commits": {d: 0 for d in DAY_NAMES}})
                agg["commits"] += w.get("commits", 0)
                agg["additions"] += w.get("additions", 0)
                agg["deletions"] += w.get("deletions", 0)
                dc = w.get("daily_commits", {})
                for d in DAY_NAMES:
                    agg["daily_commits"][d] += dc.get(d, 0)

            all_punch_cards.append(pc)
            all_contributors.append(contribs)
            all_languages.append(langs)
            agg_pr_open += pr_open
            agg_pr_closed += pr_closed
            agg_issue_open += issue_open
            agg_issue_closed += issue_closed

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
        "data_range": {
            "earliest_week": aggregate_weekly[0]["week_start"] if aggregate_weekly else None,
            "latest_week": aggregate_weekly[-1]["week_start"] if aggregate_weekly else None,
        },
        "aggregate": {
            "weekly": aggregate_weekly,
            "totals_13w": sum_last_n_weeks(aggregate_weekly, 13),
            "totals_52w": sum_last_n_weeks(aggregate_weekly, 52),
            "punch_card": aggregate_punch_card(all_punch_cards),
            "contributors": aggregate_contributors(all_contributors),
            "languages": aggregate_languages(all_languages),
            "pr_counts": {"open": agg_pr_open, "closed": agg_pr_closed},
            "issue_counts": {"open": agg_issue_open, "closed": agg_issue_closed},
        },
        "repos": repos_out,
    }

    os.makedirs("site", exist_ok=True)
    with open("site/metrics.json", "w") as f:
        json.dump(out, f, indent=2)
    print("Wrote site/metrics.json")

if __name__ == "__main__":
    main()
