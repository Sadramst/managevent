#!/usr/bin/env bash
# Deploy the Managevent stack on the VPS. Run it on the server, from anywhere.
#
#   bash infra/vps/deploy.sh            # manual path: git pull, build the four images HERE one at a
#                                       # time, back up, migrate, start, verify, report
#   bash infra/vps/deploy.sh --image-tag <tag> --image-prefix <prefix> [--git-ref <commit>]
#                                       # registry path (GitHub Actions): pull prebuilt images
#                                       # instead of building, then the same steps
#   bash infra/vps/deploy.sh --rollback # run the previous images again (migrations are not undone)
#   bash infra/vps/deploy.sh --verify   # only the health checks
#
# Options: --no-pull (keep the checked-out code), --no-backup, --no-verify (first provisioning,
# before DNS and certificates exist), --no-prune (keep old images).
#
# Order of work, and why it is safe to run against a live site:
#   1. Everything that can fail without touching the running containers happens first:
#      git, Compose config (required secrets), Caddyfile validation, image build or pull,
#      database backup, migrations.
#   2. Only then are the containers replaced (`docker compose up -d`).
#   3. Health is verified on all three public hostnames. When that fails, or when Compose could
#      not start the new containers at all, the previous image tag is started again
#      automatically and the script exits non-zero.
# The deployed tag is written to IMAGE_TAG / IMAGE_PREFIX in infra/vps/.env so that every later
# `docker compose` command uses the same images; the previous one is kept in .deploy-state.

set -Eeuo pipefail

# shellcheck source=infra/vps/lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

STATE_FILE="$VPS_DIR/.deploy-state"
SERVICES=(api worker marketing invitation)
LOCAL_PREFIX="managevent-"
API_HOST="${MANAGEVENT_API_HOST:-api.managevent.com.au}"
WWW_HOST="${MANAGEVENT_WWW_HOST:-www.managevent.com.au}"
INVITATION_HOST="${MANAGEVENT_INVITATION_HOST:-invitation.managevent.com.au}"

usage() {
  sed -n '2,13p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

state_value() {
  local key="$1"
  [ -f "$STATE_FILE" ] || return 0
  grep -E "^${key}=" "$STATE_FILE" | tail -n 1 | cut -d= -f2- || true
}

write_state() {
  local previous_tag="$1" previous_prefix="$2" previous_sha="$3"
  umask 077
  {
    printf 'PREVIOUS_IMAGE_TAG=%s\n' "$previous_tag"
    printf 'PREVIOUS_IMAGE_PREFIX=%s\n' "$previous_prefix"
    printf 'PREVIOUS_GIT_SHA=%s\n' "$previous_sha"
    printf 'SWITCHED_AT=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  } >"$STATE_FILE"
}

images_exist() {
  local prefix="$1" tag="$2" service
  for service in "${SERVICES[@]}"; do
    docker image inspect "${prefix}${service}:${tag}" >/dev/null 2>&1 || return 1
  done
}

# container_state SERVICE: health status when the service has a healthcheck, otherwise its
# run state; "missing" when there is no container.
container_state() {
  local id
  id="$(compose ps -q "$1" | head -n 1)"
  if [ -z "$id" ]; then
    printf 'missing'
    return 0
  fi
  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id"
}

# wait_for_state SERVICE WANTED SECONDS
wait_for_state() {
  local service="$1" wanted="$2" seconds="$3" waited=0 state=""
  while [ "$waited" -lt "$seconds" ]; do
    state="$(container_state "$service")"
    [ "$state" = "$wanted" ] && return 0
    sleep 5
    waited=$((waited + 5))
  done
  log "$service is '$state' after ${seconds}s (wanted '$wanted')" >&2
  return 1
}

# The worker has no healthcheck: it must be running and must not have restarted for 15 seconds.
worker_is_stable() {
  local id first second
  id="$(compose ps -q worker | head -n 1)"
  [ -n "$id" ] || return 1
  first="$(docker inspect --format '{{.State.Running}} {{.RestartCount}}' "$id")"
  sleep 15
  second="$(docker inspect --format '{{.State.Running}} {{.RestartCount}}' "$id")"
  [ "$first" = "$second" ] && [ "${second%% *}" = "true" ]
}

# http_status HOST PATH: status code of https://HOST/PATH as served by THIS server (the name is
# resolved to 127.0.0.1, so the check does not depend on public DNS). "000" when unreachable.
http_status() {
  local host="$1" path="$2"
  curl -sS -o /dev/null -w '%{http_code}' --max-time 15 \
    --resolve "${host}:443:127.0.0.1" "https://${host}${path}" 2>/dev/null || true
}

# wait_for_http HOST PATH SECONDS: succeeds on the first 2xx or 3xx answer.
wait_for_http() {
  local host="$1" path="$2" seconds="$3" waited=0 status=""
  while [ "$waited" -lt "$seconds" ]; do
    status="$(http_status "$host" "$path")"
    case "$status" in
      2?? | 3??)
        log "ok   https://${host}${path} -> ${status}"
        return 0
        ;;
    esac
    sleep 5
    waited=$((waited + 5))
  done
  log "FAIL https://${host}${path} -> ${status:-no answer} after ${seconds}s" >&2
  return 1
}

verify() {
  local failed=0 body
  log "verifying"
  wait_for_state db healthy 120 || failed=1
  wait_for_state api healthy 300 || failed=1
  if worker_is_stable; then
    log "ok   worker is running and not restarting"
  else
    log "FAIL worker is not running, or it is restarting" >&2
    failed=1
  fi
  wait_for_http "$API_HOST" /health 120 || failed=1
  wait_for_http "$WWW_HOST" / 180 || failed=1
  wait_for_http "$INVITATION_HOST" / 180 || failed=1
  body="$(curl -sS --max-time 15 --resolve "${API_HOST}:443:127.0.0.1" "https://${API_HOST}/health" 2>/dev/null || true)"
  case "$body" in
    *'"status":"ok"'*) log "ok   API health body reports status ok" ;;
    *)
      log "FAIL API health body does not report status ok" >&2
      failed=1
      ;;
  esac
  # Informational only: the HTTPS checks above already prove that Caddy and both Next apps answer.
  log "container state: caddy=$(container_state caddy) marketing=$(container_state marketing) invitation=$(container_state invitation)"
  return "$failed"
}

# switch_to PREFIX TAG: point .env at these images and (re)create the containers.
switch_to() {
  local prefix="$1" tag="$2"
  export IMAGE_PREFIX="$prefix" IMAGE_TAG="$tag"
  # One chain, so the function fails as a whole when it is called from an `if` (where the
  # shell does not stop at a failing command by itself).
  set_env_value IMAGE_PREFIX "$prefix" &&
    set_env_value IMAGE_TAG "$tag" &&
    compose up -d --remove-orphans
}

# Removes images of the four apps that are neither running now nor the rollback target, and
# build cache older than two weeks. Docker refuses to remove an image a container still uses.
prune_images() {
  local keep_a="$1" keep_b="$2" service prefix reference prefixes
  mapfile -t prefixes < <(printf '%s\n' "$LOCAL_PREFIX" "${keep_a%%|*}" "${keep_b%%|*}" | sort -u)
  for service in "${SERVICES[@]}"; do
    for prefix in "${prefixes[@]}"; do
      [ -n "$prefix" ] || continue
      while IFS= read -r reference; do
        case "$reference" in
          *':<none>' | '') continue ;;
          "${keep_a%%|*}${service}:${keep_a##*|}" | "${keep_b%%|*}${service}:${keep_b##*|}") continue ;;
        esac
        docker image rm "$reference" >/dev/null 2>&1 || true
      done < <(docker image ls --format '{{.Repository}}:{{.Tag}}' "${prefix}${service}" | sort -u)
    done
  done
  docker image prune -f >/dev/null 2>&1 || true
  docker builder prune -f --filter until=336h >/dev/null 2>&1 || true
}

rollback() {
  local previous_tag previous_prefix current_tag current_prefix
  previous_tag="$(state_value PREVIOUS_IMAGE_TAG)"
  previous_prefix="$(state_value PREVIOUS_IMAGE_PREFIX)"
  if [ -z "$previous_tag" ] || [ -z "$previous_prefix" ]; then
    die "no previous deployment is recorded in $STATE_FILE"
  fi
  current_tag="$(env_file_value IMAGE_TAG)"
  current_tag="${current_tag:-local}"
  current_prefix="$(env_file_value IMAGE_PREFIX)"
  current_prefix="${current_prefix:-$LOCAL_PREFIX}"
  images_exist "$previous_prefix" "$previous_tag" || die "the images for ${previous_prefix}*:${previous_tag} are no longer on this server"

  log "rolling back: ${current_prefix}*:${current_tag} -> ${previous_prefix}*:${previous_tag}"
  log "note: database migrations are NOT undone. The previous images must work with the current schema."
  switch_to "$previous_prefix" "$previous_tag"
  # Remember what we came from, so a second --rollback returns to it.
  write_state "$current_tag" "$current_prefix" "$(git -C "$REPO_DIR" rev-parse HEAD 2>/dev/null || true)"
  verify || die "the rolled-back stack is not healthy either: see 'docker compose ps' and 'docker compose logs'"
  log "ROLLBACK COMPLETE: running ${previous_prefix}*:${previous_tag}"
}

main() {
  local original_args=("$@")
  local mode="deploy" image_tag="" image_prefix="" git_ref=""
  local do_pull="yes" do_backup="yes" do_verify="yes" do_prune="yes"
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --image-tag)
        [ "$#" -ge 2 ] || die "--image-tag needs a value"
        image_tag="$2"
        shift 2
        ;;
      --image-prefix)
        [ "$#" -ge 2 ] || die "--image-prefix needs a value"
        image_prefix="$2"
        shift 2
        ;;
      --git-ref)
        [ "$#" -ge 2 ] || die "--git-ref needs a value"
        git_ref="$2"
        shift 2
        ;;
      --rollback)
        mode="rollback"
        shift
        ;;
      --verify)
        mode="verify"
        shift
        ;;
      --no-pull)
        do_pull="no"
        shift
        ;;
      --no-backup)
        do_backup="no"
        shift
        ;;
      --no-verify)
        do_verify="no"
        shift
        ;;
      --no-prune)
        do_prune="no"
        shift
        ;;
      -h | --help)
        usage
        exit 0
        ;;
      *) die "unknown argument: $1 (see --help)" ;;
    esac
  done

  case "${image_tag}${image_prefix}${git_ref}" in
    *[!A-Za-z0-9._/:-]*) die "--image-tag, --image-prefix and --git-ref may only contain letters, digits and . _ / : -" ;;
  esac

  require_command docker
  require_command git
  require_command curl
  require_command flock
  docker compose version >/dev/null 2>&1 || die "the Docker Compose plugin is not installed (apt-get install docker-compose-v2)"
  [ -f "$ENV_FILE" ] || die "$ENV_FILE does not exist: copy .env.example and fill it in (DEPLOYMENT.md)"
  acquire_lock deploy
  # One container at a time: the 2 GB server cannot start or build several at once.
  export COMPOSE_PARALLEL_LIMIT=1

  case "$mode" in
    verify)
      verify || die "verification failed"
      log "VERIFIED"
      return 0
      ;;
    rollback)
      rollback
      return 0
      ;;
  esac

  # ---- 1. code ------------------------------------------------------------------------------
  local before_sha after_sha
  before_sha="${MANAGEVENT_DEPLOY_BEFORE_SHA:-$(git -C "$REPO_DIR" rev-parse HEAD)}"
  if [ "$do_pull" = "yes" ]; then
    log "updating the checkout in $REPO_DIR"
    git -C "$REPO_DIR" fetch --quiet origin
    if [ -n "$git_ref" ]; then
      git -C "$REPO_DIR" merge --ff-only "$git_ref" || die "cannot fast-forward to $git_ref: fix the checkout by hand, then rerun"
    else
      git -C "$REPO_DIR" pull --ff-only || die "git pull failed: fix the checkout by hand, or rerun with --no-pull"
    fi
    after_sha="$(git -C "$REPO_DIR" rev-parse HEAD)"
    if [ "$after_sha" != "$before_sha" ] && [ -z "${MANAGEVENT_DEPLOY_REEXEC:-}" ]; then
      # The pull may have changed this very script and the Compose files. Start again from
      # the new version, without pulling a second time.
      log "code changed (${before_sha:0:12} -> ${after_sha:0:12}); restarting with the updated deploy.sh"
      export MANAGEVENT_DEPLOY_BEFORE_SHA="$before_sha" MANAGEVENT_DEPLOY_REEXEC=1
      exec bash "$VPS_DIR/deploy.sh" "${original_args[@]}" --no-pull
    fi
  fi
  after_sha="$(git -C "$REPO_DIR" rev-parse HEAD)"

  # ---- 2. which images ----------------------------------------------------------------------
  local current_tag current_prefix new_tag new_prefix registry="no"
  current_tag="$(env_file_value IMAGE_TAG)"
  current_tag="${current_tag:-local}"
  current_prefix="$(env_file_value IMAGE_PREFIX)"
  current_prefix="${current_prefix:-$LOCAL_PREFIX}"
  if [ -n "$image_tag" ]; then
    registry="yes"
    new_tag="$image_tag"
    new_prefix="${image_prefix:-$current_prefix}"
    [ "$new_prefix" != "$LOCAL_PREFIX" ] || die "--image-tag needs --image-prefix (for example ghcr.io/<owner>/managevent-)"
  else
    [ -z "$image_prefix" ] || die "--image-prefix only makes sense together with --image-tag"
    new_tag="$(git -C "$REPO_DIR" rev-parse --short=12 HEAD)"
    if [ -n "$(git -C "$REPO_DIR" status --porcelain --untracked-files=no)" ]; then
      warn "the checkout has uncommitted changes; they will be built into the images"
      new_tag="${new_tag}-dirty"
    fi
    new_prefix="$LOCAL_PREFIX"
  fi
  export IMAGE_TAG="$new_tag" IMAGE_PREFIX="$new_prefix"
  log "deploying ${new_prefix}*:${new_tag} (running now: ${current_prefix}*:${current_tag})"

  # ---- 3. preflight: nothing that is running has been touched yet ---------------------------
  compose config --quiet || die "the Compose configuration is not valid: a required variable is probably missing from $ENV_FILE (infra/ENVIRONMENTS.md)"
  docker run --rm --network none -v "$VPS_DIR/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2-alpine \
    caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 ||
    die "infra/vps/Caddyfile does not validate; run the same command without the redirection to see why"
  # Compose only checks that these two are present. A short value passes that check and then
  # fails later: the API refuses to start on a short API_PROXY_SECRET, and throws on the first
  # guest link when GUEST_TOKEN_PEPPER is short. Catch both here, before anything is replaced.
  local secret_name secret_value
  for secret_name in GUEST_TOKEN_PEPPER API_PROXY_SECRET; do
    secret_value="$(env_value "$secret_name")"
    [ "${#secret_value}" -ge 32 ] || die "$secret_name in $ENV_FILE must be at least 32 characters (node scripts/generate-deployment-secrets.mjs)"
  done
  # Every app service has `init: true`. A Docker without its init binary cannot start any of
  # them, and a rollback uses the same Compose file, so prove it works on an image that is
  # already here before the running containers are replaced.
  docker run --rm --init --network none --entrypoint /bin/true caddy:2-alpine >/dev/null 2>&1 ||
    die "Docker cannot start a container with an init process (try: docker run --rm --init caddy:2-alpine true). See: docker info --format '{{.InitBinary}}' (on Ubuntu the 'tini' package usually provides it)"
  log "preflight ok (Compose config, Caddyfile, secret lengths, init)"

  # ---- 4. images ----------------------------------------------------------------------------
  local service
  if [ "$registry" = "yes" ]; then
    log "pulling images"
    compose pull "${SERVICES[@]}"
  else
    for service in "${SERVICES[@]}"; do
      log "building $service"
      compose -f docker-compose.yml -f docker-compose.build.yml build "$service"
    done
  fi

  # ---- 5. database --------------------------------------------------------------------------
  compose up -d db
  wait_for_state db healthy 120 || die "the database did not become healthy"
  if [ "$do_backup" = "yes" ]; then
    log "backing up the database before migrating"
    bash "$VPS_DIR/backup.sh" --kind predeploy || die "the pre-deploy backup failed; nothing was changed (rerun with --no-backup only if you accept that)"
  fi
  log "applying migrations"
  compose run --rm migrate || die "migrations failed; the running containers were NOT replaced. Fix the migration before deploying again."

  # ---- 6. switch ----------------------------------------------------------------------------
  local state_before=""
  if [ -f "$STATE_FILE" ]; then
    state_before="$(cat "$STATE_FILE")"
  fi
  if [ "$current_tag" != "$new_tag" ] || [ "$current_prefix" != "$new_prefix" ]; then
    write_state "$current_tag" "$current_prefix" "$before_sha"
  fi
  log "starting containers"
  # `docker compose up` itself fails when a container does not become healthy (the web apps wait
  # for a healthy API). That must end in the rollback below, not in an abort that leaves a
  # half-replaced stack, so its result is recorded instead of stopping the script.
  local healthy="yes"
  if switch_to "$new_prefix" "$new_tag"; then
    # The Caddyfile is a single-file bind mount: when git replaces the file, a running
    # container keeps seeing the old one until it is restarted. Compare what the container sees
    # with the file on disk (already validated in the preflight) and restart only when they
    # differ.
    if ! compose exec -T caddy cat /etc/caddy/Caddyfile 2>/dev/null | cmp -s - "$VPS_DIR/Caddyfile"; then
      log "the running caddy has a different Caddyfile: restarting caddy"
      compose restart caddy || healthy="no"
    fi
  else
    log "docker compose up failed for ${new_prefix}*:${new_tag}" >&2
    healthy="no"
  fi

  # ---- 7. verify, or go back ----------------------------------------------------------------
  if [ "$healthy" = "yes" ] && [ "$do_verify" = "yes" ] && ! verify; then
    healthy="no"
  fi
  if [ "$healthy" = "no" ]; then
    log "THE NEW CONTAINERS ARE NOT HEALTHY" >&2
    compose ps >&2 || true
    if { [ "$current_tag" != "$new_tag" ] || [ "$current_prefix" != "$new_prefix" ]; } && images_exist "$current_prefix" "$current_tag"; then
      log "starting the previous images again: ${current_prefix}*:${current_tag}" >&2
      # Its result is decided by the verification below, not by the exit status of `up`.
      switch_to "$current_prefix" "$current_tag" || true
      # Put the rollback record back the way it was before this attempt.
      if [ -n "$state_before" ]; then
        printf '%s\n' "$state_before" >"$STATE_FILE"
      else
        rm -f -- "$STATE_FILE"
      fi
      if verify; then
        die "deploy of ${new_tag} failed and was ROLLED BACK to ${current_tag} (migrations were not undone). Logs: docker compose logs --tail 200 api marketing invitation worker"
      fi
      die "deploy of ${new_tag} failed AND the rollback to ${current_tag} is not healthy: the site needs attention now"
    fi
    die "deploy of ${new_tag} failed and there is no previous image set to return to"
  fi

  # ---- 8. report ----------------------------------------------------------------------------
  log "DEPLOYED ${new_prefix}*:${new_tag}"
  if [ "$before_sha" != "$after_sha" ]; then
    log "commits:"
    git -C "$REPO_DIR" --no-pager log --oneline --no-decorate "${before_sha}..${after_sha}" | head -n 40
    local migrations
    migrations="$(git -C "$REPO_DIR" diff --name-only --diff-filter=A "$before_sha" "$after_sha" -- packages/db/prisma/migrations | cut -d/ -f5 | sort -u)"
    if [ -n "$migrations" ]; then
      log "new migrations in this deploy:"
      printf '%s\n' "$migrations"
    fi
    log "infrastructure files changed:"
    git -C "$REPO_DIR" --no-pager diff --stat "$before_sha" "$after_sha" -- infra/vps apps/api/Dockerfile apps/worker/Dockerfile apps/marketing/Dockerfile apps/invitation/Dockerfile | tail -n 20
  else
    log "the code did not change (same commit ${after_sha:0:12}); containers were refreshed"
  fi
  compose ps
  if [ "$do_prune" = "yes" ]; then
    prune_images "${new_prefix}|${new_tag}" "${current_prefix}|${current_tag}"
  fi
  log "rollback, if needed: bash infra/vps/deploy.sh --rollback"
}

main "$@"
