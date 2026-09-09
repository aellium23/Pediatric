# LAUNCH_READY.md — Checklist de piloto HOC / Pédia

> Checklist para pôr **o piloto** a correr — não a produção comercial com
> dinheiro real. Objetivo: 5 pediatras reais + 20 famílias reais a
> transacionar em **modo demo/controlado**, para aprender se o produto tem
> tração antes de destravar Stripe/faturação/ERS.
>
> Empresa: DES · Ramo: `claude/telepediatria-platform-design-pq1y1v`.
> Decisões de âmbito: ver `PRODUCT_DECISIONS.md`. Estado factual: ver
> `CURRENT_PRODUCT_STATUS.md`. Deploy/handover: ver `DEPLOY-DEMO.md`.

Última atualização: 2026-07-06.

---

## Como ler esta checklist

- `[ ]` por fazer · `[x]` feito · `[~]` parcial/em curso.
- **Bloqueante** = o piloto não arranca sem isto.
- **Importante** = deve estar antes de convidar utilizadores externos.
- **Bom-ter** = melhora o piloto, não o bloqueia.

O piloto é deliberadamente **modo demo**: pagamentos simulados, sem
faturação certificada, sem envio de email/SMS. Isto é uma escolha (ver
`PRODUCT_DECISIONS.md` #4), não uma lacuna.

---

## A. Produto — o caminho crítico funciona (Bloqueante)

O loop de valor tem de correr ponta-a-ponta num ambiente novo:

- [ ] Um pai regista-se/entra e cria uma criança (com consentimento de dados de saúde).
- [ ] O pai encontra um pediatra, faz triagem e **envia uma pergunta** (consulta por mensagem).
- [ ] O pediatra vê na caixa, **responde**, e a consulta passa a ANSWERED.
- [ ] O pediatra **fecha** a consulta → captura + split (modo demo) → extrato de ganhos atualiza.
- [ ] O pai **marca uma videoconsulta** num slot e a sala abre (token demo).
- [ ] A **garantia de reembolso** dispara: consulta sem resposta dentro do SLA → reembolso automático.
- [ ] O **arquivo clínico** da criança mostra crescimento (curvas WHO), vacinas, alergias, medicação; boletim imprime.
- [ ] O pediatra vê a ficha do doente (por relação de consulta) em leitura.
- [ ] Notificações in-app com deep-link chegam de ambos os lados.

> Verificação rápida: seguir o §4 da checklist pós-deploy em `DEPLOY-DEMO.md`.

---

## B. Simplificação para o piloto (Importante — ver PRODUCT_DECISIONS #2, #3)

Esconder o ruído sem apagar código:

- [ ] Introduzir flag **`PILOT_MODE`** (cliente) que:
  - [ ] Reduz o seletor de perfis a PARENT / PEDIATRICIAN / ADMIN (+ CLINIC se aplicável).
  - [ ] Filtra `tabsFor` para esconder: Mercado, autoria Saber+ / fila de revisão, 2ª opinião, subscrições.
  - [ ] Esconde os cartões de Home que apontam para superfícies escondidas.
- [ ] ADMIN único absorve FINANCE/SUPPORT/COMPLIANCE (sem logins dedicados no piloto).
- [ ] Conteúdo de **leitura** do Saber+ pode ficar; **autoria** fica escondida.
- [ ] Confirmar que nada escondido deixa um botão/deep-link órfão a apontar para tab inexistente.

> Nota: isto é filtragem de UI. O RBAC do backend e os testes dos papéis
> permanecem intactos.

---

## C. Instrumentação mínima (Importante — a única feature nova no freeze)

- [ ] Registar eventos do funil: `search`, `open_profile`, `triage_start`,
      `message_sent`, `video_booked`, `answered`, `closed`, `rated`,
      `refund_auto`.
- [ ] Cada evento com: papel, timestamp, id de consulta/pediatra (sem PII clínica).
- [ ] Um sítio simples para ler os eventos (tabela admin ou export) — não
      precisa de dashboard bonito, precisa de ser legível.

> Porquê: sem isto o piloto dá opinião, não dados. É o que alimenta as
> simplificações de Home/dashboard **depois** (não antes — ver #8 das decisões).

---

## D. Ambiente e operação (Bloqueante para arrancar)

- [ ] Backend a correr (Render ou equivalente) com `GET /health` = ok.
- [ ] Frontend a apontar ao backend (`NEXT_PUBLIC_API_BASE`).
- [ ] Segredos **novos** gerados no ambiente (JWT, `FIELD_ENCRYPTION_KEY`) — nunca reutilizar.
- [ ] `CORS_ORIGINS` restrito à origem do frontend do piloto.
- [ ] **`ENABLE_DEV_LOGIN` — o portão nº 1.** Hoje o `render.yaml` tem
      `NODE_ENV=production` **e** `ENABLE_DEV_LOGIN=true`. Verificado por HTTP
      numa réplica local: qualquer pessoa que saiba o URL pede um token com o
      papel que quiser e lê o painel de administração (métricas + lista
      completa de utilizadores). Hoje os dados são sintéticos, por isso o
      impacto está contido — mas isto tem de mudar **antes da primeira família
      real**. Decisão a tomar:
  - [ ] Piloto com pessoas reais → **desligar** dev-login e usar Apple/Google
        (exige client IDs) **ou** pôr a app atrás de proteção de acesso da
        plataforma (ex.: password protection da Vercel).
  - [ ] Demo comercial com dados sintéticos → manter, sabendo que é público.
  - Já mitigado no código (não substitui a decisão acima): o dev-login está
    limitado a 10 pedidos/min e, com `NODE_ENV=production`, deixou de criar
    contas novas — só emite tokens para personas que já existem, pelo que
    ninguém pode poluir a base de utilizadores.
- [ ] Seed corrido: contas e dados de demonstração presentes.
- [ ] Plano de **cold-start** confirmado (Render free dorme; keep-alive do cliente mitiga, mas testar a 1ª chamada da manhã).

---

## E. Confiança e conformidade mínimas (Importante)

O piloto lida com dados de saúde reais de crianças reais — mesmo em modo demo
de pagamentos, isto **não** é negociável:

- [ ] Cifra de campos clínicos ativa (`FIELD_ENCRYPTION_KEY` real, 32 bytes).
- [ ] Consentimentos (Termos, Privacidade, dados de saúde) apresentados e registados.
- [ ] Exportação RGPD e apagar conta funcionam.
- [ ] Texto claro aos utilizadores do piloto: **"ambiente de piloto,
      pagamentos simulados, sem cobranças reais"** — para gerir expectativas.
- [ ] Aviso de que a faturação certificada AT ainda não está ativa (sem
      faturas legais no piloto).
- [ ] **Backup manual da BD** definido (mesmo que só `pg_dump` agendado à
      mão) — a partir do momento em que há dados clínicos reais, mesmo de
      piloto, não podem depender só do seed. Passos concretos:
  - [ ] Ativar backups do plano pago do Postgres no Render (o plano gratuito
        não os tem) **ou** agendar `pg_dump` diário para armazenamento fora
        do Render.
  - [ ] **Testar um restauro** — um backup que nunca foi restaurado não é um
        backup.
  - [ ] Guardar o `FIELD_ENCRYPTION_KEY` num cofre à parte: sem essa chave, um
        dump restaurado tem os dados clínicos ilegíveis.
- [ ] **Migrations em vez de `prisma db push`** antes de existirem dados a
      preservar. Enquanto o arranque correr `db push`, uma alteração de schema
      pode destruir colunas sem aviso. Passo: `npx prisma migrate dev --name
      init` a partir do schema atual, e trocar o comando de arranque para
      `prisma migrate deploy`.

> Nota honesta: backups automáticos, migrations versionadas, APM, scan de
> malware e faturação certificada ficam para **antes de produção comercial**
> (ver `PRODUCT_DECISIONS.md` #10). Não bloqueiam o piloto, mas o backup
> manual da BD passa a ser obrigatório assim que entram dados reais.

---

## F. Recrutamento do piloto (Bloqueante — é o verdadeiro trabalho)

O produto está pronto; o piloto depende de pessoas reais:

- [ ] **5 pediatras** identificados e comprometidos (credenciais verificáveis).
- [ ] Cada pediatra com perfil configurado: serviços, preços, janelas de
      mensagens, slots de vídeo, fuso.
- [ ] **~20 famílias** convidadas (canal definido: rede dos pediatras? diáspora? grupo fechado?).
- [ ] Guião de onboarding para pediatra (como responder, o que é o SLA, como funciona o extrato).
- [ ] Guião de onboarding para família (como fazer a 1ª pergunta, o que está incluído, a garantia).
- [ ] Canal de feedback direto (WhatsApp/email do fundador) para captar fricções em tempo real.

---

## G. Critérios de sucesso do piloto (definir ANTES de começar)

Sem isto, o piloto gera anedotas em vez de decisão. Propostas (editar):

- [ ] **Ativação:** ≥ 70% das famílias convidadas fazem ≥ 1 consulta.
- [ ] **Resposta:** ≥ 90% das mensagens respondidas dentro do SLA.
- [ ] **Repetição:** ≥ 30% das famílias fazem ≥ 2 consultas em 6 semanas.
- [ ] **Confiança:** ≥ 1 avaliação por consulta fechada; média ≥ 4/5.
- [ ] **Retenção do lado da oferta:** ≥ 4 dos 5 pediatras continuam ativos ao fim de 6 semanas.
- [ ] **Sinal qualitativo:** ≥ 3 pediatras dizem que recomendariam / continuariam pagando 20% de comissão.

> Se estes números aparecem → destravar Stripe/faturação/ERS e escalar.
> Se não → a aprendizagem está no *porquê*, e isso vale mais do que features novas.

---

## H. Custo da IA (antes de activar a chave)

As camadas de IA (assistente da Home, resumo de handover, estruturação SOAP)
chamam uma API paga. Sem chave, degradam em silêncio e não custam nada.

- [x] Limite dedicado nos endpoints de IA — 20 pedidos/min, separado do balde
      genérico de 100/min que protege leituras baratas. Verificado por HTTP.
- [ ] Confirmar saldo/limites de gasto na conta Anthropic antes do piloto (o
      erro "credit balance too low" já apareceu uma vez).
- [ ] Definir um tecto de gasto mensal aceitável e como o vigiar.

---

## Estado geral

| Bloco | Estado | Nota |
|---|---|---|
| A. Caminho crítico funciona | [~] | 44 testes E2E verdes contra Postgres real; falta validar no ambiente do piloto |
| B. Simplificação `PILOT_MODE` | [ ] | por implementar |
| C. Instrumentação | [ ] | por implementar (exceção autorizada ao freeze) |
| D. Ambiente/operação | [~] | Render/Vercel prontos; **decisão do dev-login é o portão nº 1** |
| E. Confiança/conformidade | [~] | cifra verificada (ciphertext em repouso); falta backup + migrations + textos |
| F. Recrutamento | [ ] | o verdadeiro gargalo — pessoas, não código |
| G. Critérios de sucesso | [ ] | definir e fixar antes de arrancar |
| H. Custo da IA | [~] | limites aplicados; falta tecto de gasto |

### Verificado nesta análise E2E (setembro 2026)

Executado contra Postgres real e servidor a correr, não por leitura de código:

- 345 testes unitários + 44 E2E verdes; typecheck e build (web e backend) verdes.
- Fotos no chat: 3 anexos / 1,26 MB aceites, **cifrados em repouso** e
  decifrados na leitura; acima do limite devolve 413 legível (era 500).
- Detector de sinais de alarme: **corrigido** — falhava 5 de 20 frases reais de
  emergência (incluindo "não está a respirar"); agora 20/20, sem falsos alarmes
  em 14 frases-armadilha, e protegido por 52 testes no CI do frontend.
- RBAC dos endpoints de IA correto (403 para pediatra, 401 anónimo).

**Dívida conhecida, não resolvida:** o backend não tem `package-lock.json`
versionado (o frontend tem), pelo que o CI resolve versões novas a cada build.
Fixá-las é desejável, mas deve ser feito conferindo primeiro o que a produção
tem instalado — para o próximo deploy não trocar dependências sem querer.

---

*Este documento é vivo. Atualizar os checkboxes à medida que o piloto avança.*
