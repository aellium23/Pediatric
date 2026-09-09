# PRODUCT_DECISIONS.md — HOC / Pédia

> Registo de decisões de produto. O propósito deste documento é **fechar
> pontos em aberto** para o piloto e travar a indecisão: cada linha é uma
> decisão tomada, com data e razão, não uma lista de opções.
> Empresa: DES · Ramo: `claude/telepediatria-platform-design-pq1y1v`.
>
> Convenção: cada decisão tem um estado.
> **DECIDIDO** = fechado, não reabrir sem razão nova.
> **PROVISÓRIO** = decidido para o piloto, a rever com dados reais.
> **ADIADO** = conscientemente fora do âmbito do piloto (não é indecisão, é foco).

Última atualização: 2026-07-06.

---

## Princípio orientador (o filtro de todas as decisões abaixo)

> Durante o piloto, o risco do HOC **não é de engenharia — é de mercado.**
> Cada decisão é avaliada por uma pergunta: *isto ajuda 5 pediatras reais e
> 20 famílias reais a transacionar e a ficar?* Se não, é ADIADO.
>
> Esconder ≠ apagar. Nada de código construído é removido. O que não é
> caminho crítico do piloto fica atrás de flag, preservado, pronto a
> reativar quando houver sinal de que faz falta.

---

## 1. Âmbito do piloto — o que ENTRA

**DECIDIDO.** O piloto expõe apenas o caminho crítico de valor:

**Pais (PARENT):**
- Início orientado a ação.
- Consultar pediatras (pesquisa, filtro por especialidade, cartão, perfil).
- Triagem → consulta por **mensagem** e por **vídeo**.
- Chat episódico (fotos clínicas cifradas incluídas).
- Arquivo clínico da criança (crescimento WHO, vacinas, alergias, medicação,
  episódios, linha do tempo, boletim).
- Notificações in-app com deep-link.
- Conta: método de pagamento, NIF opcional, privacidade/RGPD.

**Pediatras (PEDIATRICIAN):**
- Caixa de entrada (prioridade clínica, SLA, por responder/respondidas).
- Responder (com resumo pós-consulta; IA e ditado opcionais).
- Agenda-calendário (mês/semana/dia, vídeo + mensagens, férias, indisponibilidade).
- Ficha do doente (leitura do arquivo clínico por relação de consulta).
- Ganhos (extrato, filtros de período).
- Perfil (serviços, preços, fuso, documentos de credenciação).

**Admin (operador do piloto — o fundador/equipa):**
- KPIs da plataforma.
- Verificação de pediatras.
- Ver/reembolsar consultas.
- Gestão de utilizadores.

**Razão:** este é o loop que gera aprendizagem. Um pai paga, um pediatra
responde, o dinheiro (demo) faz split, o arquivo enche-se. Tudo o resto é
ruído para os primeiros 5 pediatras.

---

## 2. Âmbito do piloto — o que fica ESCONDIDO (flag, não apagado)

**DECIDIDO.** Reativa-se por flag quando houver sinal de necessidade:

| Superfície | Porquê esconder no piloto | Reativar quando |
|---|---|---|
| Painel **Mercado** (região × especialidade) | Precisa de volume real para dizer algo; no piloto os dados são o seed sintético | Houver ≥ algumas centenas de consultas reais |
| **Saber+** (autoria + revisão editorial) | Fluxo editorial completo é operação a mais para 5 pediatras; conteúdo de leitura pode ficar, a autoria não | Houver equipa clínica para curar conteúdo |
| **2ª opinião** (referrals) | Precisa de massa crítica de pediatras para funcionar como rede | O marketplace tiver ≥ dezenas de pediatras ativos |
| **Subscrições** (planos Pro/Free do pediatra) | Monetização de plataforma antes de provar o loop transacional é prematuro | O loop transacional estiver provado |
| Perfis dedicados **FINANCE / SUPPORT / COMPLIANCE / CLINIC** (logins próprios) | Ver decisão #3 | Houver equipa que ocupe esses papéis |

**Como esconder:** flag de cliente por perfil/tab (não remover de `tabsFor`
por código morto — usar uma flag `PILOT_MODE` que filtra a lista de tabs e
esconde os cartões de Home correspondentes). O conteúdo de leitura do Saber+
pode permanecer acessível; o que se esconde é a **autoria + fila de revisão**.

---

## 3. Modelo de perfis (resolve o ponto #27, em aberto há semanas)

**PROVISÓRIO (para o piloto).** Consolidar de 8 papéis operacionais para **4**:

| Papel no piloto | Absorve | Nota |
|---|---|---|
| **PARENT** | — | inalterado |
| **PEDIATRICIAN** | — | inalterado |
| **ADMIN** | FINANCE, SUPPORT, COMPLIANCE | um único login de operador (o fundador/equipa) faz KPIs, verificação, reembolsos, suporte |
| **CLINIC** | CLINIC_STAFF | um único permissionamento de clínica (sem distinção admin/staff no piloto) |

- Os papéis FINANCE/SUPPORT/COMPLIANCE/CLINIC_STAFF **não são apagados** do
  enum `Role` nem do RBAC do backend — continuam a existir e testados.
  Apenas **não têm login dedicado nem entrada no seletor de perfis** do piloto.
- O ecrã de seleção de perfis demo mostra só PARENT / PEDIATRICIAN / ADMIN
  (+ CLINIC se houver clínica no piloto).

**Razão:** dividir responsabilidades por 8 logins só faz sentido com equipa
que ocupe cada papel. No piloto, o operador é uma pessoa. Menos logins =
menos confusão na demo e menos superfície a explicar. A arquitetura granular
fica intacta para quando a equipa crescer.

**A rever:** quando houver contratação de suporte/finanças/compliance.

---

## 4. Pagamentos no piloto

**DECIDIDO.** O piloto corre em **modo demo** (sem `STRIPE_SECRET_KEY`):
- O fluxo completo funciona — start, resposta, captura+split, reembolso —
  sem cobranças reais.
- Isto é adequado e desejável: valida o comportamento (os pais pagam? os
  pediatras respondem a tempo? a garantia de reembolso gera confiança?) **sem**
  esperar por contratos de PSP/faturação.

**ADIADO para pós-piloto (destravar dinheiro real):** chaves Stripe live +
Connect, parceiro de faturação certificada (AT/ATCUD/SAF-T), registo ERS.
Estes são bloqueios de *integração e contrato*, não de código — semanas de
trabalho externo, fora do caminho crítico de aprender se o produto tem tração.

---

## 5. Modelo de disponibilidade e resposta

**DECIDIDO (já implementado, confirmado como definitivo para o piloto):**
- Dois tipos de disponibilidade: **vídeo** (slots) e **mensagens** (janelas).
- Expectativa de resposta honesta calculada pelas janelas do pediatra
  ("resposta prevista até HH:MM") + **garantia SLA** com reembolso automático
  se não houver resposta dentro do prazo.
- Fusos horários: o pediatra tem fuso próprio; as famílias veem horas no fuso
  do dispositivo (sem geolocalização — só `Intl` do dispositivo).

**Razão:** modelo híbrido (janela para expectativa, relógio de parede para
garantia) já validado em conversa. Não reabrir.

---

## 6. Monetização

**PROVISÓRIO.** Comissão de marketplace de **20%** por consulta (plano Free).
Plano **Pro €29/mês com comissão 14%** existe no código mas fica **escondido**
no piloto (ver #2 — subscrições adiadas).

**Razão:** provar primeiro que o loop transacional funciona a 20%. A escada
de planos é uma otimização de take-rate que só faz sentido depois de haver
volume. Números a validar com os pediatras reais do piloto (é 20% aceitável?
o pricing €18 mensagem / €40 vídeo tem procura?).

### 6b. Carteira de créditos — **NÃO**, e porquê

**DECIDIDO (2026-09-09).** Não haverá saldo pré-carregado em euros ou créditos.
O que existe é **inclusão mensal no plano** (o Família inclui 2 consultas por
mensagem) mais **pagamento num toque** para o que passa disso.

**Razão.** A ideia da carteira junta três coisas com respostas opostas, e os
benefícios que se procuram vêm todos das duas últimas:

| | Veredicto |
|---|---|
| (a) Saldo pré-carregado | **Não** |
| (b) Inclusão na subscrição | **Sim** — construído |
| (c) Um toque para o excedente | **Sim** — com métodos guardados (Apple/Google Pay, MB WAY) |

O saldo é a única das três que traz problemas, e traz quatro:

1. **Valor armazenado.** Dinheiro entregue hoje para gastar depois encosta à
   Diretiva da Moeda Eletrónica e à PSD2. Há a *limited network exclusion*
   (art. 3.º(k)), mas obriga a notificar o Banco de Portugal ao ultrapassar
   **1 M€ em 12 meses** (art. 37.º(2)), e fica frágil se o saldo for
   reembolsável em dinheiro.
2. **IVA.** Vender crédito é um adiantamento e cai no regime de *vouchers* de
   finalidade única/múltipla. Como os atos médicos são isentos e a subscrição
   não, uma carteira que compre ambos é de finalidade múltipla — o que obriga
   a refazer o `docs/12-faturacao-portugal.md`, desenhado para faturar por ato.
3. **Saldos por gastar** viram passivo, e a lei do consumidor não gosta de
   crédito que caduque.
4. **O split.** Hoje o dinheiro entra quando a consulta existe e é dividido na
   hora. Com carteira, a plataforma segura fundos que ainda não ganhou.

E há um argumento de produto que pesa tanto como estes: **uma carteira faz o
pai contar créditos no momento em que devia estar a pensar no filho.**

**Quando reavaliar:** se vendermos *packs* por razões de tesouraria, ou se
houver **B2B2C** (empregador ou seguradora compra crédito para os
colaboradores) — aí a carteira é o produto e o trabalho regulatório
justifica-se.

**Nota de âmbito:** esta é a terceira exceção ao congelamento (#9), depois da
instrumentação e do cofre. Fica registada para o congelamento continuar a
significar alguma coisa.

---

## 7. Idiomas e mercado do piloto

**DECIDIDO.** Piloto em **Portugal**, interface **PT** (EN/ES permanecem
100% localizados e testados, mas o mercado-alvo do piloto é PT). Fusos já
suportam Açores/Madeira/expansão futura sem trabalho adicional.

**ADIADO:** ativação comercial em Espanha / Angola / diáspora — depende de
tração no piloto PT.

---

## 8. Instrumentação (a ÚNICA coisa nova permitida durante o freeze)

**DECIDIDO.** Adicionar **event tracking mínimo** do funil:
pesquisa → abrir perfil → triagem → enviar/marcar → resposta → fecho → avaliação.

**Razão:** é a exceção justificada ao congelamento funcional. Sem isto, o
piloto gera opinião mas não dados. É o que permite decidir *com sinal* as
simplificações de Home/dashboard (que ficam ADIADAS até haver estes dados —
não simplificar por intuição).

---

## 9. O que fica CONGELADO (functional freeze, 6 semanas)

**DECIDIDO.** Durante o piloto, **nenhum scope novo**:
- ❄️ Vídeo no chat (fase 2 / S3).
- ❄️ Apps nativas (Flutter fica onde está; web PWA serve o piloto).
- ❄️ Novas features de qualquer perfil.
- ❄️ Gamificação, novos tipos de consulta, novos painéis.

**NÃO é freeze (é o trabalho do piloto):**
- ✅ Corrigir bugs e fricções reais reportados por pediatras/famílias do piloto.
- ✅ Event tracking (#8).
- ✅ Esconder/reativar por flag (#2, #3).
- ✅ Documentação (este doc, LAUNCH_READY, guias de piloto).

**Regra de arbitragem:** se um pediatra real do piloto abandona por causa
disto → não é freeze, corrige. Se é uma ideia sem utilizador a pedir → é
freeze, anota no backlog e segue.

---

## 10. Decisões técnicas de produção conscientemente ADIADAS

Documentadas para não serem esquecidas nem confundidas com "está pronto para
faturar". Nenhuma bloqueia o piloto em modo demo:

- **Backups de BD** — nenhum configurado; BD demo é reconstituível por seed.
  Necessário antes de dados reais de pacientes.
- ~~**Migrations**~~ — **feito (2026-09-09)**: migrations versionadas em
  `apps/backend/prisma/migrations`, aplicadas no arranque por
  `scripts/db-migrate.js`, com o CI a falhar se derivarem do `schema.prisma`.
- **APM/observabilidade** — logs stdout + métricas in-memory; Sentry/OTel
  antes de produção real.
- **Scan de malware nos uploads** — `scanStatus` fica `pending`; necessário
  antes de aceitar ficheiros de utilizadores reais em escala.
- **Challenge WebAuthn** vinculado a sessão server-side — antes de passkeys
  em produção.
- **dev-login + CORS aberto** — só em demo; desligar em produção real.

---

## Registo de alterações a este documento

| Data | Decisão | Estado |
|---|---|---|
| 2026-07-06 | Criação — âmbito do piloto, perfis→4, freeze de 6 semanas, instrumentação como única exceção | inicial |
