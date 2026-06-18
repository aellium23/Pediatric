# 13 · Riscos Legais e Regulatórios

> ⚠️ Orientação para estruturar o trabalho com assessoria jurídica. **Não substitui aconselhamento legal.** Cada ponto abaixo deve virar uma pergunta validada (ver [doc 18](18-perguntas-criticas.md)).

## 1. Proteção de dados (RGPD) — risco ALTO
- **Dados de saúde = categoria especial** (art.º 9.º RGPD); **dados de menores** = proteção reforçada.
- **Base legal**: **consentimento explícito** do titular das responsabilidades parentais para tratar dados de saúde do menor; e base para a teleconsulta. Distinguir consentimento clínico (médico) de base de tratamento (RGPD).
- **DPIA obrigatória** (tratamento em larga escala de dados sensíveis de menores + monitorização) — fazer **antes** do lançamento.
- **DPO**: provavelmente **obrigatório** (tratamento em larga escala de categorias especiais) — nomear.
- **Direitos**: acesso, retificação, portabilidade, apagamento, oposição, limitação — implementar processos.
- **Subcontratantes** (PSP, faturação, cloud, vídeo, notificações, chat): **DPA** (acordo de tratamento) com cada um; preferir **dados na UE**.
- **Transferências internacionais**: evitar fora da UE; se inevitável, SCC + avaliação.
- **Retenção/eliminação**: políticas por categoria; conciliar retenção clínica vs fiscal (faturas têm prazo legal próprio).
- **Registo de atividades de tratamento** (art.º 30.º).
- **Notificação de violações** (72h à CNPD).
- **CNPD**: autoridade de controlo em PT — pode haver orientações específicas para saúde/menores.

## 2. Enquadramento regulatório da telemedicina — risco ALTO
- **ERS (Entidade Reguladora da Saúde)**: estabelecimentos prestadores de cuidados de saúde **registam-se na ERS**. Validar se a plataforma, ou os pediatras através dela, configuram **estabelecimento de saúde** sujeito a registo/licenciamento.
- **Posição como intermediário vs prestador**: o **Modelo A** (intermediário tecnológico; médicos são os prestadores) reduz o risco de a *plataforma* ser classificada como prestador de cuidados — mas **a ERS pode entender de outra forma**. Confirmar.
- **Ordem dos Médicos**: regras deontológicas da **telemedicina/teleconsulta**, requisitos de identificação do médico, registo clínico, publicidade, e **validação de cédula**. Confirmar requisitos de publicidade de serviços médicos e do marketplace (avaliações, "destaque pago").
- **Prescrição eletrónica**: receitas têm circuito próprio (PEM/receita sem papel). "Renovação de receita" tem de respeitar as regras de prescrição — **não improvisar**.

## 3. Dispositivo médico (MDR) — risco MÉDIO (evitável)
- Se a app fizer **triagem automática com decisão clínica, diagnóstico ou recomendação clínica baseada em dados do doente**, pode ser **software como dispositivo médico (MDR 2017/745)** → marcação CE, requisitos pesados.
- **Estratégia**: manter a app **fora** de dispositivo médico:
  - AI/triagem **apenas administrativa** (organizar, resumir, encaminhar para profissional).
  - **Sinais de alarme** = informação/encaminhamento (ex.: "procure o SNS 24"), **não** diagnóstico — desenhar como conteúdo informativo geral, não personalizado decisório. **Confirmar a fronteira com jurista de MDR.**
  - Toda a decisão clínica é do **médico humano**.

## 4. Responsabilidade civil / profissional — risco MÉDIO
- **Responsabilidade do ato médico** é do pediatra; clarificar nos **termos profissionais** e exigir **seguro de responsabilidade civil profissional** dos pediatras.
- **Responsabilidade da plataforma**: limitar a tecnologia/intermediação; termos claros de **não-emergência**; logs que provem cumprimento (consentimentos, avisos, SLA).
- **Limites de âmbito** explícitos por consulta (o que não está incluído; quando ir presencial/urgência).

## 5. Consumo / e-commerce / pagamentos — risco MÉDIO
- **Direito do consumidor** (informação pré-contratual, preço, direito de retração — atenção a serviços já prestados), resolução de litígios (RAL/livro de reclamações eletrónico).
- **Termos de uso** (pais) e **termos profissionais** (pediatras) distintos.
- **PSD2/SCA**, **AML/KYC** dos pediatras (tratado pelo PSP via Connect), atuar como **escrow** pode ter implicações de serviços de pagamento — confirmar que o **PSP é o agente** e a plataforma não presta serviços de pagamento regulados por si.

## 6. Conteúdos e publicidade médica — risco BAIXO/MÉDIO
- Publicidade a serviços de saúde tem regras (Ordem, ERAC/ERS). **Avaliações verificadas** e **destaque pago** precisam de transparência (marcar como patrocinado).
- Biblioteca de conteúdos: validada por pediatras, com disclaimers; não aconselhamento individual.

## 7. Menores e responsabilidades parentais — risco MÉDIO
- Garantir que quem cria o perfil tem **responsabilidade parental**; tratar **guarda partilhada** (dois encarregados), conflitos, e acesso de terceiros (avós, amas) com permissões.
- Idade de consentimento digital em PT (RGPD nacional) e quem consente pelos dados de saúde do menor.

## Matriz de risco (resumo)

| Risco | Probabilidade | Impacto | Mitigação principal |
|---|---|---|---|
| RGPD/dados de saúde de menores | Alta | Alto | DPIA, DPO, consentimentos, encriptação, DPAs, dados UE |
| Classificação ERS/Ordem | Média | Alto | Modelo A intermediário; parecer ERS/Ordem antes de lançar |
| Software = dispositivo médico | Média | Alto | AI só administrativa; decisão sempre humana; parecer MDR |
| Faturação/IVA incorretos | Média | Alto | Fiscalista + parceiro certificado + Modelo A |
| Responsabilidade clínica | Média | Alto | Seguro dos médicos; âmbito; avisos; logs |
| Pagamentos/escrow regulado | Baixa/Média | Médio | PSP como agente; parecer jurídico |
| Desintermediação | Alta | Médio | Valor real (ver doc 05) |

## Sequência recomendada (legal-first)
1. **Antes de construir pagamentos/faturação**: fechar Modelo A com fiscalista.
2. **Antes do beta**: DPIA, DPO, termos/políticas, parecer ERS/Ordem, seguro dos médicos, posição MDR.
3. **Antes de escalar**: rever por país.
