#!/usr/bin/env bash
# Launch, stop, and check the hidrama verification instance.
#
#   helpers/app.sh install   # one-time: deps for backend + frontend
#   helpers/app.sh start     # backend :5679 + frontend :3013, isolated data dir
#   helpers/app.sh doctor    # read-only: is this instance worth driving?
#   helpers/app.sh stop      # kill only the processes this script started
#
# The instance never touches the developer's own data: the backend runs against
# $RUN/data, while the repo default is <repo>/data.
#
# Both ports are fixed. The Nuxt dev server proxies /api and /static to
# localhost:5679 (frontend/nuxt.config.ts) and its dev script pins :3013, so a
# second instance cannot run beside this one without editing tracked config.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
RUN="${RUN:-$ROOT/.verification/run}"
BE_PORT="${BE_PORT:-5679}"
FE_PORT="${FE_PORT:-3013}"
BE_PID_FILE="$RUN/backend.pid"
FE_PID_FILE="$RUN/frontend.pid"

# The committed lockfiles pin some tarballs to a private registry that answers 401
# outside its network, so deps install from package.json against npmjs instead.
NPM_FLAGS=(--no-package-lock --no-audit --no-fund --registry=https://registry.npmjs.org --cache "$RUN/npm-cache")

start() {
  if [ -f "$BE_PID_FILE" ] || [ -f "$FE_PID_FILE" ]; then
    echo "a run is already tracked in $RUN (run 'app.sh stop' first)"
    exit 1
  fi
  mkdir -p "$RUN/data"

  cd "$ROOT/backend"
  SQLITE_PATH="$RUN/data/verify.sqlite3" STORAGE_PATH="$RUN/data/static" PORT="$BE_PORT" \
    nohup node --import tsx src/index.ts > "$RUN/backend.log" 2>&1 &
  echo $! > "$BE_PID_FILE"

  cd "$ROOT/frontend"
  nohup npm run dev > "$RUN/frontend.log" 2>&1 &
  echo $! > "$FE_PID_FILE"
  cd "$ROOT"

  wait_for "http://localhost:$BE_PORT/api/v1/health" "backend" 90 || return 1
  wait_for "http://localhost:$FE_PORT/" "frontend" 120 || return 1
  echo "up: backend :$BE_PORT (pid $(cat "$BE_PID_FILE")), frontend :$FE_PORT (pid $(cat "$FE_PID_FILE"))"
  echo "data: $RUN/data/verify.sqlite3"
}

wait_for() {
  local url="$1" name="$2" tries="${3:-60}"
  for _ in $(seq "$tries"); do
    curl -sf -m 2 -o /dev/null "$url" && return 0
    sleep 1
  done
  echo "$name did not answer on $url after ${tries}s — see $RUN/$name.log" >&2
  stop
  return 1
}

# Kill a process and everything it spawned. Descendants of our own PIDs only —
# never a process found by name.
kill_tree() {
  local pid="$1" child
  for child in $(pgrep -P "$pid" 2>/dev/null); do kill_tree "$child"; done
  kill -TERM "$pid" 2>/dev/null
}

doctor() {
  echo "backend  $(curl -sf -m 3 "http://localhost:$BE_PORT/api/v1/health" || echo DOWN)"
  echo "frontend HTTP $(curl -s -m 5 -o /dev/null -w '%{http_code}' "http://localhost:$FE_PORT/") on :$FE_PORT"
  echo "dramas   $(curl -sf -m 3 "http://localhost:$BE_PORT/api/v1/dramas" | head -c 100 || echo DOWN)"
  if [ -f "$RUN/data/verify.sqlite3" ]; then
    echo "scratch  $RUN/data/verify.sqlite3 (isolated; the repo's data/ is untouched)"
  else
    echo "scratch  no database yet — this instance has not written anything"
  fi
  for port in "$BE_PORT" "$FE_PORT"; do
    [ -n "$(lsof -ti "tcp:$port" || true)" ] || echo "note     nothing is listening on :$port"
  done
}

stop() {
  local pid
  for f in "$BE_PID_FILE" "$FE_PID_FILE"; do
    [ -f "$f" ] || continue
    pid="$(cat "$f")"
    kill_tree "$pid"
    rm -f "$f"
  done
  sleep 2
  for port in "$BE_PORT" "$FE_PORT"; do
    local held; held="$(lsof -ti "tcp:$port" 2>/dev/null | tr '\n' ' ')"
    [ -n "$held" ] && echo "warning: tcp:$port is still held by pid(s) $held"
  done
  echo "stopped (evidence under .verification/evidence is untouched)"
}

install() {
  (cd "$ROOT/backend" && npm install "${NPM_FLAGS[@]}") && (cd "$ROOT/frontend" && npm install "${NPM_FLAGS[@]}")
}

case "${1:-}" in
  install) install ;;
  start) start ;;
  doctor) doctor ;;
  stop) stop ;;
  *) echo "usage: app.sh {install|start|doctor|stop}" >&2; exit 2 ;;
esac
