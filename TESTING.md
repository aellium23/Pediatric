# Testing the App locally

This guide gets the full stack running on your machine so you can click through
the product. Everything runs locally; no Apple/Google/Stripe accounts needed for
the basic flows.

> A **dev-login** endpoint (`POST /api/auth/dev-login`) issues tokens without an
> external IdP. It is **disabled when `NODE_ENV=production`**.

## Prerequisites
- Docker + Docker Compose
- Node.js 20+
- Flutter (stable) — for the mobile app
- (Web is optional) the same Node.js

## 1) Backend + database (Docker)
```bash
# from the repo root
docker compose up -d            # Postgres + backend on :3000
# first time only: load demo data (a verified pediatrician + a demo parent)
cd apps/backend
cp -n .env.example .env
npm install
npx prisma db push              # create the schema
npm run seed                    # demo pediatrician + parent (marta@demo.pedia)
```
- API: http://localhost:3000/api
- Interactive API docs (Swagger): **http://localhost:3000/docs**
- Health: http://localhost:3000/health

> Prefer no Docker? Run Postgres yourself, set `DATABASE_URL` in `apps/backend/.env`,
> then `npm run start:dev` in `apps/backend`.

## 2) Try the API directly (no app needed)
```bash
# Public marketplace (seeded pediatrician shows up)
curl http://localhost:3000/api/pediatricians

# Dev login as the demo parent -> returns access/refresh tokens
curl -X POST http://localhost:3000/api/auth/dev-login \
  -H 'content-type: application/json' \
  -d '{"email":"marta@demo.pedia","role":"PARENT"}'

# Use the accessToken from above:
TOKEN=...                       # paste the accessToken
curl http://localhost:3000/api/children -H "authorization: Bearer $TOKEN"
```

## 3) Mobile app (Flutter)
```bash
cd apps/mobile
flutter pub get
# Point the app at your backend (use your machine IP for a real device):
flutter run --dart-define=API_BASE_URL=http://localhost:3000/api
```
On the sign-in screen, tap **"Entrar em modo demo (teste)"** to sign in as the
demo parent. From there you can add a child and browse pediatricians.

- iOS simulator: `http://localhost:3000/api` works.
- Android emulator: use `http://10.0.2.2:3000/api`.
- Physical device: use your computer's LAN IP, e.g. `http://192.168.1.20:3000/api`.

## 4) Web portal (Next.js) — optional
```bash
cd apps/web
npm install
NEXT_PUBLIC_API_BASE=http://localhost:3000/api npm run dev   # http://localhost:3000? no -> :3000 is the API
```
Next dev runs on **http://localhost:3000 by default**, which clashes with the API.
Run it on another port:
```bash
NEXT_PUBLIC_API_BASE=http://localhost:3000/api npm run dev -- -p 3001
```
Open http://localhost:3001 → landing → **/marketplace** lists the seeded
pediatrician (the marketplace endpoint is public).

## What works end-to-end today (Increments 1–4)
- Auth (dev-login now; Apple/Google/passkeys need real credentials)
- Family & children (encrypted health profile, parental consent)
- Public marketplace + pediatrician profiles + verified reviews
- Paid message consultations (Stripe **test** keys required to complete payment)
- Realtime chat (WebSocket), SLA timers + auto-refund
- Video booking + room token (LiveKit creds required for real media)
- Notifications (in-app records; push needs FCM/APNs creds)

## Notes / limitations
- **Payments**: set `STRIPE_SECRET_KEY` (test mode) in `.env` to exercise the
  payment intent; otherwise consultation creation works but capture/split will not.
- **Video media**: token issuance works; real audio/video needs LiveKit creds.
- **Apple/Google/Passkeys**: require platform setup; use dev-login for testing.
- Never run dev-login in production (`NODE_ENV=production` returns 404).
