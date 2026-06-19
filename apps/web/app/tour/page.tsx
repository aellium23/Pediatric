import type { ReactNode } from 'react';
import Link from 'next/link';

// A static, self-contained visual tour of the whole product (4 personas).
export const dynamic = 'force-static';

function Bar() {
  return (
    <div className="statusbar">
      <span>21:06</span>
      <span style={{ letterSpacing: 2 }}>▦ ▶ 94</span>
    </div>
  );
}

function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="phone">
      <span className="notch" />
      {children}
    </div>
  );
}

function Tabs({ active, items }: { active: string; items: [string, string][] }) {
  return (
    <div className="scr-tab">
      {items.map(([icon, label]) => (
        <span key={label}>
          {icon}
          {label === active ? <b>{label}</b> : <span>{label}</span>}
        </span>
      ))}
    </div>
  );
}

const PARENT_TABS: [string, string][] = [
  ['🏠', 'Início'],
  ['👶', 'Crianças'],
  ['➕', 'Consultar'],
  ['📅', 'Agenda'],
  ['◍', 'Conta'],
];
const PED_TABS: [string, string][] = [
  ['📥', 'Consultas'],
  ['📅', 'Agenda'],
  ['€', 'Finanças'],
  ['◍', 'Perfil'],
];

function Step({
  n,
  title,
  desc,
  children,
}: {
  n: string;
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <section className="tourstep">
      <Phone>{children}</Phone>
      <div className="tourcap">
        <span className="n">{n}</span>
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
    </section>
  );
}

function Sec({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <h2 className="toursec">{title}</h2>
      <p className="toursec-sub">{sub}</p>
    </>
  );
}

export default function Tour() {
  return (
    <div className="tourwrap">
      <header className="tourhero">
        <span className="badge">PÉDIA · TOUR COMPLETO</span>
        <h1>Como funciona a app</h1>
        <p>
          Todos os perfis: Pais, Pediatra, Clínica e Administrador. Mockups com o
          design real. <Link href="/">← início</Link>
        </p>
      </header>

      {/* ══════════════ PAIS ══════════════ */}
      <Sec title="👪 Pais / Encarregados" sub="Do registo à consulta resolvida, e a gestão de saúde da criança." />

      <Step n="P1" title="Entrar" desc="Apple, Google, telefone ou passkey. Sem passwords.">
        <div className="scr dark">
          <Bar />
          <div className="scr-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 24 }}>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>O pediatra de confiança, à distância de uma mensagem.</div>
            <p style={{ opacity: 0.8, fontSize: 13 }}>Pediatras verificados · Seguro 🔒</p>
            <div className="tbtn dark"> Continuar com Apple</div>
            <div className="tbtn alt" style={{ background: 'transparent', color: '#eaf2f1', borderColor: '#3fa8a2' }}>Continuar com Google</div>
            <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.7, marginTop: 8 }}>🔑 Usar passkey</div>
          </div>
        </div>
      </Step>

      <Step n="P2" title="Verificação" desc="Código por SMS/email para confirmar o contacto.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Confirma o número</h2><span className="sub">+351 9•• ••• 123</span></div>
          <div className="scr-body">
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '20px 0', fontSize: 24 }}>
              <span>4</span><span>1</span><span>7</span><span>•</span><span>•</span><span>•</span>
            </div>
            <p className="muted" style={{ textAlign: 'center', fontSize: 12 }}>Reenviar em 0:28</p>
            <div className="tbtn">Confirmar</div>
          </div>
        </div>
      </Step>

      <Step n="P3" title="Consentimentos" desc="Termos, privacidade e autorização para dados de saúde do menor — versionados.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Antes de começar 🔒</h2></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard">☑️ Aceito os Termos de Uso</div>
            <div className="tcard">☑️ Li a Política de Privacidade</div>
            <div className="tcard surface">☑️ Autorizo o tratamento dos dados de saúde do meu filho <i>(necessário)</i></div>
            <div className="tcard">☐ Receber dicas e novidades</div>
            <div className="tbtn">Continuar</div>
          </div>
        </div>
      </Step>

      <Step n="P4" title="Início / Família" desc="Tudo à volta da criança: consultas em curso e lembretes proativos.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Olá, Marta 👋</h2></div>
          <div className="scr-body">
            <div className="tlabel">As tuas crianças</div>
            <div className="tgrid2"><div className="tcard surface" style={{ textAlign: 'center' }}>👶<br />Leo</div><div className="tcard surface" style={{ textAlign: 'center' }}>🧒<br />Ana</div></div>
            <div className="tlabel">Em curso</div>
            <div className="tcard"><span className="tpill ok">respondida</span><div style={{ marginTop: 6 }}><b>Febre — Leo</b><br /><span style={{ color: 'var(--muted)' }}>Dra. Inês</span></div></div>
            <div className="tlabel">Sugestões</div>
            <div className="tcard surface">📅 Vacina dos 12 meses do Leo</div>
          </div>
          <Tabs active="Início" items={PARENT_TABS} />
        </div>
      </Step>

      <Step n="P5" title="Adicionar criança" desc="Perfil por criança com consentimento parental explícito.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Nova criança</h2><span className="sub">Passo 2 de 2 · Saúde</span></div>
          <div className="scr-body">
            <div className="tinput">Nome — Leo</div>
            <div className="tinput">Data de nascimento — 01/10/2025</div>
            <div className="tinput">Alergias — nenhuma</div>
            <div className="tcard surface" style={{ fontSize: 12 }}>☑️ Autorizo o tratamento dos dados de saúde 🔒</div>
            <div className="tbtn">Criar arquivo</div>
          </div>
        </div>
      </Step>

      <Step n="P6" title="Arquivo da criança" desc="Hub com vacinas, crescimento, ficheiros e episódios.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Leo · 8 meses</h2><span className="sub">Médico: Dra. Inês</span></div>
          <div className="scr-body">
            <div className="tgrid2"><div className="tcard surface">💉 Vacinas</div><div className="tcard surface">📈 Crescimento</div><div className="tcard surface">📄 Ficheiros</div><div className="tcard surface">🗂 Episódios</div></div>
            <div className="tlabel">Episódios recentes</div>
            <div className="tcard">Otite — Jun 2026 <span className="tpill ok">fechado</span></div>
            <div className="tbtn">Consultar sobre o Leo</div>
          </div>
        </div>
      </Step>

      <Step n="P7" title="Vacinas (PNV)" desc="Calendário de vacinação com estados e lembretes.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Vacinas — Leo</h2><span className="sub">Plano Nacional</span></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard">✓ Nascença <span className="tpill ok">feita</span></div>
            <div className="tcard">✓ 2 meses <span className="tpill ok">feita</span></div>
            <div className="tcard surface">● 12 meses <span className="tpill warn">a agendar</span></div>
            <div className="tbtn alt">+ Registar vacina</div>
          </div>
        </div>
      </Step>

      <Step n="P8" title="Crescimento" desc="Peso, altura e percentis (curvas OMS), com leitura acessível.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Crescimento</h2><span className="sub">Leo · 8 meses</span></div>
          <div className="scr-body">
            <div className="tcard" style={{ textAlign: 'center', padding: 18 }}>
              <div style={{ fontSize: 40 }}>📈</div>
              <div className="muted" style={{ fontSize: 12 }}>curva de percentis</div>
            </div>
            <div className="tcard surface"><div className="tprice"><span>Peso</span><b>8,4 kg · P55</b></div><div className="tprice"><span>Altura</span><b>70 cm · P60</b></div></div>
          </div>
        </div>
      </Step>

      <Step n="P9" title="Ficheiros" desc="Análises, relatórios e imagens — verificados (vírus/conteúdo) e encriptados.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Ficheiros</h2><span className="sub">Leo</span></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard">📄 analise_sangue.pdf <span className="tpill ok">verificado</span></div>
            <div className="tcard">🖼️ erupcao.jpg <span className="tpill ok">verificado</span></div>
            <div className="tcard surface">🎬 video.mp4 <span className="tpill warn">a verificar</span></div>
            <div className="tbtn alt">+ Carregar</div>
          </div>
        </div>
      </Step>

      <Step n="P10" title="Episódios clínicos" desc="Agrupa mensagens, ficheiros e consultas por caso (ex.: Otite).">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Episódios</h2><span className="sub">Leo</span></div>
          <div className="scr-body">
            <div className="tcard"><b>Otite — Jun 2026</b> <span className="tpill ok">fechado</span><br /><span className="muted" style={{ fontSize: 12 }}>3 mensagens · 1 receita · 1 ficheiro</span></div>
            <div className="tcard"><b>Bronquiolite — Mar 2026</b> <span className="tpill ok">fechado</span></div>
          </div>
        </div>
      </Step>

      <Step n="P11" title="Marketplace" desc="Pediatras verificados (cédula validada). Filtros por idioma, preço, rating.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Encontrar pediatra</h2></div>
          <div className="scr-body">
            <div className="tinput">🔎 Procurar…</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}><span className="tchip">PT/EN</span><span className="tchip">€–€€€</span><span className="tchip">⭐4+</span></div>
            <div className="tcard"><div className="trow"><span className="tavatar">👩‍⚕️</span><div><b>Dra. Inês Silva</b> <span className="tpill ok">✓</span><br /><span className="muted">Pediatria geral · ⭐4.9</span></div></div><div className="muted" style={{ fontSize: 12 }}>Mensagem desde 18€ · ~4h</div></div>
            <div className="tcard"><div className="trow"><span className="tavatar">👨‍⚕️</span><div><b>Dr. Tiago</b> <span className="tpill ok">✓</span></div></div></div>
          </div>
        </div>
      </Step>

      <Step n="P12" title="Perfil do pediatra" desc="Serviços e preços transparentes + avaliações verificadas.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Dra. Inês Silva</h2><span className="sub">Cédula OM verificada 🔒 · ⭐4.9</span></div>
          <div className="scr-body">
            <div className="tlabel">Serviços</div>
            <div className="tcard"><div className="tprice"><span>💬 Mensagem</span><b>18€ · ~4h</b></div><div className="tprice"><span>🎥 Vídeo 20min</span><b>45€</b></div><div className="tprice"><span>🧠 2ª opinião</span><b>70€</b></div></div>
            <div className="tcard surface" style={{ fontSize: 12 }}>⭐⭐⭐⭐⭐ “Muito atenciosa.” — Marta</div>
            <div className="tbtn">Consultar</div>
          </div>
        </div>
      </Step>

      <Step n="P13" title="Âmbito e preço" desc="Antes de pagar: o que está incluído, preço e tempo de resposta.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Consultar — Dra. Inês</h2><span className="sub">Leo · Mensagem · 18€</span></div>
          <div className="scr-body">
            <div className="tlabel">Incluído</div>
            <div className="tcard">✓ 1 questão + esclarecimentos<br />✓ Resposta em ~4h<br />✓ Resumo + receita</div>
            <div className="tlabel">Não incluído</div>
            <div className="tcard surface">✗ Não substitui urgência</div>
            <div className="tbtn">Continuar</div>
          </div>
        </div>
      </Step>

      <Step n="P14" title="Triagem" desc="Estrutura a questão (sintomas, febre, duração) e sinais de alarme.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Sobre o Leo</h2><span className="sub">Triagem rápida</span></div>
          <div className="scr-body">
            <div className="tinput">Sintomas — febre, puxa a orelha</div>
            <div className="tinput">Febre — 38.5 ºC</div>
            <div className="tinput">Há quanto tempo — 2 dias</div>
            <div className="tcard surface" style={{ fontSize: 12 }}>Sinais de alarme? ☐ Respira mal ☐ Lábios azulados</div>
            <div className="tsafety">⚠️ Emergência? → SNS 24</div>
            <div className="tbtn">Rever e pagar</div>
          </div>
        </div>
      </Step>

      <Step n="P15" title="Aviso de segurança" desc="Se há sinais de alarme, encaminha para o SNS 24 / 112 antes de prosseguir.">
        <div className="scr">
          <Bar />
          <div className="scr-body" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 52, color: '#d7263d' }}>⚠️</div>
            <h2 style={{ color: '#d7263d', margin: '8px 0' }}>Estes sinais podem ser graves</h2>
            <p className="muted" style={{ fontSize: 13 }}>Não esperes por uma resposta online.</p>
            <div className="tbtn" style={{ background: '#d7263d' }}>Ligar SNS 24 (808 24 24 24)</div>
            <div className="tbtn alt" style={{ borderColor: '#d7263d', color: '#d7263d' }}>Ligar 112</div>
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Compreendo e quero continuar online</p>
          </div>
        </div>
      </Step>

      <Step n="P16" title="Pagamento" desc="MB WAY, Apple Pay ou cartão. Só cobra quando o pediatra responder.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Pagamento</h2></div>
          <div className="scr-body">
            <div className="tcard"><div className="tprice"><span>Ato médico (isento IVA*)</span><b>18,00€</b></div><div className="tprice"><span><b>Total</b></span><b>18,00€</b></div></div>
            <div className="tcard">◉ MB WAY 📱</div>
            <div className="tcard surface">○ Apple Pay ○ Cartão 💳</div>
            <div className="tcard surface" style={{ fontSize: 12 }}>🔒 Reembolso total se não responder no prazo.</div>
            <div className="tbtn">Pagar 18,00€</div>
          </div>
        </div>
      </Step>

      <Step n="P17" title="Conversa" desc="Chat clínico seguro por episódio. Anexa fotos/exames; recebes push na resposta.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Febre — Leo</h2><span className="sub">Dra. Inês ✓ · <span style={{ color: '#2e8b57' }}>respondida</span></span></div>
          <div className="scr-body">
            <div className="tbubble me">Tem febre e puxa a orelha 🖼️</div>
            <div className="tbubble them">Pode ser otite. Vigia a febre, dá o antipirético e…</div>
            <div className="tcard surface" style={{ fontSize: 12 }}>📋 Resumo + receita [ver]</div>
            <div className="tinput">escrever… 📎</div>
            <div className="tsafety">⚠️ Emergência? → SNS 24</div>
          </div>
        </div>
      </Step>

      <Step n="P18" title="Resumo & receita" desc="Resumo validado pelo médico, receita e fatura para descarregar.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Resumo da consulta</h2><span className="sub">Leo · Otite · Dra. Inês ✓</span></div>
          <div className="scr-body">
            <div className="tcard"><b>Avaliação</b><br /><span className="muted" style={{ fontSize: 12 }}>Otite média provável…</span></div>
            <div className="tcard surface" style={{ fontSize: 12 }}><b>Quando procurar urgência</b><br />Se febre &gt; 3 dias ou prostração.</div>
            <div className="tcard">📄 Receita.pdf · 🧾 Fatura.pdf</div>
            <div className="tbtn alt">Avaliar a Dra. Inês ⭐</div>
          </div>
        </div>
      </Step>

      <Step n="P19" title="Agendar vídeo" desc="Slots por disponibilidade, consentimento de teleconsulta e pagamento na marcação.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Vídeo — Dra. Inês</h2><span className="sub">20 min · 45€</span></div>
          <div className="scr-body">
            <div className="tlabel">Hoje</div>
            <div style={{ display: 'flex', gap: 6 }}><span className="tchip">14:00</span><span className="tchip">14:30</span><span className="tchip">15:00</span></div>
            <div className="tlabel">Amanhã</div>
            <div style={{ display: 'flex', gap: 6 }}><span className="tchip">09:00</span><span className="tchip">09:30</span></div>
            <div className="tcard surface" style={{ fontSize: 12, marginTop: 10 }}>☑️ Consinto a teleconsulta</div>
            <div className="tbtn">Confirmar e pagar</div>
          </div>
        </div>
      </Step>

      <Step n="P20" title="Sala de espera" desc="Verificação de câmara/micro antes de entrar — sem pânico técnico.">
        <div className="scr dark">
          <Bar />
          <div className="scr-body" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 44 }}>⏳</div>
            <h2 style={{ margin: '8px 0' }}>A Dra. vai admitir-te</h2>
            <p style={{ opacity: 0.8, fontSize: 13 }}>🎤 ✓ &nbsp; 📷 ✓</p>
            <div className="tbtn dark">Testar câmara e micro</div>
          </div>
        </div>
      </Step>

      <Step n="P21" title="Em chamada" desc="Vídeo healthcare-grade (encriptado). Sem gravação por defeito.">
        <div className="scr dark">
          <Bar />
          <div className="scr-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ background: '#0a1110', borderRadius: 12, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>👩‍⚕️</div>
            <div style={{ textAlign: 'center', opacity: 0.85, padding: 10 }}>🎤 📷 ⤢ 📎 <span style={{ color: '#ff6b6b' }}>☎</span></div>
            <p style={{ textAlign: 'center', fontSize: 11, opacity: 0.6 }}>● Sem gravação</p>
          </div>
        </div>
      </Step>

      <Step n="P22" title="Pós-consulta" desc="Resumo enviado e pedido de avaliação verificada.">
        <div className="scr">
          <Bar />
          <div className="scr-body" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 44 }}>✅</div>
            <h2 style={{ margin: '8px 0' }}>Obrigada!</h2>
            <p className="muted" style={{ fontSize: 13 }}>Resumo a caminho 📋</p>
            <div className="tbtn">Ver resumo</div>
            <div className="tbtn alt">Avaliar ⭐</div>
          </div>
        </div>
      </Step>

      <Step n="P23" title="Faturas & pagamentos" desc="Histórico de faturas (com QR/ATCUD) para descarregar.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Faturas</h2></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard"><div className="tprice"><span>#2026/118 · Mensagem</span><b>18,00€</b></div></div>
            <div className="tcard"><div className="tprice"><span>#2026/117 · Vídeo</span><b>45,00€</b></div></div>
            <div className="tbtn alt">Descarregar todas</div>
          </div>
          <Tabs active="Conta" items={PARENT_TABS} />
        </div>
      </Step>

      <Step n="P24" title="Subscrição familiar" desc="Pacotes de mensagens e descontos — receita recorrente.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Subscrição</h2></div>
          <div className="scr-body">
            <div className="tcard surface" style={{ textAlign: 'center' }}><b>Família Plus</b><div style={{ fontSize: 26, fontWeight: 700 }}>12,99€<span style={{ fontSize: 13 }}>/mês</span></div><div className="muted" style={{ fontSize: 12 }}>4 mensagens/mês · prioridade · descontos vídeo</div></div>
            <div className="tbtn">Subscrever</div>
          </div>
        </div>
      </Step>

      <Step n="P25" title="Privacidade & dados (RGPD)" desc="Direitos do titular: aceder, exportar, eliminar; gestão de consentimentos.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Privacidade 🔒</h2></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard">Os teus direitos</div>
            <div className="tcard surface">📤 Aceder / Exportar dados</div>
            <div className="tcard surface">🗑️ Eliminar conta</div>
            <div className="tlabel">Consentimentos</div>
            <div className="tcard">Saúde do Leo <span className="tpill ok">ativo</span></div>
            <div className="tcard">Registo de acessos (auditoria)</div>
          </div>
        </div>
      </Step>

      <Step n="P26" title="Notificações" desc="Resposta do pediatra, lembretes, vacinas e faturas — com controlo por tipo.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Notificações</h2></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard"><b>Nova resposta</b> — Dra. Inês respondeu à consulta do Leo.</div>
            <div className="tcard surface">📅 Lembrete: vídeo amanhã às 14:00</div>
            <div className="tcard surface">💉 Vacina dos 12 meses do Leo</div>
          </div>
        </div>
      </Step>

      {/* ══════════════ PEDIATRA ══════════════ */}
      <Sec title="🩺 Pediatra" sub="Trabalho remunerado, organizado, com SLA e faturação tratada." />

      <Step n="D1" title="Registo profissional" desc="Adesão com expectativas claras: cédula, identidade, IBAN.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Sou pediatra</h2></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tbtn dark" style={{ background: '#0c1413', color: '#fff' }}> Continuar com Apple</div>
            <div className="tcard surface">Vais precisar de:<br />🪪 Cédula da Ordem<br />🆔 Documento de identidade<br />🏦 IBAN + dados fiscais</div>
            <div className="tbtn">Começar registo</div>
          </div>
        </div>
      </Step>

      <Step n="D2" title="Verificação / KYC" desc="Upload de cédula e identidade; MFA obrigatório. Validado pela equipa.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Verificação</h2><span className="sub">●●○○</span></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard">1. Identidade <span className="tpill ok">✓</span></div>
            <div className="tcard surface">2. Cédula — nº 12345 · 📷 comprovativo</div>
            <div className="tcard">3. IBAN + fiscal</div>
            <div className="tcard">4. MFA (obrigatório)</div>
            <div className="tbtn">Submeter</div>
          </div>
        </div>
      </Step>

      <Step n="D3" title="Em validação" desc="Estado não-bloqueante — entretanto prepara perfil e serviços.">
        <div className="scr">
          <Bar />
          <div className="scr-body" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 44 }}>⏳</div>
            <h2 style={{ margin: '8px 0' }}>Em validação</h2>
            <p className="muted" style={{ fontSize: 13 }}>Recebes notificação em ~48h.</p>
            <div className="tbtn alt">Definir serviços</div>
          </div>
        </div>
      </Step>

      <Step n="D4" title="Caixa de consultas" desc="Fila ordenada por SLA; vê o que responder e o que expira.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Consultas</h2><span className="sub">A responder · por SLA</span></div>
          <div className="scr-body">
            <div className="tcard"><span className="tpill danger">expira 0:48</span><div style={{ marginTop: 6 }}><b>Tosse — Ana (4a)</b></div></div>
            <div className="tcard"><span className="tpill warn">SLA 3h12</span><div style={{ marginTop: 6 }}><b>Febre — Leo (8m)</b></div></div>
            <div className="tcard surface"><span className="tpill ok">respondida</span> <b>Otite — Pedro</b></div>
          </div>
          <Tabs active="Consultas" items={PED_TABS} />
        </div>
      </Step>

      <Step n="D5" title="Responder e encerrar" desc="Histórico + rascunho IA (a validar). Encerrar dispara captura, comissão e fatura.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Febre — Leo, 8m</h2><span className="sub">Triagem: 38.5º · 2 dias</span></div>
          <div className="scr-body">
            <div className="tcard surface" style={{ fontSize: 12 }}>🧠 <b>Rascunho IA (rever)</b><br />“Lactente 8m, febre 2 dias, otalgia…”</div>
            <div className="tbubble them">Pelos sintomas parece otite. Vigie a febre e…</div>
            <div className="tinput">responder… 📎</div>
            <div className="tbtn">Encerrar com resumo</div>
          </div>
        </div>
      </Step>

      <Step n="D6" title="Serviços & preços" desc="Controlo total: tipos de consulta, preço, SLA e âmbito.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Serviços & Preços</h2></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard"><div className="tprice"><span>💬 Mensagem · SLA 4h</span><b>18€ ✓</b></div></div>
            <div className="tcard"><div className="tprice"><span>🎥 Vídeo 20m</span><b>45€ ✓</b></div></div>
            <div className="tcard surface"><div className="tprice"><span>🔁 Renovar receita</span><b>15€ ☐</b></div></div>
            <div className="tbtn">Guardar</div>
          </div>
        </div>
      </Step>

      <Step n="D7" title="Agenda & disponibilidade" desc="Horários, buffers e indisponibilidades. Os pais escolhem slots.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Disponibilidade</h2></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard">Seg · 09:00–13:00 ✎</div>
            <div className="tcard">Ter · 14:00–18:00 ✎</div>
            <div className="tcard surface">Slot 20m · Buffer 10m · Indisponível 24 Jun</div>
            <div className="tbtn alt">+ Adicionar bloco</div>
          </div>
          <Tabs active="Agenda" items={PED_TABS} />
        </div>
      </Step>

      <Step n="D8" title="Videochamada (médico)" desc="Chamada + notas clínicas em simultâneo. Sem gravação por defeito.">
        <div className="scr dark">
          <Bar />
          <div className="scr-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ background: '#0a1110', borderRadius: 12, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>👶</div>
            <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 10, padding: 8, fontSize: 12 }}>Notas clínicas: otoscopia recomendada…</div>
            <div style={{ textAlign: 'center', opacity: 0.85, padding: 8 }}>🎤 📷 📝 <span style={{ color: '#ff6b6b' }}>☎</span></div>
          </div>
        </div>
      </Step>

      <Step n="D9" title="Finanças do pediatra" desc="“Quanto ganhei”: receita bruta, comissão, líquido, payout e faturas (SAF-T).">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Finanças</h2><span className="sub">Junho 2026</span></div>
          <div className="scr-body">
            <div className="tcard"><div className="tprice"><span>Receita bruta</span><b>1.240€</b></div><div className="tprice"><span>Comissão Pédia (20%)</span><b style={{ color: '#d7263d' }}>-248€</b></div><div className="tprice"><span><b>Líquido</b></span><b style={{ color: '#2e8b57' }}>992€</b></div></div>
            <div className="tcard surface" style={{ fontSize: 12 }}>Pendente de payout: <b>310€</b> · próximo: 21 Jun</div>
            <div className="tbtn alt">Exportar faturas (SAF-T)</div>
          </div>
          <Tabs active="Finanças" items={PED_TABS} />
        </div>
      </Step>

      <Step n="D10" title="Perfil público" desc="Bio, idiomas, especialidades, cédula verificada e pré-visualização.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Perfil público</h2><span className="sub">👁 pré-visualizar</span></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard"><div className="trow"><span className="tavatar">👩‍⚕️</span><div><b>Dra. Inês Silva</b> <span className="tpill ok">cédula ✓</span></div></div></div>
            <div className="tinput">Bio — Pediatria geral, 15 anos…</div>
            <div className="tcard surface">Idiomas: PT · EN · Especialidades: geral</div>
            <div className="tbtn">Guardar</div>
          </div>
        </div>
      </Step>

      <Step n="D11" title="Avaliações" desc="Verificadas (só após consulta concluída), com resposta do médico.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Avaliações</h2><span className="sub">⭐ 4.9 (132)</span></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard">⭐⭐⭐⭐⭐ “Muito atenciosa e rápida.”<br /><span className="muted">— Marta <span className="tpill ok">verificada</span></span></div>
            <div className="tbtn alt">Responder</div>
          </div>
        </div>
      </Step>

      <Step n="D12" title="Conta & Segurança" desc="MFA obrigatório, passkeys, dispositivos e estado de verificação.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Conta & Segurança</h2></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard">🔐 MFA <span className="tpill ok">ativo (obrigatório)</span></div>
            <div className="tcard surface">🔑 Passkeys · 📱 Dispositivos</div>
            <div className="tcard">🪪 Verificação <span className="tpill ok">✓</span></div>
          </div>
        </div>
      </Step>

      {/* ══════════════ CLÍNICA ══════════════ */}
      <Sec title="🏥 Clínica" sub="Gestão de equipa e operação (web; app companion para o essencial)." />

      <Step n="C1" title="Dashboard da clínica" desc="KPIs do tenant: consultas, receita, SLA e equipa ativa.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Clínica X</h2><span className="sub">Junho 2026</span></div>
          <div className="scr-body">
            <div className="tgrid2"><div className="tcard surface" style={{ textAlign: 'center' }}><b>428</b><br /><span className="muted" style={{ fontSize: 11 }}>Consultas</span></div><div className="tcard surface" style={{ textAlign: 'center' }}><b>6.120€</b><br /><span className="muted" style={{ fontSize: 11 }}>Receita</span></div><div className="tcard surface" style={{ textAlign: 'center' }}><b>96%</b><br /><span className="muted" style={{ fontSize: 11 }}>SLA</span></div><div className="tcard surface" style={{ textAlign: 'center' }}><b>8/10</b><br /><span className="muted" style={{ fontSize: 11 }}>Pediatras</span></div></div>
            <div className="tcard"><span className="tpill warn">⚠️</span> 1 consulta a expirar</div>
          </div>
        </div>
      </Step>

      <Step n="C2" title="Equipa — Pediatras" desc="Convidar e gerir pediatras do tenant; estados e ações.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Pediatras</h2></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard">Dra. Inês <span className="tpill ok">ativo</span> · 132 consultas</div>
            <div className="tcard">Dr. Tiago <span className="tpill ok">ativo</span> · 47</div>
            <div className="tcard surface">Dra. Rita <span className="tpill warn">convite pendente</span></div>
            <div className="tbtn">+ Convidar</div>
          </div>
        </div>
      </Step>

      <Step n="C3" title="Papéis & permissões" desc="RBAC do tenant: Clinic Admin vs Staff (least privilege).">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Equipa & Papéis</h2></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard">Ana — <b>Receção</b> (Staff)</div>
            <div className="tcard">João — <b>Gestor</b> (Clinic Admin)</div>
            <div className="tcard surface">Staff: agendar, triagem · sem acesso clínico amplo</div>
          </div>
        </div>
      </Step>

      <Step n="C4" title="Finanças da clínica" desc="Faturação centralizada e comissões agregadas; export SAF-T.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Finanças</h2><span className="sub">Junho</span></div>
          <div className="scr-body">
            <div className="tcard"><div className="tprice"><span>GMV clínica</span><b>30.600€</b></div><div className="tprice"><span>Comissão Pédia</span><b style={{ color: '#d7263d' }}>-5.508€</b></div><div className="tprice"><span><b>Líquido</b></span><b style={{ color: '#2e8b57' }}>25.092€</b></div></div>
            <div className="tbtn alt">Exportar SAF-T</div>
          </div>
        </div>
      </Step>

      <Step n="C5" title="Relatórios" desc="Desempenho operacional e clínico do tenant.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Relatórios</h2></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard">Consultas/dia ▁▂▃▅▇▅▃</div>
            <div className="tcard surface"><div className="tprice"><span>SLA cumprido</span><b>96%</b></div><div className="tprice"><span>CSAT</span><b>4.7/5</b></div><div className="tprice"><span>Tempo médio resp.</span><b>2h10</b></div></div>
          </div>
        </div>
      </Step>

      {/* ══════════════ ADMIN ══════════════ */}
      <Sec title="🛠️ Administrador / Plataforma" sub="O lado do dono: KPIs, validação, pagamentos, comissões e compliance." />

      <Step n="A1" title="Visão geral (KPIs)" desc="GMV, receita líquida da plataforma, conversão e satisfação.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Plataforma</h2><span className="sub">Junho 2026</span></div>
          <div className="scr-body">
            <div className="tgrid2"><div className="tcard surface" style={{ textAlign: 'center' }}><b>284k€</b><br /><span className="muted" style={{ fontSize: 11 }}>GMV</span></div><div className="tcard surface" style={{ textAlign: 'center' }}><b>56,8k€</b><br /><span className="muted" style={{ fontSize: 11 }}>Receita líq.</span></div><div className="tcard surface" style={{ textAlign: 'center' }}><b>24%</b><br /><span className="muted" style={{ fontSize: 11 }}>Conversão</span></div><div className="tcard surface" style={{ textAlign: 'center' }}><b>4.7</b><br /><span className="muted" style={{ fontSize: 11 }}>CSAT</span></div></div>
            <div className="tcard"><span className="tpill warn">⚠️</span> 4 validações · 2 disputas</div>
          </div>
        </div>
      </Step>

      <Step n="A2" title="Validação de pediatras" desc="Fila de KYC/cédula; aprovar, pedir correções ou rejeitar — tudo auditado.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Validação</h2><span className="sub">Pendentes (4)</span></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard"><b>Dra. Rita Lopes</b><br />Cédula 12345 🔍 · Identidade 🔍 · IBAN</div>
            <div className="tgrid2"><div className="tbtn" style={{ marginTop: 0 }}>Aprovar</div><div className="tbtn alt" style={{ marginTop: 0 }}>Correção</div></div>
          </div>
        </div>
      </Step>

      <Step n="A3" title="Pagamentos" desc="Transações, reembolsos, disputas e payouts (perfil Finance).">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Pagamentos</h2></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard"><div className="tprice"><span>#4521 · Marta → Inês</span><b>18€ <span className="tpill ok">capturado</span></b></div></div>
            <div className="tcard surface"><div className="tprice"><span>#4522 · Rui → Tiago</span><b>45€ <span className="tpill danger">disputa</span></b></div></div>
            <div className="tbtn alt">Exportar</div>
          </div>
        </div>
      </Step>

      <Step n="A4" title="Disputa / Reembolso" desc="Arbitragem com base no registo da consulta; gera nota de crédito.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Disputa #4522</h2><span className="sub">Vídeo · “não compareceu”</span></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard surface">Evidência: chamada 0min · consentimentos ✓ · SLA ✓</div>
            <div className="tcard">◉ Reembolso total ○ Parcial ○ Negar</div>
            <div className="tbtn">Decidir e notificar</div>
          </div>
        </div>
      </Step>

      <Step n="A5" title="Configuração de comissões" desc="Comissões por global/país/pediatra/tipo/plano; planos e destaque.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Comissões</h2></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard"><div className="tprice"><span>Padrão (Global)</span><b>20%</b></div></div>
            <div className="tcard"><div className="tprice"><span>Plano Pro</span><b>14%</b></div></div>
            <div className="tcard surface"><div className="tprice"><span>PT · Vídeo</span><b>17%</b></div></div>
            <div className="tbtn alt">+ Nova regra</div>
          </div>
        </div>
      </Step>

      <Step n="A6" title="Relatórios (GMV)" desc="GMV, funil de conversão, retenção, SLA e receita por pediatra.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Relatórios</h2><span className="sub">Junho</span></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard">GMV ▁▂▃▅▇ <b>284k€</b></div>
            <div className="tcard surface">Funil: Visita → Registo 38% → 1ª consulta 24%</div>
            <div className="tcard">SLA 95% · Tempo resp. 2h10</div>
          </div>
        </div>
      </Step>

      <Step n="A7" title="Moderação & Auditoria" desc="Moderar avaliações/conteúdos; trilho de auditoria imutável.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Auditoria</h2></div>
          <div className="scr-body" style={{ fontSize: 12 }}>
            <div className="tcard">Avaliação reportada — “…” [aprovar] [remover]</div>
            <div className="tcard surface">14:02 Support viu #4521 (mascarado)<br />14:05 Admin aprovou Dra. Rita<br />🔒 append-only · imutável</div>
          </div>
        </div>
      </Step>

      <Step n="A8" title="Compliance (RGPD)" desc="Pedidos RGPD, consentimentos, retenção, DPIA e violações (CNPD 72h).">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Compliance</h2><span className="sub">Pedidos RGPD (3)</span></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard">Acesso — Marta S. [tratar]</div>
            <div className="tcard">Eliminação — João P. [tratar]</div>
            <div className="tcard surface">Retenção · DPIA/RoPA · Violações → CNPD 72h</div>
          </div>
        </div>
      </Step>

      <Step n="A9" title="Suporte" desc="Tickets e incidentes, com SLA de suporte e ligação a SecOps.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Suporte</h2></div>
          <div className="scr-body" style={{ fontSize: 13 }}>
            <div className="tcard">#882 Pai — pagamento falhou</div>
            <div className="tcard">#881 Pediatra — dúvida KYC</div>
            <div className="tcard surface">SLA 1ª resposta: 2h · Incidentes (SEV)</div>
          </div>
        </div>
      </Step>

      <footer style={{ textAlign: 'center', marginTop: 48, color: 'var(--muted)' }}>
        <p>Tour ilustrativo do design (4 perfis). A app real iOS/Android é em Flutter.</p>
        <Link className="cta" href="/demo">Experimentar a demo →</Link>
      </footer>
    </div>
  );
}
