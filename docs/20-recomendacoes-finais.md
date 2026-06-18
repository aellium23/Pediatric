# 20 · Recomendações Finais para Lançar o MVP em Portugal

## Os 10 movimentos certos

1. **Legal-first, não tech-first.** Antes de escrever código de pagamentos/faturação, feche com fiscalista o **Modelo A** (pediatra fatura o ato médico; plataforma fatura comissão) e arranque a **DPIA**. É o que torna o negócio defensável e diferencia de "um WhatsApp pago".

2. **Lance supply-led.** Recrute **30–80 pediatras de referência** em Lisboa/Porto. Eles trazem as famílias (canal barato e de alta confiança). A oferta verificada é o ativo escasso; comece por ela.

3. **MVP estreito e profundo.** Só **consulta paga por mensagem**, ponta-a-ponta, impecável: preço/SLA/âmbito transparentes → pré-pagamento → resposta no SLA → fecho com resumo validado → **fatura certificada** → **comissão**. Vídeo e agenda ficam para a Fase 2.

4. **Compre a faturação, não a construa.** Integre um **parceiro certificado AT** com **emissão por conta de terceiros** (multi-emitente). Certificar software próprio é desperdício nesta fase.

5. **Stripe Connect com MB WAY ativo** para velocidade e split + KYC integrados; abstraia a camada de pagamentos para juntar **SIBS** quando o volume justificar. Pré-pagamento/escrow + **reembolso automático se o SLA falhar** = confiança imediata dos pais.

6. **Segurança e privacidade visíveis.** MFA para pediatras, encriptação forte, segregação por criança, consentimentos versionados, AuditLog. Faça **pentest antes do beta**. Isto é simultaneamente compliance e **argumento de marketing** ("os dados do seu filho protegidos como deve ser").

7. **Não seja dispositivo médico.** AI e "sinais de alarme" apenas **administrativos/informativos**; **decisão sempre humana**. Avisos inequívocos de **não-emergência** com encaminhamento para **SNS 24 (808 24 24 24)** e urgência. Confirme a fronteira com jurista de MDR.

8. **Profissionalize a relação, não a substitua.** O valor não é "chat barato" — é **âmbito clínico, registo, faturação, pagamento garantido e organização por criança/episódio**. Combata a desintermediação com utilidade real, não com bloqueios.

9. **Tom premium, humano e tranquilizador** em toda a UX (ver doc 19). Mobile-first. Cada ecrã reduz ansiedade do pai e poupa tempo ao médico.

10. **Beta fechado e medido.** 20–40 pediatras + famílias; instrumentar a **North Star** (consultas pagas concluídas no SLA), taxa de reembolso, CSAT, e tempo de validação de pediatra. Iterar 4–8 semanas antes de abrir Lisboa/Porto.

## Sequência de execução recomendada (resumo)
```
Fase 0: Fiscal (Modelo A) + DPIA/DPO + pareceres ERS/Ordem/MDR + PSP/faturação escolhidos + protótipo UX validado
   ↓ (gate: modelo viável)
Fase 1: Auth+perfis → arquivo da criança → marketplace+validação → chat pago+SLA → pagamentos+split → faturação+payouts → hardening+pentest
   ↓ (gate: fluxo ponta-a-ponta + fatura real + segurança)
Beta fechado (Lisboa/Porto) → lançamento limitado
```

## Critérios de sucesso do MVP (go/no-go para escalar)
- ✅ Fluxo **pai → consulta paga → resposta no SLA → fecho → fatura AT real → comissão** a funcionar de forma fiável.
- ✅ **% de SLA cumprido** alta e **taxa de reembolso** baixa.
- ✅ **CSAT/NPS** de pais e pediatras positivos.
- ✅ Pediatras a **repetir** (recebem e voltam a responder) e a **convidar** famílias.
- ✅ Zero incidentes de segurança/compliance graves; DPIA fechada; pareceres regulatórios favoráveis.

## Riscos a vigiar de perto
- **Regulatório (ERS/Ordem/MDR)** — pode obrigar a ajustes de modelo; resolver na Fase 0.
- **Fiscal (IVA/quem fatura)** — errar aqui é caro; fechar com fiscalista.
- **Desintermediação** — medir e contrariar com valor.
- **Liquidez do marketplace** — sem pediatras ativos não há produto; foco obsessivo na oferta.

## Mensagem final
O comportamento já existe — pais já consultam pediatras por mensagem. A oportunidade não é criar um hábito, é **formalizá-lo com segurança, justiça e compliance**. Ganha quem construir **confiança** (verificação, privacidade, registo) e **conveniência** (pagamento e faturação invisíveis, resposta no SLA) antes que um generalista verticalize. Comece estreito, legal-first, supply-led, e premium.
