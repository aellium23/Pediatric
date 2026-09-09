# Child Health OS — Board-Level Report
### Building the leading European Digital Child Health Platform

**Prepared by:** Advisory Board (Strategy, Ventures, Product, Engineering, Security, Compliance, Legal, Tax, Finance, Brand, Growth)
**For:** The two founders (Founder 1 — 30y IT/Healthcare/exec; Founder 2 — 21y IT/eng/cloud/architecture) · Company: **DES** (holding) · Live product: **HOC — Healthcare on Call**
**Thesis:** Not another telemedicine app. **The permanent digital health record and digital home for every European child — pregnancy to adulthood.** Telepediatrics is *one service* inside a broader platform. Capital-efficient, security-first, AI-leveraged, bootstrap-to-PMF.

> Grounding note: this plan builds on an already-deployed MVP (Next.js PWA + NestJS/Prisma/Postgres, field-level AES-256-GCM, RBAC/JWT rotation, consent gating, WHO LMS percentiles, coded clinical entry ICPC-2/ATC/PNV, marketplace + scheduling + video, Stripe-split scaffolding, ~30-article validated content library, backoffice by role). The company thesis leverages that head start.

---

## 1. Executive Summary

**What we are building.** A consumer-first, clinician-grade **Child Health Operating System**: one trusted place where a parent keeps the complete, portable, longitudinal health record of each child — documents, growth, vaccines, medication, milestones, reports, imaging — and, *within the same app*, reaches pediatric care (message, video, second opinion), clinics, and (later) labs, hospitals and insurers via standards-based interoperability (FHIR/HL7).

**Why now.** (1) Child-health data is fragmented across WhatsApp, email, paper, portals and hospital silos; (2) pediatricians give unpaid, insecure after-hours support with no system of record; (3) the **European Health Data Space (EHDS)** regulation (in force 2025, phased application ~2027–2029) mandates patient access and cross-border exchange of electronic health records — creating a regulatory tailwind for a citizen-held, interoperable record; (4) AI can finally automate the administrative burden (document understanding, summaries, plain-language explanations) without diagnosing.

**Why us.** Two founders with 30+21 years in Healthcare IT, PACS/RIS/VNA, interoperability, cloud, cybersecurity and AI can build a security-and-interop moat that consumer-only teams cannot. This is a **founder-market fit** rarely available to a child-health consumer play.

**Model.** Freemium consumer record (free) → **Family Premium subscription** (AI + storage + advanced tracking) as the recurring-revenue engine, complemented by a **pediatric marketplace take-rate** and **clinic SaaS**, later **insurance/B2B2C** and **white-label**. Diversified but subscription-anchored.

**Capital strategy.** Bootstrap through PMF. Keep fixed costs < €10–15k/month in Year 1. Automate onboarding, billing, support and content with AI. Hire only after PMF signal. Raise a **seed only from a position of strength** (traction + EHDS timing) to fund the Spain/EU expansion — or stay default-alive and grow on cash.

**Ambition.** Portugal beach-head → Iberia → EU. Target: the first app a European parent opens when they think about their child's health. Enterprise value driven by recurring revenue, retention/engagement, a proprietary longitudinal dataset, clinical trust, and an interoperability moat that makes us the natural EHDS-era citizen record.

**The 5 decisions this report asks the board to ratify.**
1. **Reposition** from "telepediatrics" to "Child Health OS"; keep HOC as the near-term Iberian consumer brand, prepare a masterbrand for EU.
2. **Anchor revenue on Family Premium** (not marketplace commission).
3. **Stripe Connect + certified PT e-invoicing (API)** now; SIBS revisited at scale.
4. **Deliberately stay outside MDR SaMD** (AI never diagnoses) to avoid a 12–24 month regulatory detour.
5. **Bootstrap to PMF; raise seed (~€1.5–3M) only to accelerate Iberia/EU**, on our terms.

---

## 2. Company Vision

- **Mission:** Give every child a single, trusted, lifelong digital health record — and make parents' lives calmer and safer.
- **10-year vision:** The European citizen-held child health record and care platform; the default interface between families, pediatric professionals, clinics, labs, hospitals and insurers.
- **North-star behaviour:** Parents open the app **weekly** (log a symptom, check a percentile, store a report, read guidance), not only to book a consultation. Engagement — not consultation volume — is the leading indicator.
- **Values:** Trust above growth · Privacy is the product · Clinician-grade rigor · Radical simplicity · Capital efficiency · Build the boring, hard, defensible things (security, interop, data quality).

---

## 3. Business Plan (condensed)

**Beach-head:** Portuguese parents of children 0–6 (highest health-touch frequency: vaccines, growth, frequent illness) + their pediatricians. Land with the *free record + vault + growth/vaccine centre*; monetise with Premium + on-platform care.

**Wedge sequence:**
1. **Consumer record & vault (free)** → acquisition + weekly habit.
2. **Family Premium (paid)** → AI document understanding, unlimited storage, advanced growth/nutrition/sleep, multi-child, family sharing.
3. **Marketplace (paid)** → message/video/second-opinion with verified pediatricians (take-rate).
4. **Clinic SaaS** → multi-pediatrician scheduling, secretariat, finance (per-seat MRR).
5. **Interoperability/B2B** → FHIR record exchange; lab/hospital connectors; insurer hub.

**Operating principle:** every workflow that can be automated (KYC of clinicians, invoicing, reminders, content, tier-1 support, document parsing) is automated before it is staffed.

**Path to profitability:** contribution-positive per family from day one (near-zero marginal cost on the free tier; Premium and clinic SaaS carry >80% gross margin). Company EBITDA-positive when recurring gross profit covers the small fixed base — targeted **Year 3** in the expected case, achievable **Year 2** in the bootstrap/worst-case by holding costs flat.

---

## 4. Business Model Canvas

| Block | Content |
|---|---|
| **Customer segments** | Parents (0–18, focus 0–6); pediatricians (independent + clinic); pediatric clinics; later: labs, hospitals, insurers, employers |
| **Value propositions** | Parents: one trusted home for the child's whole health, calmer decisions, instant access to care. Pediatricians: paid, secure, structured async/video care + a real record + no-show-proof scheduling. Clinics: turnkey digital front-office. |
| **Channels** | App Store / Play Store, PWA, SEO/content, pediatrician ambassadors, maternity/pregnancy partners, clinics, referral loops |
| **Customer relationships** | Self-serve + AI assistant; community; clinician trust; high-touch only for clinics/B2B |
| **Revenue streams** | Family Premium (subscription) · marketplace take-rate · clinic SaaS · storage upsell · AI Premium · white-label/B2B · insurer integrations |
| **Key resources** | The longitudinal dataset; the codebase/IP; clinician network; brand/trust; founders' interop+security expertise; certifications (ISO 27001 path) |
| **Key activities** | Product/eng, clinical content governance, clinician onboarding/verification, security & compliance, growth |
| **Key partners** | Stripe + certified e-invoicing (Vendus/InvoiceXpress/Moloni/Cegid), EU cloud (AWS/OVH/Scaleway EU), Claude/LLM provider (EU DPA), clinician associations, maternity brands, DPO-as-a-service, medical advisory board |
| **Cost structure** | Cloud/storage, payment fees, LLM inference, SaaS tooling, security/audits, legal/DPO, part-time clinical/design/growth; founder comp minimal early |

---

## 5. Lean Canvas

- **Problem:** fragmented child-health info; unpaid/insecure pediatrician support; lost documents; no lifelong record.
- **Customer segments:** parents 0–6 (early adopters: first-time, digitally-native, higher-income urban); independent pediatricians.
- **Unique value proposition:** *"The digital home of your child's health — everything in one secure place, care one tap away."*
- **Solution:** record + vault + growth/vaccine/medication centres + AI admin assistant + marketplace.
- **Channels:** ambassadors, content/SEO, app stores, referrals, clinics.
- **Revenue:** Premium subscription + marketplace + clinic SaaS.
- **Cost:** cloud, payments, LLM, tooling, minimal staff.
- **Key metrics:** WAU/MAU, activation (record started + 1 doc + 1 child), Premium conversion, retention (M6/M12), marketplace GMV, clinic seats.
- **Unfair advantage:** founders' healthcare-IT/interop/security depth + a proprietary longitudinal dataset + EHDS timing + clinical trust.

---

## 6. Market Analysis

- **Regulatory tailwind (decisive):** EHDS entered into force **26 Mar 2025**; primary-use provisions (citizen access, European EHR Exchange Format, MyHealth@EU) phase in ~**2027–2029**. This mandates exactly the interoperable, citizen-held record we build — turning a "nice to have" into an aligned-with-law inevitability.
- **Demographics:** Portugal ~1.7M under-18 / ~85k births/yr; Spain ~7–8M under-18; EU-27 ~75M under-18. Pediatricians: PT ~2.5–3k; ES ~15k; EU large and fragmented.
- **Adjacent spend:** private pediatric consultations, health insurance for children, parenting/health apps, cloud storage — all currently uncaptured by a single child-centric platform.
- **Behaviour:** 0–6 is the highest-frequency health window (10+ vaccine visits, frequent acute illness, growth monitoring) → natural weekly-engagement wedge.
- **Trend stack:** value-based & preventive care, patient-held records, femtech/maternity digitisation, AI document understanding, EU data-sovereignty preference.

---

## 7. TAM / SAM / SOM

*Illustrative, defensible order-of-magnitude (annual, blended consumer + marketplace + B2B).*

| Layer | Definition | Size (rough) |
|---|---|---|
| **TAM** | EU-27 digital child-health (records, care marketplace, clinic SaaS, interop/insurer) across ~75M children | **€8–12B/yr** |
| **SAM** | Portugal + Spain + 3–4 early EU markets; families willing to pay + on-platform care + clinic SaaS | **€800M–1.5B/yr** |
| **SOM (3–5 yr)** | Realistic capture: PT leadership + ES entry. e.g. 300–500k active families, 5–10% Premium, marketplace + clinics | **€10–25M ARR** |

Bottoms-up sanity (expected, Year 5): ~400k active families × 8% Premium × €65 = ~€2.1M; + marketplace GMV ~€12M × 18% = ~€2.2M; + clinics 400 seats × €60 × 12 = ~€0.3M; + B2B/interop/insurer pilots. Blended **€10–18M ARR** achievable capital-efficiently; upside from insurer/white-label deals.

---

## 8. Competitive Analysis

| Category | Examples | Their gap we exploit |
|---|---|---|
| Telemedicine | Kry/Livi, Knok (PT), Top Doctors | Episodic, adult-generalist, no lifelong child record |
| Booking | Doctolib, Top Doctors | Directory/scheduling, not a record or a home; not child-centric |
| Patient record / PHR | Apple Health, national portals (SNS 24/área do cidadão) | Not child-specific, not family-shared, weak documents/AI, no care layer |
| Parenting/tracker apps | Growth/vaccine trackers, maternity apps | Consumer-only, not clinician-grade, no care, no interop, no record portability |
| Health insurers' apps | Alan (FR), insurer portals | Payer-locked, not neutral, not child-centric |

**Our differentiation:** child-centric + lifelong record + **neutral** (not payer/provider-locked) + clinician-grade + AI admin + EHDS-native interoperability. The founders' PACS/RIS/VNA/interop background is a moat competitors can't easily copy: we can ingest and normalise real medical documents/imaging and speak FHIR fluently.

---

## 9. SWOT

- **Strengths:** founder-market fit (Healthcare IT/interop/security); working MVP; capital efficiency; neutrality; EHDS alignment.
- **Weaknesses:** two-sided cold-start (parents ↔ pediatricians); consumer brand/marketing not the founders' core; small initial team; PT market size alone insufficient → must expand.
- **Opportunities:** EHDS mandate; AI cost curve; insurer/employer channels; white-label to hospitals/clinics; Iberia → EU roll-up.
- **Threats:** incumbents (Doctolib/Kry) moving down-market; national portals expanding; regulatory drift into MDR if AI oversteps; trust/breach risk is existential in child-health.

---

## 10. Positioning Strategy

- **Company (DES):** a European health-data & digital-care company; trust and engineering as the brand.
- **Product:** *"The Digital Home of Children's Health"* / *"The permanent health record for every child."*
- **Against telemedicine:** care is a feature, the **record + peace of mind** is the product.
- **Wedge message (parents):** *"Everything about your child's health — in one safe place. And a pediatrician, one tap away."*
- **Wedge message (pediatricians):** *"Get paid for the help you already give — securely, with a real record behind it."*
- **Proof pillars:** security (healthcare-grade), neutrality (you own your data, portable), clinician-validated content, EU data residency.

---

## 11. Brand Strategy

- **Brand architecture:** near-term keep **HOC — Healthcare on Call** (already live, Iberian) as the consumer/marketplace brand; position a **child-health masterbrand** for EU scale. Company **DES** as holding.
- **Naming strategy (EU):** criteria — short, pronounceable in PT/ES/EN/FR/DE, `.com`/`.eu` + iOS/Android app-name availability, EU-trademark clearable (classes 9/10/44/42/36), no clinical over-claim. Directions to workshop: a warm child-health masterbrand (evokes "home/nest/growth/shield") + descriptor "Child Health". Decide via a 2-week naming + trademark-clearance sprint before ES launch; do **not** rename PT users mid-flight.
- **Brand story:** built by two brothers from Healthcare IT who refused to let their own children's health live in WhatsApp and paper. Trust, calm, competence.
- **Tagline options:** "Every child's health, in one place." · "The home of your child's health." · "Grow up healthy. Stay organised."
- **Identity:** the existing navy + gold, ECG-through-the-O mark is a strong, premium, distinctive asset — evolve, don't discard; extend to a warmer, parent-friendly system (soft, safe, human) while keeping the clinical credibility.
- **Tone:** reassuring, plain-language, never alarmist, never diagnostic.

---

## 12. Product Strategy

**Principle:** win the **record + habit** first; care and B2B follow the data.

**Pillars (as productised modules):**
1. **Child Health Record** — problems (ICPC-2), meds (ATC), allergies, vitals, encrypted.
2. **Family Health Vault** — documents/imaging, AI-parsed, SSE-KMS, per-child, shareable with consent.
3. **Growth & Development** — WHO percentiles (built), milestones, nutrition, sleep.
4. **Vaccination Centre** — PNV schedule, due/overdue alerts (built), certificates.
5. **Medication Centre** — reminders, history, drug-allergy conflict alert (built).
6. **Family Timeline** — one chronological view of everything.
7. **AI Health Assistant** — *never diagnoses*; organises, extracts (allergies/meds/vaccines from PDFs & photos), prepares consultation summaries, explains reports in plain language, drafts admin.
8. **Pediatric Marketplace** — directory, messaging, video, scheduling, payments, second opinion (built).
9. **Clinic Platform** — multi-pediatrician, secretariat, scheduling, finance (built).
10. **Insurance Hub** — architecture-ready; claims/eligibility/benefit integration later.
11. **Interoperability** — FHIR R4 resources, HL7v2 ingest, lab/hospital connectors, wearables later; EHDS EEHRxF alignment.

**Data moat design:** every interaction enriches a structured, coded, longitudinal record → improves AI, retention, interop value, and B2B/insurer relevance.

---

## 13. Product Roadmap (5 years)

- **Y1 (PMF):** polish record+vault+growth+vaccine+meds; AI document extraction (allergies/vaccines/meds) + report explainer; Premium subscription; native iOS/Android (Flutter) v1; PT marketplace GA; Saber+ content engine; passkeys/biometrics.
- **Y2 (Iberia):** Spanish localisation + PNV/vaccine schedule ES; clinic SaaS GA; FHIR export/import v1; lab-result ingestion (major PT/ES labs); referral/growth loops; ISO 27001 kick-off.
- **Y3 (scale + interop):** hospital connectors; EHDS EEHRxF read; imaging viewer (founders' PACS/VNA edge); insurer pilots; corporate wellness pilot; white-label v1; expand to 1–2 new EU markets.
- **Y4 (platform):** insurance hub GA; wearables; developer/API + partner ecosystem; multi-country compliance automation.
- **Y5 (category leader):** EU multi-market; data-network-effect features; M&A of local point solutions; enterprise/insurer contracts anchor ARR.

---

## 14. UX Strategy

- **Mobile-first (95% mobile), native iOS + Android via Flutter**, one-handed, ≤3 taps to primary actions, Dark Mode, WCAG 2.2 AA, offline-first for record/vault reads, push, deep links, passkeys + Face/Touch ID.
- **Benchmarks:** Apple Health (data trust), Revolut (fintech polish/security feel), Notion (flexible structure), Uber/Airbnb (frictionless transactions).
- **Design system:** extend the current tokens (theme-adaptive) into a full HIG + Material-compliant native system; premium, calm, safe.
- **Guardrails:** never show clinical jargon to parents (already moved growth alerts to percentile language); AI outputs always labelled informational + "talk to your pediatrician".
- **Trust UX:** visible security (biometric lock, "your data, encrypted, in the EU"), consent transparency, export/delete in-app (built).

---

## 15. Technical Architecture

- **Now:** modular monolith (NestJS/Prisma/Postgres) + Next.js PWA — correct for this stage (low ops, fast iteration). Evolve to selective services only where scale demands (video, AI/document pipeline, notifications, interop).
- **Data:** Postgres (managed, EU region) + object storage (S3-compatible EU, SSE-KMS) for documents/imaging; field-level AES-256-GCM for special-category data (built); per-tenant isolation; event log/outbox.
- **Interop layer:** FHIR R4 facade (HAPI FHIR or native resources) + HL7v2 ingest + terminology (SNOMED CT/LOINC/ICPC-2/ATC mapping); EHDS EEHRxF adapter. This is the founders' home turf and a durable moat.
- **AI/document pipeline:** async OCR + LLM extraction (allergies/meds/vaccines/labs) with human-in-loop, EU processing, no training on patient data, strict output schemas.
- **Mobile:** Flutter (single codebase, near-native), platform-channel for passkeys/biometrics/health-kit later.
- **Cloud:** EU-only (AWS eu-west/eu-central or OVH/Scaleway for sovereignty); IaC; autoscaling; CDN; managed video (LiveKit EU self-host — already integrated) for the 10k concurrent target.
- **Scale path:** read replicas, partitioning by family/tenant, object-store for the 100M-document target, queue-based async, stateless API tier — supports 1M families / 50k consults-day / 10k concurrent video without redesign.

---

## 16. Security Architecture

- **Principles:** Security & Privacy by Design, Zero Trust, Defense in Depth (already the codebase philosophy).
- **Identity:** OAuth 2.1 / OIDC, **passkeys** + MFA, RBAC + ABAC (built), device trust, short-lived access tokens + rotating refresh with reuse detection (built), session revocation on erasure (built).
- **Data:** encryption in transit (TLS 1.3) + at rest (KMS) + field-level AES-256-GCM for PHI (built); key management/rotation; tokenised storage keys.
- **App/mobile:** WAF, rate-limiting/bot defense, certificate pinning, jailbreak/root detection, secure enclave for keys, obfuscation, anti-reverse-engineering.
- **Ops:** SIEM + centralised audit logs (immutable audit trail built), IDS, secrets management, least-privilege IAM, signed builds, SBOM + supply-chain scanning (SAST/SCA/secret-scanning in CI — active; the recent CodeQL alert was triaged as a false positive and hardened).
- **Resilience:** encrypted backups, tested DR/RTO-RPO, ransomware-resistant immutable backups, incident-response runbook, breach-notification process.
- **Assurance roadmap:** external pen test pre-scale; **ISO 27001** (Y2) and **SOC 2 Type II** (Y3) to unlock clinics/insurers/enterprise.
- **Non-negotiable:** in child health, one breach is existential. Security spend is never the cost to cut.

---

## 17. AI Strategy

- **Hard rule:** AI **never diagnoses, triages to a diagnosis, or gives individualised medical advice.** It is administrative/organisational + explanatory. This keeps us **out of MDR SaMD** and preserves trust.
- **Use cases:** document understanding (OCR + extract allergies/vaccines/meds/labs into the structured record), consultation prep summaries for parent & clinician, plain-language explanation of reports, smart reminders, content drafting (clinician-reviewed), tier-1 support automation, internal ops (clinician KYC checks, billing reconciliation).
- **Guardrails:** strict output schemas, confidence + human-in-loop for anything entering the record, "informational only / talk to your pediatrician" labelling, red-flag → "seek care" static rules (not AI-decided).
- **Data governance:** EU processing + DPA with the LLM provider (e.g., Anthropic/Claude), **no training on patient data**, PII minimisation/redaction before inference, full audit of AI actions.
- **Monetisation:** "AI Premium" as a subscription tier lever (unlimited document parsing, deep report explainers, family summaries).

---

## 18. Payments Architecture

- **Recommendation: Stripe Connect (Express)** as primary — fastest to marketplace GA, best DX, supports **MB WAY, Multibanco, Apple Pay, Google Pay, cards**, automatic split (application fee/transfer), Connect KYC for clinicians. (Split scaffolding already built.)
- **SIBS Marketplace:** revisit at PT scale to reduce domestic fees on MB WAY/Multibanco; dual-rail optionality later.
- **Flows:** consumer subscription (Stripe Billing) + marketplace split (pediatrician receives medical-act amount, platform retains commission) + clinic SaaS billing.
- **Ops:** webhook-driven reconciliation, idempotency, dunning, SCA/PSD2 compliance, refund/dispute state machine (refund guards already hardened).

---

## 19. Fiscal / Invoicing Architecture (Portugal → EU)

- **Who invoices whom:** the **pediatrician** issues the medical-act invoice to the family (medical services **VAT-exempt**, CIVA art. 9); the **platform** issues a **commission/intermediation invoice** to the pediatrician (**standard 23% VAT**). Clinic SaaS + Premium subscriptions invoiced by the platform (VAT per rules; e-services). (This is the model already scaffolded in the invoicing module.)
- **Money flow:** Stripe Connect splits at capture — pediatrician's share to their connected account, platform commission retained. Subscriptions collected by platform.
- **PT compliance:** integrate a **certified e-invoicing provider via API** (Vendus, InvoiceXpress, Moloni, or Cegid/PHC) for **ATCUD + QR + SAF-T (PT)**; do not hand-roll certified invoicing. AT communication handled by the provider.
- **International scale:** VAT **OSS** for cross-border B2C e-services; per-country medical-service VAT treatment reviewed with local counsel; consider IP/holding structure (below) for efficiency.
- **Action:** engage a PT tax adviser to confirm intermediation VAT treatment and the certified-provider choice before charging real commissions.

---

## 20. Legal Structure

- **Operating company:** **Lda. (Portugal)** for speed/cost. Consider a **holding (Lda. or SGPS)** to hold IP/brand and receive future investment (cleaner cap table, IP ring-fencing, exit efficiency) — validate cost/benefit with counsel given bootstrap stage (don't over-engineer on day 1).
- **Cap table:** two founders; decide split candidly (50/50 is simplest but requires a strong deadlock/tie-break mechanism; a 51/49 or defined lead avoids paralysis). **Founder vesting (4-year, 1-year cliff)** even for founders — protects both brothers.
- **Agreements:** Founders' Agreement + Shareholders' Agreement (reserved matters, tag/drag, transfer restrictions, deadlock resolution, IP assignment, good/bad-leaver), **ESOP 8–12%** pool for first key hires/advisors.
- **Governance:** 2-founder board initially + **Advisory Board** (pediatrician KOL, healthcare lawyer, security/interop expert, growth). Formal board post-seed.
- **IP:** all code/brand assigned to the company; trademark filings (PT/EU) for the masterbrand before ES launch.

---

## 21. Go-To-Market Strategy

- **Beach-head:** Portugal, parents 0–6, urban, digitally-native, higher-income; and their pediatricians.
- **Two-sided cold-start solution:** seed the **supply** (pediatrician ambassadors — 20–50 credible early adopters, revenue + record value + no-show-proof scheduling as the hook) which pulls **demand** (their patients' families) → then broaden consumer acquisition on the free record.
- **Channels (ranked):**
  1. **Pediatrician & clinic ambassadors** (highest trust, two-sided).
  2. **Content/SEO** — the validated Saber+ library is an acquisition asset (fever, vaccines, sleep… high-intent parent search).
  3. **Maternity/pregnancy partnerships** (start the record at pregnancy — the earliest wedge).
  4. **Referral loops** (family sharing → co-parent/grandparent invites; pediatrician invites patients).
  5. **App Store / Play ASO** + community (parent groups), PR (founder story + EHDS angle), selective paid.
- **Iberia:** replicate with ES pediatric associations + localisation; then FR/other EU with EHDS interop as the enterprise wedge.
- **B2B motion:** clinics (SaaS), then insurers/employers (child-health benefit) once the consumer graph + record exist.

---

## 22. Pricing Strategy

- **Free:** record + vault (limited storage) + growth/vaccine/meds basics + read-only sharing → acquisition + habit.
- **Family Premium:** **€59–79/yr (≈€5–7/mo)** — AI document parsing, unlimited storage/imaging, advanced growth/nutrition/sleep, multi-child, family sharing, report explainers, priority. Annual-billed for cash + retention.
- **Marketplace:** **18–20% take-rate** on message/video/second-opinion (family pays clinician fee + platform fee).
- **Clinic SaaS:** **€39–99/seat/month** by tier (scheduling → secretariat → finance/analytics).
- **AI Premium / storage:** upsell within Premium or add-on.
- **B2B/insurer/white-label:** custom (per-member-per-month or license).
- **Principle:** subscription-anchored recurring revenue; marketplace amplifies but does not lead.

---

## 23. Customer Acquisition Strategy

- **CAC discipline:** target blended CAC payback < 12 months; lean on **organic/ambassador/content** (low CAC) before paid.
- **Activation definition:** account + 1 child + 1 document/vaccine logged within 7 days (drives retention). Instrument and optimise relentlessly.
- **Loops:** (a) pediatrician invites patients; (b) family sharing invites co-parents; (c) content SEO → free record → Premium; (d) clinic onboarding brings its patient base.
- **Funnels:** cold-start hardened (backend warm-up/keep-alive already shipped so first-touch never fails).

---

## 24. Customer Retention Strategy

- **Retention is the business** (recurring model). Levers: weekly-value features (growth/percentile updates, vaccine due alerts, reminders, timeline), AI that saves real time (document parsing), family sharing (multi-user stickiness), and care history that increases switching cost.
- **Engagement cadence:** proactive, non-alarmist notifications (vaccine due, growth check, seasonal guidance), seasonal content, milestone nudges.
- **Trust retention:** transparent privacy, in-app export/delete, zero dark patterns.
- **Metrics:** M6/M12 retention, WAU/MAU, Premium churn < 5%/mo target, NPS, per-family engagement depth.

---

## 25. Financial Model (5 years, expected case, capital-efficient)

*Illustrative; anchored to bootstrap discipline. €.*

| | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---|---|---|---|---|
| Active families | 8k | 60k | 180k | 350k | 500k |
| Premium % | 4% | 6% | 8% | 8% | 9% |
| ARR — Premium | 25k | 260k | 0.95M | 1.9M | 2.9M |
| Marketplace GMV | 0.2M | 1.5M | 5M | 9M | 13M |
| ARR — Marketplace (18%) | 40k | 270k | 0.9M | 1.6M | 2.3M |
| Clinic SaaS ARR | 10k | 120k | 0.4M | 0.9M | 1.6M |
| B2B/insurer/white-label | — | — | 0.2M | 1.0M | 3.0M |
| **Total revenue** | **~75k** | **~0.65M** | **~2.4M** | **~5.4M** | **~9.8M** |
| Gross margin | 70% | 75% | 80% | 82% | 83% |
| Fixed opex (team+tooling+security) | 0.12M | 0.5M | 1.3M | 2.6M | 4.2M |
| Marketing | 0.03M | 0.15M | 0.5M | 1.2M | 2.0M |
| **EBITDA** | **(~0.1M)** | **(~0.15M)** | **~+0.1M** | **~+0.8M** | **~+2.0M** |

- **Best case:** faster Premium conversion + insurer/white-label pull → Y5 €15–18M rev, ~25–30% EBITDA.
- **Worst case (default-alive):** hold fixed costs flat, stay PT-only, ~€1–2M rev by Y3 but **cash-flow positive earlier** — founders survive without raising.
- **Burn/runway:** Year-1 net burn tiny (founders minimal comp); bootstrap-viable. Any raise is to accelerate, not to survive.

---

## 26. Hiring Plan (challenge every hire)

**Test for each role:** *Can AI do it? Can automation do it? Can a founder do it? Can it be outsourced?* Hire only if all four are "no" and it's on the critical path.

| Role | Y1 | Verdict |
|---|---|---|
| Product/Eng (both founders) | ✅ founders | Core — no hire |
| Clinical governance / medical advisor | Part-time/advisor | Outsource (pediatrician KOL, paid advisory) |
| DPO | DPO-as-a-service | Outsource |
| Accounting/fiscal + certified invoicing | Outsource + SaaS | Outsource |
| Legal | Retainer | Outsource |
| Design (native) | Contract | Outsource until PMF |
| Support (tier-1) | AI + founders | Automate |
| Content | AI-drafted + clinician review | Automate + advisor |
| Growth/community | **First real hire post-PMF** | Hire when CAC scaling proven |

- **Y1 org:** 2 founders + fractional (advisor, DPO, accountant, legal, contract designer). **0–1 FTE.**
- **Y2 org:** + 1 full-stack eng, + 1 growth/community, + part-time clinical ops/support lead. **~3–4 FTE.**
- **Y3 org:** + 2 eng (interop/mobile), + support/clinical-ops lead, + partnerships/BD, + finance/ops part-time. **~8–10 FTE.**
- Keep the org **deliberately small**; automation and outsourcing are the default.

---

## 27. Budget (bootstrap, conservative — Year 1 monthly)

| Item | €/month |
|---|---|
| Cloud + storage (EU) | 300–800 |
| Video (LiveKit EU) | 100–400 |
| LLM inference | 200–800 |
| SaaS tooling (repos/CI/analytics/email/support) | 200–500 |
| Certified e-invoicing + accounting | 150–400 |
| DPO-as-a-service + legal retainer (amortised) | 400–800 |
| Security (scanning, later pen test amortised) | 200–600 |
| Design/content contractors (as needed) | 500–2,000 |
| App store fees + domains + trademarks (amortised) | 100–300 |
| **Total fixed (ex-founder comp)** | **~€2.5–7k/month** |

- **Avoid:** offices, premature hires, heavy paid marketing pre-PMF, building anything a proven SaaS does cheaper (invoicing, email, analytics, error tracking).
- **Build vs buy:** build the differentiated core (record, interop, AI pipeline, security-sensitive paths); buy commodities (payments, invoicing, email, observability, CDN).

---

## 28. KPIs

- **North star:** Weekly Active Families / engaged families.
- **Acquisition:** installs, activation rate (record+child+doc in 7d), CAC, viral coefficient.
- **Monetisation:** Premium conversion, ARPU, marketplace GMV/take, clinic seats, MRR/ARR, net revenue retention.
- **Retention:** M6/M12 retention, Premium churn, DAU/MAU, NPS.
- **Trust/ops:** security incidents (target 0), uptime, support automation rate, time-to-resolution.
- **Clinical:** verified pediatricians, consult SLA, review scores.

---

## 29. Founder Playbook (first 24 months)

- **Founder 1 (30y, exec/BD/strategy/healthcare):** CEO — GTM, pediatrician/clinic BD, partnerships, fundraising-optionality, compliance/legal orchestration, brand.
- **Founder 2 (21y, eng/cloud/architecture):** CTO — architecture, security, interop, AI pipeline, mobile, delivery.
- **Cadence:** weekly metric review (activation/retention/Premium), monthly board-style self-review, quarterly strategy reset.
- **Rules:** ship weekly; talk to 5 parents + 5 pediatricians every week; automate before hiring; never trade security/compliance for speed; keep default-alive.
- **Relationship hygiene (two brothers = a risk):** written roles, decision rights, vesting, deadlock mechanism, and an explicit "how we disagree" protocol — set now, in writing.

---

## 30. Risk Assessment

| Risk | Type | Mitigation |
|---|---|---|
| Two-sided cold start | Commercial | Ambassador-led supply seeding; free consumer record as demand magnet |
| Data breach (existential) | Security | Defense-in-depth, encryption, pen tests, ISO 27001, cyber-insurance, IR plan |
| MDR/SaMD reclassification | Regulatory | AI never diagnoses; static red-flag rules; legal review of every AI feature |
| GDPR/children's-data misstep | Regulatory | DPO, DPIA, consent management, minimisation, EU residency |
| Founder/brother conflict | Founder | Vesting, shareholders' agreement, deadlock clause, advisory board |
| Incumbent moves down-market | Business | Speed + child-centric depth + interop moat + neutrality |
| Small PT market | Business | Iberia/EU expansion designed-in; B2B/insurer ARR |
| Payment/fiscal non-compliance | Financial/legal | Stripe + certified invoicing + PT tax counsel |
| LLM cost/quality drift | Technical | Provider-agnostic pipeline, caching, schema constraints, cost caps |
| Bootstrap under-capitalisation vs speed | Financial | Default-alive plan; raise to accelerate only from strength |

---

## 31. Fundraising Strategy

- **Default: bootstrap to PMF.** With this founder profile and a working MVP, PMF is reachable on modest capital.
- **Raise IF and WHEN:** activation + retention + early Premium/marketplace traction prove PMF **and** EHDS timing makes speed valuable. Then a **pre-seed/seed of ~€1.5–3M** to fund Iberia + interop + first hires.
- **From whom:** European health-tech/deep-tech seed funds + strategic/health angels (pediatric KOLs, health-IT operators); avoid investors who push growth-over-trust.
- **Milestones to unlock the raise:** ~50k active families, clear Premium conversion + retention curves, 20+ ambassador pediatricians, clinic SaaS logos, ISO 27001 in progress.
- **Terms discipline:** keep dilution low (founders' equity is the asset), clean cap table via holding, strong reserved matters.

---

## 32. Exit Strategy

- **Likely acquirers:** European telehealth (Doctolib, Kry/Livi), insurers (Alan, Fidelidade/Ageas, Bupa), health-IT/EHR + imaging (Philips, GE HealthCare, Cerner/Oracle, Wolters Kluwer, Docaposte, Cegedim), and parenting/femtech consolidators.
- **Valuation drivers:** ARR + net revenue retention, engaged-family base, **proprietary longitudinal child-health dataset**, clinical trust/brand, **interoperability/EHDS positioning**, security certifications, Iberia/EU footprint.
- **Moats to deepen for value:** data network effects, clinician network, interop connectors (hospital/lab), regulatory/compliance assets, brand trust.
- **Optionality:** strong recurring-revenue + default-alive posture means the founders can hold for a larger strategic exit or run it profitably — never a forced sale.

---

## 33. 90-Day Action Plan

**Days 0–30 — Foundations & focus**
- Ratify the 5 board decisions (positioning, revenue anchor, payments/fiscal, MDR-out, raise-later).
- PT tax adviser: confirm intermediation-VAT + certified e-invoicing provider; wire it via API.
- Founders' + Shareholders' Agreement + vesting + IP assignment; ESOP pool; trademark search.
- Instrument analytics (activation/retention funnel); define the North-Star dashboard.
- Ship: AI document extraction v1 (allergies/vaccines/meds) + report explainer behind Premium flag.

**Days 31–60 — Supply & subscription**
- Recruit 15–30 ambassador pediatricians (revenue + record hook); onboard first clinics.
- Launch **Family Premium** (Stripe Billing) + certified invoicing live.
- Native app (Flutter) v1 beta to TestFlight/Play internal; passkeys/biometrics.
- Publish 20+ SEO content pieces from the Saber+ engine.

**Days 61–90 — Demand & proof**
- Public PT launch (App Store + Play + PWA); referral loops on.
- First 5–10k activated families; measure activation/retention/Premium conversion.
- Security: external pen test scheduled; ISO 27001 gap assessment; DPIA.
- Decide: keep bootstrapping vs open a seed conversation — based on the retention curve.

---

## 34. Month-by-Month Roadmap (24 months)

- **M1–2:** legal/fiscal/security foundations; analytics; AI extraction v1; ambassador pipeline.
- **M3–4:** Premium GA; certified invoicing; clinic onboarding v1; content scale.
- **M5–6:** native iOS/Android v1 GA; referral loops; PT public launch; first retention read.
- **M7–8:** optimise activation/retention; AI report explainer GA; clinic SaaS billing GA.
- **M9–10:** FHIR export v1; lab-result ingestion (1–2 PT labs); ISO 27001 kick-off; pen test.
- **M11–12:** PMF review + go/no-go on seed; Spain localisation begins; PT market leadership push.
- **M13–15:** **Spain launch** (localisation, ES vaccine schedule, ES pediatrician ambassadors).
- **M16–18:** clinic SaaS scale; FHIR import + hospital connector pilot; insurer conversations.
- **M19–21:** imaging viewer (PACS/VNA edge) beta; white-label v1; corporate-wellness pilot.
- **M22–24:** EHDS EEHRxF read; 1 new EU market entry prep; ISO 27001 cert; Series-A-readiness (if scaling) or profitable steady-state (if default-alive).

---

## Final synthesis (board's unanimous view)

The rare asset here is **founder-market fit**: two Healthcare-IT/interop/security veterans building a **neutral, citizen-held child-health record** exactly as **EHDS** makes that record a legal expectation. The winning move is **not** to compete as telemedicine — it is to **own the record and the weekly parent habit**, monetise via **subscription first**, and let **care, clinics, interop and insurers** compound on the data.

Execute capital-efficiently: bootstrap to PMF, automate with AI, hire almost no one, never compromise security or compliance, and raise only to pour fuel on a proven fire. Do that, and this becomes the **European reference platform for child digital health** — and a highly valuable, defensible, trust-led company.
