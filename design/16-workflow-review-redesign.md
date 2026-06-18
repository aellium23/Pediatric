# 16 · Workflow Review & Mobile Redesign

Revisão de **cada workflow** procurando padrões desktop-oriented (tabelas largas, formulários longos, multi-painel, hover, modais centrados, ações no topo) e o respetivo **redesign mobile-first**. Veredito: ✅ já mobile · 🔧 redesenhado · ⚠️ aceitável só em web (clínica/admin).

## Princípio do redesign
Tudo o que um pai/pediatra faz em movimento é **smartphone-primeiro, uma mão, ≤3 toques**. Ferramentas de back-office (clínica/admin) podem ser web-densas, mas o pediatra tem **app** para o trabalho clínico do dia-a-dia.

---

## Pai — auditoria

| Workflow | Risco desktop | Veredito | Redesign mobile |
|---|---|---|---|
| Registo/login | Form longo | 🔧 | **Social/passkey 1-toque**; OTP autofill; sem password |
| Consentimentos | "Página de termos" scroll infinito | 🔧 | Checklist curta + sheets de detalhe; granular; guarda estado |
| Adicionar criança | Form longo único | 🔧 | **2 passos curtos**, guarda automático, teclados certos |
| Escolher pediatra | Tabela com colunas | 🔧 | **Cards Airbnb-like** + filter chips + bottom-sheet de filtros |
| Iniciar consulta | Wizard estilo desktop | 🔧 | Sheets progressivas: tipo→âmbito→triagem→pagar; 1 ação/ecrã |
| Pagamento | Form de cartão | 🔧 | **Apple Pay/Google Pay/MB WAY nativos**; sheet; haptic success |
| Chat | — | ✅ | Padrão mensagens nativo; composer em baixo; offline draft |
| Ver resumo/fatura | Abrir PDF noutra "janela" | 🔧 | Pré-visualização in-app + share sheet nativo |
| Marcar vídeo | Calendário denso | 🔧 | **Chips de slots** (Hoje/Amanhã) por disponibilidade; 1 toque |
| Gerir saúde (vacinas/cresc.) | Tabelas | 🔧 | **Timeline + gráficos Apple Health-like** com tabela a11y |
| Privacidade/RGPD | Definições estilo painel | 🔧 | Lista de ações claras (aceder/exportar/eliminar) + step-up biométrico |
| Faturas | Tabela | 🔧 | Lista de cards com download/share |

## Pediatra — auditoria

| Workflow | Risco desktop | Veredito | Redesign mobile |
|---|---|---|---|
| Inbox de consultas | Tabela com muitas colunas | 🔧 | **Lista priorizada por SLA**; cards; badges; swipe actions |
| Detalhe + responder | Multi-painel desktop | 🔧 | **1 coluna** no telefone (abas Histórico/Conversa); **master-detail** só em tablet/fold aberto |
| Rascunho IA | Painel lateral | 🔧 | Bloco inline expansível "rever e usar" |
| Encerrar com resumo | Form longo | 🔧 | Campos focados + rascunho IA editável; 1 CTA |
| Serviços & preços | Tabela editável | 🔧 | Lista com toggles + edição inline em sheet |
| Agenda/disponibilidade | Grelha semanal desktop | 🔧 | Lista de blocos por dia + editor em sheet; grelha só em tablet |
| Videochamada + notas | Dois painéis | ⚠️🔧 | Telefone: chamada full + **notas em sheet/Picture-in-Picture**; tablet: split |
| Finanças | Dashboard desktop | 🔧 | **Cards de métrica** empilhados (Revolut-like) + lista de transações |
| Verificação/KYC | Upload multi-campo | 🔧 | **Stepper** com progresso; câmara para docs; estado claro |

**Nota**: o trabalho clínico do pediatra é **app-first**. A versão web (portal) existe para sessões longas/tablet, com master-detail — mas nunca é pré-requisito.

## Clínica — auditoria

| Workflow | Veredito | Decisão |
|---|---|---|
| Dashboard, equipa, permissões, faturação, relatórios | ⚠️ | **Web-primeiro** (gestão = tarefa de secretária/gestor). **App companion** para o essencial: ver operação, alertas de SLA, aprovar convites. Tabelas → cards em mobile companion. |

## Admin — auditoria

| Workflow | Veredito | Decisão |
|---|---|---|
| Validação, pagamentos/disputas, config comissões, relatórios, compliance | ⚠️ | **Backoffice web** (legítimo desktop). **App companion** apenas para **aprovações e alertas críticos** (validar pediatra, alerta de disputa/incidente) com push + ação rápida. |

---

## Padrões desktop banidos no app (pai/pediatra)
- ❌ Tabelas com scroll horizontal → **cards/listas**.
- ❌ Formulários longos numa página → **passos curtos** com guarda automático.
- ❌ Modais centrados pequenos → **bottom sheets**.
- ❌ Ações primárias no topo → **bottom-anchored**.
- ❌ Hover como requisito → tudo funciona por **toque**; estados explícitos.
- ❌ Multi-painel obrigatório → **1 coluna** no telefone; master-detail só como *enhancement* em ecrã grande.
- ❌ Date pickers de calendário denso para marcação → **chips de slots**.
- ❌ Upload "arrastar ficheiros" → **câmara/galeria/ficheiros** nativos.

## Resultado
- **100% dos workflows de pai e pediatra**: smartphone-primeiro, uma mão, ≤3 toques (validado na matriz do [doc 11](11-mobile-first-principles.md)).
- **Clínica/Admin**: web-densa por natureza, com **app companion** para o que é urgente/móvel — sem forçar gestão pesada no telemóvel nem trazer densidade desktop para o app do consumidor.
