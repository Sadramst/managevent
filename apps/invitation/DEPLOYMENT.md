# Deployment Guide: invitation.managevent.com.au

This guide outlines how to deploy the **Managevent Digital Invitations & Host Studio** (`apps/invitation`) to Vercel targeting the production custom domain `invitation.managevent.com.au`.

---

## 1. Vercel Project Setup

1. **Import Repository**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard) → **Add New...** → **Project**.
   - Select the `Managevent` monorepo repository (`Sadramst/managevent`).

2. **Project Settings**:
   - **Project Name**: `managevent-invitation`
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `apps/invitation` (click **Edit** and set `apps/invitation`, ensuring "Include source files outside of the Root Directory in the Build Step" is **checked** for monorepo packages).

3. **Build & Development Settings**:
   - **Build Command**: `pnpm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `pnpm install`

---

## 2. Environment Variables

Configure the following environment variables in Vercel (**Settings** → **Environment Variables**):

| Variable Name | Environment | Value | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_INVITATION_URL` | Production | `https://invitation.managevent.com.au` | Canonical base URL for guest share links & QR codes |
| `NEXT_PUBLIC_API_URL` | Production | `https://api.managevent.com.au` | Managevent Sydney Backend API |
| `GUEST_TOKEN_PEPPER` | Production | *Generate random 32-byte secret* | Server-side HMAC pepper for deterministic guest tokens |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Production | *Your Google Maps API Key* | Maps embedding & directions |

---

## 3. Custom Domain & DNS Configuration

1. In Vercel Project Settings, navigate to **Domains**.
2. Add `invitation.managevent.com.au`.
3. In your DNS provider (e.g. Cloudflare, Namecheap, AWS Route 53):
   - **Record Type**: `CNAME`
   - **Host / Name**: `invitation`
   - **Value / Target**: `cname.vercel-dns.com`
   - **TTL**: `Auto` or `300`
4. Vercel will automatically provision a free Let's Encrypt TLS certificate for HTTPS.

---

## 4. Verification & Testing Post-Deploy

After deployment completes:

1. **Guest Micro-site**:
   - Open `https://invitation.managevent.com.au/i/anniversary/armita-party-g9qtmt`
   - Test wax-seal gate reveal animation, live countdown, bilingual toggle, and RSVP submission.
2. **Privacy Headers**:
   - Verify `X-Robots-Tag: noindex, nofollow, noarchive` is present on `/i/*`, `/studio/*`, `/legacy/*`.
3. **Legacy Redirection**:
   - Verify `https://invitation.managevent.com.au/anniversary/armita-party-g9qtmt` redirects (307) to canonical `/i/anniversary/armita-party-g9qtmt`.
4. **Host Studio**:
   - Access `https://invitation.managevent.com.au/studio`
   - Test guest search, table assignment, WhatsApp 1-click message generation, and Excel BOM CSV export.
