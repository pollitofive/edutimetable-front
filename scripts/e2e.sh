#!/usr/bin/env bash
# Corre Playwright en su imagen oficial (Ubuntu): el contenedor del front es
# Alpine y Playwright no lo soporta. node_modules va en un volumen propio,
# porque los binarios nativos de Alpine no sirven en Ubuntu.
#   scripts/e2e.sh [local|staging] [args de playwright...]
#   scripts/e2e.sh local --ui    → UI en http://localhost:9323
set -euo pipefail
cd "$(dirname "$0")/.."

target="${1:-local}"; shift || true
version="$(node -p "require('./package.json').devDependencies['@playwright/test'].replace(/^[^0-9]*/, '')")"
image="mcr.microsoft.com/playwright:v${version}-noble"

env_args=()
[[ -f .env.e2e ]] && env_args+=(--env-file .env.e2e)

ui_args=() cmd_args=("$@")
if [[ " $* " == *" --ui "* ]]; then
  ui_args=(-p 9323:9323)
  cmd_args+=(--ui-host=0.0.0.0 --ui-port=9323)
fi

tty_args=()
[[ -t 1 ]] && tty_args=(-it)

exec docker run --rm "${tty_args[@]}" "${ui_args[@]}" "${env_args[@]}" \
  -e E2E_TARGET="$target" -e CI="${CI:-}" \
  --add-host edutimetable.local.test:host-gateway \
  --add-host api.edutimetable.local.test:host-gateway \
  --ipc=host \
  -v "$PWD":/app -v edutimetable-front-e2e-node-modules:/app/node_modules \
  -e HOST_UID="$(id -u)" -e HOST_GID="$(id -g)" \
  -w /app "$image" \
  bash -c '
    npm ci --no-audit --no-fund --loglevel=error || exit 1
    npx playwright test "$@"; status=$?
    # Corre como root: los reportes vuelven a ser del usuario del host
    chown -R "$HOST_UID:$HOST_GID" test-results playwright-report e2e/.auth 2>/dev/null
    exit $status
  ' _ "${cmd_args[@]}"
