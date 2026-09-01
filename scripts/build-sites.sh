#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$project_root/dashboard"
VITE_BASE_PATH=/ npm run build

cd "$project_root"
rm -rf dist
mkdir -p dist/server dist/client
cp sites/worker.js dist/server/index.js
cp -R site/. dist/client/
