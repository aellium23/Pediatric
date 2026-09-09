# 22 · App mobile (Flutter) — estado e plano de conclusão

A app nativa (`apps/mobile`, Flutter + Riverpod + go_router + Dio) está como
**esqueleto funcional**; o produto completo está hoje na **app web** (`apps/web`,
`/app`), que corre no Safari/Chrome do telemóvel como PWA e cobre todos os perfis
e fluxos. Esta nota define o que falta para paridade nativa + publicação.

## Já existente (esqueleto)
- `core/api_client.dart` (Dio), `core/token_storage.dart`, `core/router.dart`,
  `core/theme.dart`, `core/env.dart` (API base via `--dart-define`).
- `features/auth` (sign-in + dev-login), `features/children`, `features/home`.

## Em falta para paridade com a web (`/app`)
| Área | Ecrãs/itens |
|---|---|
| Pai | perfil de saúde da criança (crescimento/IMC, vacinas, medicação, episódios), iniciar consulta (mensagem + **marcar vídeo** com slots), thread + cancelar, avaliar, plano (subscrição), avisos |
| Pediatra | caixa SLA + thread + fechar, agenda (disponibilidade), perfil + serviços, ganhos, Pro |
| Admin/Compliance/Suporte/Finanças | visão/métricas, verificação de pediatras, utilizadores, auditoria, reembolsos |
| Clínica | dashboard (equipa, pediatras, consultas) |
| Transversal | seletor de perfil, push (FCM/APNs), biometria/passkeys, deep links, offline cache |

> Como o backend e os contratos REST já estão estáveis e cobertos pela web, a
> app nativa reutiliza os **mesmos endpoints** — o trabalho é sobretudo de UI.

## Caminho de publicação
1. **iOS (TestFlight)** — requer **Mac** + conta Apple Developer. `flutter build ipa`
   → upload via Xcode/Transporter → TestFlight. (Sem Mac: usar a app web no
   Safari, ou um serviço de build CI macOS como Codemagic/Bitrise.)
2. **Android (Play)** — `flutter build appbundle` → Play Console (faixa interna).
3. **Compliance de loja**: política de privacidade, consentimentos, classificação
   etária, dados de saúde declarados (ver docs 13/14).

## Recomendação
Para validar produto agora, usar a **web `/app`** (já cobre tudo, no telemóvel).
Investir no nativo quando houver tração e um Mac/pipeline macOS — a maior parte da
lógica (estado, API, modelos) transita do esqueleto existente.
