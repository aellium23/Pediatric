# E06 · Segurança de IA

A IA na Pédia é **assistente administrativa** (resumo, organização, triagem administrativa), **nunca** um agente clínico autónomo. A arquitetura de segurança de IA garante isolamento, não-exposição de dados e ausência de uso indevido para treino.

## Fronteiras absolutas — a IA NUNCA:
- **Diagnostica autonomamente** nem emite decisão clínica sem validação humana.
- **Expõe dados entre utilizadores** (entre famílias).
- **Expõe dados entre pediatras** (entre tenants/contas).
- **Usa dados clínicos para treino sem consentimento explícito** (e mesmo com consentimento, com salvaguardas).

Toda a saída de IA é **claramente identificada como rascunho** e requer **ação/validação humana** do pediatra para ter qualquer valor clínico (alinhado com a estratégia de **não ser dispositivo médico** — ver [riscos legais](../docs/13-riscos-legais.md)).

## Controlos

### Tenant Isolation
- Contexto de IA estritamente **escopado** ao tenant/consulta em curso: o modelo só recebe dados a que aquele utilizador/pediatra já tem acesso autorizado.
- **Isolamento de dados** por família e por pediatra no pipeline de IA (mesmas fronteiras do RBAC/ABAC + RLS).
- Sem memória persistente partilhada entre tenants; caches e embeddings segregados por tenant (e cifrados).
- Se usar RAG/embeddings de histórico clínico: índices **por criança/família**, com verificação de pertença a cada consulta ao índice.

### Prompt Injection Protection
- Tratar **todo o conteúdo do utilizador e de ficheiros como não confiável** (mensagens, PDFs, imagens com texto).
- Separação rígida entre **instruções do sistema** e **dados**; o conteúdo do utilizador nunca é interpretado como instrução.
- Allow-list de ações que a IA pode despoletar; **a IA não tem permissões diretas** — propõe, o humano (ou um serviço com autorização própria) executa.
- Sanitização/normalização de inputs; deteção de padrões de injeção; output filtering.
- Ferramentas/funções expostas à IA com **least privilege** e validação server-side dos argumentos.

### Data Leakage Prevention (DLP)
- **Filtragem de saída** para impedir vazamento de PII/dados clínicos para fora do âmbito do utilizador.
- **Redação/minimização** de dados enviados ao modelo (só o necessário; pseudonimização quando possível).
- Se usar LLM de terceiros: **fornecedor na UE / EU data boundary**, **DPA**, **zero data retention** e **opt-out de treino** contratualizados; preferir modelos com garantias enterprise ou self-host para dados sensíveis.
- Sem envio de identificadores diretos de menores ao modelo quando evitável.

### AI Audit Logs
- Registo **imutável** de cada interação de IA: input (referência/hash), prompt de sistema (versão), modelo, output, quem validou, quando.
- Rastreabilidade para investigação de incidentes, pedidos RGPD e demonstração de que a decisão foi humana.
- Versionamento de prompts/modelos (model & prompt governance); avaliação de qualidade e de viés.

## Governança de IA
- **Human-in-the-loop** obrigatório para tudo o que toque o clínico.
- **Consentimento** específico para processamento por IA quando aplicável; transparência ao utilizador.
- Avaliação de **riscos do AI Act (UE)**: classificar os casos de uso; saúde tende a ser "alto risco" — manter o sistema **fora** de uso clínico autónomo reduz exposição, mas documentar conformidade (gestão de risco, transparência, supervisão humana, robustez).
- Testes adversariais (red-teaming de prompt injection / jailbreak) no ciclo de segurança.
- **Kill-switch** para desativar funcionalidades de IA por feature flag.

## Casos de uso permitidos (recap)
- Resumo de conversa **(rascunho para o médico validar)**.
- Estruturação da triagem **administrativa**.
- Organização/etiquetagem de ficheiros por criança/episódio.
- Deteção de **palavras-chave de alarme** para mostrar avisos de encaminhamento (SNS 24) — informativo, não diagnóstico.
