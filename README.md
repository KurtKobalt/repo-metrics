# OneVisa Repo Metrics

Nightly job aggregates commits and weekly churn (additions + deletions) for OneVisa repos. Publishes an interactive dashboard via GitHub Pages.

Owner: `onevisa-ai` · Repos: `ov-capture-backend`, `ov-capture-frontend`, `ov-admin`, `ov-cms`, `ov-superadmin`, `ov-translator`, `ov-submitter` (configured in `.github/workflows/metrics.yml`).

## How to update the numbers

### Option A — GitHub Actions (recommended)
Runs nightly at 02:00 UTC. To regenerate on demand:
```bash
gh workflow run "Repo Metrics" -R KurtKobalt/repo-metrics
gh run watch -R KurtKobalt/repo-metrics
```
Or use the Actions tab → "Repo Metrics" → "Run workflow".

The job needs:
- Secret `GH_PAT` with scopes `repo`, `read:org` (so it can read private OV repos).
- Optional Variables override the workflow defaults:
  - `METRICS_OWNER` (default `onevisa-ai`)
  - `METRICS_REPOS_WHITELIST` (default = all 7 OV repos)
  - `METRICS_INCLUDE_PRIVATE` (default `false` — set to `true` for private repos)

### Option B — Local regeneration
```bash
export GITHUB_TOKEN=$(gh auth token)
export OWNER=onevisa-ai
export INCLUDE_PRIVATE=true
export REPOS_WHITELIST=ov-capture-backend,ov-capture-frontend,ov-admin,ov-cms,ov-superadmin,ov-translator,ov-submitter

pip install requests
python scripts/metrics.py                          # writes site/metrics.json
cp site/metrics.json dashboard/public/metrics.json # so the dev server picks it up
```

First runs can take 5–15 minutes because GitHub returns 202 while it warms `/stats/*` caches.

## Run the dashboard
```bash
cd dashboard
npm install
npm run dev          # http://localhost:5173/repo-metrics/
npm run build        # static build to dashboard/dist/
```

## Adding a repo
Edit `REPOS_WHITELIST` in `.github/workflows/metrics.yml` (the default after `||`). Or set `METRICS_REPOS_WHITELIST` as a GitHub Actions Variable to override without editing code.

## Notes
- Uses GitHub `/stats` endpoints (`commit_activity`, `code_frequency`, `punch_card`, `contributors`).
- 202 responses are retried up to 8 times with backoff.
- Leaderboard window: last 13 weeks (~90 days). Adjust in `metrics.py`.
