#!/bin/sh
# Build locally and deploy to the production droplet.
#
#   scripts/deploy.sh server        compile the API, sync it, restart it
#   scripts/deploy.sh migrate       apply pending database migrations (take a backup first!)
#   scripts/deploy.sh web           build the web app and sync it (live immediately)
#   scripts/deploy.sh stack         sync docker-compose.yml + Caddyfile and apply them
#   scripts/deploy.sh backup        take a database backup on the droplet now
#   scripts/deploy.sh status        show containers and recent API log lines
#
# Several steps can be given in order, e.g.:  scripts/deploy.sh backup server migrate web
#
# Nothing is built on the droplet (1 GB RAM). One SSH connection is reused for
# all steps because the droplet's firewall rate-limits new SSH connections.
set -eu

HOST="${ICU_DEPLOY_HOST:-root@138.68.67.206}"
REMOTE=/root/anesth
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CTRL="$HOME/.ssh/cm-icu-deploy"

ssh_() { ssh -o ControlPath="$CTRL" "$HOST" "$@"; }
rsync_() { rsync -rlpt --delete -e "ssh -o ControlPath=$CTRL" "$@"; }

cleanup() { ssh -O exit -o ControlPath="$CTRL" "$HOST" 2>/dev/null || true; rm -f "$CTRL"; }
trap cleanup EXIT
rm -f "$CTRL"
ssh -o BatchMode=yes -o ConnectTimeout=15 -o ControlMaster=yes -o ControlPath="$CTRL" -o ControlPersist=600 -fN "$HOST"

wait_for_api() {
    ssh_ 'for i in $(seq 1 60); do docker logs --since 2m icu_server_prod 2>&1 | grep -q "Server is running" && exit 0; sleep 2; done; echo "API did not start:"; docker logs --tail 30 icu_server_prod; exit 1'
}

[ $# -gt 0 ] || { sed -n '2,12p' "$0"; exit 1; }

for step in "$@"; do
    case "$step" in
    backup)
        ssh_ 'sh /root/anesth/scripts/backup-db.sh'
        ;;
    server)
        echo "== building API"
        (cd "$ROOT/server" && npm run build --silent)
        ssh_ "mkdir -p $REMOTE/server/dist $REMOTE/server/prisma $REMOTE/scripts"
        rsync_ "$ROOT/server/dist/" "$HOST:$REMOTE/server/dist/"
        rsync_ "$ROOT/server/prisma/" "$HOST:$REMOTE/server/prisma/"
        rsync_ "$ROOT/scripts/" "$HOST:$REMOTE/scripts/"
        ssh_ "chown -R root:root $REMOTE/server/dist $REMOTE/server/prisma $REMOTE/scripts && chmod -R u=rwX,go=rX $REMOTE/server/dist $REMOTE/server/prisma"
        echo "== restarting API"
        ssh_ "cd $REMOTE && docker compose up -d --no-build server && docker restart icu_server_prod >/dev/null"
        wait_for_api
        ;;
    migrate)
        echo "== applying database migrations"
        ssh_ "cd $REMOTE && docker compose run --rm --no-deps -T server npx prisma migrate deploy"
        ;;
    web)
        echo "== building web app"
        (cd "$ROOT/client" && npm run build --silent)
        ssh_ "mkdir -p $REMOTE/client/dist"
        rsync_ "$ROOT/client/dist/" "$HOST:$REMOTE/client/dist/"
        ssh_ "chown -R root:root $REMOTE/client/dist && chmod -R u=rwX,go=rX $REMOTE/client/dist"
        ;;
    stack)
        echo "== applying docker-compose.yml and Caddyfile"
        rsync -rlpt -e "ssh -o ControlPath=$CTRL" "$ROOT/docker-compose.yml" "$ROOT/Caddyfile" "$HOST:$REMOTE/"
        ssh_ "cd $REMOTE && docker compose config -q && docker compose up -d --no-build"
        wait_for_api
        ;;
    status)
        ssh_ 'docker ps --format "{{.Names}}\t{{.Status}}"; free -m | sed -n 2,3p; docker logs --tail 8 icu_server_prod 2>&1 | cut -c1-160'
        ;;
    *)
        echo "unknown step: $step" >&2; exit 1
        ;;
    esac
done
echo "== done"
