# Engineering Pulse project instructions

## Update policy

The dashboard is updated manually. Do not add a scheduled GitHub Actions trigger, an automatic deployment trigger, or a recurring job unless the user explicitly changes this policy.

When the user asks to refresh or update the live dashboard:

1. Read and follow [`docs/manual-update.md`](docs/manual-update.md).
2. Reuse the existing Sites project in `.openai/hosting.json`; never create a replacement project for this dashboard.
3. Preserve the public production hostname `https://engineering.onevisa.ai` unless the user explicitly requests a domain change.
4. Regenerate metrics from the configured sibling repositories, validate the collector and dashboard, build the Sites package, publish one new version, and verify the live hostname.
5. Keep the GitHub workflow manual-only. Its `workflow_dispatch` job publishes GitHub Pages and does not update the production OneVisa hostname.

Generated data and deployment output are not the source of truth. `dashboard/public/metrics.json`, `site/metrics.json`, `site/og.png`, and `dist/` are rebuilt during a manual update.
