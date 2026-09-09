# 01 · Qualificação regulatória — assistente e detetor de sinais de alarme

> ## ⚠️ RASCUNHO PARA REVISÃO JURÍDICA — não é um parecer
>
> Este documento foi redigido por engenharia a partir do código em produção,
> para dar a um jurista uma base factual sobre a qual trabalhar. **Não substitui
> parecer jurídico e não está assinado.** As referências regulatórias estão
> ligadas às fontes; as conclusões são propostas, não determinações.
>
> **Fabricante:** DES · **Produto:** HOC (Healthcare on Call)
> **Âmbito:** assistente da Home e detetor de sinais de alarme
> **Versão analisada:** ramo `claude/telepediatria-platform-design-pq1y1v`,
> setembro de 2026 · **Data:** 2026-09-09

---

## 1. Porque este documento existe

A decisão nº 4 do conselho (`docs/strategy/00-child-health-os-relatorio-conselho.md`)
é **ficar deliberadamente fora do MDR**, evitando um desvio regulatório de
12–24 meses. Essa decisão só é defensável se a finalidade prevista estiver
escrita **antes** de alguém a perguntar.

Hoje não está. O produto tem uma funcionalidade que classifica sintomas em três
níveis e num deles manda ligar o 112, e a justificação de porque isso não é um
dispositivo médico existe apenas na cabeça de quem o construiu. A diferença
entre ter isto escrito e não ter é a diferença entre uma conversa de vinte
minutos com o regulador e um processo.

Escrito agora, as regras cabem numa página. Escrito depois do piloto, é
arqueologia.

---

## 2. Finalidade prevista — proposta de declaração

> O HOC é uma aplicação de consumo destinada a famílias. Permite (a) manter o
> registo de saúde da criança introduzido pela própria família, (b) contactar e
> contratar consultas com pediatras verificados, e (c) apresentar informação
> geral de saúde infantil e mensagens de encaminhamento para os serviços de
> saúde públicos e para os pediatras da plataforma.
>
> O HOC **não se destina** a diagnosticar, prevenir, monitorizar, prever,
> prognosticar, tratar ou atenuar qualquer doença, lesão ou deficiência. Não
> produz um diagnóstico, um diagnóstico diferencial, uma probabilidade, uma
> pontuação de risco, nem uma recomendação clínica individualizada. As
> mensagens de encaminhamento são informação geral, idêntica para todos os
> utilizadores perante a mesma expressão, e reproduzem orientação de segurança
> já publicada pelos serviços de saúde.
>
> Todas as decisões clínicas são tomadas por profissionais de saúde
> qualificados, dentro ou fora da plataforma.

Esta redação é a peça juridicamente decisiva do documento. **É ela que o
jurista tem de aprovar ou corrigir**, porque a qualificação sob o MDR depende do
que o fabricante declara como finalidade — não do que o software poderia fazer.

---

## 3. O que o software faz, factualmente

### 3.1 Detetor de sinais de alarme (`apps/web/lib/assist.ts`)

Um comparador de expressões **determinístico**, executado no dispositivo do
utilizador:

- Normaliza o texto (minúsculas, remoção de acentos).
- Compara-o com **7 regras de sinal grave** — `breathing`, `seizure`,
  `bluish`, `unresponsive`, `anaphylaxis`, `bleeding`, `headtrauma` — e com
  **4 regras de cautela** — `highfever`, `dehydration`, `persistentvomit`,
  `severepain`.
- Devolve um de três níveis: `emergency`, `caution`, `info`.
- Em `emergency` mostra um texto fixo e dois números públicos: **112** e
  **SNS 24 (808 24 24 24)**.

Propriedades que interessam à qualificação:

| | |
|---|---|
| Personalização | **Nenhuma.** A idade, o peso, o histórico e as alergias da criança **não entram** no cálculo. A mesma frase produz o mesmo resultado para qualquer criança. |
| Aprendizagem | **Nenhuma.** Lista estática, versionada em git, revista por humanos. |
| Dados clínicos | **Não são lidos.** O detetor recebe apenas o texto que o pai acabou de escrever. |
| Saída | Texto fixo + números públicos. Sem diagnóstico, sem probabilidade, sem lista de hipóteses. |
| Transparência | As regras são legíveis no repositório e cobertas por 52 testes. |

### 3.2 Camada de linguagem (LLM)

Quando existe chave de API, um modelo **reescreve o tom** da orientação já
determinada. Não decide gravidade. Os prompts proíbem explicitamente
diagnosticar, indicar medicamentos, doses ou tratamentos, e obrigam a manter a
indicação de falar com um pediatra. Sem chave, a camada degrada em silêncio e o
texto determinístico é usado tal como está.

### 3.2.1 Leitura de documentos do cofre

Um segundo uso do modelo **transcreve** um documento que a família carregou
(relatório, análises, boletim de vacinas) para três listas: alergias, vacinas e
medicação. O prompt proíbe interpretar, diagnosticar e inferir — só pode
devolver o que está escrito no documento. **A saída não é gravada**: é mostrada
ao titular do registo, com todas as caixas por marcar, e só o que ele marcar
entra na ficha. É transcrição sob decisão humana, não leitura clínica
automática (ver § 7).

### 3.3 Encaminhamento por especialidade

Um segundo comparador sugere **que especialidade do marketplace consultar**
(dermatologia, pneumologia, alergologia…). É um auxiliar de navegação comercial
— aproxima-se de "que categoria de serviço devo procurar", não de "que doença
tenho".

---

## 4. O que o software não faz

- Não emite diagnóstico nem diagnóstico diferencial.
- Não calcula probabilidade, pontuação de risco ou prognóstico.
- Não recomenda medicamentos, doses ou tratamentos.
- Não decide se a criança deve ou não ir à urgência — mostra números públicos.
- Não usa dados clínicos da criança para determinar a gravidade.
- Não afirma excluir nada ("não é nada de grave" nunca é dito).
- Não substitui, nem se apresenta como substituto de, avaliação médica.

---

## 5. Análise à luz do MDCG 2019-11

A [orientação MDCG 2019-11](https://health.ec.europa.eu/system/files/2020-09/md_mdcg_2019_11_guidance_en_0.pdf)
percorre quatro passos, e exige que **cada função seja analisada
separadamente** (estrutura modular).

| Passo | Registo/cofre | Marketplace | Detetor de sinais de alarme |
|---|---|---|---|
| 1. É software? | Sim | Sim | Sim |
| 2. Age sobre dados para além de armazenar, arquivar, comunicar ou pesquisa simples? | **Não** — armazenamento e pesquisa simples | Não | **Sim** — compara e classifica |
| 3. É em benefício de doentes individuais? | — | — | Sim |
| 4. A finalidade cai no art. 2.º(1) do MDR? | — | — | **É aqui que se decide** |

Os dois primeiros blocos ficam claramente fora: armazenamento, arquivo,
comunicação e pesquisa simples não qualificam como dispositivo.

**O passo 4, para o detetor, é honestamente discutível.**

### 5.1 O argumento a favor de não ser dispositivo

- A finalidade declarada é **informar e encaminhar**, não diagnosticar.
- Não há personalização: sem entrada de dados do doente, não há "benefício
  individual" no sentido de um output adaptado àquela criança.
- O conteúdo reproduz **informação de segurança já pública** — é o que o SNS 24
  diz a qualquer pessoa que ligue. Aproxima-se de *signposting* e de
  "informação de carácter geral", que a orientação exclui.
- A saída é fixa e não interpretativa.

### 5.2 O argumento contra — que tem de constar

- Classificar texto livre de sintomas em três níveis de gravidade **é uma
  operação sobre dados clínicos**, e o resultado influencia uma decisão de
  procura de cuidados.
- A maioria dos verificadores de sintomas europeus é tratada como
  [Classe IIa pela Regra 11](https://blog.johner-institute.com/regulatory-affairs/mdr-rule-11/);
  o serviço público finlandês *Omaolo* tem marcação CE precisamente por isto.
- O facto de a decisão ser tomada por **regras e não por IA é irrelevante** para
  a qualificação — o MDR olha para a finalidade e para o efeito, não para a
  técnica.
- Um texto de exclusão de responsabilidade **não altera** a qualificação.

### 5.3 Conclusão proposta

O detetor **provavelmente** fica fora do MDR enquanto se mantiver estático, não
personalizado e limitado a reproduzir orientação pública — mas a margem é
estreita e depende inteiramente da redação da finalidade prevista e da
disciplina de a manter. **É esta a pergunta a levar ao jurista**, não "somos ou
não um dispositivo médico" em abstrato.

---

## 6. O ponto mais fraco não é técnico — é a nossa própria linguagem

A qualificação depende do que o **fabricante declara**. E o produto declara,
hoje, em texto que qualquer pessoa pode ler:

| Onde | O que diz |
|---|---|
| Prompt do LLM (`ai.module.ts`) | *"És o **assistente de triagem** de uma app de telepediatria"* |
| Ecrã de ajuda ao pai | *"**Triagem rápida** — diz-nos como está a criança; sinais graves são destacados"* |
| Notas do pediatra | *"**Triagem** assinalou: …"*, *"⚠️ **Triagem** indicou sinais graves"* |
| Instrumentação | evento `triage_start` |

"Triagem" é um termo clínico com significado próprio: **atribuir prioridade de
atendimento a um doente**. Ao usá-lo, o fabricante está a declarar uma
finalidade médica — exatamente a que a decisão nº 4 quer evitar. Nenhum
argumento das secções anteriores sobrevive bem a um documento interno que
chama triagem ao que faz.

**Recomendação — é a alteração mais barata e mais consequente deste ficheiro:**

- Substituir "triagem" por **"orientação"** ou **"encaminhamento"** em todo o
  texto visível ao utilizador e nos prompts.
- Manter "triagem" apenas onde descreve o que o **pediatra** faz, que é uma
  atividade clínica real e devidamente enquadrada.
- Fixar isto como regra de glossário, para não voltar a entrar.

> ### ✅ Feito a 2026-09-09
>
> Nenhuma ocorrência de "triagem" resta no texto visível nem nos prompts.
>
> | Antes | Depois | Porquê |
> |---|---|---|
> | Prompt do LLM: *"assistente de **triagem**"* (3 prompts) | *"assistente de **orientação**"* | Era a declaração de finalidade mais explícita que existia |
> | Ajuda ao pai: *"**Triagem** rápida"* | *"**Orientação** rápida"* | |
> | Estado da consulta: *"Em **triagem**"* | *"Em análise"* | Acompanha Aberta / Em análise / Respondida / Fechada |
> | Nota do pediatra: *"**Triagem** assinalou:"* | *"O **questionário da família** assinalou:"* | Não éramos nós a triar — era a família a responder a um questionário. Atribuir a informação à fonte é também melhor prática clínica |
> | *"Sem sinais de alarme assinalados na **triagem**"* | *"…assinalados **pela família**"* | idem |
> | *"⚠️ **Triagem** indicou sinais graves"* | *"⚠️ **A família assinalou** sinais graves"* | idem |
> | Vista do pediatra: *"**Triagem** da família"* | *"**Questionário** da família"* | |
> | Funil do admin: *"Iniciou **triagem**"* | *"Iniciou consulta"* | |
> | Tour público: *"**Triagem**"*, *"**Triagem** rápida"*, *"**Triagem**: 38.5º"* | *"Antes de enviar"*, *"Orientação rápida"*, *"Questionário: 38.5º"* | Página pública — é a que um regulador lê primeiro |
>
> **Nomes internos mantidos de propósito:** o componente `TriageDialog`, o
> estado `ConsultationStatus.TRIAGE` e o evento `triage_start`. Não são
> declarações ao público, e mudá-los quebraria a lista fechada de eventos e os
> dados históricos do funil. O que conta é o que é declarado.
>
> **Regra de glossário, daqui para a frente:** "triagem" só se usa para
> descrever o que um **pediatra** faz.

A alteração dos nomes internos (componentes, eventos) é opcional e menos
urgente; o que conta é o que é declarado.

---

## 7. Controlos que sustentam esta qualificação

Estas passam a ser **restrições de desenho**, não preferências. Enquanto se
mantiverem, a análise da secção 5 aguenta-se:

- [ ] As regras de sinal de alarme mantêm-se **estáticas, versionadas e
      revistas por humanos**.
- [ ] A gravidade **nunca** é decidida por um modelo de linguagem.
- [ ] Nenhum dado clínico da criança (idade, peso, histórico, alergias) entra no
      cálculo da gravidade.
- [ ] A saída nunca inclui diagnóstico, hipóteses, probabilidade ou pontuação.
- [ ] A saída nunca indica medicamento, dose ou tratamento.
- [ ] O produto nunca afirma **excluir** uma condição.
- [ ] O conteúdo de emergência limita-se a encaminhar para 112 / SNS 24.
- [ ] A finalidade prevista publicada coincide com a da secção 2.
- [ ] **Nenhuma saída de modelo entra no registo clínico sem confirmação
      humana explícita.** A leitura de documentos do cofre
      (`POST /documents/:childId/:id/read`) *propõe*: devolve alergias, vacinas
      e medicação lidas, sem escrever. Só o que o titular do registo marca, item
      a item e sem nada pré-marcado, é gravado — e pelos endpoints normais da
      ficha, com as validações de sempre. É esta fronteira que mantém a
      extração no passo 2 do MDCG 2019-11 (armazenar e transcrever sob decisão
      humana) e fora do "agir sobre dados"; se algum dia se gravar
      automaticamente, a secção 5 tem de ser refeita antes.

---

## 8. O que obrigaria a reavaliar tudo

Qualquer um destes muda a resposta e exige nova análise **antes** de ser
implementado:

- Personalizar a orientação por idade, peso ou histórico da criança.
- Devolver probabilidades, pontuações de risco ou listas de causas possíveis.
- Deixar o LLM decidir a gravidade em vez de reescrever o tom.
- Dizer ao pai se deve ou não ir à urgência, em vez de mostrar os números.
- Ligar o detetor ao registo clínico da criança.
- Gravar automaticamente no registo o que um modelo leu de um documento, ou
  pré-marcar as sugestões para o pai apenas confirmar em bloco.
- Seguir a via de **reembolso público** (DiGA na Alemanha, PECAN em França) —
  que exige marcação CE, e portanto é uma decisão de entrar no MDR de propósito,
  não por acidente (ver `docs/strategy/03-revisao-mercado-roadmap.md` §1).

---

## 9. Enquadramentos vizinhos

- **AI Act, art. 50.º** — obrigação de transparência cumprida desde 2026-09-09:
  o assistente identifica-se como IA. Falta a marcação de conteúdo sintético do
  art. 50.º(2), com prazo a **2 de dezembro de 2026**.
- **ERS** — a prestação de teleconsultas tem enquadramento próprio; ver o
  [guia prático da ERS](https://www.ers.pt/pt/prestadores/alertas-de-supervisao-comunicados-e-informacoes/selecionar/informacoes/informacoes/guia-pratico-prestacao-de-teleconsultas/)
  e `docs/13-riscos-legais.md`.
- **RGPD** — os dados tratados aqui são de categoria especial; ver
  `docs/14-seguranca-privacidade.md`.

---

## 10. Assinaturas

Este documento só produz efeito depois de revisto e assinado.

| Papel | Nome | Data | Assinatura |
|---|---|---|---|
| Redação (engenharia) | — | 2026-09-09 | *rascunho* |
| Revisão jurídica | | | |
| Aprovação (fabricante, DES) | | | |

**Rever quando:** houver alteração ao detetor, à finalidade prevista, ou a
qualquer um dos controlos da secção 7 — e, em qualquer caso, antes da primeira
família real.
