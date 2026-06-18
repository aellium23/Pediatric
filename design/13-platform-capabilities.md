# 13 · Platform Capabilities — Offline, Push, Deep Links, Biometrics, Passkeys

Especificação de comportamento das capacidades nativas. Segurança alinhada com [enterprise E03/E05](../enterprise/03-iam-authentication.md).

---

## 5 · Offline mode (onde possível)
Princípio: **ler offline, escrever com fila**. Dados clínicos só são cacheados **cifrados** e nunca em claro.

| Área | Offline read | Offline write |
|---|---|---|
| Arquivo da criança (perfil, vacinas, crescimento) | ✅ cache cifrada | ✅ edição enfileirada → sincroniza |
| Conversas (histórico recente) | ✅ últimas N mensagens cifradas | ✅ **rascunho** de mensagem enfileirado (envia ao reconectar) |
| Ficheiros já descarregados | ✅ cifrados localmente | — upload enfileirado |
| Marketplace | ⚠️ último resultado em cache (read-only) | ❌ |
| **Pagamento** | ❌ (requer rede) | ❌ — **nunca** offline (integridade financeira) |
| **Vídeo** | ❌ | ❌ |
| Faturas (PDF já obtido) | ✅ | — |

- **Indicador offline** não-bloqueante (banner discreto); ações dependentes de rede ficam em estado "vai enviar quando houver ligação".
- **Sync** ao reconectar com resolução de conflitos (last-write-wins para perfil; mensagens são append-only → sem conflito).
- **Segurança**: cache cifrada (Keychain/Keystore-backed); **expira** e é purgada no logout/lock; sem dados clínicos em backups do SO.
- **Apple Health-like**: ver dados de saúde da criança sempre disponível, mesmo sem rede.

## 6 · Push notifications
- **Canais/categorias** (Android channels / iOS categories) com controlo granular pelo utilizador:
  - Pai: *resposta do pediatra* (alta prioridade), *lembrete de consulta/vídeo*, *vacina/medicação*, *fatura emitida*, *marketing* (opt-in separado).
  - Pediatra: *nova consulta*, *SLA a expirar* (crítico), *videochamada a começar*, *payout*.
- **Conteúdo seguro**: notificações **não revelam dados clínicos** no ecrã bloqueado ("Tens uma nova resposta" — sem detalhe); detalhe só após autenticação.
- **Rich/actionable**: ações rápidas (ex.: "Ver", "Adiar lembrete"); imagens só não-sensíveis.
- **Tempo real**: APNs/FCM; *Live Activity* (iOS) / *ongoing notification* (Android) para consulta ativa e chamada — estilo Uber.
- **Quiet hours** e respeito por "Não incomodar"; SLA crítico do pediatra pode quebrar quiet hours (configurável).
- **Permissão pedida no momento certo** (after-value priming), não no arranque.

## 7 · Deep links
- **Esquema**: Universal Links (iOS) + App Links (Android) → `https://pedia.app/...` (sem custom scheme inseguro).
- **Rotas-chave**:
  - `/consult/{id}` → conversa (de push "pediatra respondeu") — **< 3 s** ao destino.
  - `/child/{id}` · `/child/{id}/vaccines`
  - `/pediatrician/{slug}` → perfil (partilha/marketing, SEO web → app)
  - `/appointment/{id}` → sala de espera/chamada
  - `/invoice/{id}` · `/consent/{id}`
- **Autorização no destino**: deep link nunca contorna auth/consentimento/pertença (Zero Trust); se sessão expirada → autentica e **continua** ao destino.
- **Deferred deep linking**: utilizador novo via link de pediatra → instala → cai no perfil correto após registo.
- **Estado válido**: links para recursos sem permissão mostram estado seguro (não fuga de existência de dados).

## 8 · Biometric login
- **Face ID / Touch ID** (iOS) · **BiometricPrompt** (Android, classe forte).
- **Desbloqueio rápido** da app e **step-up** para ações sensíveis (alterar IBAN, exportar/eliminar dados, ver registo clínico após inatividade).
- Biometria desbloqueia **chave local** (Keychain/Keystore) — credenciais nunca em claro; falha → fallback para passkey/PIN do dispositivo.
- **App lock** opcional (re-autenticar ao voltar do background após X min) — recomendado on por defeito para pediatras.
- Copy adapta-se ao hardware (SE = "Toca para autenticar"; Face ID = "Olha para autenticar").

## 9 · Passkeys (FIDO2/WebAuthn)
- **Login sem password** por defeito; passkeys sincronizadas (iCloud Keychain / Google Password Manager) ou device-bound.
- **Registo**: na criação de conta, oferta de criar passkey (1 toque) — **phishing-resistant**.
- **Multi-dispositivo**: passkeys sincronizadas; gestão de dispositivos/credenciais em Conta ([P-27]/[D-14]).
- **MFA**: passkey conta como fator forte; pediatras/admin mantêm MFA obrigatório (passkey + device trust).
- Fallback: OTP (email/telefone) se o utilizador não tiver passkey; nunca password longa como caminho principal.

## Mapa capacidade → ecrã
| Capacidade | Ecrãs-chave |
|---|---|
| Offline | P-07 arquivo, P-18 chat (read+draft), P-08/09 vacinas/crescimento |
| Push | P-18 (resposta), P-20 (lembrete), D-04 (SLA), chamada |
| Deep link | push→P-18, share→P-13, P-21 chamada |
| Biometria | P-02 login, step-up em P-17/P-27 |
| Passkeys | P-02 registo/login, P-27/D-14 gestão |
