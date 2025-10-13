# Multi‑repo GitHub Metrics — Commits & Churn

Nightly job aggregates commits and weekly churn (additions + deletions) for all repos under a user or org. Publishes an interactive dashboard via GitHub Pages.

## Setup
1. Create a new repo (e.g., `repo-metrics`) and push these files.
2. **Secrets** → add `GH_PAT` with scopes: `repo`, `read:org` (needed for private/org repos).
3. **Variables** → set:
   - `METRICS_OWNER` = `<your-user-or-org>`
   - `METRICS_INCLUDE_PRIVATE` = `true`/`false`
   - `METRICS_INCLUDE_FORKS` = `false`
   - `METRICS_REPOS_WHITELIST` = optional CSV list
4. Enable **Pages** on the repo: Source → `gh-pages` branch.
5. Run the workflow (Actions → Repo Metrics → Run workflow) or wait for the nightly cron.

## Notes
- Uses GitHub `/stats` endpoints:
  - `commit_activity` → weekly commit totals (52w)
  - `code_frequency` → weekly additions/deletions (deletions negative)
- If a repo’s stats return **202 Accepted**, GitHub is warming the cache. The workflow retries a few times.
- Leaderboard covers ~13 weeks (~90 days). Adjust in `metrics.py` if needed.

## Extending
- Add PR review time, lead time, or open/closed issues by querying Issues/PRs endpoints and appending series to `metrics.json`.
- Add repo filters (languages, topics) by fetching repo metadata and excluding noise.
