# Incident and Notifiable Data Breach runbook

> References: Australian Privacy Act 1988, Notifiable Data Breaches (NDB) scheme; `docs/compliance/PRIVACY.md`. How production is built and operated: [`../DEPLOYMENT.md`](../DEPLOYMENT.md).

Production is one server (`/opt/managevent` on the Sydney VPS). Secrets live in `infra/vps/.env` on that server and in the owner's password manager; deployment credentials live in the GitHub Environment `production`. There is no other secret store.

## A. The service is down or degraded

1. **Look.** `cd /opt/managevent/infra/vps && docker compose ps`, then `bash deploy.sh --verify`. The "Troubleshooting" section of `DEPLOYMENT.md` lists the usual causes.
2. **If a deploy caused it,** go back: `bash deploy.sh --rollback`.
3. **If the server is out of memory or disk,** see "The server is slow" and "The disk is filling up" in `DEPLOYMENT.md`. Restarting one service is `docker compose restart <service>`.
4. **If data was damaged,** stop writes first (`docker compose stop api worker marketing invitation`), then decide between a forward fix and a restore (`DEPLOYMENT.md`, "Restore"). A restore loses everything written since the backup.
5. **If the server is gone,** follow "Server lost" in `DEPLOYMENT.md`.
6. Write down what happened, when, and what was done, while it is fresh.

## B. Suspected compromise or data breach

### 1. Contain (first 4 hours)

1. **Tell the owner (`SUPER_ADMIN`).** One person leads; everyone else reports to them.
2. **Preserve evidence before changing anything.** Container logs are rotated (5 × 10 MB each), so copy them now:

   ```bash
   mkdir -p /root/incident-$(date -u +%Y%m%dT%H%MZ) && cd "$_"
   for s in caddy api worker marketing invitation db; do docker compose -f /opt/managevent/infra/vps/docker-compose.yml logs --no-color "$s" > "$s.log" 2>&1; done
   bash /opt/managevent/infra/vps/backup.sh --kind predeploy     # a point-in-time copy of the database, including AuditLog
   last -a > logins.txt; journalctl -u ssh --since "-7 days" > ssh.log
   ```

   The logs contain no guest links, cookies or request bodies by design, and addresses are truncated. Keep the folder on the server and one copy in Australia; treat it as personal information.

3. **Cut off what is exposed.** All of these are edits to `infra/vps/.env` followed by `docker compose up -d` in `infra/vps` (update the password-manager copy too):

   | Suspected exposed                | Do this                                                                                                                                 | Side effect                                                           |
   | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
   | A guest link                     | Revoke or reissue it in the host studio (or `POST /v1/events/{eventId}/parties/{partyId}/revoke-link`)                                  | The old link answers 410                                              |
   | A user's session or password     | Delete that user's rows in `Session`; have them reset the password                                                                      | They are signed out                                                   |
   | `BETTER_AUTH_SECRET`             | Replace it                                                                                                                              | Everyone is signed out                                                |
   | `API_PROXY_SECRET`               | Replace it                                                                                                                              | None                                                                  |
   | `GUEST_TOKEN_PEPPER`             | Replace it only if you accept the cost                                                                                                  | **Every guest link and pass already sent stops working**              |
   | `PII_ENCRYPTION_KEY`             | Do **not** just replace it: existing health fields would become unreadable. Plan a re-encryption with engineering (OPEN_DECISIONS D-13) | Until then, restrict access to the server and the backups             |
   | `POSTGRES_PASSWORD`              | `ALTER ROLE managevent PASSWORD '...'` in the `db` container, then the same value in `.env`                                             | Brief restart of api and worker                                       |
   | `RESEND_API_KEY`, Stripe keys    | Revoke in the provider's dashboard, create new ones, update `.env`                                                                      | Email or checkout is off until the new key is in place                |
   | The deploy SSH key or the server | Remove the key from `authorized_keys`, rotate the GitHub Environment secrets, and assume everything in `.env` is exposed                | Rotate every secret above; consider rebuilding the server from backup |
   | The backup bucket credentials    | Revoke them at the storage provider and issue new ones                                                                                  | Archives are age-encrypted; the private key is not on the server      |

4. **If an attacker may still have access to the server,** take it off the internet (`ufw deny 80,443/tcp`, or stop the instance at Vultr) and rebuild on a new server from the repository, the password-manager `.env` (with rotated secrets) and the newest backup.

### 2. Assess (target 72 hours, 30 days at most)

1. Identify which records were accessed: `User`, `Guest`, `Rsvp` (encrypted dietary and allergy fields), `Lead`, `Payment`. `AuditLog` records staff reads of health data and exports.
2. Check whether field-level AES-256-GCM encryption (`enc:v1:...`) protected the health fields: it did only if `PII_ENCRYPTION_KEY` was not exposed together with the data. The key and the database are on the same server; an off-server backup alone does not contain the key.
3. Decide whether the breach is likely to result in serious harm to any individual.

### 3. Notify (if it is an eligible data breach)

1. Prepare the statement for the **Office of the Australian Information Commissioner (OAIC)**.
2. Notify the affected individuals in plain English, with what happened, what information was involved and what they should do.
3. Record the incident in the Admin Breach Register (`AuditLog`), with the evidence folder's location.

## C. Afterwards

- Rotate anything that was touched during the response and was not already rotated.
- Run a restore drill (`DEPLOYMENT.md`) if backups were involved.
- Write a short review: timeline, cause, what limited the damage, what to change. Open issues for the changes.
