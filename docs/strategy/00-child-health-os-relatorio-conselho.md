# Child Health OS — Relatório de Conselho
### Construir a principal plataforma europeia de saúde infantil digital

**Preparado por:** Conselho Consultivo (Estratégia, Investimento, Produto, Engenharia, Segurança, Compliance, Jurídico, Fiscal, Financeiro, Marca, Crescimento)
**Para:** Os dois fundadores (Fundador 1 — 30 anos IT/Saúde/gestão; Fundador 2 — 21 anos IT/eng./cloud/arquitetura) · Empresa: **DES** (holding) · Produto em produção: **HOC — Healthcare on Call**
**Tese:** Não é mais uma app de telemedicina. **O registo de saúde digital permanente e a casa digital de cada criança europeia — da gravidez à idade adulta.** A telepediatria é *um serviço* dentro de uma plataforma mais ampla. Eficiente em capital, segurança em primeiro lugar, alavancada por IA, bootstrap até PMF.

> Nota de contexto: este plano assenta num MVP já em produção (PWA Next.js + NestJS/Prisma/Postgres, AES-256-GCM ao nível do campo, rotação RBAC/JWT, gating de consentimento, percentis LMS da OMS, entrada clínica codificada ICPC-2/ATC/PNV, marketplace + agendamento + vídeo, estrutura de split Stripe, biblioteca de conteúdos validados com ~30 artigos, backoffice por perfil). A tese da empresa alavanca esse avanço.

---

## 1. Sumário Executivo

**O que estamos a construir.** Um **Sistema Operativo de Saúde Infantil** — consumer-first, com rigor clínico: um lugar de confiança onde os pais mantêm o registo de saúde completo, portável e longitudinal de cada filho — documentos, crescimento, vacinas, medicação, marcos de desenvolvimento, relatórios, imagiologia — e, *dentro da mesma app*, acedem a cuidados pediátricos (mensagem, vídeo, segunda opinião), clínicas e (mais tarde) laboratórios, hospitais e seguradoras via interoperabilidade normalizada (FHIR/HL7).

**Porquê agora.** (1) Os dados de saúde infantil estão fragmentados por WhatsApp, email, papel, portais e silos hospitalares; (2) os pediatras dão apoio fora de horas, não pago e inseguro, sem sistema de registo; (3) o regulamento do **Espaço Europeu de Dados de Saúde (EHDS)** (em vigor desde 2025, aplicação faseada ~2027–2029) obriga ao acesso pelo doente e ao intercâmbio transfronteiriço dos registos eletrónicos de saúde — criando um vento de cauda regulatório para um registo interoperável, na posse do cidadão; (4) a IA pode finalmente automatizar a carga administrativa (compreensão de documentos, resumos, explicações em linguagem simples) sem diagnosticar.

**Porquê nós.** Dois fundadores com 30+21 anos em IT de Saúde, PACS/RIS/VNA, interoperabilidade, cloud, cibersegurança e IA conseguem construir um fosso de segurança e interoperabilidade que equipas apenas de consumo não conseguem. Este é um **founder-market fit** raramente disponível numa aposta de consumo em saúde infantil.

**Modelo.** Registo de consumo freemium (grátis) → **subscrição Family Premium** (IA + armazenamento + acompanhamento avançado) como motor de receita recorrente, complementada por uma **comissão de marketplace pediátrico** e **SaaS para clínicas**, mais tarde **seguros/B2B2C** e **white-label**. Diversificado, mas ancorado na subscrição.

**Estratégia de capital.** Bootstrap até ao PMF. Manter os custos fixos < 10–15k€/mês no Ano 1. Automatizar onboarding, faturação, suporte e conteúdos com IA. Contratar apenas depois do sinal de PMF. Levantar uma **ronda seed apenas numa posição de força** (tração + timing do EHDS) para financiar a expansão a Espanha/UE — ou permanecer *default-alive* e crescer com cash.

**Ambição.** Portugal como cabeça-de-ponte → Ibéria → UE. Objetivo: ser a primeira app que um pai europeu abre quando pensa na saúde do filho. Valor da empresa impulsionado por receita recorrente, retenção/engagement, um conjunto de dados longitudinal proprietário, confiança clínica e um fosso de interoperabilidade que nos torna o registo natural do cidadão na era EHDS.

**As 5 decisões que este relatório pede ao conselho para ratificar.**
1. **Reposicionar** de "telepediatria" para "Child Health OS"; manter o HOC como marca de consumo ibérica no curto prazo e preparar uma masterbrand para a UE.
2. **Ancorar a receita no Family Premium** (não na comissão de marketplace).
3. **Stripe Connect + faturação eletrónica PT certificada (API)** já; SIBS reavaliado à escala.
4. **Ficar deliberadamente fora do MDR SaMD** (a IA nunca diagnostica) para evitar um desvio regulatório de 12–24 meses.
5. **Bootstrap até ao PMF; levantar seed (~1,5–3M€) apenas para acelerar Ibéria/UE**, nos nossos termos.

---

## 2. Visão da Empresa

- **Missão:** Dar a cada criança um registo de saúde digital único, de confiança e para toda a vida — e tornar a vida dos pais mais calma e mais segura.
- **Visão a 10 anos:** O registo e plataforma de cuidados de saúde infantil europeu, na posse do cidadão; a interface por defeito entre famílias, profissionais de pediatria, clínicas, laboratórios, hospitais e seguradoras.
- **Comportamento estrela-polar:** Os pais abrem a app **semanalmente** (registar um sintoma, ver um percentil, guardar um relatório, ler orientação), e não apenas para marcar uma consulta. O engagement — e não o volume de consultas — é o indicador principal.
- **Valores:** Confiança acima do crescimento · A privacidade é o produto · Rigor de nível clínico · Simplicidade radical · Eficiência de capital · Construir as coisas aborrecidas, difíceis e defensáveis (segurança, interoperabilidade, qualidade dos dados).

---

## 3. Plano de Negócio (condensado)

**Cabeça-de-ponte:** pais portugueses de crianças 0–6 (a maior frequência de contacto com a saúde: vacinas, crescimento, doença frequente) + os seus pediatras. Entrar com o *registo grátis + cofre + centro de crescimento/vacinas*; monetizar com Premium + cuidados na plataforma.

**Sequência de cunha (wedge):**
1. **Registo e cofre de consumo (grátis)** → aquisição + hábito semanal.
2. **Family Premium (pago)** → compreensão de documentos por IA, armazenamento ilimitado, crescimento/nutrição/sono avançados, multi-criança, partilha familiar.
3. **Marketplace (pago)** → mensagem/vídeo/segunda opinião com pediatras verificados (comissão).
4. **SaaS para clínicas** → agendamento multi-pediatra, secretariado, financeiro (MRR por lugar).
5. **Interoperabilidade/B2B** → intercâmbio de registos FHIR; conectores de laboratório/hospital; hub de seguradoras.

**Princípio operacional:** todo o fluxo de trabalho que possa ser automatizado (KYC de clínicos, faturação, lembretes, conteúdos, suporte de nível 1, parsing de documentos) é automatizado antes de ser dotado de pessoas.

**Caminho para a rentabilidade:** contribuição positiva por família desde o primeiro dia (custo marginal quase nulo no tier grátis; Premium e SaaS de clínicas com margem bruta >80%). EBITDA positivo quando o lucro bruto recorrente cobre a pequena base fixa — alvo no **Ano 3** no cenário esperado, atingível no **Ano 2** no cenário bootstrap/pior caso mantendo os custos estáveis.

---

## 4. Business Model Canvas

| Bloco | Conteúdo |
|---|---|
| **Segmentos de cliente** | Pais (0–18, foco 0–6); pediatras (independentes + clínica); clínicas pediátricas; depois: laboratórios, hospitais, seguradoras, empregadores |
| **Propostas de valor** | Pais: uma casa de confiança para toda a saúde do filho, decisões mais calmas, acesso instantâneo a cuidados. Pediatras: cuidados assíncronos/vídeo pagos, seguros e estruturados + um registo real + agendamento à prova de faltas. Clínicas: front-office digital chave-na-mão. |
| **Canais** | App Store / Play Store, PWA, SEO/conteúdo, pediatras embaixadores, parceiros de maternidade/gravidez, clínicas, ciclos de referência |
| **Relações com clientes** | Self-serve + assistente de IA; comunidade; confiança clínica; alto-toque apenas para clínicas/B2B |
| **Fontes de receita** | Family Premium (subscrição) · comissão de marketplace · SaaS de clínicas · upsell de armazenamento · IA Premium · white-label/B2B · integrações com seguradoras |
| **Recursos-chave** | O conjunto de dados longitudinal; o código/IP; a rede de clínicos; marca/confiança; a expertise dos fundadores em interoperabilidade+segurança; certificações (caminho ISO 27001) |
| **Atividades-chave** | Produto/eng., governação de conteúdo clínico, onboarding/verificação de clínicos, segurança e compliance, crescimento |
| **Parceiros-chave** | Stripe + faturação eletrónica certificada (Vendus/InvoiceXpress/Moloni/Cegid), cloud UE (AWS/OVH/Scaleway UE), fornecedor Claude/LLM (DPA UE), associações de clínicos, marcas de maternidade, DPO-as-a-service, conselho consultivo médico |
| **Estrutura de custos** | Cloud/armazenamento, taxas de pagamento, inferência LLM, ferramentas SaaS, segurança/auditorias, jurídico/DPO, part-time clínico/design/crescimento; remuneração dos fundadores mínima no início |

---

## 5. Lean Canvas

- **Problema:** informação de saúde infantil fragmentada; apoio pediátrico não pago/inseguro; documentos perdidos; ausência de registo para toda a vida.
- **Segmentos de cliente:** pais 0–6 (early adopters: primeira vez, nativos digitais, rendimento mais alto, urbanos); pediatras independentes.
- **Proposta de valor única:** *"A casa digital da saúde do seu filho — tudo num lugar seguro, cuidados a um toque de distância."*
- **Solução:** registo + cofre + centros de crescimento/vacinas/medicação + assistente administrativo de IA + marketplace.
- **Canais:** embaixadores, conteúdo/SEO, app stores, referências, clínicas.
- **Receita:** subscrição Premium + marketplace + SaaS de clínicas.
- **Custo:** cloud, pagamentos, LLM, ferramentas, equipa mínima.
- **Métricas-chave:** WAU/MAU, ativação (registo iniciado + 1 documento + 1 criança), conversão para Premium, retenção (M6/M12), GMV do marketplace, lugares de clínica.
- **Vantagem injusta:** profundidade dos fundadores em IT de saúde/interoperabilidade/segurança + um conjunto de dados longitudinal proprietário + timing do EHDS + confiança clínica.

---

## 6. Análise de Mercado

- **Vento de cauda regulatório (decisivo):** o EHDS entrou em vigor a **26 mar 2025**; as disposições de uso primário (acesso do cidadão, Formato Europeu de Intercâmbio de EHR, MyHealth@EU) entram em vigor de forma faseada ~**2027–2029**. Isto obriga exatamente ao registo interoperável, na posse do cidadão, que construímos — transformando um "bom de ter" numa inevitabilidade alinhada com a lei.
- **Demografia:** Portugal ~1,7M menores de 18 / ~85k nascimentos/ano; Espanha ~7–8M menores de 18; UE-27 ~75M menores de 18. Pediatras: PT ~2,5–3k; ES ~15k; UE grande e fragmentado.
- **Despesa adjacente:** consultas pediátricas privadas, seguros de saúde para crianças, apps de parentalidade/saúde, armazenamento cloud — tudo atualmente não capturado por uma única plataforma centrada na criança.
- **Comportamento:** 0–6 é a janela de saúde de maior frequência (10+ visitas de vacinação, doença aguda frequente, monitorização de crescimento) → cunha natural de engagement semanal.
- **Conjunto de tendências:** cuidados baseados em valor e preventivos, registos na posse do doente, digitalização femtech/maternidade, compreensão de documentos por IA, preferência europeia por soberania de dados.

---

## 7. TAM / SAM / SOM

*Ordem de grandeza ilustrativa e defensável (anual, misto consumo + marketplace + B2B).*

| Camada | Definição | Dimensão (aprox.) |
|---|---|---|
| **TAM** | Saúde infantil digital UE-27 (registos, marketplace de cuidados, SaaS de clínicas, interop./seguradoras) para ~75M crianças | **8–12B€/ano** |
| **SAM** | Portugal + Espanha + 3–4 mercados UE iniciais; famílias dispostas a pagar + cuidados na plataforma + SaaS de clínicas | **800M–1,5B€/ano** |
| **SOM (3–5 anos)** | Captura realista: liderança PT + entrada ES. ex.: 300–500k famílias ativas, 5–10% Premium, marketplace + clínicas | **10–25M€ ARR** |

Verificação bottom-up (esperado, Ano 5): ~400k famílias ativas × 8% Premium × 65€ = ~2,1M€; + GMV de marketplace ~12M€ × 18% = ~2,2M€; + clínicas 400 lugares × 60€ × 12 = ~0,3M€; + pilotos B2B/interop./seguradoras. **10–18M€ ARR** misto atingível de forma eficiente em capital; upside de contratos com seguradoras/white-label.

---

## 8. Análise Competitiva

| Categoria | Exemplos | Falha que exploramos |
|---|---|---|
| Telemedicina | Kry/Livi, Knok (PT), Top Doctors | Episódica, generalista adulto, sem registo infantil para toda a vida |
| Marcações | Doctolib, Top Doctors | Diretório/agendamento, não um registo nem uma casa; não centrado na criança |
| Registo do doente / PHR | Apple Health, portais nacionais (SNS 24 / área do cidadão) | Não específico de crianças, não partilhado em família, documentos/IA fracos, sem camada de cuidados |
| Apps de parentalidade/tracker | Trackers de crescimento/vacinas, apps de maternidade | Apenas consumo, sem rigor clínico, sem cuidados, sem interop., sem portabilidade de registo |
| Apps de seguradoras | Alan (FR), portais de seguradoras | Fechadas ao pagador, não neutras, não centradas na criança |

**A nossa diferenciação:** centrada na criança + registo para toda a vida + **neutra** (não fechada a pagador/prestador) + rigor clínico + IA administrativa + interoperabilidade nativa EHDS. O background dos fundadores em PACS/RIS/VNA/interoperabilidade é um fosso difícil de copiar: conseguimos ingerir e normalizar documentos/imagiologia médicos reais e falar FHIR fluentemente.

---

## 9. SWOT

- **Forças:** founder-market fit (IT de saúde/interoperabilidade/segurança); MVP funcional; eficiência de capital; neutralidade; alinhamento com o EHDS.
- **Fraquezas:** arranque a frio de dois lados (pais ↔ pediatras); marca de consumo/marketing não é o core dos fundadores; equipa inicial pequena; a dimensão do mercado PT por si só é insuficiente → é obrigatório expandir.
- **Oportunidades:** mandato EHDS; curva de custo da IA; canais de seguradoras/empregadores; white-label para hospitais/clínicas; roll-up Ibéria → UE.
- **Ameaças:** incumbentes (Doctolib/Kry) a descer de mercado; portais nacionais a expandir; deriva regulatória para MDR se a IA ultrapassar limites; o risco de confiança/violação é existencial em saúde infantil.

---

## 10. Estratégia de Posicionamento

- **Empresa (DES):** uma empresa europeia de dados de saúde e cuidados digitais; confiança e engenharia como marca.
- **Produto:** *"A Casa Digital da Saúde das Crianças"* / *"O registo de saúde permanente para cada criança."*
- **Contra a telemedicina:** os cuidados são uma funcionalidade, o **registo + tranquilidade** são o produto.
- **Mensagem de cunha (pais):** *"Tudo sobre a saúde do seu filho — num só lugar seguro. E um pediatra, a um toque de distância."*
- **Mensagem de cunha (pediatras):** *"Seja pago pela ajuda que já dá — em segurança, com um registo real por trás."*
- **Pilares de prova:** segurança (nível saúde), neutralidade (os dados são seus, portáveis), conteúdo validado por clínicos, residência de dados na UE.

---

## 11. Estratégia de Marca

- **Arquitetura de marca:** no curto prazo manter o **HOC — Healthcare on Call** (já em produção, ibérico) como marca de consumo/marketplace; posicionar uma **masterbrand de saúde infantil** para escala UE. Empresa **DES** como holding.
- **Estratégia de naming (UE):** critérios — curto, pronunciável em PT/ES/EN/FR/DE, `.com`/`.eu` + disponibilidade de nome de app iOS/Android, registável como marca UE (classes 9/10/44/42/36), sem exagero de alegação clínica. Direções a explorar: uma masterbrand quente de saúde infantil (evoca "casa/ninho/crescimento/escudo") + descritor "Child Health". Decidir num sprint de 2 semanas de naming + clearance de marca antes do lançamento ES; **não** renomear utilizadores PT a meio do voo.
- **Storytelling de marca:** construído por dois irmãos vindos do IT de Saúde que se recusaram a deixar a saúde dos próprios filhos viver no WhatsApp e no papel. Confiança, calma, competência.
- **Opções de tagline:** "A saúde de cada criança, num só lugar." · "A casa da saúde do seu filho." · "Crescer com saúde. Manter-se organizado."
- **Identidade:** o navy + dourado atual, com a marca ECG-através-do-O, é um ativo forte, premium e distintivo — evoluir, não descartar; estender a um sistema mais quente e amigo dos pais (suave, seguro, humano) mantendo a credibilidade clínica.
- **Tom:** tranquilizador, linguagem simples, nunca alarmista, nunca diagnóstico.

---

## 12. Estratégia de Produto

**Princípio:** ganhar primeiro o **registo + hábito**; os cuidados e o B2B seguem os dados.

**Pilares (como módulos produtizados):**
1. **Registo de Saúde Infantil** — problemas (ICPC-2), medicação (ATC), alergias, sinais vitais, encriptado.
2. **Cofre de Saúde Familiar** — documentos/imagiologia, interpretados por IA, SSE-KMS, por criança, partilháveis com consentimento.
3. **Crescimento e Desenvolvimento** — percentis OMS (construído), marcos, nutrição, sono.
4. **Centro de Vacinação** — calendário PNV, alertas de devidas/em atraso (construído), certificados.
5. **Centro de Medicação** — lembretes, histórico, alerta de conflito medicamento-alergia (construído).
6. **Timeline Familiar** — uma vista cronológica de tudo.
7. **Assistente de Saúde IA** — *nunca diagnostica*; organiza, extrai (alergias/medicação/vacinas de PDFs e fotos), prepara resumos de consulta, explica relatórios em linguagem simples, redige tarefas administrativas.
8. **Marketplace Pediátrico** — diretório, mensagens, vídeo, agendamento, pagamentos, segunda opinião (construído).
9. **Plataforma de Clínicas** — multi-pediatra, secretariado, agendamento, financeiro (construído).
10. **Hub de Seguros** — arquitetura pronta; integração de sinistros/elegibilidade/benefícios mais tarde.
11. **Interoperabilidade** — recursos FHIR R4, ingestão HL7v2, conectores de laboratório/hospital, wearables mais tarde; alinhamento EEHRxF do EHDS.

**Design do fosso de dados:** cada interação enriquece um registo estruturado, codificado e longitudinal → melhora a IA, a retenção, o valor de interoperabilidade e a relevância B2B/seguradoras.

---

## 13. Roadmap de Produto (5 anos)

- **A1 (PMF):** polir registo+cofre+crescimento+vacinas+medicação; extração de documentos por IA (alergias/vacinas/medicação) + explicador de relatórios; subscrição Premium; iOS/Android nativo (Flutter) v1; marketplace PT em GA; motor de conteúdos Saber+; passkeys/biometria.
- **A2 (Ibéria):** localização em espanhol + calendário PNV/vacinas ES; SaaS de clínicas em GA; export/import FHIR v1; ingestão de resultados de laboratório (principais laboratórios PT/ES); ciclos de referência/crescimento; arranque ISO 27001.
- **A3 (escala + interop.):** conectores hospitalares; leitura EEHRxF do EHDS; visualizador de imagiologia (vantagem PACS/VNA dos fundadores); pilotos com seguradoras; piloto de bem-estar corporativo; white-label v1; expansão a 1–2 novos mercados UE.
- **A4 (plataforma):** hub de seguros em GA; wearables; API/developer + ecossistema de parceiros; automação de compliance multi-país.
- **A5 (líder de categoria):** multi-mercado UE; funcionalidades de efeito de rede de dados; M&A de soluções locais; contratos empresa/seguradoras ancoram o ARR.

---

## 14. Estratégia de UX

- **Mobile-first (95% mobile), iOS + Android nativos via Flutter**, uma mão, ≤3 toques para ações principais, Dark Mode, WCAG 2.2 AA, offline-first para leituras de registo/cofre, push, deep links, passkeys + Face/Touch ID.
- **Benchmarks:** Apple Health (confiança nos dados), Revolut (polish/sensação de segurança fintech), Notion (estrutura flexível), Uber/Airbnb (transações sem fricção).
- **Design system:** estender os tokens atuais (adaptáveis ao tema) para um sistema nativo completo, conforme HIG + Material; premium, calmo, seguro.
- **Guardrails:** nunca mostrar jargão clínico aos pais (os alertas de crescimento já foram movidos para linguagem de percentil); outputs de IA sempre rotulados como informativos + "fale com o seu pediatra".
- **UX de confiança:** segurança visível (bloqueio biométrico, "os seus dados, encriptados, na UE"), transparência de consentimento, export/apagar in-app (construído).

---

## 15. Arquitetura Técnica

- **Agora:** monólito modular (NestJS/Prisma/Postgres) + PWA Next.js — correto para esta fase (baixo ops, iteração rápida). Evoluir para serviços seletivos apenas onde a escala o exigir (vídeo, pipeline de IA/documentos, notificações, interop.).
- **Dados:** Postgres (gerido, região UE) + armazenamento de objetos (compatível S3 UE, SSE-KMS) para documentos/imagiologia; AES-256-GCM ao nível do campo para dados de categoria especial (construído); isolamento por tenant; log de eventos/outbox.
- **Camada de interoperabilidade:** fachada FHIR R4 (HAPI FHIR ou recursos nativos) + ingestão HL7v2 + terminologia (mapeamento SNOMED CT/LOINC/ICPC-2/ATC); adaptador EEHRxF do EHDS. Este é o território-mãe dos fundadores e um fosso durável.
- **Pipeline de IA/documentos:** OCR + extração LLM assíncronos (alergias/medicação/vacinas/análises) com human-in-loop, processamento na UE, sem treino com dados de doentes, esquemas de output estritos.
- **Mobile:** Flutter (base de código única, quase nativa), platform-channel para passkeys/biometria/health-kit mais tarde.
- **Cloud:** apenas UE (AWS eu-west/eu-central ou OVH/Scaleway para soberania); IaC; autoscaling; CDN; vídeo gerido (LiveKit self-host UE — já integrado) para o alvo de 10k concorrentes.
- **Caminho de escala:** réplicas de leitura, particionamento por família/tenant, object-store para o alvo de 100M documentos, assíncrono baseado em filas, camada de API stateless — suporta 1M famílias / 50k consultas-dia / 10k vídeo concorrente sem redesenho.

---

## 16. Arquitetura de Segurança

- **Princípios:** Segurança e Privacidade by Design, Zero Trust, Defesa em Profundidade (já é a filosofia do código).
- **Identidade:** OAuth 2.1 / OIDC, **passkeys** + MFA, RBAC + ABAC (construído), device trust, tokens de acesso de curta duração + refresh rotativo com deteção de reutilização (construído), revogação de sessão no apagamento (construído).
- **Dados:** encriptação em trânsito (TLS 1.3) + em repouso (KMS) + AES-256-GCM ao nível do campo para PHI (construído); gestão/rotação de chaves; chaves de armazenamento tokenizadas.
- **App/mobile:** WAF, rate-limiting/defesa contra bots, certificate pinning, deteção de jailbreak/root, secure enclave para chaves, ofuscação, anti-engenharia-reversa.
- **Ops:** SIEM + logs de auditoria centralizados (trilho de auditoria imutável construído), IDS, gestão de segredos, IAM de menor privilégio, builds assinados, SBOM + scanning de supply-chain (SAST/SCA/secret-scanning em CI — ativo; o recente alerta CodeQL foi triado como falso positivo e endurecido).
- **Resiliência:** backups encriptados, DR/RTO-RPO testados, backups imutáveis resistentes a ransomware, runbook de resposta a incidentes, processo de notificação de violação.
- **Roadmap de garantia:** pen test externo antes da escala; **ISO 27001** (A2) e **SOC 2 Type II** (A3) para desbloquear clínicas/seguradoras/empresas.
- **Inegociável:** em saúde infantil, uma violação é existencial. A despesa em segurança nunca é o custo a cortar.

---

## 17. Estratégia de IA

- **Regra rígida:** a IA **nunca diagnostica, faz triagem para um diagnóstico ou dá aconselhamento médico individualizado.** É administrativa/organizacional + explicativa. Isto mantém-nos **fora do MDR SaMD** e preserva a confiança.
- **Casos de uso:** compreensão de documentos (OCR + extrair alergias/vacinas/medicação/análises para o registo estruturado), resumos de preparação de consulta para pai e clínico, explicação em linguagem simples de relatórios, lembretes inteligentes, redação de conteúdo (revista por clínico), automação de suporte de nível 1, ops internas (verificações KYC de clínicos, reconciliação de faturação).
- **Guardrails:** esquemas de output estritos, confiança + human-in-loop para tudo o que entra no registo, rotulagem "apenas informativo / fale com o seu pediatra", regras estáticas de red-flag → "procure cuidados" (não decididas por IA).
- **Governação de dados:** processamento na UE + DPA com o fornecedor de LLM (ex.: Anthropic/Claude), **sem treino com dados de doentes**, minimização/redação de PII antes da inferência, auditoria completa das ações de IA.
- **Monetização:** "IA Premium" como alavanca de tier de subscrição (parsing ilimitado de documentos, explicadores de relatórios aprofundados, resumos familiares).

---

## 18. Arquitetura de Pagamentos

- **Recomendação: Stripe Connect (Express)** como principal — o mais rápido para GA de marketplace, melhor DX, suporta **MB WAY, Multibanco, Apple Pay, Google Pay, cartões**, split automático (application fee/transfer), KYC Connect para clínicos. (Estrutura de split já construída.)
- **SIBS Marketplace:** reavaliar à escala PT para reduzir taxas domésticas em MB WAY/Multibanco; opcionalidade dual-rail mais tarde.
- **Fluxos:** subscrição de consumo (Stripe Billing) + split de marketplace (o pediatra recebe o montante do ato médico, a plataforma retém a comissão) + faturação de SaaS de clínicas.
- **Ops:** reconciliação orientada por webhooks, idempotência, dunning, compliance SCA/PSD2, máquina de estados de reembolso/disputa (guardas de reembolso já endurecidas).

---

## 19. Arquitetura Fiscal / Faturação (Portugal → UE)

- **Quem fatura a quem:** o **pediatra** emite a fatura do ato médico à família (serviços médicos **isentos de IVA**, art. 9 CIVA); a **plataforma** emite uma **fatura de comissão/intermediação** ao pediatra (**IVA à taxa normal de 23%**). SaaS de clínicas + subscrições Premium faturados pela plataforma (IVA conforme regras; serviços eletrónicos). (Este é o modelo já esboçado no módulo de faturação.)
- **Fluxo de dinheiro:** o Stripe Connect faz o split na captura — a parte do pediatra para a sua conta ligada, comissão da plataforma retida. Subscrições cobradas pela plataforma.
- **Compliance PT:** integrar um **fornecedor de faturação eletrónica certificado via API** (Vendus, InvoiceXpress, Moloni ou Cegid/PHC) para **ATCUD + QR + SAF-T (PT)**; não construir faturação certificada à mão. Comunicação à AT tratada pelo fornecedor.
- **Escala internacional:** IVA **OSS** para serviços eletrónicos B2C transfronteiriços; tratamento de IVA de serviços médicos por país revisto com aconselhamento jurídico local; considerar estrutura de IP/holding (abaixo) para eficiência.
- **Ação:** contratar um consultor fiscal PT para confirmar o tratamento de IVA da intermediação e a escolha do fornecedor certificado antes de cobrar comissões reais.

---

## 20. Estrutura Jurídica

- **Empresa operacional:** **Lda. (Portugal)** por rapidez/custo. Considerar uma **holding (Lda. ou SGPS)** para deter IP/marca e receber investimento futuro (cap table mais limpo, ring-fencing do IP, eficiência na saída) — validar custo/benefício com aconselhamento dado o estágio bootstrap (não sobre-engenheirar no dia 1).
- **Cap table:** dois fundadores; decidir a divisão com franqueza (50/50 é o mais simples mas exige um mecanismo forte de desbloqueio/desempate; 51/49 ou um lead definido evita paralisia). **Vesting de fundadores (4 anos, cliff de 1 ano)** mesmo para fundadores — protege ambos os irmãos.
- **Acordos:** Acordo de Fundadores + Acordo de Sócios (matérias reservadas, tag/drag, restrições de transferência, resolução de deadlock, cessão de IP, good/bad-leaver), **pool ESOP 8–12%** para primeiras contratações-chave/consultores.
- **Governação:** conselho de 2 fundadores inicialmente + **Conselho Consultivo** (KOL pediátrico, advogado de saúde, especialista em segurança/interop., crescimento). Conselho formal pós-seed.
- **IP:** todo o código/marca cedido à empresa; registos de marca (PT/UE) para a masterbrand antes do lançamento ES.

---

## 21. Estratégia Go-To-Market

- **Cabeça-de-ponte:** Portugal, pais 0–6, urbanos, nativos digitais, rendimento mais alto; e os seus pediatras.
- **Solução para o arranque a frio de dois lados:** semear a **oferta** (pediatras embaixadores — 20–50 early adopters credíveis, com receita + valor do registo + agendamento à prova de faltas como isco) que puxa a **procura** (as famílias dos seus pacientes) → depois alargar a aquisição de consumo com o registo grátis.
- **Canais (ordenados):**
  1. **Pediatras e clínicas embaixadores** (maior confiança, dois lados).
  2. **Conteúdo/SEO** — a biblioteca validada Saber+ é um ativo de aquisição (febre, vacinas, sono… pesquisa de pais de alta intenção).
  3. **Parcerias de maternidade/gravidez** (iniciar o registo na gravidez — a cunha mais precoce).
  4. **Ciclos de referência** (partilha familiar → convites de co-parente/avós; pediatras convidam pacientes).
  5. **ASO App Store / Play** + comunidade (grupos de pais), PR (história dos fundadores + ângulo EHDS), pago seletivo.
- **Ibéria:** replicar com associações pediátricas ES + localização; depois FR/outros UE com interoperabilidade EHDS como cunha empresarial.
- **Motion B2B:** clínicas (SaaS), depois seguradoras/empregadores (benefício de saúde infantil) assim que o grafo de consumo + o registo existirem.

---

## 22. Estratégia de Preços

- **Grátis:** registo + cofre (armazenamento limitado) + básicos de crescimento/vacinas/medicação + partilha só-leitura → aquisição + hábito.
- **Family Premium:** **59–79€/ano (≈5–7€/mês)** — parsing de documentos por IA, armazenamento/imagiologia ilimitados, crescimento/nutrição/sono avançados, multi-criança, partilha familiar, explicadores de relatórios, prioridade. Faturado anualmente para cash + retenção.
- **Marketplace:** **comissão de 18–20%** em mensagem/vídeo/segunda opinião (a família paga a taxa do clínico + a taxa da plataforma).
- **SaaS de clínicas:** **39–99€/lugar/mês** por tier (agendamento → secretariado → financeiro/analytics).
- **IA Premium / armazenamento:** upsell dentro do Premium ou add-on.
- **B2B/seguradoras/white-label:** personalizado (per-member-per-month ou licença).
- **Princípio:** receita recorrente ancorada na subscrição; o marketplace amplifica mas não lidera.

---

## 23. Estratégia de Aquisição de Clientes

- **Disciplina de CAC:** alvo de payback de CAC misto < 12 meses; apoiar-se em **orgânico/embaixadores/conteúdo** (CAC baixo) antes de pago.
- **Definição de ativação:** conta + 1 criança + 1 documento/vacina registados em 7 dias (impulsiona a retenção). Instrumentar e otimizar sem descanso.
- **Ciclos:** (a) pediatras convidam pacientes; (b) partilha familiar convida co-parentes; (c) SEO de conteúdo → registo grátis → Premium; (d) onboarding de clínica traz a sua base de pacientes.
- **Funis:** arranque a frio endurecido (warm-up/keep-alive do backend já entregues, para que o primeiro contacto nunca falhe).

---

## 24. Estratégia de Retenção de Clientes

- **A retenção é o negócio** (modelo recorrente). Alavancas: funcionalidades de valor semanal (atualizações de crescimento/percentil, alertas de vacinas devidas, lembretes, timeline), IA que poupa tempo real (parsing de documentos), partilha familiar (aderência multi-utilizador) e histórico de cuidados que aumenta o custo de mudança.
- **Cadência de engagement:** notificações proativas, não alarmistas (vacina devida, verificação de crescimento, orientação sazonal), conteúdo sazonal, nudges de marcos.
- **Retenção por confiança:** privacidade transparente, export/apagar in-app, zero dark patterns.
- **Métricas:** retenção M6/M12, WAU/MAU, alvo de churn Premium < 5%/mês, NPS, profundidade de engagement por família.

---

## 25. Modelo Financeiro (5 anos, cenário esperado, eficiente em capital)

*Ilustrativo; ancorado na disciplina bootstrap. €.*

| | A1 | A2 | A3 | A4 | A5 |
|---|---|---|---|---|---|
| Famílias ativas | 8k | 60k | 180k | 350k | 500k |
| % Premium | 4% | 6% | 8% | 8% | 9% |
| ARR — Premium | 25k | 260k | 0,95M | 1,9M | 2,9M |
| GMV Marketplace | 0,2M | 1,5M | 5M | 9M | 13M |
| ARR — Marketplace (18%) | 40k | 270k | 0,9M | 1,6M | 2,3M |
| ARR SaaS de clínicas | 10k | 120k | 0,4M | 0,9M | 1,6M |
| B2B/seguradoras/white-label | — | — | 0,2M | 1,0M | 3,0M |
| **Receita total** | **~75k** | **~0,65M** | **~2,4M** | **~5,4M** | **~9,8M** |
| Margem bruta | 70% | 75% | 80% | 82% | 83% |
| Opex fixo (equipa+ferramentas+segurança) | 0,12M | 0,5M | 1,3M | 2,6M | 4,2M |
| Marketing | 0,03M | 0,15M | 0,5M | 1,2M | 2,0M |
| **EBITDA** | **(~0,1M)** | **(~0,15M)** | **~+0,1M** | **~+0,8M** | **~+2,0M** |

- **Melhor caso:** conversão Premium mais rápida + pull de seguradoras/white-label → A5 15–18M€ receita, ~25–30% EBITDA.
- **Pior caso (default-alive):** manter custos fixos estáveis, ficar só-PT, ~1–2M€ receita até A3 mas **cash-flow positivo mais cedo** — os fundadores sobrevivem sem levantar.
- **Burn/runway:** burn líquido do Ano 1 minúsculo (remuneração mínima dos fundadores); viável em bootstrap. Qualquer ronda é para acelerar, não para sobreviver.

---

## 26. Plano de Contratação (desafiar cada contratação)

**Teste para cada função:** *A IA consegue fazê-lo? A automação consegue? Um fundador consegue? Pode ser subcontratado?* Contratar apenas se todos os quatro forem "não" e estiver no caminho crítico.

| Função | A1 | Veredito |
|---|---|---|
| Produto/Eng. (ambos os fundadores) | ✅ fundadores | Core — sem contratação |
| Governação clínica / consultor médico | Part-time/consultor | Subcontratar (KOL pediátrico, consultoria paga) |
| DPO | DPO-as-a-service | Subcontratar |
| Contabilidade/fiscal + faturação certificada | Subcontratar + SaaS | Subcontratar |
| Jurídico | Avença | Subcontratar |
| Design (nativo) | Contrato | Subcontratar até PMF |
| Suporte (nível 1) | IA + fundadores | Automatizar |
| Conteúdo | Redigido por IA + revisão clínica | Automatizar + consultor |
| Crescimento/comunidade | **Primeira contratação real pós-PMF** | Contratar quando o scaling de CAC estiver provado |

- **Org A1:** 2 fundadores + fracionários (consultor, DPO, contabilista, jurídico, designer em contrato). **0–1 FTE.**
- **Org A2:** + 1 eng. full-stack, + 1 crescimento/comunidade, + part-time lead de ops clínicas/suporte. **~3–4 FTE.**
- **Org A3:** + 2 eng. (interop./mobile), + lead de suporte/ops clínicas, + parcerias/BD, + financeiro/ops part-time. **~8–10 FTE.**
- Manter a org **deliberadamente pequena**; automação e subcontratação são o padrão.

---

## 27. Orçamento (bootstrap, conservador — Ano 1 mensal)

| Item | €/mês |
|---|---|
| Cloud + armazenamento (UE) | 300–800 |
| Vídeo (LiveKit UE) | 100–400 |
| Inferência LLM | 200–800 |
| Ferramentas SaaS (repos/CI/analytics/email/suporte) | 200–500 |
| Faturação eletrónica certificada + contabilidade | 150–400 |
| DPO-as-a-service + avença jurídica (amortizada) | 400–800 |
| Segurança (scanning, depois pen test amortizado) | 200–600 |
| Contratantes de design/conteúdo (conforme necessário) | 500–2 000 |
| Taxas de app store + domínios + marcas (amortizado) | 100–300 |
| **Total fixo (ex-remuneração de fundadores)** | **~2,5–7k€/mês** |

- **Evitar:** escritórios, contratações prematuras, marketing pago pesado antes do PMF, construir qualquer coisa que um SaaS provado faça mais barato (faturação, email, analytics, error tracking).
- **Build vs buy:** construir o core diferenciado (registo, interoperabilidade, pipeline de IA, caminhos sensíveis à segurança); comprar commodities (pagamentos, faturação, email, observabilidade, CDN).

---

## 28. KPIs

- **Estrela-polar:** Famílias Ativas Semanais / famílias engajadas.
- **Aquisição:** instalações, taxa de ativação (registo+criança+documento em 7d), CAC, coeficiente viral.
- **Monetização:** conversão para Premium, ARPU, GMV/comissão de marketplace, lugares de clínica, MRR/ARR, net revenue retention.
- **Retenção:** retenção M6/M12, churn Premium, DAU/MAU, NPS.
- **Confiança/ops:** incidentes de segurança (alvo 0), uptime, taxa de automação de suporte, tempo até resolução.
- **Clínico:** pediatras verificados, SLA de consulta, pontuações de avaliação.

---

## 29. Playbook dos Fundadores (primeiros 24 meses)

- **Fundador 1 (30 anos, gestão/BD/estratégia/saúde):** CEO — GTM, BD de pediatras/clínicas, parcerias, opcionalidade de fundraising, orquestração de compliance/jurídico, marca.
- **Fundador 2 (21 anos, eng./cloud/arquitetura):** CTO — arquitetura, segurança, interoperabilidade, pipeline de IA, mobile, entrega.
- **Cadência:** revisão semanal de métricas (ativação/retenção/Premium), auto-avaliação mensal estilo conselho, reset estratégico trimestral.
- **Regras:** entregar semanalmente; falar com 5 pais + 5 pediatras todas as semanas; automatizar antes de contratar; nunca trocar segurança/compliance por velocidade; manter default-alive.
- **Higiene da relação (dois irmãos = um risco):** funções escritas, direitos de decisão, vesting, mecanismo de deadlock e um protocolo explícito de "como discordamos" — definir agora, por escrito.

---

## 30. Avaliação de Riscos

| Risco | Tipo | Mitigação |
|---|---|---|
| Arranque a frio de dois lados | Comercial | Semear oferta via embaixadores; registo de consumo grátis como íman de procura |
| Violação de dados (existencial) | Segurança | Defesa em profundidade, encriptação, pen tests, ISO 27001, ciber-seguro, plano de IR |
| Reclassificação MDR/SaMD | Regulatório | IA nunca diagnostica; regras estáticas de red-flag; revisão jurídica de cada funcionalidade de IA |
| Falha RGPD/dados de crianças | Regulatório | DPO, DPIA, gestão de consentimento, minimização, residência UE |
| Conflito de fundadores/irmãos | Fundador | Vesting, acordo de sócios, cláusula de deadlock, conselho consultivo |
| Incumbentes descem de mercado | Negócio | Velocidade + profundidade centrada na criança + fosso de interoperabilidade + neutralidade |
| Mercado PT pequeno | Negócio | Expansão Ibéria/UE desenhada desde o início; ARR B2B/seguradoras |
| Não-compliance de pagamentos/fiscal | Financeiro/jurídico | Stripe + faturação certificada + consultor fiscal PT |
| Deriva de custo/qualidade de LLM | Técnico | Pipeline agnóstico ao fornecedor, caching, restrições de esquema, tetos de custo |
| Subcapitalização bootstrap vs velocidade | Financeiro | Plano default-alive; levantar para acelerar apenas de posição de força |

---

## 31. Estratégia de Fundraising

- **Padrão: bootstrap até ao PMF.** Com este perfil de fundadores e um MVP funcional, o PMF é alcançável com capital modesto.
- **Levantar SE e QUANDO:** ativação + retenção + tração inicial de Premium/marketplace provarem o PMF **e** o timing do EHDS tornar a velocidade valiosa. Então uma **pre-seed/seed de ~1,5–3M€** para financiar Ibéria + interoperabilidade + primeiras contratações.
- **De quem:** fundos seed europeus de health-tech/deep-tech + business angels estratégicos/de saúde (KOLs pediátricos, operadores de health-IT); evitar investidores que empurrem crescimento acima de confiança.
- **Marcos para desbloquear a ronda:** ~50k famílias ativas, curvas claras de conversão + retenção Premium, 20+ pediatras embaixadores, logos de SaaS de clínicas, ISO 27001 em curso.
- **Disciplina de termos:** manter a diluição baixa (o equity dos fundadores é o ativo), cap table limpo via holding, matérias reservadas fortes.

---

## 32. Estratégia de Saída (Exit)

- **Prováveis adquirentes:** telesaúde europeia (Doctolib, Kry/Livi), seguradoras (Alan, Fidelidade/Ageas, Bupa), health-IT/EHR + imagiologia (Philips, GE HealthCare, Cerner/Oracle, Wolters Kluwer, Docaposte, Cegedim) e consolidadores de parentalidade/femtech.
- **Drivers de valorização:** ARR + net revenue retention, base de famílias engajadas, **conjunto de dados longitudinal proprietário de saúde infantil**, confiança/marca clínica, **posicionamento em interoperabilidade/EHDS**, certificações de segurança, presença Ibéria/UE.
- **Fossos a aprofundar para valor:** efeitos de rede de dados, rede de clínicos, conectores de interoperabilidade (hospital/laboratório), ativos regulatórios/de compliance, confiança da marca.
- **Opcionalidade:** uma postura forte de receita recorrente + default-alive significa que os fundadores podem aguentar por uma saída estratégica maior ou operar com lucro — nunca uma venda forçada.

---

## 33. Plano de Ação a 90 Dias

**Dias 0–30 — Fundações e foco**
- Ratificar as 5 decisões do conselho (posicionamento, âncora de receita, pagamentos/fiscal, fora-do-MDR, levantar-depois).
- Consultor fiscal PT: confirmar IVA de intermediação + fornecedor de faturação eletrónica certificada; integrá-lo via API.
- Acordo de Fundadores + Acordo de Sócios + vesting + cessão de IP; pool ESOP; pesquisa de marca.
- Instrumentar analytics (funil de ativação/retenção); definir o dashboard estrela-polar.
- Entregar: extração de documentos por IA v1 (alergias/vacinas/medicação) + explicador de relatórios atrás de flag Premium.

**Dias 31–60 — Oferta e subscrição**
- Recrutar 15–30 pediatras embaixadores (isco de receita + registo); onboarding das primeiras clínicas.
- Lançar **Family Premium** (Stripe Billing) + faturação certificada em produção.
- App nativa (Flutter) v1 beta para TestFlight/Play interno; passkeys/biometria.
- Publicar 20+ peças de conteúdo SEO do motor Saber+.

**Dias 61–90 — Procura e prova**
- Lançamento público PT (App Store + Play + PWA); ciclos de referência ligados.
- Primeiras 5–10k famílias ativadas; medir ativação/retenção/conversão Premium.
- Segurança: pen test externo agendado; avaliação de gaps ISO 27001; DPIA.
- Decidir: continuar bootstrap vs abrir conversa de seed — com base na curva de retenção.

---

## 34. Roadmap Mês-a-Mês (24 meses)

- **M1–2:** fundações jurídicas/fiscais/de segurança; analytics; extração por IA v1; pipeline de embaixadores.
- **M3–4:** Premium em GA; faturação certificada; onboarding de clínicas v1; escala de conteúdo.
- **M5–6:** iOS/Android nativo v1 em GA; ciclos de referência; lançamento público PT; primeira leitura de retenção.
- **M7–8:** otimizar ativação/retenção; explicador de relatórios por IA em GA; faturação SaaS de clínicas em GA.
- **M9–10:** export FHIR v1; ingestão de resultados de laboratório (1–2 laboratórios PT); arranque ISO 27001; pen test.
- **M11–12:** revisão de PMF + go/no-go de seed; localização de Espanha começa; empurrão para liderança de mercado PT.
- **M13–15:** **lançamento em Espanha** (localização, calendário de vacinas ES, pediatras embaixadores ES).
- **M16–18:** escala do SaaS de clínicas; import FHIR + piloto de conector hospitalar; conversas com seguradoras.
- **M19–21:** visualizador de imagiologia (vantagem PACS/VNA) em beta; white-label v1; piloto de bem-estar corporativo.
- **M22–24:** leitura EEHRxF do EHDS; preparação de entrada em 1 novo mercado UE; certificação ISO 27001; prontidão para Série A (se em escala) ou steady-state rentável (se default-alive).

---

## Síntese final (visão unânime do conselho)

O ativo raro aqui é o **founder-market fit**: dois veteranos de IT de Saúde/interoperabilidade/segurança a construir um **registo de saúde infantil neutro, na posse do cidadão**, exatamente no momento em que o **EHDS** torna esse registo uma expectativa legal. A jogada vencedora **não** é competir como telemedicina — é **ser dono do registo e do hábito semanal dos pais**, monetizar via **subscrição primeiro**, e deixar que **cuidados, clínicas, interoperabilidade e seguradoras** componham sobre os dados.

Executar de forma eficiente em capital: bootstrap até ao PMF, automatizar com IA, contratar quase ninguém, nunca comprometer segurança ou compliance, e levantar capital apenas para deitar combustível numa fogueira já provada. Faça-se isto, e isto torna-se a **plataforma europeia de referência para a saúde infantil digital** — e uma empresa altamente valiosa, defensável e liderada pela confiança.
