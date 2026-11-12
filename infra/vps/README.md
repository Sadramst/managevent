# `infra/vps`: the production stack

Everything that runs on the Sydney VPS is defined in this folder. **How to use it is in the root [`DEPLOYMENT.md`](../../DEPLOYMENT.md)**; this page only says what each file is.

| File                                          | What it is                                                                                                                                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker-compose.yml`                          | The stack: `db`, `api`, `worker`, `marketing`, `invitation`, `caddy`, plus the one-off tools `migrate` and `seed`. References images by `IMAGE_PREFIX` and `IMAGE_TAG` |
| `docker-compose.build.yml`                    | Override that adds `build:` for building the four images on the server (the manual path)                                                                               |
| `.env.example`                                | Template for `.env` (never committed). Every variable is explained in [`../ENVIRONMENTS.md`](../ENVIRONMENTS.md)                                                       |
| `Caddyfile`                                   | TLS, the four hostnames, security headers, body limits, the redacted access log, client-address hygiene                                                                |
| `deploy.sh`                                   | Deploy, verify, roll back. Used by hand and by `.github/workflows/deploy.yml`                                                                                          |
| `backup.sh`, `restore.sh`                     | Encrypted PostgreSQL backups with retention; restore drill and restore                                                                                                 |
| `lib.sh`                                      | Helpers shared by the three scripts                                                                                                                                    |
| `systemd/managevent-backup.service`, `.timer` | The nightly backup schedule                                                                                                                                            |

Files that exist only on the server, all gitignored: `.env` (secrets, mode `0600`) and `.deploy-state` (the previous image tag, written by `deploy.sh` for rollback).

## Everyday commands

Run them on the server. The scripts are started with `bash`, so they do not depend on the executable bit.

```bash
cd /opt/managevent/infra/vps
docker compose ps                         # state and health
docker compose logs --tail 100 api        # or worker, marketing, invitation, caddy, db
bash deploy.sh                            # git pull, build, back up, migrate, start, verify
bash deploy.sh --rollback                 # previous images again
bash deploy.sh --verify                   # health checks only
bash backup.sh                            # a backup now
bash restore.sh --drill --identity <key>  # prove the newest backup restores
```

## Rules of this folder

- **Only Caddy publishes ports.** Never add `ports:` to another service: the client-address trust model depends on the API being reachable from the Docker network only.
- **Every required secret has a `${VAR:?}` guard** in `docker-compose.yml`, so a missing value stops Compose before anything is started or replaced. Keep that when adding one.
- **Validate before you restart.** `deploy.sh` checks the Compose configuration and the Caddyfile first. When working by hand, use the commands under "Updating" in `DEPLOYMENT.md`.
- **One build at a time** on the 2 GB plan.
- CI checks this folder on every pull request: shell syntax, ShellCheck, `docker compose config` with a complete environment and with none, and `caddy validate`.
