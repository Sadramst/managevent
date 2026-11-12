#!/usr/bin/env bash
# Restore a Managevent PostgreSQL backup made by infra/vps/backup.sh.
#
#   bash infra/vps/restore.sh --drill                       # newest nightly backup -> scratch database, checked, dropped
#   bash infra/vps/restore.sh --drill --file <archive>      # the same for one archive
#   bash infra/vps/restore.sh --file <archive> --into <db>  # restore into a new database and keep it
#   bash infra/vps/restore.sh --file <archive> --promote    # restore, then make it the live database
#
# Nothing here overwrites the live database. A restore always goes into a NEW database.
# `--promote` then stops the apps, renames the live database to `managevent_before_<time>`,
# renames the restored one to `managevent`, applies pending migrations and starts the apps.
# The old database is kept until you drop it yourself.
#
# Options:
#   --identity <file>   age private key for *.age archives (or BACKUP_AGE_IDENTITY_FILE).
#                       Bring it to the server for the restore and remove it afterwards.
#   --keep              with --drill: keep the scratch database instead of dropping it
#   --yes               with --promote: do not ask for confirmation

set -Eeuo pipefail

# shellcheck source=infra/vps/lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

# Path of a decrypted archive while it is being restored. Removed on every exit.
PLAIN_FILE=""

usage() {
  sed -n '2,17p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

cleanup() {
  if [ -n "$PLAIN_FILE" ]; then
    rm -f -- "$PLAIN_FILE"
  fi
}

# count_rows DATABASE TABLE: prints the row count, or "absent" when the table does not exist.
count_rows() {
  local database="$1" table="$2" exists
  exists="$(psql_db "$database" "select to_regclass('public.\"${table}\"') is not null")"
  if [ "$exists" = "t" ]; then
    psql_db "$database" "select count(*) from public.\"${table}\""
  else
    printf 'absent'
  fi
}

main() {
  local mode="" file="" target="" identity="" keep="no" assume_yes="no"
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --drill)
        mode="drill"
        shift
        ;;
      --promote)
        mode="promote"
        shift
        ;;
      --into)
        [ "$#" -ge 2 ] || die "--into needs a database name"
        target="$2"
        shift 2
        ;;
      --file)
        [ "$#" -ge 2 ] || die "--file needs a path"
        file="$2"
        shift 2
        ;;
      --identity)
        [ "$#" -ge 2 ] || die "--identity needs a path"
        identity="$2"
        shift 2
        ;;
      --keep)
        keep="yes"
        shift
        ;;
      --yes)
        assume_yes="yes"
        shift
        ;;
      -h | --help)
        usage
        exit 0
        ;;
      *) die "unknown argument: $1" ;;
    esac
  done
  if [ -z "$mode" ] && [ -n "$target" ]; then
    mode="into"
  fi
  [ -n "$mode" ] || {
    usage
    exit 2
  }

  require_command docker
  require_command flock
  require_command sha256sum

  local backup_dir
  backup_dir="$(env_value BACKUP_DIR)"
  backup_dir="${backup_dir:-/var/backups/managevent}"

  if [ -z "$file" ]; then
    [ "$mode" = "drill" ] || die "--file is required (only --drill picks the newest backup by itself)"
    file="$(find "$backup_dir/daily" -maxdepth 1 -type f '(' -name 'managevent-*.dump' -o -name 'managevent-*.dump.age' ')' 2>/dev/null | sort | tail -n 1)"
    [ -n "$file" ] || die "no backup found in $backup_dir/daily"
  fi
  [ -f "$file" ] || die "backup file not found: $file"

  local stamp
  stamp="$(date -u +%Y%m%dt%H%M%Sz)"
  if [ -z "$target" ]; then
    target="managevent_restore_${stamp}"
  fi
  case "$target" in
    managevent | postgres | template0 | template1) die "refusing to restore into '$target': choose a new database name" ;;
    *[!a-z0-9_]* | '') die "the database name may only contain a-z, 0-9 and _" ;;
  esac

  acquire_lock restore
  trap cleanup EXIT
  trap 'log "RESTORE FAILED (line $LINENO)" >&2' ERR

  [ -n "$(compose ps -q db)" ] || die "the db container is not running (docker compose up -d db)"

  log "backup: $file"
  if [ -f "$file.sha256" ]; then
    (cd "$(dirname "$file")" && sha256sum --check --quiet "$(basename "$file").sha256") ||
      die "checksum mismatch: the archive is damaged or was changed"
    log "checksum ok"
  else
    warn "no .sha256 next to the archive: integrity not checked"
  fi

  local meta_fingerprint="" meta_migration=""
  if [ -f "$file.meta" ]; then
    meta_fingerprint="$(grep -E '^pii_key_fingerprint=' "$file.meta" | cut -d= -f2- || true)"
    meta_migration="$(grep -E '^latest_migration=' "$file.meta" | cut -d= -f2- || true)"
  fi

  local source_file="$file"
  case "$file" in
    *.age)
      require_command age "apt-get install age"
      identity="${identity:-$(env_value BACKUP_AGE_IDENTITY_FILE)}"
      [ -n "$identity" ] || die "this archive is encrypted: pass --identity <age private key file>"
      [ -f "$identity" ] || die "age identity file not found: $identity"
      umask 077
      mkdir -p "$backup_dir/.tmp"
      PLAIN_FILE="$backup_dir/.tmp/restore-${stamp}.dump"
      age --decrypt --identity "$identity" --output "$PLAIN_FILE" "$file"
      source_file="$PLAIN_FILE"
      log "decrypted"
      ;;
  esac

  if [ "$(psql_db postgres "select count(*) from pg_database where datname = '${target}'")" != "0" ]; then
    die "database '$target' already exists"
  fi

  log "restoring into new database '$target'"
  psql_db postgres "create database \"${target}\" owner \"${DB_USER}\"" >/dev/null
  compose exec -T db pg_restore -U "$DB_USER" -d "$target" --no-owner --exit-on-error <"$source_file"
  cleanup
  PLAIN_FILE=""

  # ---- checks -----------------------------------------------------------------------------
  local tables migrations latest_migration queue table
  tables="$(psql_db "$target" "select count(*) from information_schema.tables where table_schema = 'public'")"
  migrations="$(psql_db "$target" "select count(*) from _prisma_migrations where finished_at is not null")"
  latest_migration="$(psql_db "$target" "select migration_name from _prisma_migrations where finished_at is not null order by finished_at desc limit 1")"
  queue="$(psql_db "$target" "select count(*) from information_schema.schemata where schema_name = 'pgboss'")"

  log "restored: $tables tables in public, $migrations migrations applied, latest: $latest_migration"
  log "pg-boss queue schema present: $([ "$queue" = "1" ] && printf yes || printf no)"
  for table in User Event Invitation Party Guest Rsvp Lead; do
    log "rows in \"$table\": $(count_rows "$target" "$table")"
  done

  [ "$tables" -gt 0 ] || die "the restored database has no tables"
  [ "$migrations" -gt 0 ] || die "the restored database has no applied migrations"
  if [ -n "$meta_migration" ] && [ "$meta_migration" != "unknown" ] && [ "$meta_migration" != "$latest_migration" ]; then
    die "latest migration is '$latest_migration' but the backup recorded '$meta_migration'"
  fi

  local current_fingerprint
  current_fingerprint="$(pii_key_fingerprint)"
  if [ -z "$meta_fingerprint" ] || [ "$meta_fingerprint" = "unknown" ] || [ "$current_fingerprint" = "unknown" ]; then
    warn "PII_ENCRYPTION_KEY could not be compared with the one this backup was made under"
  elif [ "$meta_fingerprint" != "$current_fingerprint" ]; then
    warn "PII_ENCRYPTION_KEY in $ENV_FILE is NOT the key this backup was made under (backup: $meta_fingerprint, now: $current_fingerprint)."
    warn "Encrypted guest health fields in this backup cannot be read until the matching key is put back."
    [ "$mode" != "promote" ] || die "refusing to promote a backup whose encryption key does not match"
  else
    log "PII_ENCRYPTION_KEY matches the key this backup was made under ($current_fingerprint)"
  fi

  # ---- outcome ----------------------------------------------------------------------------
  case "$mode" in
    drill)
      if [ "$keep" = "yes" ]; then
        log "DRILL PASSED. Scratch database kept: $target (drop it with: docker compose exec db dropdb -U $DB_USER $target)"
      else
        psql_db postgres "drop database \"${target}\"" >/dev/null
        log "DRILL PASSED. Scratch database dropped."
      fi
      ;;
    into)
      log "restored into '$target'. The live database was not touched."
      ;;
    promote)
      if [ "$assume_yes" != "yes" ]; then
        printf 'This replaces the LIVE database with the backup above. Type "promote" to continue: '
        local answer=""
        read -r answer
        [ "$answer" = "promote" ] || die "cancelled; the restored copy is in '$target'"
      fi
      local old="managevent_before_${stamp}"
      log "taking a safety backup of the live database first"
      bash "$VPS_DIR/backup.sh" --kind predeploy
      log "stopping the apps"
      compose stop marketing invitation worker api
      psql_db postgres "select pg_terminate_backend(pid) from pg_stat_activity where datname in ('${DB_NAME}', '${target}') and pid <> pg_backend_pid()" >/dev/null
      psql_db postgres "alter database \"${DB_NAME}\" rename to \"${old}\"" >/dev/null
      psql_db postgres "alter database \"${target}\" rename to \"${DB_NAME}\"" >/dev/null
      log "live database is now the restored copy; the previous one is '$old'"
      log "applying pending migrations"
      compose run --rm migrate
      log "starting the apps"
      compose up -d
      log "PROMOTED. Verify with: bash infra/vps/deploy.sh --verify"
      log "When you are sure, drop the previous database: docker compose exec db dropdb -U $DB_USER $old"
      ;;
  esac
}

main "$@"
