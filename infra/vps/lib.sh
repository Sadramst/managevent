#!/usr/bin/env bash
# Shared helpers for the operations scripts in this folder (deploy.sh, backup.sh, restore.sh).
# Source it; do not run it.
#
# shellcheck shell=bash

VPS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$VPS_DIR/../.." && pwd)"
ENV_FILE="${MANAGEVENT_ENV_FILE:-$VPS_DIR/.env}"
DB_USER="managevent"
DB_NAME="managevent"

export VPS_DIR REPO_DIR ENV_FILE DB_USER DB_NAME

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

warn() {
  log "WARNING: $*" >&2
}

die() {
  log "ERROR: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' is not installed${2:+ ($2)}"
}

# env_file_value KEY
# Prints the value of KEY from the Compose .env file (last assignment wins, one pair of
# surrounding quotes removed), or nothing when it is not there. The file is never sourced: it
# is a Compose file, not a shell script.
env_file_value() {
  local key="$1" line value first last
  [ -f "$ENV_FILE" ] || return 0
  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 | tr -d '\r' || true)"
  [ -n "$line" ] || return 0
  value="${line#*=}"
  if [ "${#value}" -ge 2 ]; then
    first="${value:0:1}"
    last="${value: -1}"
    if [ "$first" = "$last" ] && { [ "$first" = '"' ] || [ "$first" = "'" ]; }; then
      value="${value:1:${#value}-2}"
    fi
  fi
  printf '%s' "$value"
}

# env_value KEY
# The same, but a variable that is set in the process environment wins over the file.
env_value() {
  local key="$1"
  if [ -n "${!key:-}" ]; then
    printf '%s' "${!key}"
    return 0
  fi
  env_file_value "$key"
}

# set_env_value KEY VALUE
# Replaces (or appends) KEY=VALUE in the Compose .env file. The new file is written next to the
# old one with mode 0600 and moved into place, so a crash never leaves a half-written .env.
set_env_value() {
  local key="$1" value="$2" tmp
  [ -f "$ENV_FILE" ] || die "$ENV_FILE does not exist"
  tmp="$(mktemp "${ENV_FILE}.XXXXXX")"
  chmod 600 "$tmp"
  grep -v -E "^${key}=" "$ENV_FILE" >"$tmp" || true
  printf '%s=%s\n' "$key" "$value" >>"$tmp"
  mv "$tmp" "$ENV_FILE"
}

# Runs `docker compose` in this folder, so the project name, .env and relative paths resolve.
compose() {
  (cd "$VPS_DIR" && docker compose "$@")
}

# acquire_lock NAME
# Takes an exclusive lock for the lifetime of the calling script, or stops when another run
# holds it. File descriptor 9 stays open until the script exits.
acquire_lock() {
  local name="$1" lock_file
  lock_file="${TMPDIR:-/tmp}/managevent-${name}.lock"
  exec 9>"$lock_file"
  flock -n 9 || die "another ${name} run is in progress (lock: $lock_file)"
}

# psql_db DATABASE SQL
# Runs one statement inside the db container and prints unaligned tuples only.
psql_db() {
  local database="$1" sql="$2"
  compose exec -T db psql -U "$DB_USER" -d "$database" -v ON_ERROR_STOP=1 -At -c "$sql"
}

# A short, non-reversible label for the PII_ENCRYPTION_KEY in use. It lets a backup say which
# key its encrypted health fields need, without storing the key. Prints "unknown" when the key
# is not available.
pii_key_fingerprint() {
  local key
  key="$(env_value PII_ENCRYPTION_KEY)"
  if [ -z "$key" ]; then
    printf 'unknown'
    return 0
  fi
  printf 'managevent-pii-key-fingerprint:%s' "$key" | sha256sum | cut -c1-12
}
