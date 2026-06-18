# E05 · Segurança de App Móvel, API, Ficheiros e Vídeo

## Mobile App Security

| Controlo | Implementação |
|---|---|
| **Jailbreak / Root Detection** | Bibliotecas de deteção + atestação de plataforma; restringir/avisar em dispositivos comprometidos |
| **Emulator Detection** | Heurísticas + Play Integrity / App Attest |
| **App Integrity Verification** | **Play Integrity API** (Android) + **App Attest / DeviceCheck** (iOS) — atestação no backend |
| **Runtime Protection (RASP)** | Deteção de hooking/Frida/debugging em runtime; reação (degradar/bloquear) |
| **Certificate Pinning** | Pinning das ligações à API; rotação de pins gerida |
| **Code Obfuscation** | Ofuscação (Flutter `--obfuscate` + R8/ProGuard); símbolos separados |
| **Anti-Tampering** | Verificação de assinatura/checksum; deteção de repackaging |
| **Secure storage** | Keychain (iOS) / Keystore (Android); nunca segredos clínicos em texto simples no dispositivo |
| **Screen protection** | Bloquear screenshots/screen recording em ecrãs clínicos sensíveis; ocultar conteúdo no app switcher |
| **No sensitive data in logs/backups** | Excluir dados clínicos de logs e de backups do SO |

- Atestação de integridade **verificada no servidor** antes de operações sensíveis (não confiar só no cliente — Zero Trust).
- **Jailbreak/root** não bloqueia liminarmente todos os utilizadores (UX), mas eleva risco → step-up e restrições.

## API Security

```
Cliente → CDN/WAF/DDoS → API Gateway → (mTLS) → Serviços
```

| Controlo | Implementação |
|---|---|
| **API Gateway** | Ponto único: authN/Z, validação de schema (OpenAPI), versionamento, quotas |
| **WAF** | Regras OWASP Top 10, virtual patching, regras custom |
| **DDoS Protection** | L3/L4/L7 (CDN/Anycast + serviço gerido), autoscaling |
| **Rate Limiting** | Por IP, por conta, por endpoint, por método de pagamento |
| **Throttling** | Degradação graciosa sob carga; filas para operações pesadas |
| **Bot Protection** | Device attestation, challenge adaptativo, deteção de scraping no marketplace |
| **Geo Protection** | Geofencing/geo-blocking conforme mercados ativos; deteção de geo anómala |
| **Input validation** | Validação estrita, allow-lists, proteção contra injeção/SSRF/IDOR |
| **Authorization por objeto** | Verificação de pertença (anti-IDOR) em cada recurso; RLS em DB |
| **Idempotência & assinaturas** | Webhooks assinados (PSP/faturação), chaves de idempotência em pagamentos |

- **Sem confiança no cliente**: toda a autorização revalidada no servidor.
- Segredos de API rotacionados; mTLS interno; quotas por tenant.

## File Security

**Todos os ficheiros passam por verificação ANTES do armazenamento:**
1. **Malware Scan** + **Virus Scan** (motor AV; quarentena se positivo).
2. **Content Validation** (tipo MIME real vs declarado, magic bytes, limites de tamanho, deteção de polyglots, remoção de metadados EXIF sensíveis).
3. Só após aprovação o ficheiro é **encriptado (AES-256)** e persistido.

Acesso a ficheiros:
- **Signed URLs** de **curta duração** (minutos).
- **Temporary Access Tokens** ligados ao utilizador/consulta.
- **Expiring Downloads** (links que caducam; downloads auditados).
- Storage **privado** (sem acesso público); CDN com tokens assinados.
- Segregação por criança/episódio; verificação de pertença a cada acesso.

## Video Security

- **WebRTC** com **SRTP** (media encriptada) + **DTLS** + sinalização sobre **TLS 1.3**.
- Fornecedor **healthcare-grade** na **UE** (LiveKit self-host EU / Twilio / Vonage / Daily) com DPA.
- **Sem gravação automática**. Gravação **apenas com consentimento explícito** de ambas as partes, com base legal, e armazenamento encriptado + retenção definida.
- **Sala de espera** + verificação de identidade/dispositivo antes de admitir.
- Salas efémeras, tokens de acesso curtos por sessão, TURN/STUN seguros.
- Sem partilha de tela por defeito; controlos claros de mute/câmara; indicação visível de gravação se ativada.
