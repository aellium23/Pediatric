# Testing the App

## 📱 Testar a partir do iPhone (sem computador) — GitHub Codespaces

A app **nativa iOS** precisa de um Mac/TestFlight para instalar. Mas podes correr
e ver a plataforma (portal **web** + **API/Swagger**) **a partir do Safari no
iPhone**, usando o GitHub Codespaces (corre tudo na cloud).

**Passos (tudo no Safari do iPhone):**
1. Abre **github.com/aellium23/Pediatric** e inicia sessão.
2. Toca em **Branches** e escolhe `claude/telepediatria-platform-design-pq1y1v`.
   *(o código está neste branch)*
3. Toca no botão verde **Code** → separador **Codespaces** → **Create codespace**.
   - Dica: se o botão não aparecer, no Safari toca em **aA** → **Request Desktop
     Website**.
4. Espera ~2 min (instala dependências e dados demo automaticamente).
5. No terminal do Codespace (em baixo), escreve:
   ```bash
   bash .devcontainer/start.sh
   ```
6. Abre o separador **Ports** (ou o aviso que aparece). Em **Web portal (3001)**,
   muda a *Visibility* para **Public** e toca no ícone do globo 🌐 → abre no Safari.
   - Marketplace: adiciona `/marketplace` ao URL.
   - API/Swagger: faz o mesmo com a porta **3000** e abre `/docs`.

> Os Codespaces têm um tier gratuito generoso. Para a app **nativa** no iPhone,
> precisas mesmo de um Mac ou de uma pipeline TestFlight — diz-me se quiseres que
> a monte.

## 🚀 Publicar o portal web na Vercel (URL público, a partir do iPhone)

A Vercel hospeda o **frontend** (`apps/web`). Sem API configurada, ele corre com
**dados de demonstração** — ou seja, fica logo utilizável. (Para dados reais,
precisas de uma API pública; ver nota no fim.)

**Passos (no Safari do iPhone):**
1. Vai a **vercel.com** e inicia sessão com o **GitHub**.
2. **Add New → Project** → autoriza a Vercel a aceder ao repo `aellium23/Pediatric`
   e **importa-o**.
3. ⚠️ **Root Directory**: define **`apps/web`** (é um monorepo).
4. ⚠️ **Production Branch**: o código está no branch
   `claude/telepediatria-platform-design-pq1y1v` (o `main` ainda não o tem). Em
   **Settings → Git**, define esse branch como produção — **ou** faz merge do PR #1
   para `main` primeiro.
5. (Opcional) **Environment Variables**: deixa vazio para modo demo; para dados
   reais, define `NEXT_PUBLIC_API_BASE` = URL público da API (ex.: `https://…/api`).
6. **Deploy** → obténs um URL tipo `pedia-web.vercel.app` → abre no Safari.
   - Landing na raiz; lista de pediatras em `/marketplace`.

> **Backend público (para dados reais)**: a Vercel não serve o NestJS+Postgres.
> Para a experiência completa, o backend tem de correr noutro sítio (ex.: Render
> ou Railway, ambos com Postgres gerido e deploy a partir do telemóvel). Diz-me se
> queres que prepare esse deploy do backend — depois é só pôr o URL em
> `NEXT_PUBLIC_API_BASE` na Vercel.

## 🌐 Stack completo online no iPhone — Backend no Render + Web na Vercel

Para teres **dados reais** (não demo) o backend precisa de estar online.
Usamos **Render** para correr o servidor NestJS **e** a base de dados Postgres —
tudo criado e ligado automaticamente pelo `render.yaml` (1 clique, sem copiar
connection strings).

**A) Backend + base de dados no Render (no Safari):**
1. Vai a **render.com** e entra com o **GitHub**.
2. **New → Blueprint** → seleciona o repo `aellium23/Pediatric` e o branch
   `claude/telepediatria-platform-design-pq1y1v`. O Render lê o `render.yaml`.
3. **Apply**. O Render cria o serviço `pedia-backend` **+** a base de dados
   `pedia-db` (free) e liga-os sozinho (gera também os segredos JWT).
4. Espera ~3–5 min. No arranque, cria as tabelas e **semeia** um pediatra
   verificado + um utilizador para cada perfil. Anota o URL:
   `https://pedia-backend-xxxx.onrender.com` — testa `…/docs` (Swagger).

**B) Ligar a Web (Vercel) ao backend:**
5. Vercel → **Settings → Environment Variables** → adiciona
   `NEXT_PUBLIC_API_BASE = https://pedia-backend-xxxx.onrender.com/api` → **Redeploy**.
6. Abre `/marketplace` (dados reais) e **`/demo`** (login → criança → consulta) no
   iPhone. O CORS já está aberto para o ambiente de demo.

### Utilizadores de teste (um por perfil)
Sem password — usa `POST /api/auth/dev-login` com o email (no Swagger, ou a `/demo`
usa o de pai automaticamente):

| Perfil | Email |
|---|---|
| Pai / Encarregado | `marta@demo.pedia` |
| Pediatra (verificado) | `ines@demo.pedia` |
| Clínica — Administrador | `clinica.admin@demo.pedia` |
| Clínica — Staff | `clinica.staff@demo.pedia` |
| Administrador da plataforma | `admin@demo.pedia` |
| Suporte | `suporte@demo.pedia` |
| Finanças | `financas@demo.pedia` |
| Compliance | `compliance@demo.pedia` |

**Como testar cada perfil:**
- **Pai** → na web em **`/demo`** (UI completa: criança + consulta).
- **Pediatra / Clínica / Admin** → no **Swagger** (`…/docs`): `POST /auth/dev-login`
  com o email do perfil → copia o `accessToken` → botão **Authorize** (cola o token)
  → chama os endpoints desse perfil (ex.: pediatra `GET /pediatricians/me/finance`;
  admin/finance `POST /consultations/{id}/refund`).

> **Notas (free tier):** o serviço Render adormece com inatividade — o 1.º pedido
> após pausa pode demorar ~30s (cold start). A base free do Render é temporária
> (válida ~90 dias). **Pagamentos** só funcionam se definires `STRIPE_SECRET_KEY`
> (modo teste). Uploads de ficheiros precisam de credenciais AWS (não essenciais
> para o teste base).

---

# Testing the App locally (com computador)

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
node scripts/db-migrate.js      # apply the versioned migrations
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
