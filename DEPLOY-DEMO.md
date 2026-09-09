# HOC — Backup do projeto e deploy em modo demo

Guia de handover para colocar a versão atual em demonstração noutra
infraestrutura. O ramo com a versão atual é
`claude/telepediatria-platform-design-pq1y1v`.

---

## 1. Fazer o backup / entregar o código

**Opção A — acesso direto (recomendada):** adicionar a equipa como
colaboradores do repositório GitHub (Settings → Collaborators). É a única
opção que preserva histórico E permite receber atualizações futuras.

**Opção B — clone espelho (backup completo, offline):**
```bash
git clone --mirror https://github.com/aellium23/Pediatric.git pediatric-backup.git
# entrega a pasta pediatric-backup.git (contém TODO o histórico e ramos);
# a equipa restaura com:
git clone pediatric-backup.git pediatric
cd pediatric && git checkout claude/telepediatria-platform-design-pq1y1v
```

**Opção C — bundle (um único ficheiro, fácil de enviar):**
```bash
git clone https://github.com/aellium23/Pediatric.git
cd Pediatric
git bundle create hoc-demo.bundle claude/telepediatria-platform-design-pq1y1v
# a equipa restaura com:
git clone hoc-demo.bundle -b claude/telepediatria-platform-design-pq1y1v pediatric
```

**Opção D — ZIP sem histórico (só o snapshot):** GitHub → Code → Download
ZIP (com o ramo selecionado), ou `git archive`. Serve para demo, mas perde
o histórico.

> Para marcar este momento: criar uma tag/release no GitHub
> (`git tag demo-v1 && git push origin demo-v1`) — a equipa sabe exatamente
> que versão recebeu.

**O que NUNCA entra no backup:** segredos. O repositório não contém chaves
(verificado); as chaves de produção (base de dados, JWT, cifra) vivem só na
infraestrutura. A equipa gera as suas próprias (ver §3).

---

## 2. O que é o "modo demo"

- **Sem Stripe:** sem `STRIPE_SECRET_KEY`, os pagamentos correm em modo
  demo (sem cobranças reais) — o fluxo completo funciona, incluindo
  reembolsos.
- **Login de demonstração:** `ENABLE_DEV_LOGIN=true` ativa o
  `POST /api/auth/dev-login` e o ecrã de escolha de perfis na app.
  **Nunca ativar num ambiente de produção real.**
- **Dados de demonstração:** o seed (corre no arranque) cria pediatras,
  famílias, crianças com histórico clínico, consultas e artigos Saber+.
  Contas: `marta@demo.pedia` (mãe), `ines@demo.pedia` (pediatra),
  `admin@demo.pedia`, etc. — ver `apps/backend/prisma/seed.ts`.

---

## 3. Pôr a correr noutra infraestrutura

### Caminho 1 — Docker Compose (mais rápido, qualquer VM)
Requisitos: Docker + Docker Compose.
```bash
cd pediatric
docker compose up -d        # Postgres 16 + backend
cd apps/web
cp .env.example .env.local 2>/dev/null || true
# NEXT_PUBLIC_API_BASE=http://localhost:3000/api
npm install && npm run build && npm start   # ou `npm run dev`
```

### Caminho 2 — Render + Vercel (réplica do ambiente atual)
1. **Backend:** Render → New → Blueprint → apontar ao repositório/ramo.
   O `render.yaml` cria o serviço Node + Postgres gerido, gera segredos
   novos automaticamente, aplica o schema e o seed no arranque.
2. **Frontend:** Vercel → Import project → root `apps/web` →
   env `NEXT_PUBLIC_API_BASE=https://<serviço>.onrender.com/api`.
3. No Render, definir `CORS_ORIGINS=https://<app>.vercel.app`.

### Caminho 3 — infraestrutura própria (qualquer host Node)
Requisitos: Node 22+, PostgreSQL 15+.
```bash
# Backend
cd apps/backend
cp .env.example .env        # editar: DATABASE_URL, segredos NOVOS (ver abaixo)
npm install && npx prisma generate && npm run build
node scripts/db-migrate.js && npm run seed   # aplica migrations versionadas
node dist/main.js           # (ou dist/src/main.js)

# Frontend
cd apps/web
NEXT_PUBLIC_API_BASE=https://api.exemplo.com/api npm run build && npm start
```

**Variáveis obrigatórias do backend** (gerar valores novos por ambiente):
| Variável | Nota |
|---|---|
| `DATABASE_URL` | Postgres do ambiente |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | `openssl rand -hex 32` |
| `FIELD_ENCRYPTION_KEY` | exatamente 32 bytes — `openssl rand -hex 16` |
| `ENABLE_DEV_LOGIN` | `true` só em demo |
| `CORS_ORIGINS` | origem(ns) do frontend |

As restantes (`STRIPE_*`, `AWS_*`, Apple/Google) ficam por preencher em
demo — os módulos degradam graciosamente.

---

## 4. Checklist de verificação pós-deploy

1. `GET /health` responde `ok`.
2. A app abre e o ecrã de perfis demo aparece (dev-login ativo).
3. Entrar como mãe (`marta@demo.pedia`) → Início mostra crianças e
   consultas; como pediatra (`ines@demo.pedia`) → caixa de entrada e
   agenda com disponibilidade.
4. Criar uma consulta de mensagem e responder do outro lado (pagamento em
   modo demo).
5. Trocar idioma (PT/EN/ES) e tema (claro/escuro) nas definições.

## 5. Notas de segurança para a equipa

- Segredos **novos por ambiente**; nunca reutilizar os de produção.
- `ENABLE_DEV_LOGIN` desligado fora de demos.
- A base de dados demo contém apenas dados fictícios do seed; não importar
  dados reais para ambientes de demonstração.
