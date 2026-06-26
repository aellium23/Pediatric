# 26 · AI Scribe — resumo automático da consulta de vídeo (funcionalidade planeada)

> **Estado: planeado (não implementado).** Documento de arquitetura e requisitos.
> Não ativa nada. Depende de credenciais (LLM/STT) e de processo legal
> (consentimento, DPA, DPIA). Ver legenda em `docs/24`.

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
