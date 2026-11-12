#!/usr/bin/env bash
# PostgreSQL backup for the Managevent VPS.
#
#   bash infra/vps/backup.sh                    # nightly run (systemd timer or cron)
#   bash infra/vps/backup.sh --kind predeploy   # taken by deploy.sh and restore.sh before they change data
#
# What it does:
#   1. `pg_dump --format=custom` of the whole `managevent` database (application tables and the
#      pg-boss queue), streamed out of the db container. The custom format is compressed.
#   2. Checks the archive is readable (`pg_restore --list`).
#   3. Encrypts it with age to BACKUP_AGE_RECIPIENT (a PUBLIC key; the private key is not on
#      this server). Without a recipient the dump stays local and unencrypted, with a warning.
#   4. Writes <name>.sha256 and <name>.meta (no personal data) next to it.
#   5. Keeps the newest BACKUP_KEEP_DAILY (7) nightly and BACKUP_KEEP_WEEKLY (4) weekly archives.
#   6. Copies the new archive off the server when a destination is configured. Unencrypted
#      archives are never uploaded.
#   7. Exits non-zero when any step fails, so the systemd unit is marked failed.
#
# Configuration: the process environment, or else infra/vps/.env (see .env.example):
#   BACKUP_DIR              default /var/backups/managevent
#   BACKUP_AGE_RECIPIENT    age1... public key
#   BACKUP_RCLONE_REMOTE    rclone destination, for example `vultr-syd:managevent-backups`
#   BACKUP_S3_URI           aws-cli destination, for example `s3://managevent-backups`
#   BACKUP_S3_ENDPOINT      endpoint for an S3-compatible store (omit for AWS itself)
#   BACKUP_KEEP_DAILY, BACKUP_KEEP_WEEKLY, BACKUP_KEEP_PREDEPLOY   default 7, 4, 5
#   BACKUP_HEARTBEAT_URL    optional URL fetched after a successful nightly run
#
# The bucket must be in Australia (ADR-0008). Restore with infra/vps/restore.sh.

set -Eeuo pipefail

# shellcheck source=infra/vps/lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

usage() {
  sed -n '2,7p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

positive_integer() {
  case "$1" in
    '' | *[!0-9]* | 0) return 1 ;;
    *) return 0 ;;
  esac
}

# prune_sets DIRECTORY KEEP
# Keeps the newest KEEP backups (an archive plus its .sha256 and .meta) and removes the rest.
# Pruning is by count, not by age: if backups stop being made, the old ones are not deleted.
prune_sets() {
  local directory="$1" keep="$2" stamps total index
  mapfile -t stamps < <(
    find "$directory" -maxdepth 1 -type f -name 'managevent-*' -printf '%f\n' |
      sed -n -E 's/^(managevent-[0-9]{8}T[0-9]{6}Z)\..*$/\1/p' | sort -u
  )
  total="${#stamps[@]}"
  if [ "$total" -le "$keep" ]; then
    return 0
  fi
  for ((index = 0; index < total - keep; index++)); do
    rm -f -- "$directory/${stamps[index]}".*
    log "pruned $(basename "$directory")/${stamps[index]}"
  done
}

# upload FILE SUBDIRECTORY
upload() {
  local file="$1" subdirectory="$2"
  if [ -n "$RCLONE_REMOTE" ]; then
    rclone copy --quiet "$file" "${RCLONE_REMOTE%/}/$subdirectory/"
  elif [ -n "$S3_URI" ]; then
    if [ -n "$S3_ENDPOINT" ]; then
      aws s3 cp --only-show-errors --endpoint-url "$S3_ENDPOINT" "$file" "${S3_URI%/}/$subdirectory/"
    else
      aws s3 cp --only-show-errors "$file" "${S3_URI%/}/$subdirectory/"
    fi
  fi
}

# Path of the plain (unencrypted) dump while it is being checked. Removed on every exit.
WORK_FILE=""

main() {
  local kind="daily"
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --kind)
        [ "$#" -ge 2 ] || die "--kind needs a value"
        kind="$2"
        shift 2
        ;;
      -h | --help)
        usage
        exit 0
        ;;
      *) die "unknown argument: $1" ;;
    esac
  done
  case "$kind" in
    daily | predeploy) ;;
    *) die "--kind must be daily or predeploy" ;;
  esac

  require_command docker
  require_command flock
  require_command sha256sum

  local backup_dir recipient keep_daily keep_weekly keep_predeploy heartbeat
  backup_dir="$(env_value BACKUP_DIR)"
  backup_dir="${backup_dir:-/var/backups/managevent}"
  recipient="$(env_value BACKUP_AGE_RECIPIENT)"
  RCLONE_REMOTE="$(env_value BACKUP_RCLONE_REMOTE)"
  S3_URI="$(env_value BACKUP_S3_URI)"
  S3_ENDPOINT="$(env_value BACKUP_S3_ENDPOINT)"
  keep_daily="$(env_value BACKUP_KEEP_DAILY)"
  keep_daily="${keep_daily:-7}"
  keep_weekly="$(env_value BACKUP_KEEP_WEEKLY)"
  keep_weekly="${keep_weekly:-4}"
  keep_predeploy="$(env_value BACKUP_KEEP_PREDEPLOY)"
  keep_predeploy="${keep_predeploy:-5}"
  heartbeat="$(env_value BACKUP_HEARTBEAT_URL)"

  positive_integer "$keep_daily" || die "BACKUP_KEEP_DAILY must be a positive integer"
  positive_integer "$keep_weekly" || die "BACKUP_KEEP_WEEKLY must be a positive integer"
  positive_integer "$keep_predeploy" || die "BACKUP_KEEP_PREDEPLOY must be a positive integer"

  if [ -n "$recipient" ]; then
    require_command age "apt-get install age"
    case "$recipient" in
      age1*) ;;
      *) die "BACKUP_AGE_RECIPIENT must be an age PUBLIC key (age1...), never a private key" ;;
    esac
  fi
  if [ -n "$RCLONE_REMOTE" ]; then
    require_command rclone "apt-get install rclone"
  elif [ -n "$S3_URI" ]; then
    require_command aws "apt-get install awscli"
  fi
  if [ -z "$recipient" ] && { [ -n "$RCLONE_REMOTE" ] || [ -n "$S3_URI" ]; }; then
    die "an upload destination is configured but BACKUP_AGE_RECIPIENT is not: unencrypted archives are never uploaded"
  fi

  umask 077
  mkdir -p "$backup_dir/daily" "$backup_dir/weekly" "$backup_dir/predeploy" "$backup_dir/.tmp"
  chmod 700 "$backup_dir"
  acquire_lock backup

  local stamp name
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  name="managevent-${stamp}.dump"
  WORK_FILE="$backup_dir/.tmp/$name"
  # The plain dump only ever exists in .tmp, and never survives this script.
  trap 'rm -f -- "$WORK_FILE"' EXIT
  trap 'log "BACKUP FAILED (line $LINENO)" >&2' ERR

  [ -n "$(compose ps -q db)" ] || die "the db container is not running"

  log "dumping database '$DB_NAME' ($kind)"
  compose exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" --format=custom >"$WORK_FILE"
  [ -s "$WORK_FILE" ] || die "pg_dump produced an empty file"

  # The archive must be readable, and must list at least as many entries as the database has
  # tables (an entry line of `pg_restore --list` starts with its numeric id).
  local listing entries tables
  listing="$(compose exec -T db pg_restore --list <"$WORK_FILE")" || die "pg_restore cannot read the archive: it is not restorable"
  entries="$(printf '%s\n' "$listing" | grep -c -E '^[0-9]+;' || true)"
  tables="$(psql_db "$DB_NAME" "select count(*) from information_schema.tables where table_schema = 'public'")"
  case "$tables" in
    '' | *[!0-9]*) die "could not count the tables of '$DB_NAME'" ;;
  esac
  if [ "$entries" -lt "$tables" ]; then
    die "the archive lists $entries entries but the database has $tables tables: it is incomplete"
  fi
  if [ "$tables" -eq 0 ]; then
    warn "the database has no tables yet: this archive is empty"
  fi

  local final="$backup_dir/$kind/$name" encrypted="no"
  if [ -n "$recipient" ]; then
    final="$final.age"
    age --encrypt --recipient "$recipient" --output "$final" "$WORK_FILE"
    encrypted="yes"
  else
    warn "BACKUP_AGE_RECIPIENT is not set: this archive is NOT encrypted and stays on this server only"
    cp -- "$WORK_FILE" "$final"
  fi
  rm -f -- "$WORK_FILE"
  [ -s "$final" ] || die "the final archive is empty"

  local migration git_sha
  migration="$(psql_db "$DB_NAME" "select migration_name from _prisma_migrations where finished_at is not null order by finished_at desc limit 1" 2>/dev/null || true)"
  git_sha="$(git -C "$REPO_DIR" rev-parse --short=12 HEAD 2>/dev/null || true)"
  (
    cd "$backup_dir/$kind"
    sha256sum -- "$(basename "$final")" >"$(basename "$final").sha256"
  )
  {
    printf 'created_at=%s\n' "$stamp"
    printf 'kind=%s\n' "$kind"
    printf 'file=%s\n' "$(basename "$final")"
    printf 'bytes=%s\n' "$(stat -c %s "$final")"
    printf 'encrypted=%s\n' "$encrypted"
    printf 'archive_entries=%s\n' "$entries"
    printf 'latest_migration=%s\n' "${migration:-unknown}"
    printf 'git_sha=%s\n' "${git_sha:-unknown}"
    printf 'image_tag=%s\n' "$(env_value IMAGE_TAG)"
    printf 'pii_key_fingerprint=%s\n' "$(pii_key_fingerprint)"
  } >"$final.meta"
  log "wrote $final ($(stat -c %s "$final") bytes, $entries archive entries, encrypted: $encrypted)"

  # Weekly copy: promote this archive when the newest weekly one is older than 6.5 days (or
  # there is none). This catches up by itself after a missed night.
  local promoted=""
  if [ "$kind" = "daily" ]; then
    local recent_weekly
    recent_weekly="$(find "$backup_dir/weekly" -maxdepth 1 -type f '(' -name 'managevent-*.dump' -o -name 'managevent-*.dump.age' ')' -mmin -9360 -print -quit)"
    if [ -z "$recent_weekly" ]; then
      cp -p -- "$final" "$final.sha256" "$final.meta" "$backup_dir/weekly/"
      promoted="$backup_dir/weekly/$(basename "$final")"
      log "promoted to weekly/$(basename "$final")"
    fi
    prune_sets "$backup_dir/daily" "$keep_daily"
    prune_sets "$backup_dir/weekly" "$keep_weekly"
  else
    prune_sets "$backup_dir/predeploy" "$keep_predeploy"
  fi

  if [ -n "$RCLONE_REMOTE" ] || [ -n "$S3_URI" ]; then
    local file
    for file in "$final" "$final.sha256" "$final.meta"; do
      upload "$file" "$kind"
    done
    if [ -n "$promoted" ]; then
      for file in "$promoted" "$promoted.sha256" "$promoted.meta"; do
        upload "$file" weekly
      done
    fi
    log "uploaded to ${RCLONE_REMOTE:-$S3_URI}"
  else
    warn "no off-server destination is configured (BACKUP_RCLONE_REMOTE or BACKUP_S3_URI): this backup does not survive the loss of this server"
  fi

  if [ -n "$heartbeat" ] && [ "$kind" = "daily" ]; then
    curl -fsS --max-time 15 --retry 3 -o /dev/null "$heartbeat" || warn "heartbeat URL could not be reached"
  fi
  log "backup complete"
}

main "$@"
