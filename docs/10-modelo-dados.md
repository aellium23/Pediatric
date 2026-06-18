# 10 · Modelo de Dados Inicial

Esquema relacional (PostgreSQL). Convenções: `id` UUID, timestamps `created_at/updated_at`, soft-delete onde fizer sentido, encriptação a nível de coluna para dados de saúde sensíveis (pgcrypto/aplicação).

## ERD (texto)

```
User ──< FamilyMember >── Family ──< Child ──< ClinicalRecord
  │                                   │            ├─ ClinicalEpisode ──< Message
  │                                   │            └─ FileAsset
Pediatrician ──< PediatricianService                   │
  │           ──< Availability (Fase 2)                 │
  │           ──< Review                                │
Consultation ──┬─ (Child, Pediatrician, Family)         │
               ├─< Message ──< FileAsset ───────────────┘
               ├─ Payment ──< Refund
               ├─ Invoice (ato médico) / CommissionInvoice
               └─ ClinicalNote
Consent · AuditLog · Notification · Payout · TaxRule · Country
```

## Entidades principais

### identity
- **User**(id, role[`parent|pediatrician|admin`], auth_provider, phone, phone_verified, email, email_verified, mfa_enabled, status, locale, country_id, created_at)
- **Consent**(id, user_id, subject_type[`health_data|teleconsult|terms|privacy|marketing`], child_id?, version, granted_at, revoked_at, evidence_json) — *versionado e imutável*

### family & children
- **Family**(id, name, primary_user_id, country_id)
- **FamilyMember**(id, family_id, user_id, relationship[`mother|father|guardian`], permissions)
- **Child**(id, family_id, name, birth_date, sex, blood_type?, usual_doctor?, created_at)
  - **ChildHealthProfile**(child_id, allergies_json, current_medications_json, known_conditions_json) — *encriptado*
- **GrowthMeasurement**(id, child_id, date, weight, height, head_circ, percentiles_json) *(Fase 2)*
- **VaccineRecord**(id, child_id, vaccine, dose, date, source) *(Fase 2)*

### clinical records
- **ClinicalEpisode**(id, child_id, title, status[`open|closed|archived`], opened_at, closed_at)
- **ClinicalRecord**(id, child_id, episode_id?, type, author_id, content_json) — notas/relatórios
- **FileAsset**(id, owner_user_id, child_id, episode_id?, consultation_id?, type[`image|video|pdf|lab|prescription|report`], storage_key, mime, size, checksum, scan_status, encrypted, created_at)

### pediatricians & marketplace
- **Pediatrician**(id, user_id, license_number, license_verified_at, verified_by_admin_id, bio, experience_years, languages[], specialties[], status[`pending|active|suspended`], rating_avg, payout_account_id, tax_profile_id)
- **PediatricianService**(id, pediatrician_id, type[`message|async|video|second_opinion|prescription_renewal|follow_up`], price_cents, currency, sla_hours, scope_text, active)
- **Availability**(id, pediatrician_id, weekday, start, end, slot_minutes, buffer_minutes) *(Fase 2)*
- **Unavailability**(id, pediatrician_id, start_at, end_at, reason) *(Fase 2)*
- **Review**(id, consultation_id, family_id, pediatrician_id, rating, comment, verified, created_at)
- **Favorite**(family_id, pediatrician_id)

### consultations & messaging
- **Consultation**(id, family_id, child_id, pediatrician_id, service_id, type, status[`open|triage|answered|closed|archived|expired|refunded|disputed`], scope_snapshot, price_cents, currency, sla_due_at, opened_at, answered_at, closed_at, reopen_until)
- **TriageSubmission**(id, consultation_id, symptoms_json, fever_c, duration, red_flags_json, answers_json)
- **Message**(id, consultation_id, sender_user_id, body, ai_generated[bool], created_at)  — anexos via FileAsset
- **ClinicalNote**(id, consultation_id, pediatrician_id, content, summary_validated[bool], created_at)
- **AppointmentSlot / VideoSession**(id, consultation_id, scheduled_at, room_id, consent_id, started_at, ended_at) *(Fase 2)*

### payments & invoicing
- **Payment**(id, consultation_id, family_id, amount_cents, currency, method[`mbway|card|applepay|googlepay|multibanco`], psp[`stripe|sibs`], psp_ref, status[`authorized|captured|failed|refunded|charged_back`], hold_until, captured_at)
- **Split**(id, payment_id, platform_fee_cents, pediatrician_amount_cents, fee_model[`pct|fixed|hybrid`], pct, fixed_cents)
- **Refund**(id, payment_id, amount_cents, reason, status, created_by, created_at)
- **Payout**(id, pediatrician_id, amount_cents, currency, period_start, period_end, status, psp_ref, paid_at)
- **Invoice**(id, consultation_id, issuer[`pediatrician|platform`], recipient[`patient`], type[`invoice|credit_note`], partner_doc_id, atcud, qr_payload, saft_status, amount_cents, vat_cents, vat_regime, pdf_url, issued_at)
- **CommissionInvoice**(id, pediatrician_id, period, amount_cents, vat_cents, partner_doc_id, atcud, pdf_url, issued_at)

### platform / config
- **Country**(id, code, currency, default_locale, active)
- **TaxRule**(id, country_id, service_type, vat_rate, exemption_code?, valid_from, valid_to) — *regras plugáveis por país*
- **CommissionRule**(id, scope[`global|country|pediatrician|plan|service_type`], ref_id?, model, pct, fixed_cents, valid_from)
- **Subscription**(id, family_id?/pediatrician_id?, plan_id, status, current_period_end) *(Fase 3)*
- **Notification**(id, user_id, channel, template, payload, status, sent_at)
- **AuditLog**(id, actor_user_id, action, entity_type, entity_id, ip, user_agent, metadata_json, created_at) — *append-only, dados de saúde tratados como acesso auditável*

## Notas de modelação
- **Segregação por família e por criança**: toda a leitura de dados clínicos passa por verificação de pertença (`family_id`) + permissões do `FamilyMember`. RBAC + row-level security (RLS) no Postgres como defesa em profundidade.
- **Imutabilidade clínica/legal**: `Message`, `Invoice`, `Consent`, `AuditLog` não são editáveis; correções via novos registos/notas de crédito.
- **Encriptação**: campos de saúde (`ChildHealthProfile`, conteúdos clínicos) encriptados; ficheiros encriptados em repouso (KMS).
- **Retenção**: políticas por tipo (clínico vs faturação — faturação tem retenção legal mínima em PT, tipicamente 10 anos; clínico segue normas próprias) — confirmar com advogado/contabilista (doc 18).
- **Multi-moeda**: valores sempre em `cents` + `currency`.
