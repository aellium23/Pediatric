# 08 · Backlog MVP Priorizado

Priorização **MoSCoW** (Must / Should / Could / Won't-now) para a **Fase 1 — MVP Portugal**. O objetivo do MVP é provar: *pediatras verificados respondem a consultas pagas por mensagem, com faturação compliant e comissão da plataforma.*

## Épicos do MVP

| ID | Épico | Prioridade |
|----|-------|-----------|
| E1 | Contas & Identidade (pais) | Must |
| E2 | Perfil familiar & arquivo da criança | Must |
| E3 | Onboarding & validação de pediatras | Must |
| E4 | Marketplace & perfil público | Must |
| E5 | Consulta paga por mensagem + SLA | Must |
| E6 | Upload e gestão de ficheiros clínicos | Must |
| E7 | Pagamentos + split + comissão | Must |
| E8 | Faturação compliant (parceiro certificado) | Must |
| E9 | Consentimentos, termos & privacidade | Must |
| E10 | Backoffice / Admin | Must |
| E11 | Notificações | Should |
| E12 | Triagem estruturada + sinais de alarme | Should |
| E13 | Avaliações verificadas | Should |
| E14 | Dashboard financeiro do pediatra | Should |

## Histórias por épico (Must)

### E1 · Contas & Identidade (pais)
- Como pai, registo-me por **telefone/email/Apple/Google** e verifico contacto por OTP. *(Must)*
- Aceito **Termos + Privacidade** versionados; registo é guardado. *(Must)*
- Recuperação de conta / reautenticação. *(Must)*

### E2 · Perfil familiar & arquivo da criança
- Crio **perfil familiar** e adiciono **crianças** (nome, DN, género, alergias, medicação, doenças, médico habitual). *(Must)*
- Dou **consentimento parental** para dados de saúde do menor (registado). *(Must)*
- Vejo o **arquivo** por criança (ficheiros, histórico). *(Must)*

### E3 · Onboarding & validação de pediatras
- Registo-me como pediatra; submeto **identidade + cédula + IBAN + dados fiscais**. *(Must)*
- Admin **valida** e ativa o perfil. *(Must)*
- Defino **preços por tipo de consulta, SLA, âmbito, disponibilidade básica**. *(Must)*

### E4 · Marketplace & perfil público
- Como pai, **procuro/filtro** pediatras e vejo **perfil público** (badge de verificação, idiomas, preços, SLA, rating). *(Must)*
- Marco **favorito**. *(Should)*

### E5 · Consulta paga por mensagem + SLA
- Vejo **preço, SLA e âmbito** antes de pagar. *(Must)*
- **Pré-pago/autorizo**, envio questão + anexos; cria-se `Consultation`. *(Must)*
- Pediatra responde dentro do SLA; estados `aberta→respondida→encerrada`. *(Must)*
- **Reembolso automático** se SLA falhar. *(Must)*
- Reabertura dentro de janela. *(Should)*

### E6 · Ficheiros clínicos
- Upload de **imagem/vídeo/PDF**; pré-visualização; vírus-scan; associação a criança/episódio. *(Must)*
- Storage **encriptado**; URLs assinados de curta duração. *(Must)*

### E7 · Pagamentos + split + comissão
- **MB WAY + cartão** no MVP (Apple/Google Pay logo a seguir). *(Must)*
- **Hold → capture no fecho**; **split** automático comissão/pediatra. *(Must)*
- **Payout** ao pediatra. *(Must)*
- Reembolsos. *(Must)*

### E8 · Faturação compliant
- Integração com **parceiro certificado AT**; emissão com **NIF/ATCUD/QR**; **SAF-T**. *(Must)*
- Documentos separados: ato médico vs comissão. *(Must)* *(modelo a fechar — doc 12)*

### E9 · Consentimentos, termos & privacidade
- Fluxos de consentimento versionados (dados de saúde, teleconsulta). *(Must)*
- Pedidos RGPD (acesso/eliminação) — processo (pode ser semi-manual no MVP). *(Must)*

### E10 · Backoffice / Admin
- Gestão de utilizadores; **validação de pediatras**; gestão de pagamentos/reembolsos/disputas; **trilho de auditoria**; relatórios básicos. *(Must)*

## Should / Could

- **E11 Notificações** push + email (SMS/WhatsApp depois). *(Should)*
- **E12 Triagem + sinais de alarme** com encaminhamento SNS 24. *(Should — forte recomendação de incluir por segurança)*
- **E13 Avaliações verificadas**. *(Should)*
- **E14 Dashboard financeiro** do pediatra. *(Should)*
- Episódios clínicos como agrupador. *(Could no MVP, Must na Fase 2)*
- Resumos AI (rascunho). *(Could — pode entrar tarde no MVP)*

## Won't (agora — ficam para Fase 2/3)
Videochamada, agenda avançada, subscrições, clínicas, seguradoras, percentis/vacinas/medicação, biblioteca de conteúdos, partilha entre médicos, AI de triagem.

## Definição de "Pronto" (DoD) do MVP
- Fluxo **pai → consulta paga → resposta → fecho → fatura → comissão** funcional ponta-a-ponta.
- **RGPD**: consentimentos, encriptação em trânsito/repouso, segregação por família/criança, logs de acesso.
- **Faturação**: documento válido AT emitido em ambiente real (com parceiro).
- **Segurança**: MFA para pediatras, RBAC, backups, plano básico de incidentes.
- **Legal**: termos/política revistos por advogado; DPIA iniciada.

## Sequência sugerida de entrega (sprints)
1. Auth + perfis (pais e pediatras) + consentimentos.
2. Arquivo da criança + uploads.
3. Marketplace + perfil público + validação de pediatra (backoffice).
4. Consulta por mensagem + estados + SLA.
5. Pagamentos (hold/capture/split) + reembolso.
6. Faturação (parceiro) + payouts + dashboard básico.
7. Notificações + triagem/sinais de alarme + avaliações + hardening de segurança.
8. Beta fechado com 20–40 pediatras e respetivas famílias.
