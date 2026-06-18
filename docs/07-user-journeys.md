# 07 · User Journeys

Jornadas ponta-a-ponta. Notação: **[Pai]**, **[Pediatra]**, **[Sistema]**, **[Admin]**.

---

## J1 · Pai cria conta
1. **[Pai]** abre app → "Começar".
2. Escolhe método: telefone, email, **Apple/Google**, rede social.
3. **[Sistema]** envia OTP (SMS/email) → verificação de contacto.
4. **[Pai]** aceita **Termos** + **Política de Privacidade** (versão registada).
5. Cria **perfil familiar** (nome da família, encarregado principal).
6. **[Sistema]** cria conta; KYC leve (nome). KYC reforçado só se necessário para faturação/pagamento.

## J2 · Pai adiciona criança
1. **[Pai]** → "Adicionar criança".
2. Preenche: nome, **data de nascimento**, género, alergias, medicação atual, doenças conhecidas, médico habitual.
3. **Consentimento parental** explícito para tratamento de **dados de saúde** do menor (categoria especial) — ecrã dedicado, registado com timestamp e versão.
4. Opcional: upload de vacinas, análises, relatórios; declara responsabilidade parental.
5. **[Sistema]** cria `Child` segregada; inicia arquivo clínico.

## J3 · Pai escolhe pediatra (marketplace)
1. **[Pai]** explora **marketplace**: filtra por especialidade, idioma, preço, rating, disponibilidade.
2. Vê **perfil público**: cédula validada (badge), experiência, idiomas, preços por tipo, SLA, condições, avaliações verificadas.
3. Marca como **favorito** ou inicia consulta.

## J4 · Pai inicia consulta por mensagem
1. Seleciona **criança** + **tipo de consulta** (mensagem única / pacote / follow-up).
2. **[Sistema]** mostra **preço, SLA, âmbito e exclusões**; checkbox "compreendo que não substitui urgência".
3. **Triagem estruturada**: sintomas, febre (ºC), duração, sinais de alarme, anexos.
4. **[Sistema]** se deteta sinal de alarme → **aviso de encaminhamento** (SNS 24/urgência), pai confirma que entende.
5. **Pagamento/autorização** (MB WAY/cartão/Apple/Google Pay). Fundos em **hold/escrow**.
6. **[Sistema]** cria `Consultation` (estado `aberta`), notifica pediatra, arranca **SLA timer**.

## J5 · Pediatra responde
1. **[Pediatra]** recebe push; vê questão + triagem + anexos + **resumo AI (rascunho)** + histórico da criança.
2. Estado → `em_triagem`. Pede esclarecimento se preciso (dentro do âmbito).
3. Responde com indicações; pode anexar receita/relatório.
4. **[Sistema]** estado → `respondida`; SLA cumprido marca pagamento como **capturável**.

## J6 · Pediatra fecha consulta
1. **[Pediatra]** redige/valida **resumo clínico** (edita rascunho AI) + recomendações + "quando procurar urgência".
2. Encerra → estado `encerrada`; pai pode **reabrir** dentro de janela (ex.: 48h) sem custo (regra configurável).
3. **[Sistema]** **captura o pagamento**, calcula **split** (comissão plataforma / valor pediatra).
4. **[Pai]** convidado a deixar **avaliação verificada**.

## J7 · Pai agenda videochamada
1. **[Pai]** escolhe pediatra → "Videochamada" → vê **slots disponíveis**.
2. Seleciona slot (fuso correto) → **consentimento informado teleconsulta** → **pagamento no momento da marcação**.
3. **[Sistema]** cria evento, envia para calendário (ICS), agenda **lembretes** (push/SMS/email).
4. No horário: **sala de espera** → verificação câmara/micro → consulta.
5. **[Pediatra]** regista **notas clínicas**; envia **resumo pós-consulta**.
6. **[Sistema]** captura pagamento + split + fatura.

## J8 · Fatura é emitida
1. Na **captura do pagamento**, **[Sistema]** chama o **parceiro de faturação certificado**.
2. Emite documento(s) conforme o modelo jurídico escolhido (ver [doc 12](12-faturacao-portugal.md)):
   - Fatura do **ato médico** ao paciente (emitente: pediatra ou plataforma em nome/por conta).
   - Fatura/nota da **comissão** da plataforma ao pediatra.
3. Documento com **NIF, ATCUD, QR Code**; **SAF-T** comunicado à AT.
4. **[Pai]** e **[Pediatra]** recebem os respetivos documentos (download + email).

## J9 · Plataforma cobra comissão (split)
1. No fecho, o **split** retém a comissão (ex.: 20% + fee) e aloca o restante ao **saldo do pediatra**.
2. **Payout** ao pediatra conforme calendário (ex.: semanal) para IBAN verificado.
3. **[Pediatra]** vê no **dashboard financeiro**: receita bruta, comissões, líquido, pendentes, faturas.

## J10 · Reembolso / disputa (exceção)
1. SLA falhado ou pedido legítimo → **[Pai]** ou **[Sistema]** inicia reembolso.
2. **[Admin]** arbitra disputas; reembolso total/parcial; estorno do split; **nota de crédito** emitida.
3. Chargeback de cartão → fluxo de contestação com evidências (registo da consulta).

## J11 · Admin valida pediatra (onboarding da oferta)
1. **[Pediatra]** regista-se → submete **identidade (KYC)** + **cédula da Ordem dos Médicos** + IBAN + dados fiscais.
2. **[Admin]** verifica cédula (e, idealmente, no portal da Ordem) + identidade.
3. Aprova → perfil público ativo; ou pede correções.
4. **[Sistema]** cria conta conectada de pagamentos (Stripe Connect / SIBS) com onboarding KYC do processador.

---

### Mapa de estados de uma consulta (resumo)
```
aberta → em_triagem → respondida → encerrada → arquivada
   │                       │
   ├──(SLA falhou)──► expirada ──► reembolsada
   └──(pedido)──────► disputa ──► reembolsada/parcial
```
