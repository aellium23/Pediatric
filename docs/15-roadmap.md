# 15 · Roadmap de 12 Meses

Calendário indicativo assumindo arranque com equipa pequena (ver [doc 16](16-equipa.md)). Datas relativas a **M0 = mês de arranque**.

## Visão por fases

| Fase | Meses | Objetivo | Saída |
|---|---|---|---|
| **0 · Discovery** | M0–M2 | Validar problema, legal, fiscal, regulatório; protótipo UX | Decisão go/no-go + modelo fechado |
| **1 · MVP Portugal** | M2–M6 | Chat pago compliant ponta-a-ponta | Beta fechado → lançamento limitado |
| **2 · Vídeo + Agenda** | M6–M9 | Teleconsulta vídeo + agenda + reembolsos | Oferta completa de consulta |
| **3 · Escala (início)** | M9–M12 | Subscrições, conteúdos, AI admin, preparar ES | Receita recorrente + base p/ expansão |

---

## Fase 0 — Discovery e Validação (M0–M2)
**Produto/UX**
- Entrevistas: 15–25 pais, 15–25 pediatras.
- Protótipo navegável (Figma) das jornadas-chave; testes de usabilidade.
- Definição de pricing inicial e proposta de valor.

**Legal/Fiscal/Regulatório (crítico — paralelo)**
- Fechar **Modelo A** com fiscalista (faturação/IVA).
- Iniciar **DPIA**; selecionar **DPO**.
- Parecer sobre **ERS / Ordem dos Médicos / dispositivo médico**.
- Selecionar **parceiro de faturação** e **PSP** (Stripe Connect + MB WAY).
- Rascunho de termos (pais), termos profissionais, política de privacidade, consentimentos.

**Tech**
- ADRs (stack), setup de repo, CI/CD, ambientes, base de auth.

**Gate M2**: modelo jurídico/fiscal viável + UX validada + stack decidida → **go**.

## Fase 1 — MVP Portugal (M2–M6)
**Sprints (ver doc 08)**
- M2–M3: Auth + perfis (pais/pediatras) + consentimentos + arquivo da criança + uploads.
- M3–M4: Marketplace + perfil público + **validação de pediatras** (backoffice) + favoritos.
- M4–M5: **Consulta por mensagem** + estados + SLA + triagem/sinais de alarme.
- M5–M6: **Pagamentos** (hold/capture/split MB WAY+cartão) + **faturação parceiro** + payouts + reembolsos + dashboard financeiro básico + notificações.
- M6: **Hardening** (segurança, pentest), DPIA concluída, beta fechado (20–40 pediatras + famílias).

**Gate M6**: fluxo ponta-a-ponta com fatura real + comissão + segurança validada → **lançamento limitado** (Lisboa/Porto).

## Fase 2 — Videochamada e Agenda (M6–M9)
- **Agenda** do pediatra (horários, buffers, indisponibilidades) + integração calendário.
- **Videochamada** healthcare-grade + sala de espera + consentimento + notas + resumo pós-consulta.
- **Lembretes** (push/SMS/email; WhatsApp se compliant).
- **Reembolsos/cancelamentos/no-shows** com regras configuráveis.
- **Episódios clínicos** como agrupador de primeira classe.
- Apple Pay / Google Pay completos.

**Gate M9**: oferta de consulta completa (mensagem + vídeo) estável → **abertura geral PT**.

## Fase 3 — Escala (M9–M12)
- **Subscrição familiar** (pacotes/descontos) + **plano Pro de pediatra**.
- **Biblioteca de conteúdos** validados.
- **AI administrativa**: resumos validados, organização, triagem administrativa.
- **Crescimento/percentis, vacinas, medicação** (perfil de saúde rico).
- **Partilha entre médicos** + **segunda opinião** como produto.
- **Programa de clínicas** (piloto B2B).
- **Preparação Espanha**: i18n ES, validação fiscal/regulatória ES, parceiro de faturação ES.
- Início do caminho **ISO 27001 / SOC 2**.

**Gate M12**: receita recorrente a crescer + retenção saudável + base técnica/legal pronta para 2º país.

## Marcos visuais (Gantt textual)
```
M0  M1  M2  M3  M4  M5  M6  M7  M8  M9  M10 M11 M12
[--Discovery--]
        [--------- MVP Portugal ---------]
                                [--- Vídeo+Agenda ---]
                                            [---- Escala/ES prep ----]
Legal/Fiscal/RGPD: [============ contínuo ============================]
Segurança/Pentest:           [pentest]           [pentest]      [ISO/SOC2 start]
```

## Dependências críticas
- Faturação e pagamentos **dependem** do fecho do modelo jurídico (Fase 0).
- Lançamento **depende** de DPIA + pareceres ERS/Ordem.
- Vídeo **depende** de DPA com fornecedor UE.
- Expansão ES **depende** de validação fiscal/regulatória local (não reutilizar PT).
