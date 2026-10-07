#!/usr/bin/env bash
# Run Archive 115 locally in a container. Uses Docker if it is installed and
# running; otherwise Podman (starting its virtual machine on macOS if needed).
#
#   ./deployment/deploy.sh            build and start (same as "up")
#   ./deployment/deploy.sh up         build and start, then open the browser
#   ./deployment/deploy.sh down       stop and remove the container
#   ./deployment/deploy.sh restart    rebuild and restart
#   ./deployment/deploy.sh logs       follow the server logs
#   ./deployment/deploy.sh status     show the container status
#   ./deployment/deploy.sh test       run the Cypress suite against the container
#
# Options (environment variables):
#   PORT=9000        serve on another port (default 8080)
#   ENGINE=podman    force an engine (docker | podman)
#   NO_OPEN=1        do not open the browser
set -euo pipefail

cd "$(dirname "$0")/.."
export PORT="${PORT:-8080}"
ACTION="${1:-up}"

say() { printf '\033[1;33m[archivo-115]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[archivo-115]\033[0m %s\n' "$*" >&2; exit 1; }
has() { command -v "$1" >/dev/null 2>&1; }

docker_ready() { has docker && docker info >/dev/null 2>&1; }

start_podman_machine() {
  # Linux runs Podman natively; macOS and Windows need the VM.
  [ "$(uname -s)" = "Linux" ] && return 0
  if ! podman machine list --format '{{.Name}}' 2>/dev/null | grep -q .; then
    say "Creating the Podman virtual machine (first time only)…"
    podman machine init
  fi
  if ! podman info >/dev/null 2>&1; then
    say "Starting the Podman virtual machine…"
    podman machine start >/dev/null 2>&1 || true
    podman info >/dev/null 2>&1 || fail "Podman is installed but its virtual machine did not start. Try: podman machine start"
  fi
}

pick_engine() {
  local wanted="${ENGINE:-}"
  if [ "$wanted" = "docker" ] || { [ -z "$wanted" ] && docker_ready; }; then
    docker_ready || fail "Docker is not running. Start Docker Desktop (or the docker service) and try again."
    if docker compose version >/dev/null 2>&1; then COMPOSE=(docker compose)
    elif has docker-compose; then COMPOSE=(docker-compose)
    else fail "Docker is installed but Docker Compose is missing. Install the compose plugin: https://docs.docker.com/compose/install/"
    fi
    ENGINE_NAME=docker
    return
  fi
  if [ "$wanted" = "podman" ] || has podman; then
    has podman || fail "ENGINE=podman was requested but Podman is not installed."
    if [ -z "$wanted" ] && has docker; then say "Docker is installed but not running; using Podman instead."; fi
    start_podman_machine
    if has podman-compose; then COMPOSE=(podman-compose)
    elif podman compose version >/dev/null 2>&1; then COMPOSE=(podman compose)
    else fail "Podman is installed but no compose provider was found. Install one: pip install podman-compose (or brew install podman-compose)"
    fi
    ENGINE_NAME=podman
    return
  fi
  fail "Neither Docker nor Podman is installed. Install one of them:
  Docker: https://docs.docker.com/get-docker/
  Podman: https://podman.io/docs/installation"
}

wait_for_site() {
  local url="http://localhost:${PORT}/"
  say "Waiting for ${url} …"
  for _ in $(seq 1 60); do
    if curl -fsS -o /dev/null "$url" 2>/dev/null; then return 0; fi
    sleep 1
  done
  fail "The site did not answer on ${url}. See the logs with: ./deployment/deploy.sh logs"
}

open_browser() {
  [ "${NO_OPEN:-}" = "1" ] && return 0
  [ -t 1 ] || return 0
  local url="http://localhost:${PORT}/"
  if has open; then open "$url" >/dev/null 2>&1 || true
  elif has xdg-open; then xdg-open "$url" >/dev/null 2>&1 || true
  fi
}

case "$ACTION" in
  up | down | restart | logs | status | test) ;;
  -h | --help | help) sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  *) fail "Unknown action \"${ACTION}\". Use: up | down | restart | logs | status | test" ;;
esac

pick_engine
say "Using ${ENGINE_NAME} (${COMPOSE[*]})."

case "$ACTION" in
  up)
    "${COMPOSE[@]}" up -d --build --force-recreate web
    wait_for_site
    say "Archive 115 is running at http://localhost:${PORT}/  (English: http://localhost:${PORT}/en/)"
    say "Stop it with: ./deployment/deploy.sh down"
    open_browser
    ;;
  restart)
    "${COMPOSE[@]}" down
    "${COMPOSE[@]}" up -d --build --force-recreate web
    wait_for_site
    say "Restarted at http://localhost:${PORT}/"
    ;;
  down) "${COMPOSE[@]}" down ;;
  logs) "${COMPOSE[@]}" logs -f web ;;
  status) "${COMPOSE[@]}" ps ;;
  test)
    "${COMPOSE[@]}" up -d --build --force-recreate web
    wait_for_site
    "${COMPOSE[@]}" --profile test run --rm e2e
    ;;
esac
