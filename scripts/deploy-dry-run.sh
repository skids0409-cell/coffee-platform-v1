#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/sites-env.sh" -- "$0" "$@"
fi

worker="${SITES_PROJECT_ROOT}/dist/server/index.js"
client="${SITES_PROJECT_ROOT}/dist/client"
config="${SITES_PROJECT_ROOT}/wrangler.deploy.jsonc"
wrangler="${SITES_PROJECT_ROOT}/node_modules/.bin/wrangler"

[[ -f "${worker}" ]] || {
  echo "Missing deployment Worker: dist/server/index.js" >&2
  exit 66
}
[[ -d "${client}" ]] || {
  echo "Missing deployment assets: dist/client" >&2
  exit 66
}
[[ -f "${config}" ]] || {
  echo "Missing deployment configuration: wrangler.deploy.jsonc" >&2
  exit 66
}
[[ -x "${wrangler}" ]] || {
  echo "Wrangler is unavailable. Run npm run install:ci first." >&2
  exit 69
}

"${wrangler}" deploy \
  --config "${config}" \
  --dry-run \
  --strict

echo "Validated Cloudflare deployment package for coffee-platform-baghdad-beta."
