# 06 · Funcionalidades Detalhadas

Mapeamento dos blocos A–H do briefing, com regras e estados.

---

## A. Comunicação clínica segura

- **Chat pais ↔ pediatra** com histórico completo, pesquisável.
- **Anexos**: imagens, vídeos, PDFs, análises, receitas, relatórios. Limites de tamanho/tipo; pré-visualização; vírus-scan.
- **Organização por criança e por episódio clínico**: cada mensagem está sempre associada a uma `Child` e pode ser ligada a um `ClinicalEpisode`.
- **Marcar conversa como "episódio clínico"**: agrupa mensagens, anexos, notas e consulta(s) num caso (ex.: "Otite — Junho 2026").
- **Estados da conversa/consulta**: `aberta → em_triagem → respondida → encerrada → arquivada` (+ `expirada` se SLA falha, `reembolsada`).
- **Resumos automáticos** (AI administrativa) que o pediatra **revê e valida** antes de constar no registo. Nunca diagnóstico autónomo.
- **Avisos de não-emergência**: banner persistente + interstitial na triagem; botão "Isto é uma emergência?" que mostra **SNS 24 (808 24 24 24)** e 112.
- **Encriptação** em trânsito e repouso; mensagens imutáveis após envio (apenas "apagar para mim" não altera registo clínico/legal).

## B. Consultas pagas por mensagem

- Pai escolhe pediatra → vê **preço, SLA (tempo estimado), âmbito do serviço** e o que **não** está incluído.
- **Pré-pagamento ou autorização** (hold) antes de enviar a questão.
- Pediatra recebe a questão (com triagem estruturada e anexos) e responde **dentro do SLA**.
- **Produtos**: consulta única, **pacote de mensagens** (N mensagens / janela), **follow-up 24/48/72h**, **subscrição**.
- **SLA & garantia**: se o pediatra não responder no prazo → **reembolso automático** ou reatribuição (com consentimento).
- **Encerramento**: pediatra encerra com resumo + recomendações; pai pode reabrir dentro de janela definida (ex.: 48h) sem novo custo (regra configurável).

## C. Videochamada

- **Agendamento** por disponibilidade do pediatra; integração com calendário (ICS/Google/Apple).
- **Pagamento no momento da marcação**.
- **Sala de espera virtual**; verificação de dispositivo (câmara/micro).
- **Consentimento informado** para teleconsulta antes de entrar.
- **Anexos** antes/durante/depois.
- **Notas clínicas** do pediatra; **resumo pós-consulta** enviado ao pai.
- Vídeo **healthcare-grade** (encriptado, sem gravação por defeito; gravação só com duplo consentimento e base legal — provavelmente **não** no MVP).

## D. Agenda e disponibilidade

- Pediatra define **horários, duração, buffers, indisponibilidades**, tipos de consulta por slot.
- Pais escolhem slot disponível (fuso horário correto).
- **Lembretes**: push, SMS, email, WhatsApp (se consentido e via Business API compliant).
- **Reagendamento/cancelamento** com regras configuráveis (janelas, taxas de no-show).

## E. Pagamentos e monetização
Ver [doc 11 — Fluxos de Pagamento](11-fluxos-pagamento.md). Resumo:
- Início por Portugal; **Stripe Connect vs SIBS** (split).
- Métodos: **MB WAY, cartão, Apple Pay, Google Pay, Multibanco**.
- Comissão retida; restante pago ao pediatra; modelos %/fixo/plano/híbrido/destaque.
- Reembolsos, chargebacks, cancelamentos, no-shows, disputas.

## F. Faturação e fiscalidade
Ver [doc 12 — Faturação Portugal](12-faturacao-portugal.md). Resumo:
- Modelo compliant AT: NIF, **ATCUD**, **QR Code**, **SAF-T**; software certificado.
- Separar **valor da consulta médica** vs **comissão da plataforma**; **IVA/isenção** a validar.
- Arquitetura fiscal escalável por país.

## G. Compliance, legal e saúde
Ver [doc 13](13-riscos-legais.md) e [doc 14](14-seguranca-privacidade.md).

## H. Funcionalidades úteis adicionais

| Funcionalidade | Descrição | Fase |
|---|---|---|
| **Triagem estruturada** | Sintomas, idade, febre, duração, sinais de alarme, anexos → organiza a questão (administrativa, não diagnóstica) | 1 |
| **Sinais de alerta** | Regras que recomendam **urgência/SNS 24**; nunca bloqueiam mas avisam | 1 |
| **Perfil de saúde da criança** | Alergias, medicação, doenças, médico habitual | 1 |
| **Plano de vacinação** | Calendário PNV; lembretes | 2 |
| **Lembretes de medicação** | Doses/horários | 2 |
| **Crescimento (percentis)** | Peso, altura, perímetro cefálico, curvas OMS | 2 |
| **Biblioteca de conteúdos** | Artigos validados por pediatras | 2/3 |
| **Partilha segura de histórico** | Com outro pediatra (consentida, com expiração) | 2/3 |
| **Segunda opinião** | Produto de consulta dedicado | 2 |
| **Pediatra favorito** | Acesso rápido ao médico de confiança | 1 |
| **Marketplace de pediatras** | Diretório com filtros (idioma, preço, especialidade, rating) | 1 |
| **Avaliações verificadas** | Só após consulta concluída | 1 |
| **Subscrição familiar** | Pacotes/descontos | 3 |
| **Programa de clínicas** | B2B2C | 3 |
| **Integração com seguradoras** | Parcerias | 3 |
| **Assistente AI administrativo** | Resumo, organização, triagem administrativa — **sempre com validação médica** | 3 |

### Princípios para a AI (crítico para não ser dispositivo médico)
- A AI **nunca** dá diagnóstico, prescrição ou decisão clínica autónoma.
- Usos permitidos: **resumir** conversas, **estruturar** a triagem administrativa, **organizar** ficheiros, **sugerir rascunhos** de resumo que o médico edita/aprova, **detetar palavras-chave de alarme** para mostrar avisos de segurança (encaminhamento, não diagnóstico).
- Toda a saída AI é **claramente identificada** e requer **ação humana** do pediatra antes de ter valor clínico.
- Ver implicações regulatórias no [doc 13](13-riscos-legais.md).
