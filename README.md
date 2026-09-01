# OneVisa Engineering Pulse

An engineering activity dashboard spanning fourteen configured OneVisa repositories:

- Capture Frontend (`ov-capture-frontend`)
- Capture Backend (`ov-capture-backend`)
- Admin (`ov-admin`)
- Superadmin (`ov-superadmin`)
- CMS (`ov-cms`)
- Translator (`ov-translator`)
- Submitter (`ov-submitter`)
- Website (`ov-website2`, hosted as `onevisa-ai/ov-website`)
- Control Center (`ov-control-center`)
- QA (`ov-qa`)
- Pulse (`ov-pulse`)
- Claude Plugins (`claude-plugins`)
- IMMI Scrapper (`immi-scrapper`)
- Agents (`ov-agents`)

The dashboard provides a full-history GitHub-style contribution heatmap with both intensity and binary active/idle views, person/repository/date filters, commit trends, added/updated/deleted line impact, and time-filtered comparisons by person or repository. Every heatmap day opens into a full activity view with an hourly timeline, repository impact, contributors, and the exact commits. Comparisons can switch between weekly and accumulated commits or changed lines, and a separate 24-hour cadence chart shows when contributions happen across the current filters. It also includes repository and contributor rankings, work patterns, language composition, and data coverage indicators.

## Update policy

Updates are manual. There is no nightly refresh. Follow [the manual update runbook](docs/manual-update.md) when the metrics or production dashboard should be refreshed. The GitHub Actions workflow is retained only as an on-demand GitHub Pages publication and does not update `engineering.onevisa.ai`.

## How history is counted

For each configured repository, the collector reads every unique commit reachable from:

1. the canonical remote default branch; and
2. any local branch commit that is not reachable from any remote branch.

Commits are deduplicated by SHA. This preserves the full history through repository transfers from Beto-owned accounts to `onevisa-ai`, while keeping each product as one canonical repository. Contributor aliases are normalized through [config/metrics.json](config/metrics.json), including Beto's `KurtKobalt`, `beto-ov`, and earlier local Git display names.

Git reports additions and deletions, not exact line replacements. `updated_lines` is therefore an explicit estimate calculated per commit as `min(additions, deletions)`. The remaining additions and deletions are shown as newly added and removed lines.

## Run locally

The default repository root is the parent directory of this project, matching the standard OV workspace layout.

```bash
python3 scripts/metrics.py
cd dashboard
npm ci
npm run dev
```

The collector writes both `site/metrics.json` and `dashboard/public/metrics.json`. A local run includes all fourteen configured repositories and commits from their unpublished branches. The optional manual GitHub Actions run clones the twelve repositories hosted by `onevisa-ai`. `immi-scrapper` and `ov-agents` currently have no GitHub remotes, so they are available only to local manual generation until remotes exist.

To use a different checkout root or output file:

```bash
METRICS_REPOS_ROOT=/path/to/repos python3 scripts/metrics.py
METRICS_OUTPUT=/tmp/metrics.json python3 scripts/metrics.py
```

Set `GITHUB_TOKEN` to enrich the generated data with current language, pull-request, and issue counts. Activity history itself comes from Git and does not need network access.

## Verification

```bash
python3 -m unittest discover -s tests
python3 -m py_compile scripts/metrics.py
cd dashboard
npm run build
npm run lint
```

For the Cloudflare/Sites production package, run `bash scripts/build-sites.sh`. This produces the root-hosted worker and static assets under `dist/`; the regular dashboard build keeps the `/repo-metrics/` base used by GitHub Pages.

The manual GitHub Pages workflow requires `GH_PAT` to read private repositories. It runs only when explicitly started from GitHub Actions.
