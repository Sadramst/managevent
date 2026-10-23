# ADR-0004: PostgreSQL + Prisma in Sydney

- **Status:** Accepted, with the provider pending under D-02
- **Decision:**
  - PostgreSQL 16+ in `ap-southeast-2`.
  - **Supabase** is preferred because it adds Realtime for the photo wall and live RSVP. **Neon** is the alternative. Both offer Sydney regions.
  - Prisma ORM (7.x at the time of writing; use the latest stable release at scaffold time).
  - Migrations are append-only and run by CI on deploy.
- **Rules:**
  - Do not use Supabase Auth or Supabase Storage. Auth is Better Auth and storage is R2. This keeps the provider swappable.
  - If Supabase Realtime is used, it is used only for broadcast. Row data is still fetched through the API.
