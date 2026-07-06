# HOC — Healthcare on Call · Resumo do Projeto (contexto para trabalho de plano de negócios)

> Documento de contexto autocontido. Data: julho 2026. Empresa: DES.
> Estado: MVP completo em demonstração (frontend Vercel + backend Render + PostgreSQL), pronto para piloto.

---

## 1. O que é

**HOC** é um marketplace de telepediatria para o mercado português (com ambição ibérica/PALOP/diáspora). Transforma as mensagens informais que os pais já enviam aos pediatras (WhatsApp, SMS) numa **experiência clínica segura, organizada, remunerada e compliant**:

- **Marketplace de pediatras verificados** (cédula da Ordem dos Médicos validada por compliance).
- **Consultas pagas**: mensagem assíncrona, videoconsulta, segunda opinião, renovação de receita, follow-up.
- **Arquivo clínico familiar** por criança (crescimento com percentis OMS, vacinas PNV, medicação, alergias com alerta de conflito fármaco-alergia, episódios, linha do tempo, boletim exportável em PDF).
- **Pagamentos com split + faturação certificada AT** (comissão de marketplace).

## 2. Modelo de negócio

- **Receita por transação**: comissão de **20%** sobre cada consulta (plano Free do pediatra). Plano **Pro €29/mês com comissão 14%** — take rate blended estimado ~18,5%.
- **Pricing por consulta** (definido pelo pediatra dentro de faixas): mensagem ~€18, vídeo ~€40-45, segunda opinião ~€60. Ticket médio ponderado **€25,60** (mix 70% mensagem / 25% vídeo / 5% outros).
- **Proposta de confiança ao consumidor** (implementada e verdadeira no produto): paga-se **uma vez por consulta**, perguntas de seguimento **incluídas** até ao encerramento, cobrança **só quando o pediatra responde** — sem resposta dentro da garantia (SLA), **reembolso automático**.
- **Modelo do pediatra** (à Uber): destaque no líquido que ganha; comissão documentada no extrato e em faturas de comissão (dedutíveis, contexto recibos verdes).
- Clínicas: partilha de receita configurável (revenueSharePct) sobre o valor dos seus pediatras.

## 3. Mercado

- Portugal: ~1,3–1,5M crianças 0-14; TAM ~800k–1M famílias.
- Internacionalização preparada: app trilingue **PT/EN/ES** (100% localizada, fail-safe para PT) e **fusos horários** corretos (pediatra tem fuso próprio; famílias veem horas no fuso do dispositivo — Lisboa/Açores/Madrid/Luanda testados).
- Expansão natural: Espanha, Angola/PALOP, diáspora portuguesa.

## 4. Estado do produto (tudo construído e funcional em demo)

**Experiência dos pais:** Início orientado a ação; triagem com sinais de alarme (visíveis ao pediatra); chat episódico com separadores de dia, eventos de estado, preço no botão ("Enviar pergunta · €X"), **fotos clínicas cifradas** (até 3/mensagem, visualizador com zoom); marcação de vídeo com confirmação de preço e dica de fuso horário; expectativa honesta de resposta ("resposta prevista até 13:00" calculada pelas janelas do pediatra) + garantia de reembolso; perfil de saúde por criança completo; notificações com deep-link e badge; Saber+ com 45 artigos validados; SOS (112/SNS24); fotos de perfil; método de pagamento (cartão/MB WAY/Apple/Google Pay); NIF opcional para faturas; guia de ajuda "?" por página; PWA com temas claro/escuro.

**Experiência do pediatra:** caixa de entrada com prioridade clínica (graves primeiro, SLA), separação por responder/respondidas, filtros de data; **agenda-calendário real** (mês/semana/dia, blocos de vídeo e de "horário de mensagens", exceções por dia, férias, duplicar semana, marcações visíveis no calendário, drag no desktop); **regra de indisponibilidade**: editar/remover disponibilidade com consultas marcadas exige confirmação → reembolso automático + convite à remarcação (mesma ou outro pediatra — escolha da família); ficha do doente com linha do tempo e boletim; ganhos com filtros de período e extrato por consulta; publicação de conteúdos com **revisão editorial** (submete → admin clínico aprova/rejeita); assistente IA para estruturar notas SOAP; ditado por voz.

**Back-office:** admin (KPIs, verificação de pediatras, gestão de utilizadores, auditoria, revisão de conteúdos, **painel Mercado**: penetração por região × especialidade, oferta vs procura, tendência mensal); finanças (tesouraria com gráficos de evolução de faturação/comissões, movimentos com filtros e reembolso com motivo); compliance (verificação de credenciais); suporte (pesquisa de utilizadores + ficha 360); clínica (receita da clínica, fila de revisão de conteúdos).

**Segurança/RGPD:** dados clínicos (mensagens, triagem, fotos, resumos, nº SNS) cifrados **AES-256-GCM**; minimização de dados (sem morada completa; região por distrito para analítica; NIF opcional); consentimentos versionados e auditados; auditoria de acessos; RBAC por perfil.

**Qualidade:** 325 testes de backend automatizados verdes; builds de produção verdes; 942 chaves de tradução EN/ES verificadas programaticamente.

## 5. Perfis (roles) e recomendação pendente

Existem: PARENT, PEDIATRICIAN, PLATFORM_ADMIN, FINANCE, COMPLIANCE, SUPPORT, CLINIC_ADMIN, CLINIC_STAFF. Recomendação em aberto (decisão do fundador): consolidar para 4-5 no arranque — fundir CLINIC_STAFF num permissionamento da clínica e adiar logins dedicados FINANCE/SUPPORT até haver equipa.

## 6. Compliance e regulatório (Portugal)

- **RGPD art. 9** (dados de saúde): cifra, consentimento explícito, minimização — implementado.
- **ERS**: registo da HOC/clínicas como prestador de telemedicina (obrigação do prestador, não dos utilizadores) — campo criado; registo formal por fazer.
- **Faturação certificada AT** (ATCUD/SAF-T): arquitetura pronta com adaptador para parceiro certificado; fatura de consumidor sem NIF por defeito, com NIF a pedido.
- Conteúdos clínicos publicados passam por revisão editorial (mitigação de risco).

## 7. Simulações financeiras (36 meses, 3 cenários) — doc completo em `01-simulacoes-financeiras.md`

| | A Conservador | B Base | C Otimista |
|---|---|---|---|
| Adesão inicial | +40 famílias/mês | +120/mês | +300/mês |
| Crescimento mensal | 5% | 8% | 12% |
| Break-even | >M36 | ≈ ano 4 | **M29** |
| Receita HOC ano 3 | €43,5k | €342k | €2,70M |
| EBITDA ano 3 | −€349k | −€340k | +€166k (6%) |
| Necessidade máx. financiamento | €860k | €863k | €501k |
| LTV/CAC | 1,8x | 4,4x | 9,1x |

**Unit economics:** contribuição ~€3,90/consulta para a HOC; ~€2,40 de receita/família ativa/mês; payback de CAC ~9 meses no cenário base; ~8.500 famílias ativas cobrem a equipa de fase 2. Sensibilidade: 50 famílias novas/mês ⇒ ~€1,2k comissão/mês em estacionário; 250 ⇒ ~€6k; 1000 ⇒ ~€25k.
**Custos assumidos:** infra €200→€1,5k/mês em degraus; PSP 1,4%+€0,25; faturação €0,20/consulta; equipa por fases (2 fundadores + dev → +suporte/clinical lead → +2); CAC €14-25/família; compliance €800/mês; overhead 10%.
**Não modelado:** IVA 23% sobre a comissão, IRC, sazonalidade, chargebacks, working capital.

## 8. Custos atuais e dependências para produção real

- **Hoje (demo):** Render free/starter + Vercel + Postgres gerido ≈ €0-50/mês.
- **Para produção real falta:** chaves Stripe live (Connect para split + payouts), bucket S3 (vídeos no chat e documentos — fase 2), contrato com parceiro de faturação certificada, registo ERS, keep-warm/plano pago do backend, apps nativas (hoje PWA).

## 9. Roadmap próximo (por prioridade sugerida)

1. Piloto com pediatras reais (o produto está pronto para demo/piloto).
2. Stripe live + parceiro de faturação + registo ERS (destravar dinheiro real).
3. Consolidação de perfis (decisão pendente).
4. Vídeo no chat (fase 2, S3) e event tracking do funil (pesquisas→marcações) para alimentar o painel Mercado com dados de conversão.
5. Payouts automatizados aos pediatras; apps nativas.

## 10. Perguntas em aberto (bom material para o plano de negócios)

- Validação de pricing (€18 mensagem é o certo? disposição a pagar por região/segmento).
- CAC real por canal (o modelo assume €14-25 — validar com campanhas piloto).
- Parcerias: seguradoras/subsistemas (ADSE, Multicare, Médis) como canal B2B2C; clínicas como canal de aquisição de pediatras.
- Estratégia de oferta: como recrutar pediatras nas especialidades/regiões que o painel Mercado sinalizar (dermatologia/alergologia no demo).
- Financiamento: ~€900k de runway para o cenário base — equity, PT2030/incentivos, ou crescimento mais lento autofinanciado.
- Naming/marca: "HOC — Healthcare on Call" (logo navy+dourado com ECG) — registo de marca por fazer.
