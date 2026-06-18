# 16 · Estimativa de Equipa Necessária

Faseado por necessidade. Valores de custo são **ordens de grandeza** para Portugal (a ajustar).

## Fase 0 — Discovery (pequena, ~2–4 pessoas)
| Função | Dedicação | Notas |
|---|---|---|
| Founder/CEO (produto+negócio) | Full | Visão, fundraising, parcerias com pediatras |
| Product/UX Designer | Full/contrato | Protótipo, jornadas, testes |
| Tech Lead / Arquiteto | Full | ADRs, setup, decisões de stack |
| Pediatra consultor (clínico) | Part-time | Validação clínica, conteúdo, rede de médicos |
| **Externos**: Advogado (RGPD/saúde) · Fiscalista · DPO | Contrato | Críticos na Fase 0 |

## Fase 1 — MVP (núcleo de produto, ~6–9 pessoas)
| Função | Nº | Notas |
|---|---|---|
| Tech Lead / Backend sénior | 1 | Arquitetura, pagamentos, faturação, segurança |
| Backend engineer | 1–2 | Consultas, mensagens, integrações |
| Mobile (Flutter) | 1–2 | App pais + médico |
| Frontend web (Next.js) | 1 | Marketplace + backoffice + portal pediatra |
| Product/UX Designer | 1 | Continuidade |
| Product Manager | 1 (pode ser founder) | Backlog, priorização |
| QA / Test | 0,5–1 | Pode começar partilhado |
| DevOps/SecOps | 0,5–1 | Infra, CI/CD, segurança (pode ser o Tech Lead no início) |
| **Externos**: DPO, Advogado, Fiscalista, Pentest | Contrato | DPIA, termos, pentest pré-lançamento |
| Pediatra consultor | Part-time | Onboarding de médicos, qualidade clínica |

## Fase 2 — Vídeo + Agenda (~9–13 pessoas)
Adicionar:
| Função | Nº |
|---|---|
| Backend engineer | +1 |
| Mobile engineer | +1 |
| Operações/Suporte (onboarding pediatras + apoio pais) | +1–2 |
| Growth/Marketing | +1 |
| Customer Success (pediatras) | +0,5–1 |

## Fase 3 — Escala (~14–20+ pessoas)
Adicionar:
| Função | Nº |
|---|---|
| Eng. de dados / AI (assistente administrativo) | +1–2 |
| Security/Compliance lead (ISO/SOC2) | +1 |
| Expansão internacional (PM país ES) | +1 |
| Marketing/Growth | +1–2 |
| Suporte/Operações | +2 |
| Finance/Billing ops | +1 |

## Modelo de custo (ordem de grandeza, anual, PT)
> Custos totais empregador, indicativos. Ajustar a salários reais/seniority.

| Perfil | Custo anual aprox. (€) |
|---|---|
| Engenheiro sénior | 55k–85k |
| Engenheiro mid | 40k–60k |
| Designer | 40k–60k |
| PM | 50k–75k |
| Operações/Suporte | 25k–40k |
| Founder (subsídio inicial) | variável |

**Burn ilustrativo Fase 1** (7 pessoas internas + externos): ~**350k–500k €/ano** + externos (legal/fiscal/DPO/pentest ~40–80k) + infra/SaaS (~20–50k). Total Fase 1 ≈ **0,45–0,65 M€/ano**.

## Externos essenciais (todas as fases)
- **Advogado** especializado em saúde digital + RGPD.
- **Contabilista/Fiscalista** certificado (faturação, IVA, multi-país).
- **DPO** (interno ou externo).
- **Pentest / auditoria de segurança**.
- **Pediatra(s) consultor(es)** para qualidade clínica e rede.

## Notas
- Começar **enxuto**: na Fase 1, o Tech Lead pode acumular DevOps/Sec; o founder pode acumular PM.
- **Não cortar** em legal/fiscal/segurança — é onde está o risco existencial do negócio.
- Operações/Suporte tornam-se críticos quando há pediatras a bordo (onboarding, disputas).
