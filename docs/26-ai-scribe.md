# 26 · AI Scribe — resumo automático da consulta de vídeo

> ## ⚠️ Precedência — a Via B foi **decidida contra** a 2026-09-09
>
> **Via A (ditado) e a estruturação SOAP por LLM estão feitas e ficam.** Secções
> 0 e 0b descrevem código em produção.
>
> **Via B — transcrição ambiente de toda a consulta — não vai ser construída.**
> As secções 1 a 7 abaixo são um plano de implementação que **já não está em
> vigor**; ficam como referência técnica de *como se faria*, e como a lista de
> bloqueadores que teriam de ser levantados. Não são trabalho por fazer.
>
> **Porquê:** escribas de IA ambientais tornaram-se *commodity* — até 90% dos
> médicos em instituições de topo já os usam, há mais de 50 fornecedores, e a
> Epic, a Oracle Health, a athenahealth e a Meditech integraram-nos no core. Não
> há vantagem competitiva a construir aqui, e o que a Via B custaria (agente
> LiveKit, STT europeu com DPA, ecrã de consentimento próprio, DPIA, política de
> retenção, avaliação de fidelidade clínica) é grande e é todo em regulação e
> integração, não em produto.
>
> A vantagem do HOC está no **registo**, não na nota da consulta. Decisão
> registada em [`../PRODUCT_DECISIONS.md`](../PRODUCT_DECISIONS.md) §9c, com as
> condições escritas para reabrir; origem em
> [`strategy/03-revisao-mercado-roadmap.md`](strategy/03-revisao-mercado-roadmap.md)
> §1 e §6 (proposta nº 10).

## 0. Via A — ditado de voz da nota (implementado)
No editor de resumo da consulta, o pediatra carrega em **"🎙️ Ditar nota"** e
fala; o texto é transcrito pela **Web Speech API do browser** e acrescentado ao
rascunho editável, que o pediatra revê e **guarda no campo cifrado** já
existente. É voz-para-texto da nota do próprio médico (equivalente a escrever) —
barreira legal baixa, sem chave de API. Limitações honestas: a transcrição usa o
serviço de voz do browser (ex.: Chrome → Google), pelo que o **texto ditado é
processado por esse serviço**; para produção, trocar por um STT europeu com DPA.
Frontend-only; degrada com elegância se o browser não suportar.

## 0b. Estruturação SOAP por LLM (implementado)
Para além do ditado, há já uma passagem **LLM real** (`AiService` →
`POST /consultations/:id/summary/structure`, botão "✨ Estruturar com IA"):
pega na nota ditada/escrita e, com o **Claude** (default `claude-haiku-4-5`),
corrige os termos de transcrição a partir do contexto e organiza em SOAP — **sem
inventar factos**. Chamada server-side (a chave nunca chega ao browser, timeout
de 30s, só regista o status/erro da Anthropic, nunca o corpo); o pediatra **revê
antes de guardar**. Ativa com `ANTHROPIC_API_KEY`; sem ela responde 503.
Enviar texto clínico a um LLM é processamento de dados de saúde → produção exige
**DPA + residência UE + consentimento**.

A secção seguinte descreve a **Via B** (transcrição **ambiente** de toda a
consulta — captar o áudio em direto + STT + LLM), ainda planeada.

## 1. Objetivo
Durante uma consulta de vídeo, captar o áudio, transcrever e gerar um **rascunho
de resumo clínico (SOAP)** que o pediatra **revê e edita antes de guardar**. É o
padrão de *ambient clinical documentation* / "AI scribe" (ex.: Nuance DAX,
Abridge, Nabla), associado na literatura a redução da carga de documentação e a
mais tempo de contacto clínico.

## 2. Encaixe no que já existe
A plataforma já tem as duas peças finais do fluxo:
- **Resumo pós-consulta cifrado** — campo `Consultation.summary` (AES-256-GCM),
  endpoints `GET/POST /consultations/:id/summary` (pediatra escreve; ambos leem).
- **Rascunho SOAP determinístico** — `genDraft()` na web (a partir da triagem).

O scribe **substitui a fonte do rascunho**: em vez da triagem, usa a transcrição
real da consulta. O destino (campo cifrado, revisão do pediatra) **não muda**.

## 3. Arquitetura proposta
```
Consulta de vídeo (LiveKit room)
  └─ Agente LiveKit (server-side, opt-in por consulta)
       ├─ capta faixas de áudio da sala
       ├─ STT (speech-to-text) em streaming  ──► transcrição (efémera)
       └─ no fim: LLM compõe rascunho SOAP    ──► POST rascunho (não publicado)
                                                   │
Pediatra revê/edita ──► Api.setSummary() ──► Consultation.summary (cifrado)
```
- **Port hexagonal**: definir `ScribePort` (interface) com implementações
  trocáveis (STT provider, LLM provider), à imagem dos ports já existentes
  (Stripe/LiveKit/Notification). Sem lock-in.
- **Transcrição efémera**: não persistir o áudio; a transcrição só existe o
  tempo necessário para gerar o rascunho e é apagada (retenção mínima).
- **Human-in-the-loop**: o rascunho **nunca** é guardado como resumo final sem
  ação explícita do pediatra. Marcação visível "gerado por IA — rever".

## 4. Requisitos de compliance (bloqueadores antes de ativar) ⚖️🔑
1. **Consentimento explícito e específico** (pais/tutor; e o adolescente quando
   aplicável) para **gravação/transcrição** e **processamento por IA** — ecrã
   próprio, versionado, antes de iniciar a captação. Reutilizar o modelo de
   `Consent`/`ConsentSubject` já existente, com um novo *subject* dedicado.
2. **DPA** com os fornecedores de STT e LLM + **residência de dados na UE**
   (preferir fornecedores/endpoints europeus; sem treino do modelo com os dados).
3. **DPIA** (avaliação de impacto sobre proteção de dados) — dados de saúde de
   categoria especial (RGPD art. 9; enquadrar com EHDS).
4. **Política de retenção** da transcrição e do rascunho (minimização).
5. **Segurança**: cifra em trânsito e em repouso; segredos só em variáveis de
   ambiente; logs sem conteúdo clínico.
6. **Qualidade/segurança clínica**: rascunho sempre revisto; aviso de risco de
   alucinação; idealmente avaliação da fidelidade do resumo antes de ir a produção.

## 5. Distinção importante
Isto é **diferente** do *"Agent observability"* do LiveKit (telemetria de
debugging que capta áudio/transcrições sem propósito clínico) — esse deve ficar
**Disabled**. O scribe é uma funcionalidade **intencional e consentida**.

## 6. Passos de implementação (quando avançar)
1. `ScribePort` + adapters (STT, LLM) atrás de chaves 🔑.
2. Agente LiveKit (server) que entra na sala só quando há consentimento ativo.
3. Ecrã de **consentimento de gravação/IA** (web) antes de iniciar o vídeo.
4. Endpoint para receber o rascunho gerado (estado "rascunho", não publicado).
5. UI: o rascunho aparece no editor de resumo já existente, marcado "IA — rever".
6. Retenção/apagamento automático da transcrição.
7. DPIA + DPA assinados; ativar por *feature flag*.

## 7. Referências
- Weed LL. *Medical records that guide and teach.* N Engl J Med. 1968 (estrutura SOAP).
- Literatura sobre *ambient clinical documentation / AI scribes* e redução da
  carga documental do clínico (rever evidência atual antes de produção).
- RGPD art. 9 (dados de categoria especial); enquadramento EHDS.
