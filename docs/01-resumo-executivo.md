# 01 · Resumo Executivo

> **Precedência — posicionamento substituído.** Este resumo descreve o
> blueprint do MVP como *marketplace de telepediatria*. O posicionamento em
> vigor é o **Child Health OS** — o registo de saúde da criança, com a
> telepediatria como *um serviço* dentro dele — e a receita é ancorada na
> subscrição Family Premium, não na comissão. Ver
> [`strategy/00-child-health-os-relatorio-conselho.md`](strategy/00-child-health-os-relatorio-conselho.md)
> e o [índice de precedência](README.md). O resto deste documento (produto,
> tipos de consulta, perfis) mantém-se válido.

## A tese em três frases

Os pais já consultam pediatras informalmente por mensagem — milhares de vezes por dia, em Portugal — mas esse trabalho é invisível, desorganizado, não remunerado e juridicamente exposto. **Pédia** estrutura essa relação num produto digital seguro e compliant, em que cada interação clínica tem âmbito definido, preço, SLA, registo e fatura. A plataforma cobra uma comissão de marketplace sobre consultas pagas e constrói receita recorrente via subscrições familiares e planos para pediatras e clínicas.

## O produto

Uma app **mobile-first** (iOS + Android) e web, com três perfis:

- **Pais/Encarregados** — perfil familiar, arquivo clínico por criança, escolha de pediatra, consultas pagas, agendamento, histórico.
- **Pediatras** — perfil profissional verificado, agenda, pricing por tipo de consulta, dashboard financeiro, ferramentas clínicas e de resumo.
- **Administrador/Plataforma** — validação de pediatras, gestão de comissões e pagamentos, faturação, relatórios, moderação e suporte.

### Tipos de consulta (produtos monetizáveis)
1. Consulta por **mensagem** (chat com SLA).
2. Consulta **assíncrona** (envio de questão + anexos, resposta estruturada).
3. **Videochamada** agendada.
4. **Segunda opinião**.
5. **Renovação de receita**.
6. **Follow-up** 24/48/72h.
7. **Subscrição familiar** (acesso continuado, pacotes de mensagens).
8. **Planos para clínicas**.

## Como ganha dinheiro

| Fonte de receita | Descrição |
|---|---|
| Comissão por consulta | % (ex.: 15–25%) sobre o valor cobrado por consulta |
| Fee fixo por transação | Componente fixa (ex.: 0,30–0,50 €) opcional/híbrida |
| Subscrição familiar | Mensalidade que dá acesso a pacotes/descontos |
| Plano de pediatra | Mensalidade para acesso a ferramentas premium / menor comissão |
| Destaque no marketplace | Posicionamento pago no diretório |
| Planos para clínicas | B2B2C |
| (Futuro) Seguradoras | Pacotes de telepediatria white-label/parcerias |

## Diferenciação — porque não é "um WhatsApp pago"

- **Verificação real de pediatras** (cédula validada, identidade KYC).
- **Âmbito clínico explícito** por consulta + SLA + estados (triagem→respondida→encerrada).
- **Arquivo clínico estruturado** por criança e por episódio (não um fio de chat infinito).
- **Faturação certificada AT** com ATCUD/QR/SAF-T e split de pagamento automático.
- **Compliance de dados de saúde** (RGPD categoria especial, encriptação, auditoria, consentimentos versionados).
- **Segurança de nível healthcare** (vídeo encriptado, MFA, RBAC, logs).
- **Avisos e triagem de segurança** que encaminham emergências para o SNS 24 / urgência.

## Faseamento (resumo)

- **Fase 0 — Discovery** (≈2–3 meses): pesquisa, validação legal/fiscal/regulatória, protótipo UX.
- **Fase 1 — MVP Portugal** (≈3–4 meses): registo, perfis de crianças, validação de pediatras, **chat pago**, upload de ficheiros, pagamento + comissão, **faturação básica compliant via parceiro certificado**, backoffice, consentimentos.
- **Fase 2 — Vídeo + Agenda** (≈3 meses): agenda, videochamadas, lembretes, notas pós-consulta, reembolsos/cancelamentos.
- **Fase 3 — Escala** (≈6+ meses): subscrições, clínicas, seguradoras, conteúdos, AI administrativa, Espanha.

## Pedidos de validação antes de escrever código de produção

A viabilidade depende de quatro confirmações externas (ver [doc 18](18-perguntas-criticas.md)):
1. **Fiscal/faturação**: quem emite fatura ao paciente e tratamento de IVA/isenção do ato médico vs. comissão da plataforma.
2. **Regulatório**: enquadramento como **intermediário/prestador de telemedicina**, necessidade de registo na **ERS**, posição da **Ordem dos Médicos**.
3. **Proteção de dados**: **DPIA** obrigatória (dados de saúde de menores em larga escala), nomeação de **DPO**.
4. **Pagamentos**: viabilidade de **split** com MB WAY/Multibanco (SIBS) vs. Stripe Connect.

## Resultado pretendido

Uma plataforma **séria, premium, segura e escalável** que (a) **remunera justamente** os pediatras pelo trabalho que já fazem, (b) dá aos pais **acesso de confiança** e organizado à pediatria, e (c) gera para a plataforma **receita recorrente** com margens de marketplace saudáveis e defensabilidade regulatória/operacional.
