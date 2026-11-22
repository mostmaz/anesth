#!/bin/sh
# Nightly database backup. Runs on the droplet from cron (see scripts/README-deploy.md).
#
# Keeps 14 daily dumps and the dump from the first day of each month for a year.
# These live on the same disk as the database: enable DigitalOcean Backups (or
# copy them elsewhere) to survive the loss of the droplet itself.
set -eu

DIR=/root/backups/nightly
mkdir -p "$DIR"
chmod 700 /root/backups "$DIR"

STAMP=$(date -u +%Y-%m-%d)
OUT="$DIR/icu_db-$STAMP.sql.gz"
TMP="$OUT.tmp"

docker exec icu_postgres_prod pg_dump -U postgres -d icu_db --no-owner | gzip > "$TMP"
gzip -t "$TMP"
# A dump without the main tables means something went wrong: keep the old files.
if [ "$(zcat "$TMP" | grep -c '^CREATE TABLE')" -lt 20 ]; then
    echo "$(date -u +%FT%TZ) backup FAILED: dump looks incomplete" >&2
    rm -f "$TMP"
    exit 1
fi
mv "$TMP" "$OUT"
chmod 600 "$OUT"

# Monthly copy on the 1st.
if [ "$(date -u +%d)" = "01" ]; then cp -p "$OUT" "$DIR/monthly-$(date -u +%Y-%m).sql.gz"; fi

# Retention.
find "$DIR" -name 'icu_db-*.sql.gz' -mtime +14 -delete
find "$DIR" -name 'monthly-*.sql.gz' -mtime +370 -delete

echo "$(date -u +%FT%TZ) backup ok: $OUT ($(du -h "$OUT" | cut -f1))"
