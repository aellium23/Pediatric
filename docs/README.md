# Índice e precedência dos documentos

Esta pasta tem **duas camadas** de documentação, escritas em momentos
diferentes. Quando se contradizem, vale a de cima.

## 1. Estratégia atual — `docs/strategy/`

| Documento | O que é |
|---|---|
| [`00-child-health-os-relatorio-conselho.md`](strategy/00-child-health-os-relatorio-conselho.md) | **A tese em vigor**: Child Health OS, receita ancorada no Family Premium, roadmap de 24 meses e 5 anos, decisões ratificadas pelo conselho |
| [`00-child-health-os-board-report.md`](strategy/00-child-health-os-board-report.md) | O mesmo relatório em inglês |
| [`01-simulacoes-financeiras.md`](strategy/01-simulacoes-financeiras.md) | Cenários financeiros |
| [`02-resumo-projeto-contexto.md`](strategy/02-resumo-projeto-contexto.md) | Contexto do projeto |
| [`03-revisao-mercado-roadmap.md`](strategy/03-revisao-mercado-roadmap.md) | Revisão de mercado (set. 2026) vs. roadmap vs. código, e as melhorias propostas |

## 2. Blueprint do MVP — `docs/01` a `docs/26`

O plano de produto, técnico, fiscal e de compliance com que o MVP foi
construído. **Continua válido para execução** — funcionalidades, arquitetura,
faturação, riscos legais, dados, UX — e é a referência mais detalhada que
existe sobre *como* o produto funciona.

Índice completo: ver o [README na raiz](../README.md).

### O que ficou substituído

Quatro pontos, e só estes. Cada documento afetado tem um aviso no topo.

| Ponto | Blueprint (01–26) | Em vigor (strategy/) |
|---|---|---|
| **Posicionamento** | Marketplace de telepediatria | **Child Health OS** — o registo de saúde da criança; a telepediatria é um serviço dentro dele |
| **Âncora de receita** | Comissão de marketplace (~20%) | **Subscrição Family Premium**; a comissão passa a complementar |
| **Métrica Norte** | Consultas pagas concluídas por mês | **Engagement semanal** — o pai voltar quando ninguém está doente |
| **Horizonte do roadmap** | 12 meses (M0–M12), fases 0–3 | 24 meses + 5 anos |

Tudo o resto nos documentos 01–26 mantém-se.

## 3. Conformidade — `docs/compliance/`

| Documento | O que é |
|---|---|
| [`01-qualificacao-regulatoria.md`](compliance/01-qualificacao-regulatoria.md) | **Rascunho para revisão jurídica**: finalidade prevista do assistente e do detetor de sinais de alarme, porque se propõe que não seja dispositivo médico, e os controlos que sustentam essa posição |

## 4. Estado operacional — na raiz do repositório

| Documento | O que é |
|---|---|
| [`../CURRENT_PRODUCT_STATUS.md`](../CURRENT_PRODUCT_STATUS.md) | Fotografia factual do que o código faz hoje |
| [`../PRODUCT_DECISIONS.md`](../PRODUCT_DECISIONS.md) | Decisões de âmbito para o piloto (incl. congelamento de funcionalidades) |
| [`../LAUNCH_READY.md`](../LAUNCH_READY.md) | Checklist do piloto |
| [`../SECURITY.md`](../SECURITY.md) | Política de divulgação de vulnerabilidades |
| [`../DEPLOY-DEMO.md`](../DEPLOY-DEMO.md) | Deploy e handover |

---

*Se atualizares a estratégia, atualiza a tabela "o que ficou substituído" — é
ela que evita que alguém construa o produto errado a partir de um documento
antigo.*
