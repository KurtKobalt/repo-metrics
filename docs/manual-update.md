# Manual Engineering Pulse update

The OneVisa Engineering Pulse has no scheduled refresh. Update it only when Beto explicitly requests a refresh.

Production URL: <https://engineering.onevisa.ai>

## What a manual update does

A complete update refreshes repository histories, regenerates the metrics payload, validates the dashboard, and publishes a new version to the existing Sites project behind the OneVisa Cloudflare-managed hostname.

The production project ID is stored in `.openai/hosting.json`. Always reuse it. Never create a second Sites project for this dashboard.

## 1. Prepare repository history

The default repository root is the parent of this repository. The configured checkouts are listed in `config/metrics.json`.

For repositories with remotes, fetch current remote history without resetting, cleaning, switching, or discarding any local work:

```bash
for repository in \
  ov-capture-frontend ov-capture-backend ov-admin ov-superadmin ov-cms \
  ov-translator ov-submitter ov-website2 ov-control-center ov-qa ov-pulse \
  claude-plugins; do
  git -C "../$repository" fetch --all --prune
done
```

`immi-scrapper` and `ov-agents` currently have no GitHub remotes. Their available local history is used as-is. If either receives a remote later, update `config/metrics.json`, this guide, and the manual GitHub workflow together.

## 2. Regenerate metrics

Run the collector from the repository root:

```bash
python3 scripts/metrics.py
```

Set `GITHUB_TOKEN` only when current GitHub language, pull-request, and issue metadata is required. Git history and commit drilldowns do not require the API.

Confirm the generated payload before publishing:

```bash
jq '{schema_version, generated_at, repo_count, commits: (.commit_log | length), warnings}' dashboard/public/metrics.json
```

Expected invariants:

- `schema_version` is `3`.
- `repo_count` is `14` while all configured checkouts are available.
- `warnings` is empty or every warning is understood before publishing.
- `commit_log` contains no author email, raw author name, or local-only indicator.

## 3. Validate the project

```bash
python3 -m unittest discover -s tests
python3 -m py_compile scripts/metrics.py
npm --prefix dashboard run lint
npm --prefix dashboard run build
git diff --check
```

Do not publish when a test, type check, lint check, or build fails.

## 4. Build and publish production

Build the root-hosted Cloudflare/Sites package:

```bash
bash scripts/build-sites.sh
```

Then use the `sites-hosting` workflow to update the existing project:

1. Read `.openai/hosting.json` and reuse its `project_id`.
2. Push the exact validated source snapshot to the existing Sites source repository.
3. Package `dist/` with the Sites `package-site.sh` helper.
4. Save one new site version using the pushed source SHA and archive.
5. Deploy that saved version to the existing public site.
6. Poll until the deployment succeeds.
7. Verify `https://engineering.onevisa.ai`, `/metrics.json`, and `/og.png` return successfully and that the live metrics schema is `3`.

Never expose or persist the temporary Sites source credential. Delete temporary source clones and archives after the deployment succeeds.

## 5. Restore the GitHub Pages build

`scripts/build-sites.sh` temporarily builds with a root URL. Restore the repository's normal `/repo-metrics/` build afterward:

```bash
npm --prefix dashboard run build
```

This keeps `site/index.html` compatible with the manual GitHub Pages workflow.

## Optional manual GitHub Pages publication

`.github/workflows/metrics.yml` has only a `workflow_dispatch` trigger. Running it from the GitHub Actions UI refreshes the GitHub Pages copy from organization-hosted repositories. It does not update `engineering.onevisa.ai`, and it cannot include `immi-scrapper` or `ov-agents` until those repositories have remotes.
