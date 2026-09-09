# E01 · App Store & Google Play — Compliance e Ciclo de Vida

App nativa multiplataforma (Flutter) publicada na **Apple App Store** e **Google Play**, com compliance integral e processo contínuo de submissão/atualização.

## Apple App Store

### Conformidade obrigatória
- **Human Interface Guidelines (HIG)**: navegação nativa, Dynamic Type, Dark Mode, safe areas, haptics, acessibilidade (VoiceOver), SF Symbols onde aplicável.
- **App Store Review Guidelines**: secção **1.4 (saúde física)**, **5.1 (privacidade)**, **3.1 (pagamentos)**.
- **Sign in with Apple** — **obrigatório** se forem oferecidos outros logins sociais (Guideline 4.8); implementado com OIDC.
- **Apple Pay** para pagamentos de serviços (consultas são serviços de "pessoa-para-pessoa"/serviços reais → **fora** do IAP obrigatório; usar PSP externo + Apple Pay).
- **Passkeys** (AuthenticationServices / ASAuthorization) para login sem password.
- **Privacy**:
  - **App Privacy "Nutrition Labels"** completas e exatas.
  - **App Tracking Transparency (ATT)** — sem tracking entre apps por defeito; **dados de saúde nunca usados para publicidade**.
  - **Privacy Manifest** (`PrivacyInfo.xcprivacy`) + razões de API ("required reason APIs").
  - Permissões com *purpose strings* claros (câmara, microfone, fotos, notificações).
- **HealthKit**: só se integrarmos dados de saúde do dispositivo; se usado, respeitar a proibição de uso para publicidade/venda de dados.
- **Consentimentos** apresentados in-app antes de qualquer recolha clínica.

### Riscos de review a antecipar
- Apps de saúde sofrem **review reforçada**: documentar que são **pediatras licenciados** que prestam o serviço, incluir **disclaimers de não-emergência**, e fornecer **conta de demonstração** ao revisor.
- Evitar qualquer alegação de **diagnóstico automático** (review e MDR).

## Google Play

### Conformidade obrigatória
- **Google Play Developer Policies**, com **Health Apps policy** e **Health Content & Services declaration** (telemedicina exige declaração e, por vezes, prova de credenciais/registo).
- **Sign in with Google** (Credential Manager) — OIDC.
- **Google Pay** para pagamentos (serviços reais → fora do Play Billing obrigatório; usar PSP + Google Pay).
- **Play Integrity API** (sucessor do SafetyNet) — atestação de integridade de app/dispositivo (deteção de tampering, emuladores, dispositivos comprometidos).
- **Permissões Android** mínimas, runtime permissions, **Data Safety form** completo e exato, **Photo Picker** em vez de acesso amplo a media.
- **Foreground service** types declarados (se vídeo/notificações).
- **Target API level** sempre atualizado conforme exigência anual da Play.

### Riscos a antecipar
- **Health declaration** pode exigir comprovação de que os prestadores são profissionais licenciados e de enquadramento legal da telemedicina.
- **Data Safety** tem de refletir com exatidão o tratamento de dados de saúde.

## Requisitos transversais (ambas as stores)
- **Account deletion in-app** (obrigatório nas duas stores) — fluxo de eliminação de conta e dados, ligado ao processo RGPD de apagamento.
- **Política de privacidade** pública e acessível; **EULA**.
- **Subscrições** (Fase 3) conforme regras de cada store (cancelamento, gestão, restauração).
- **Acessibilidade** (WCAG 2.2 AA como baseline interno).
- **Localização** PT/EN/ES desde cedo.

## Processo de publicação, aprovação, atualização e gestão contínua

### 1. Pré-submissão
- Contas: **Apple Developer Program** (organização, D-U-N-S) + **Google Play Console** (organização verificada).
- Identidade de marca, ícones, screenshots, textos ASO, classificação etária (parental/medical).
- **Conta demo** + notas de review (explicar fluxo clínico, credenciais, não-emergência).
- Privacy labels / Data Safety preenchidos.

### 2. Build & assinatura
- Pipeline CI/CD: build Flutter → assinatura (App Store Connect API key / Play App Signing) → upload (**Fastlane**).
- **Code obfuscation** e símbolos de debug separados (ver [E05](05-app-api-file-video-security.md)).

### 3. Canais de teste (faseado)
- **iOS**: TestFlight (internal → external beta).
- **Android**: Internal testing → Closed → Open testing → Production (**staged rollout** 5%→20%→50%→100%).

### 4. Submissão & review
- Submeter via App Store Connect / Play Console; responder a pedidos de review com documentação preparada.
- **SLA de resposta a rejeições**: runbook com causas comuns (saúde, privacidade, pagamentos) e respostas-tipo.

### 5. Atualização contínua
- **Release train** quinzenal/mensal; **hotfix** acelerado para segurança.
- **Forced update** mínimo suportado (kill-switch de versões inseguras via remote config).
- Acompanhar **mudanças anuais** (target API Android, novas privacy rules Apple) num calendário de compliance de stores.

### 6. Monitorização pós-lançamento
- Crash reporting (Sentry/Firebase Crashlytics), métricas de adoção de versão, ratings & reviews (resposta gerida), alertas de policy strikes.
- **Plano de contingência** para remoção/strike: comunicação, correção, reapelo.

## Checklist de prontidão para submissão
- [ ] Sign in with Apple + Google + Passkeys
- [ ] Apple Pay + Google Pay via PSP (sem IAP indevido)
- [ ] Play Integrity + (iOS) App Attest
- [ ] Privacy Labels / Data Safety exatos · ATT sem tracking
- [ ] Account deletion in-app
- [ ] Health declaration (Play) + notas de review (Apple)
- [ ] Conta demo + disclaimers de não-emergência
- [ ] Acessibilidade + localização
- [ ] Política de privacidade + EULA públicas
