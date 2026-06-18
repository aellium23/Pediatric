# 18 · Perguntas Críticas a Validar

Estas perguntas são **bloqueadoras** ou **estruturantes**. Resolvê-las na **Fase 0**, antes de construir pagamentos/faturação e antes do beta.

## A. Advogado (RGPD / saúde / digital)
1. Quem pode dar **consentimento para tratamento de dados de saúde de menor** e como tratar **guarda partilhada** / dois encarregados?
2. **DPIA**: confirmar obrigatoriedade e conduzir; é necessária **consulta prévia à CNPD**?
3. **DPO**: obrigatório? Interno ou externo?
4. **Base legal** para cada tratamento (consulta clínica, faturação, marketing, AI de resumo).
5. **Retenção**: prazos por categoria (clínico vs fiscal) e como conciliar apagamento RGPD com obrigação de conservar faturas/registo clínico.
6. **Termos de uso (pais)**, **termos profissionais (pediatras)**, **política de privacidade**, **DPAs** — redação e revisão.
7. **Responsabilidade**: como limitar a responsabilidade da plataforma e alocar o ato médico ao pediatra; exigir **seguro de RC profissional**?
8. **Direito de retração** do consumidor em serviços digitais/serviços já prestados.
9. **Dispositivo médico (MDR)**: onde está a fronteira para a **triagem/sinais de alarme/AI** não tornarem a app um dispositivo médico?
10. **Menores e idade de consentimento digital** em PT.

## B. Contabilista / Fiscalista
1. **Quem fatura o ato médico ao paciente** — pediatra, plataforma ou ambos? Validar **Modelo A** (plataforma emite em nome e por conta do pediatra).
2. **IVA vs isenção** do ato médico por **tipo de consulta** (mensagem, vídeo, segunda opinião, **renovação de receita**, follow-up).
3. **IVA da comissão** da plataforma (23%?) e tratamento se o pediatra estiver em **regime de isenção art.º 53.º**.
4. **Software/parceiro certificado AT** que suporte **emissão por conta de terceiros / multi-emitente**, ATCUD, QR, SAF-T, e-Fatura.
5. **Notas de crédito** para reembolsos e seu fluxo.
6. **Obrigações declarativas** da plataforma sobre pagamentos a pediatras (retenções? declarações?).
7. **Atuar como escrow / receber em nome do médico** — implicações fiscais e de serviços de pagamento.
8. **Faturação cross-border** e regras de **IVA/OSS** para a expansão.
9. **Prazos de conservação** de documentos fiscais.

## C. Pediatras / Clínico
1. Que **tipos de consulta** fazem sentido clinicamente à distância e quais **não** (limites de âmbito)?
2. **SLA** realista por tipo de consulta.
3. **Pricing** aceitável e comissão tolerável (testar 20% + plano Pro).
4. **Sinais de alarme** e protocolos de **encaminhamento** (SNS 24 / urgência) — quais incluir, como redigir sem fazer diagnóstico.
5. **Renovação de receita**: o que é clinicamente/legalmente admissível remotamente; circuito de **prescrição eletrónica**.
6. **Registo clínico** mínimo exigível e formato; o que o resumo AI pode/não pode conter.
7. Requisitos da **Ordem dos Médicos** para teleconsulta, identificação, publicidade e avaliações.
8. Apetite de adoção: o que faria um pediatra **mudar** do WhatsApp para a plataforma?

## D. Entidade Reguladora / Ordem
1. **ERS**: a plataforma (ou os médicos via plataforma) configura **estabelecimento prestador de cuidados** sujeito a **registo/licenciamento**?
2. **Ordem dos Médicos**: regras de **telemedicina**, **publicidade de serviços médicos**, marketplace, avaliações e "destaque pago".
3. **Validação de cédula** profissional — fonte oficial e processo.
4. **Prescrição eletrónica**: acesso/integração e requisitos.
5. Requisitos específicos para **teleconsulta de menores**.

## E. Pagamentos
1. **Stripe Connect** cobre **MB WAY** em PT com a UX necessária (push, timeout, reembolsos)? Custos reais?
2. **SIBS Marketplace/Splits**: condições comerciais, esforço de integração, KYC de pediatras.
3. **Escrow/hold + capture no fecho** com MB WAY (que cobra logo) — fluxo de reembolso e impacto fiscal.
4. **Rolling reserve** para chargebacks?
5. **KYC/AML** dos pediatras pelo PSP.

## F. Produto / Negócio
1. **Take rate** ótimo e elasticidade (sensibilidade dos pediatras).
2. **Pré-pago vs autorização** — preferência dos utilizadores.
3. **Garantia de reembolso por SLA falhado** — viável operacionalmente?
4. Estratégia anti-**desintermediação**.

## Priorização (o que desbloqueia o quê)
| Pergunta | Bloqueia | Quando |
|---|---|---|
| B1–B4 (modelo de faturação) | Construir pagamentos/faturação | Fase 0 |
| A1–A5, A9 (RGPD/MDR/DPIA) | Beta com dados reais | Fase 0 |
| D1–D3 (ERS/Ordem/cédula) | Lançamento público | Fase 0/1 |
| E1–E3 (PSP/MB WAY/escrow) | Implementar pagamentos | Fase 0 |
| C1–C7 (clínico) | Definir produtos de consulta | Fase 0 |
