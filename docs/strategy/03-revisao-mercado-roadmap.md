# 03 · Revisão de mercado e roadmap — o que mudou por baixo do plano

> Data: 2026-09-09 · Empresa: DES · Produto: HOC / Pédia
> Método: pesquisa de mercado (setembro 2026) + leitura dos documentos de
> estratégia e roadmap + **auditoria do código em produção**. As três fontes
> foram comparadas entre si; o que se segue são as divergências.
>
> Base documental: `docs/strategy/00-child-health-os-relatorio-conselho.md`
> (tese Child Health OS), `docs/15-roadmap.md` (roadmap de 12 meses),
> `docs/05-modelo-negocio.md`, `LAUNCH_READY.md`, `PRODUCT_DECISIONS.md`.
>
> **Aviso:** as leituras regulatórias abaixo são pontos a levar a jurista, não
> pareceres. O que é factual são as datas e os textos citados.

---

## 1. O mercado confirma a tese — e é maior do que o plano assume

| Indicador | Valor | Leitura |
|---|---|---|
| Plataformas de telessaúde pediátrica | 2,06 mM USD (2026) → 4,58 mM (2030), CAGR 22,2% | O segmento existe e cresce, mas é **pequeno** — é um serviço, não uma categoria |
| Saúde digital na Europa | 113,9 mM USD (2026) → 258,7 mM (2031), CAGR 17,85% | A categoria "registo + plataforma" é ~50× maior do que a "teleconsulta" |

Isto **reforça a decisão nº 1 do conselho** (reposicionar de telepediatria para
Child Health OS): o mercado onde o plano quer estar é o segundo, não o primeiro.

Outras leituras do mercado, com consequências diretas:

- **Escribas de IA ambientais são commodity, não vantagem.** Até 90% dos médicos
  em instituições de topo já os usam; há mais de 50 fornecedores, e Epic,
  Oracle Health, athenahealth e Meditech integraram-nos no core. O HOC já tem
  ditado + estruturação SOAP — **isso é suficiente; não investir mais aqui.**
- **Reembolso público de software de saúde é um canal real na UE** (DiGA na
  Alemanha, PECAN em França), e **não aparece em lado nenhum do roadmap**. É a
  única via que paga sem depender do bolso da família. Exige, porém, marcação CE
  — colide de frente com a decisão nº 4 (ver §3).
- **Saúde mental pediátrica** é apontada como a área de maior crescimento em
  telessaúde infantil. O produto não tem nada nesse eixo.
- **Monitorização remota e wearables** aparecem em todas as listas de
  tendências, mas para 0–6 anos (a cabeça-de-ponte) o hardware quase não existe.
  Manter em A4 como está. Não antecipar por moda.

---

## 2. Os documentos internos contradizem-se

Há dois roadmaps no repositório e apontam para produtos diferentes:

| | `docs/15-roadmap.md` + `05-modelo-negocio.md` | `strategy/00-...-conselho.md` |
|---|---|---|
| Produto | Marketplace de telepediatria | Registo de saúde infantil (Child Health OS) |
| Receita âncora | **Comissão** (20%) | **Family Premium** (subscrição) |
| Métrica principal | Consultas | **Engagement semanal** |
| Horizonte | 12 meses (M0–M12) | 24 meses + 5 anos |

Nenhum dos dois diz que o outro foi substituído. Quem entrar no repositório
amanhã — um investidor, um advogado, um programador novo — lê o primeiro e
constrói o produto errado.

**Proposta:** marcar `15-roadmap.md` e `05-modelo-negocio.md` com um cabeçalho
de precedência ("substituído pelo relatório do conselho para efeitos de
estratégia; mantido como referência do plano de execução do MVP"), ou
reescrevê-los. É meia hora de trabalho e evita uma decisão errada.

> **Resolvido em 2026-09-09** — e a contradição era mais larga do que estes
> dois documentos. O `17-kpis.md` fixava como Métrica Norte "consultas pagas
> concluídas por mês", que é exatamente o que o relatório do conselho rejeita,
> e o `01-resumo-executivo.md` é a porta de entrada com o posicionamento
> antigo. Pior: a pasta `docs/strategy/` não estava indexada em lado nenhum,
> pelo que a camada decisiva era invisível a quem chegasse ao repositório.
>
> O que foi feito, sem reescrever nenhum documento — reescrever o modelo de
> negócio é decisão dos fundadores, não arrumação:
> - **`docs/README.md`** novo: índice de precedência que nomeia as duas camadas
>   e a tabela dos **quatro pontos** substituídos (posicionamento, âncora de
>   receita, métrica norte, horizonte), deixando claro que tudo o resto de
>   01–26 se mantém.
> - **Aviso no topo** de 01, 05, 15 e 17, cada um a dizer o que naquele
>   documento ficou substituído e o que continua válido.
> - **README da raiz**: passa a abrir com a tese em vigor, tem uma tabela "por
>   onde começar" por tipo de leitor, e indexa `docs/strategy/`. O índice do
>   blueprint fica marcado como tal.

---

## 3. Três coisas que mudaram por baixo do plano

### 3.1 O AI Act já está em vigor para este produto — e falta um aviso

As obrigações de transparência do **artigo 50.º do AI Act aplicam-se desde 2 de
agosto de 2026**. Exigem que qualquer sistema conversacional revele ao
utilizador, **no início da interação e em linguagem simples**, que está a falar
com uma IA.

O assistente da Home apresenta-se como "Assistente HOC". Em lado nenhum diz que
é um sistema de IA. Os avisos que existem ("isto é uma orientação geral e não
substitui uma avaliação médica") são sobre a natureza clínica do conselho, não
sobre a natureza automática do interlocutor — são coisas diferentes e o
artigo 50.º pede a segunda.

**Custo de resolver: horas.** É a correção com melhor rácio deste documento.

> **Resolvido em 2026-09-09.** O assistente passou a declarar-se, antes da
> primeira pergunta e também no topo da conversa já iniciada: *"Falas com um
> assistente automático (inteligência artificial), não com um pediatra."* O
> leitor de ecrã anuncia cada resposta como "Assistente de IA". E o resumo de
> handover, quando é a IA que o escreve, chega à triagem com a autoria à vista
> — o pai está prestes a enviá-lo a um pediatra como se fossem as suas palavras.
> Falta a marcação de conteúdo sintético do art. 50.º(2), cujo prazo para
> sistemas já no mercado é **2 de dezembro de 2026**.

### 3.2 A regra "a IA nunca faz triagem" já não descreve o produto

A decisão nº 4 do conselho é ficar deliberadamente fora do MDR, e a estratégia
de IA formula-o como: *"regras estáticas de red-flag → 'procure cuidados' (não
decididas por IA)"*.

O código cumpre a letra dessa regra — o detetor de sinais de alarme
(`apps/web/lib/assist.ts`) é determinístico e nunca passa pelo LLM. Mas a
orientação regulatória sobre software de triagem é explícita noutro sentido:

> *"Se a aplicação produz um output clínico — uma lista de diagnósticos, uma
> decisão de triagem, uma recomendação de cuidados — é um dispositivo médico,
> independentemente de qualquer texto de exclusão de responsabilidade."*

O que o produto faz hoje: recebe sintomas em texto livre, classifica em três
níveis de gravidade, e num deles manda ligar o 112. Isso é uma decisão de
triagem — o facto de ser tomada por regras e não por IA é irrelevante para a
qualificação. A maioria dos verificadores de sintomas cai em **Classe IIa pela
Regra 11** do MDR (o serviço nacional finlandês *Omaolo* tem marcação CE como
IIa, precisamente por isto).

**Isto não quer dizer que o HOC seja um dispositivo médico.** Há uma defesa
séria: as regras são estáticas, públicas, não personalizadas, e reproduzem
literatura de segurança já pública (o que o SNS 24 diz a qualquer pessoa). Isso
aproxima-o de *signposting* informativo. Mas essa defesa **não está escrita em
lado nenhum**, e é a diferença entre uma conversa de 20 minutos com o regulador
e um desvio de 12–24 meses.

**Proposta:** um ficheiro de qualificação versionado no repositório —
declaração de finalidade prevista, o que o software faz e não faz, porque não é
dispositivo médico, e quem assinou. Feito **agora**, enquanto as regras cabem
numa página. Feito depois do piloto, é arqueologia.

### 3.3 O calendário EHDS decide se o roadmap está adiantado ou atrasado

Datas confirmadas: o regulamento **aplica-se a partir de 26 de março de 2027**,
com atos de execução na mesma data; **março de 2029** traz a troca da primeira
vaga de dados prioritários (resumo do doente, receita eletrónica) e as regras de
uso secundário; o formato é o **EEHRxF** europeu.

O roadmap põe "leitura EEHRxF" em M22–24. Se M0 é ~agora, isso são ~2028 —
alinhado com 2029. **Mas há uma pergunta anterior que o roadmap não faz:** o
HOC, ao posicionar-se como o registo de saúde da criança, é um "sistema EHR" na
aceção do EHDS? Se for, herda obrigações de certificação de interoperabilidade
e não apenas a possibilidade de ler dados. Essa resposta muda a arquitetura de
dados, não o mês do roadmap.

**Proposta:** parecer específico sobre a qualificação EHDS **antes** de investir
em interoperabilidade. E, entretanto, uma medida barata: **exportar o registo da
criança em formato aberto e estruturado** já — hoje custa dias, depois de haver
dados reais custa um projeto.

---

## 4. A maior lacuna não é regulatória — é de produto

A tese diz que o comportamento estrela-polar é o pai abrir a app **semanalmente**,
e que a cunha de entrada é *"registo e cofre de consumo (grátis) → aquisição +
hábito semanal"*.

O modelo de dados em produção tem `Child`, `GrowthMeasurement`, `Allergy`,
`Vital`, `Vaccination`, `Medication`, `Episode`. **Não tem cofre de documentos.**
`VerificationDocument` é para credenciais de pediatras e `FileAsset` é para
anexos de mensagens — nenhum dos dois é o cofre da família.

Consequência prática: hoje **o único motivo para abrir o HOC é a criança estar
doente**. Isso é algumas vezes por ano, não semanal. É exatamente o risco de
"frequência baixa" que o próprio modelo de negócio lista — e a subscrição
Family Premium, que é a receita âncora, não tem em que assentar. Ninguém paga
uma mensalidade por uma app que abre três vezes por ano.

**Esta é a lacuna com maior impacto no plano inteiro**, e é anterior a tudo o
resto: sem cofre não há hábito, sem hábito não há Premium, sem Premium a receita
volta a ser a comissão — ou seja, volta-se ao roadmap antigo por omissão.

> **Cofre construído em 2026-09-09.** `ChildDocument` com título e ficheiro
> cifrados em repouso (AES-256-GCM, provado por E2E contra Postgres real),
> tipos PDF/imagem, ~3 MB por documento, listagem sem transportar os bytes.
> Regra de acesso partilhada com o resto da ficha clínica —
> `ChildAccessService`, uma só cópia, porque duas cópias de uma regra de
> autorização é como se publica um IDOR. A família escreve e apaga; **o
> pediatra que a acompanha lê**, dentro do registo que já consulta, e não pode
> apagar. Cada upload conta como ação de hábito (`document_add`).
>
> **O que fica por fazer, de propósito:** a *extração por IA* (OCR → alergias,
> vacinas, medicação para o registo estruturado) — a metade que a estratégia
> liga ao Family Premium. É uma peça própria, com revisão humana obrigatória
> antes de qualquer coisa entrar no registo clínico, e não devia ser enfiada na
> mesma entrega que o armazenamento.
>
> **Endurecido a 2026-09-09**, depois de eu próprio ter apontado as duas
> lacunas que deixei: o tipo do ficheiro passou a ser decidido pela assinatura
> dos bytes e não pelo rótulo do cliente (um HTML disfarçado de PDF é recusado,
> e um PNG rotulado como PDF também), e há uma **quota por família** — 25 MB e
> 100 documentos por omissão, contados por família para não serem contornáveis
> a criar crianças, com o espaço restante à vista antes de o pai bater no
> limite. Continua **sem análise de malware**: mitigado pela validação de
> assinatura e pelo visualizador do browser em sandbox, mas registado como
> limitação conhecida no `SECURITY.md`.
>
> **Armazenamento:** no piloto o ficheiro fica em linha na base de dados, como
> data URL cifrada — o mesmo caminho que as fotos do chat já tomam. Isso limita
> um documento a alguns MB e põe bytes na base. É adequado a um piloto e
> deliberadamente não é a resposta de produção: o `FilesModule` já tem o
> caminho de URL assinado para S3, e é para lá que isto deve migrar antes de
> escalar.
>
> **Nota de âmbito:** o `PRODUCT_DECISIONS.md` fixa um congelamento de
> funcionalidades com a instrumentação como única exceção. O cofre é uma
> segunda exceção — pedida explicitamente, e é a peça de que depende a tese.
> Fica registada aqui para o congelamento continuar a significar alguma coisa.

---

## 5. O piloto não consegue medir aquilo que decide o negócio

`LAUNCH_READY.md` bloco C (instrumentação de eventos) está por fazer e
classificado como "Importante". Mas a estrela-polar do plano é **engagement**,
não volume de consultas — e o bloco C é a única coisa no piloto que mede
engagement.

Sem ele, o piloto responde "as pessoas gostaram?" e não responde "voltam?".
A primeira pergunta não decide nada; a segunda decide se a tese Child Health OS
se confirma ou se o produto é mesmo só telepediatria.

**Proposta:** subir o bloco C de *Importante* a **Bloqueante**, e acrescentar
aos eventos do funil dois contadores de hábito: **sessões por família por
semana** e **ações fora de consulta** (registar peso, ver percentil, abrir o
registo, ler um artigo).

> **Resolvido em 2026-09-09.** Existe uma tabela `AnalyticsEvent` sem nenhuma
> coluna de texto livre — só ids, nomes de uma lista fechada e números — pelo
> que conteúdo clínico não lá pode entrar por acidente. Os nove eventos do
> funil e quatro de hábito (`app_open`, `record_view`, `growth_add`,
> `article_read`) alimentam uma secção nova no perfil Admin, com exportação
> CSV. Os resultados do lado do servidor são recolhidos por escuta de eventos
> de domínio, não por chamadas dentro do fluxo clínico: uma falha de
> instrumentação não pode fazer falhar uma consulta. No apagar-conta os
> eventos perdem o `userId` — as contagens ficam, a ligação à pessoa não.

---

## 6. Melhorias propostas, por ordem de execução

| # | Proposta | Porquê agora | Esforço |
|---|---|---|---|
| 1 | ~~**Divulgar que o assistente é IA** (AI Act art. 50.º)~~ · **feito** | Obrigação já em vigor desde 2 ago 2026 | Horas |
| 2 | ~~**Instrumentação de hábito** (bloco C, elevado a bloqueante)~~ · **feito** | Sem isto o piloto não testa a tese | Dias |
| 3 | **Ficheiro de qualificação regulatória** (finalidade prevista, MDR) | Barato agora, arqueologia depois | 1 dia + jurista |
| 4 | ~~**Resolver a contradição entre os dois roadmaps**~~ · **feito** | Evita que alguém construa o produto errado | Meia hora |
| 5 | **Cofre de documentos** ✓ · *extração por IA ainda não* | É o que cria o hábito semanal e sustenta o Premium | Cofre feito; extração por construir |
| 6 | **Export do registo em formato aberto/FHIR-compatível** | Preparação EHDS enquanto ainda não há dados reais | Dias |
| 7 | **Parecer sobre qualificação EHDS** ("somos um sistema EHR?") | Decide arquitetura, não calendário | Externo |
| 8 | **Módulo de desenvolvimento/saúde mental** | Maior crescimento do segmento; densidade de subscrição | A2 |
| 9 | **Decidir conscientemente sobre a via DiGA/PECAN** | Receita que não depende do bolso da família — mas exige CE | Decisão A2/A3 |
| 10 | **Não investir mais em escriba de IA** | É commodity; a vantagem está no registo | — (poupança) |

As propostas 1 a 4 cabem antes do piloto e não competem com o recrutamento de
pediatras, que continua a ser o verdadeiro gargalo. A proposta 5 é a que muda o
negócio.

---

## Fontes

Mercado e tendências:
- [Pediatric Telehealth Platform Market Report 2026 — Research and Markets](https://www.researchandmarkets.com/reports/6104148/pediatric-telehealth-platform-market-report)
- [Europe Digital Health Market — Mordor Intelligence](https://www.mordorintelligence.com/industry-reports/europe-digital-health-market)
- [Top 10 Digital Health Trends in 2026 — StartUs Insights](https://www.startus-insights.com/innovators-guide/emerging-digital-health-trends/)
- [Healthcare AI Trends 2026](https://www.soapnoteai.com/soap-note-guides-and-example/healthcare-ai-trends-2026/)
- [This Week in European HealthTech — healthcare.digital](https://www.healthcare.digital/single-post/this-week-in-european-healthtech-medtech-and-health-ai-28th-august-2026)

Regulação:
- [AI Act — regras de transparência do artigo 50.º](https://artificialintelligenceact.eu/transparency-rules-article-50/)
- [EU AI Act explicado para organizações de saúde — Tandem Health](https://tandemhealth.ai/resources/knowledge/eu-ai-act-explained-what-healthcare-organisations-need-to-know)
- [Regulamento (UE) 2025/327 — EHDS](https://www.ey.com/en_gr/technical/tax/tax-alerts/regulation-2025-327-establishing-ehds)
- [EHDS em vigor: implicações — Kennedys](https://www.kennedyslaw.com/en/thought-leadership/article/2026/the-european-health-data-space-is-in-force-implications-for-healthcare-medtech-and-life-sciences/)
- [MDR Regra 11 — Johner Institute](https://blog.johner-institute.com/regulatory-affairs/mdr-rule-11/)
- [Um verificador de sintomas é um dispositivo médico? — QualiHQ](https://qualihq.com/guides/is-a-symptom-checker-a-medical-device)
- [Guia prático de teleconsultas — ERS](https://www.ers.pt/pt/prestadores/alertas-de-supervisao-comunicados-e-informacoes/selecionar/informacoes/informacoes/guia-pratico-prestacao-de-teleconsultas/)
