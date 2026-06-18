# E11 · Prontidão para Investimento

Documento orientado a **investidores, board e parceiros institucionais** (VC, seguradoras, grupos hospitalares, potenciais adquirentes).

## Objetivo de criação de valor (5 anos)
- **100.000 famílias** · **ARR ≥ 1M€** (trajetória para 5–10M€) · **PT → ES → Europa**.
- Padrões de segurança/privacidade/compliance de nível enterprise como **ativo estratégico**, não custo.

## Moats competitivos (defensabilidade)

| Moat | Porquê é defensável |
|---|---|
| **Compliance & trust** | Faturação certificada AT, RGPD para dados de menores, ISO/SOC2, EHDS-ready — anos e capital para replicar; barreira real face a "WhatsApp pago" |
| **Oferta verificada (supply)** | Rede de pediatras com cédula validada e reputação acumulada (avaliações verificadas) — escasso e difícil de copiar |
| **Arquivo clínico proprietário** | Histórico longitudinal por criança (vacinas, crescimento, episódios) cria custo de mudança elevado |
| **Marca de confiança** | Em saúde infantil, a confiança é o fator de compra nº1; quem a conquistar primeiro lidera |
| **Dados & operações** | Conhecimento operacional (SLAs, triagem, qualidade) e dados agregados (anonimizados) melhoram o produto |
| **Integrações institucionais** | Clínicas, seguradoras, hospitais criam distribuição e lock-in B2B2C |

## Efeitos de rede
- **Cross-side**: mais pediatras verificados → mais valor para pais → mais pais → atrai mais pediatras (volante de marketplace).
- **Locais/geográficos**: liquidez por cidade/idioma; vantagem do primeiro a atingir massa crítica local.
- **Continuidade (same-side fraco mas real)**: o "pediatra de confiança" + arquivo da criança aumentam retenção e referências boca-a-boca (pais recomendam a outros pais).
- **B2B2C**: clínicas trazem as suas bases; seguradoras trazem membros — acelera o volante.

## Estratégia de retenção (drivers de LTV)
- **Arquivo clínico familiar** acumulado (vacinas, crescimento, episódios) → switching cost.
- **Relação com o pediatra favorito** → recompra e continuidade.
- **Subscrição familiar** → receita recorrente + frequência.
- **Múltiplos produtos** (mensagem, vídeo, segunda opinião, renovação de receita, follow-up) → mais ocasiões de uso ao longo do ciclo de vida da criança (0–18 anos = LTV longo).
- **Lembretes/valor proativo** (vacinas, crescimento, conteúdos) → engagement entre consultas.
- **NPS e qualidade** medidos e geridos → referência e baixa rotatividade.

## Drivers de valuation

| Driver | Métrica | Porque importa ao investidor |
|---|---|---|
| **Crescimento** | Famílias, GMV, ARR, % MoM | Trajetória e TAM europeu |
| **Receita recorrente** | MRR/ARR, % de receita de subscrição | Previsibilidade → múltiplos mais altos |
| **Unit economics** | LTV:CAC (≥3), payback (<12m), margem de contribuição | Eficiência de capital |
| **Retenção** | Net revenue retention, churn, coortes | Qualidade do negócio |
| **Take rate** | Comissão/GMV + receita por pediatra | Monetização do marketplace |
| **Defensabilidade** | Moats, compliance, certificações | Risco competitivo e regulatório baixo |
| **Escalabilidade** | Capacidade sem redesenho ([E10](10-scalability.md)) | Margem incremental e alavancagem |
| **Compliance/segurança** | ISO/SOC2, DPIA, zero incidentes graves | Reduz risco de due diligence |

## Prontidão para Due Diligence (data room)
- **Técnica**: arquitetura, [escalabilidade](10-scalability.md), SBOM, relatórios de **pentest**, roadmap de **certificações**, postura de segurança ([E02](02-security-architecture.md)–[E09](09-devsecops-pentest-certs.md)).
- **Compliance/legal**: DPIA, RoPA, DPAs, consentimentos, pareceres ERS/Ordem/MDR/fiscal, termos e políticas.
- **Financeira**: GMV, ARR, unit economics, coortes, modelo de faturação compliant ([doc 12](../docs/12-faturacao-portugal.md)).
- **Produto**: métricas (North Star, KPIs — [doc 17](../docs/17-kpis.md)), roadmap, retenção.
- **Org**: equipa, governança de segurança (CISO/DPO), políticas.
- **Trust center** público para parceiros (sumário de controlos, certificações, estado de compliance).

## Caminhos de entrada de capital/parceiros
- **Venture Capital**: tese de líder europeu em saúde infantil; healthtech com compliance forte e efeitos de rede.
- **Seguradoras**: telepediatria como benefício (per-member); integração via API; requer SOC2/ISO e DORA-awareness.
- **Grupos hospitalares/clínicas**: B2B2C, white-label, distribuição; requer ISO 27001 e interoperabilidade (FHIR/EHDS).
- **Aquisição futura**: arquitetura limpa, multi-tenant, certificada e EHDS-ready maximiza atratividade e múltiplo de saída.

## Riscos para o investidor (e mitigação)
| Risco | Mitigação |
|---|---|
| Regulatório (ERS/Ordem/MDR/fiscal) | Legal-first, pareceres na Fase 0, modelo de intermediário |
| Desintermediação | Valor real (faturação, registo, pagamento garantido, conveniência) |
| Liquidez do marketplace | Estratégia supply-led; foco em pediatras de referência |
| Segurança/privacidade (dados de menores) | Security/Privacy by Design, certificações, DPIA, seguro cibernético |
| Execução multi-país | Arquitetura plugável por país; validação local antes de cada mercado |

## Síntese para o board
Pédia combina (1) um **comportamento de procura já existente** (pais consultam pediatras por mensagem), (2) um **modelo de marketplace monetizável** com receita recorrente, e (3) **barreiras de compliance e confiança** que protegem a margem. Construída desde o dia 1 com **segurança, privacidade, escala e compliance enterprise**, está posicionada para ser **líder europeia em saúde infantil** e atrativa para VC, seguradoras, hospitais e aquisição.
