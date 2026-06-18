# Pédia — Plataforma de Telepediatria Privada

> **Documento de design de produto, negócio, tecnologia e compliance**
> Mercado inicial: **Portugal** · Ambição: escalar para a **Europa**
> Estado: *blueprint v1* · Nome "Pédia" é um placeholder de trabalho (a validar em naming/marca)

---

## O que é

**Pédia** transforma as mensagens informais que os pais já enviam aos pediatras (WhatsApp, SMS, email) numa **experiência clínica segura, organizada, remunerada e compliant**. Não é "um WhatsApp pago": é uma plataforma que profissionaliza a relação digital entre pais e pediatras, paga justamente os médicos e gera receita recorrente para a plataforma através de uma comissão de marketplace.

A proposta assenta em quatro pilares:

1. **Marketplace** de pediatras verificados (cédula da Ordem dos Médicos validada).
2. **Consultas pagas** por mensagem, assíncronas, videochamada, segunda opinião, renovação de receita e follow-up.
3. **Arquivo clínico familiar** seguro, por criança e por episódio.
4. **Infraestrutura de pagamentos + faturação compliant** (split de pagamento, comissão, fatura certificada AT).

---

## Índice de entregáveis

| # | Documento | Conteúdo |
|---|-----------|----------|
| 01 | [Resumo Executivo](docs/01-resumo-executivo.md) | Visão, tese, números-chave |
| 02 | [Problema e Oportunidade de Mercado](docs/02-problema-oportunidade.md) | Dor, mercado, TAM/SAM/SOM, concorrência |
| 03 | [Personas](docs/03-personas.md) | Pais, pediatras, admin |
| 04 | [Proposta de Valor](docs/04-proposta-valor.md) | Para pais e para pediatras |
| 05 | [Modelo de Negócio](docs/05-modelo-negocio.md) | Receita, comissões, pricing, unit economics |
| 06 | [Funcionalidades Detalhadas](docs/06-funcionalidades.md) | A–H do briefing, detalhadas |
| 07 | [User Journeys](docs/07-user-journeys.md) | Jornadas ponta-a-ponta |
| 08 | [Backlog MVP Priorizado](docs/08-backlog-mvp.md) | Épicos, histórias, MoSCoW |
| 09 | [Arquitetura Técnica](docs/09-arquitetura-tecnica.md) | Stack, serviços, diagrama |
| 10 | [Modelo de Dados](docs/10-modelo-dados.md) | Entidades, ERD, esquema inicial |
| 11 | [Fluxos de Pagamento](docs/11-fluxos-pagamento.md) | Stripe Connect vs SIBS, split, estados |
| 12 | [Modelo de Faturação Portugal](docs/12-faturacao-portugal.md) | AT, ATCUD, SAF-T, IVA/isenção, quem fatura |
| 13 | [Riscos Legais e Regulatórios](docs/13-riscos-legais.md) | RGPD, ERS, Ordem, dispositivo médico |
| 14 | [Segurança e Privacidade](docs/14-seguranca-privacidade.md) | Encriptação, MFA, auditoria, ISO/SOC2 |
| 15 | [Roadmap de 12 Meses](docs/15-roadmap.md) | Fases 0–3 e calendário |
| 16 | [Estimativa de Equipa](docs/16-equipa.md) | Funções, custos, faseamento |
| 17 | [KPIs](docs/17-kpis.md) | Métricas norte, produto, clínicas, financeiras |
| 18 | [Perguntas Críticas a Validar](docs/18-perguntas-criticas.md) | Advogado, contabilista, pediatras, regulador |
| 19 | [UX/UI e Wireframes](docs/19-ux-ui-wireframes.md) | Princípios, tom, wireframes descritivos |
| 20 | [Recomendações Finais para o MVP](docs/20-recomendacoes-finais.md) | Como lançar em Portugal |

---

## Princípios de design transversais

- **Segurança e privacidade desde o primeiro dia** (privacy & security by design, RGPD).
- **A app não é um dispositivo médico** — sem diagnóstico autónomo nem triagem com decisão clínica automática. AI apenas para organização/resumo/triagem administrativa, sempre com validação médica.
- **Avisos inequívocos**: a plataforma **não substitui urgência/emergência**. Sinais de alarme encaminham para **SNS 24 (808 24 24 24)** e urgência hospitalar.
- **Mobile-first**, tom **seguro, humano, clínico, simples e tranquilizador**.
- **Compliant por construção**: faturação certificada, split de pagamentos, consentimentos versionados, trilho de auditoria.

> ⚠️ **Aviso**: Este blueprint contém recomendações de produto e engenharia. As secções legais, fiscais e regulatórias são **orientações a confirmar** com advogado, contabilista/fiscalista certificado, pediatras e entidades reguladoras (CNPD, ERS, Ordem dos Médicos, Autoridade Tributária). Ver [doc 18](docs/18-perguntas-criticas.md).
