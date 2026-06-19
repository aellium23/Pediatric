import type { ReactNode } from 'react';
import Link from 'next/link';

// A static, self-contained visual tour of the product — viewable on any phone.
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

function Tabs({ active }: { active: string }) {
  const items: [string, string][] = [
    ['🏠', 'Início'],
    ['👶', 'Crianças'],
    ['➕', 'Consultar'],
    ['📅', 'Agenda'],
    ['◍', 'Conta'],
  ];
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

export default function Tour() {
  return (
    <div className="tourwrap">
      <header className="tourhero">
        <span className="badge">PÉDIA · TOUR</span>
        <h1>Como funciona a app</h1>
        <p>
          Um passeio pelo fluxo completo: dos pais ao pediatra. Mockups com o
          design real da aplicação. <Link href="/">← início</Link>
        </p>
      </header>

      <h2 className="toursec">👪 Para os pais</h2>
      <p className="toursec-sub">Do registo à consulta resolvida.</p>

      {/* 1 — Welcome / login */}
      <Step n="1" title="Entrar" desc="Registo em segundos com Apple, Google, telefone ou passkey. Sem passwords.">
        <div className="scr dark">
          <Bar />
          <div className="scr-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: 24 }}>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>
              O pediatra de confiança, à distância de uma mensagem.
            </div>
            <p style={{ opacity: 0.8, fontSize: 13 }}>Pediatras verificados · Seguro e privado 🔒</p>
            <div className="tbtn dark"> Continuar com Apple</div>
            <div className="tbtn alt" style={{ background: 'transparent', color: '#eaf2f1', borderColor: '#3fa8a2' }}>
              Continuar com Google
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, opacity: 0.7, marginTop: 8 }}>🔑 Usar passkey</div>
          </div>
        </div>
      </Step>

      {/* 2 — Home */}
      <Step n="2" title="Início / Família" desc="Tudo à volta da criança: estado das consultas e lembretes proativos (vacinas, crescimento).">
        <div className="scr">
          <Bar />
          <div className="scr-top">
            <h2>Olá, Marta 👋</h2>
          </div>
          <div className="scr-body">
            <div className="tlabel">As tuas crianças</div>
            <div className="tgrid2">
              <div className="tcard surface" style={{ textAlign: 'center' }}>👶<br />Leo</div>
              <div className="tcard surface" style={{ textAlign: 'center' }}>🧒<br />Ana</div>
            </div>
            <div className="tlabel">Em curso</div>
            <div className="tcard">
              <span className="tpill ok">respondida</span>
              <div style={{ marginTop: 6 }}><b>Febre — Leo</b><br /><span style={{ color: 'var(--muted)' }}>Dra. Inês · toca para ver</span></div>
            </div>
            <div className="tlabel">Sugestões</div>
            <div className="tcard surface">📅 Vacina dos 12 meses do Leo</div>
          </div>
          <Tabs active="Início" />
        </div>
      </Step>

      {/* 3 — Add child */}
      <Step n="3" title="Adicionar criança" desc="Perfil por criança com consentimento parental explícito para dados de saúde.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Nova criança</h2><span className="sub">Passo 2 de 2 · Saúde</span></div>
          <div className="scr-body">
            <div className="tinput">Nome — Leo</div>
            <div className="tinput">Data de nascimento — 01/10/2025</div>
            <div className="tinput">Alergias — nenhuma</div>
            <div className="tcard surface" style={{ fontSize: 12 }}>
              ☑️ Autorizo o tratamento dos dados de saúde do meu filho 🔒
            </div>
            <div className="tbtn">Criar arquivo</div>
          </div>
        </div>
      </Step>

      {/* 4 — Child profile */}
      <Step n="4" title="Arquivo da criança" desc="Vacinas, crescimento (percentis), exames, relatórios e episódios clínicos — num só sítio.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Leo · 8 meses</h2><span className="sub">Médico: Dra. Inês</span></div>
          <div className="scr-body">
            <div className="tgrid2">
              <div className="tcard surface">💉 Vacinas</div>
              <div className="tcard surface">📈 Crescimento</div>
              <div className="tcard surface">📄 Ficheiros</div>
              <div className="tcard surface">🗂 Episódios</div>
            </div>
            <div className="tlabel">Episódios recentes</div>
            <div className="tcard">Otite — Jun 2026 <span className="tpill ok">fechado</span></div>
            <div className="tbtn">Consultar sobre o Leo</div>
          </div>
        </div>
      </Step>

      {/* 5 — Marketplace */}
      <Step n="5" title="Marketplace" desc="Pediatras verificados (cédula validada). Filtra por idioma, preço, rating e disponibilidade.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Encontrar pediatra</h2></div>
          <div className="scr-body">
            <div className="tinput">🔎 Procurar…</div>
            <div style={{ display: 'flex', gap: 6, fontSize: 11, marginBottom: 4 }}>
              <span className="tchip">PT/EN</span><span className="tchip">€–€€€</span><span className="tchip">⭐4+</span>
            </div>
            <div className="tcard">
              <div className="trow">
                <span className="tavatar">👩‍⚕️</span>
                <div><b>Dra. Inês Silva</b> <span className="tpill ok">✓</span><br /><span style={{ color: 'var(--muted)' }}>Pediatria geral · PT/EN · ⭐4.9</span></div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Mensagem desde 18€ · responde ~4h</div>
            </div>
            <div className="tcard">
              <div className="trow"><span className="tavatar">👨‍⚕️</span><div><b>Dr. Tiago</b> <span className="tpill ok">✓</span></div></div>
            </div>
          </div>
        </div>
      </Step>

      {/* 6 — Pediatrician profile */}
      <Step n="6" title="Perfil do pediatra" desc="Serviços e preços transparentes, idiomas, experiência e avaliações verificadas.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Dra. Inês Silva</h2><span className="sub">Cédula OM verificada 🔒 · ⭐ 4.9</span></div>
          <div className="scr-body">
            <div className="tlabel">Serviços</div>
            <div className="tcard"><div className="tprice"><span>💬 Mensagem</span><b>18€ · ~4h</b></div><div className="tprice"><span>🎥 Vídeo 20min</span><b>45€</b></div><div className="tprice"><span>🧠 2ª opinião</span><b>70€</b></div></div>
            <div className="tlabel">Avaliações verificadas</div>
            <div className="tcard surface" style={{ fontSize: 12 }}>⭐⭐⭐⭐⭐ “Muito atenciosa e rápida.” — Marta</div>
            <div className="tbtn">Consultar</div>
          </div>
        </div>
      </Step>

      {/* 7 — Scope & price */}
      <Step n="7" title="Âmbito e preço" desc="Antes de pagar: o que está (e não está) incluído, preço e tempo de resposta. Zero surpresas.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Consultar — Dra. Inês</h2><span className="sub">Criança: Leo · Mensagem · 18€</span></div>
          <div className="scr-body">
            <div className="tlabel">Incluído</div>
            <div className="tcard">✓ 1 questão + esclarecimentos<br />✓ Resposta em ~4h úteis<br />✓ Resumo final + receita</div>
            <div className="tlabel">Não incluído</div>
            <div className="tcard surface">✗ Não substitui urgência médica</div>
            <div className="tbtn">Continuar</div>
          </div>
        </div>
      </Step>

      {/* 8 — Triage */}
      <Step n="8" title="Triagem" desc="Estrutura a questão (sintomas, febre, duração). Sinais de alarme encaminham para o SNS 24.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Sobre o Leo</h2><span className="sub">Triagem rápida</span></div>
          <div className="scr-body">
            <div className="tinput">Sintomas — febre e puxa a orelha</div>
            <div className="tinput">Febre — 38.5 ºC</div>
            <div className="tinput">Há quanto tempo — 2 dias</div>
            <div className="tcard surface" style={{ fontSize: 12 }}>Sinais de alarme?<br />☐ Dificuldade a respirar ☐ Lábios azulados</div>
            <div className="tsafety">⚠️ Emergência? → SNS 24 (808 24 24 24)</div>
            <div className="tbtn">Rever e pagar</div>
          </div>
        </div>
      </Step>

      {/* 9 — Payment */}
      <Step n="9" title="Pagamento" desc="MB WAY, Apple Pay ou cartão. Só é cobrado quando o pediatra responder — senão, reembolso total.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Pagamento</h2></div>
          <div className="scr-body">
            <div className="tcard"><div className="tprice"><span>Ato médico (isento de IVA*)</span><b>18,00€</b></div><div className="tprice"><span><b>Total</b></span><b>18,00€</b></div></div>
            <div className="tlabel">Método</div>
            <div className="tcard">◉ MB WAY 📱</div>
            <div className="tcard surface">○ Apple Pay &nbsp;&nbsp; ○ Cartão 💳</div>
            <div className="tcard surface" style={{ fontSize: 12 }}>🔒 Só é cobrado quando a Dra. responder. Reembolso total se não responder.</div>
            <div className="tbtn">Pagar 18,00€</div>
          </div>
        </div>
      </Step>

      {/* 10 — Chat */}
      <Step n="10" title="Conversa" desc="Chat clínico seguro por episódio. Anexa fotos/exames. Recebes push quando o pediatra responde.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Febre — Leo</h2><span className="sub">Dra. Inês ✓ · <span style={{ color: '#2e8b57' }}>respondida</span></span></div>
          <div className="scr-body">
            <div className="tbubble me">Tem febre e puxa a orelha 🖼️</div>
            <div className="tbubble them">Pelos sintomas pode ser uma otite. Vigia a febre, dá o antipirético e…</div>
            <div className="tcard surface" style={{ fontSize: 12 }}>📋 Resumo + receita [ver]</div>
            <div className="tinput">escrever… 📎</div>
            <div className="tsafety">⚠️ Emergência? → SNS 24</div>
          </div>
        </div>
      </Step>

      {/* 11 — Summary */}
      <Step n="11" title="Resumo & receita" desc="Resumo validado pelo médico, receita e fatura para descarregar. E avalias a consulta.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Resumo da consulta</h2><span className="sub">Leo · Otite · Dra. Inês ✓</span></div>
          <div className="scr-body">
            <div className="tcard"><b>Avaliação</b><br /><span style={{ color: 'var(--muted)', fontSize: 12 }}>Otite média provável…</span></div>
            <div className="tcard surface" style={{ fontSize: 12 }}><b>Quando procurar urgência</b><br />Se febre &gt; 3 dias ou prostração.</div>
            <div className="tcard">📄 Receita.pdf &nbsp; 🧾 Fatura.pdf</div>
            <div className="tbtn alt">Avaliar a Dra. Inês ⭐</div>
          </div>
        </div>
      </Step>

      {/* 12 — Video booking */}
      <Step n="12" title="Videochamada" desc="Marca um slot por disponibilidade, com consentimento de teleconsulta e pagamento na marcação.">
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

      <h2 className="toursec">🩺 Para o pediatra</h2>
      <p className="toursec-sub">Trabalho remunerado, organizado e com SLA sob controlo.</p>

      {/* 13 — Inbox */}
      <Step n="13" title="Caixa de consultas" desc="Fila ordenada por SLA. Vê de relance o que responder e o que está a expirar.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Consultas</h2><span className="sub">A responder · ordenado por SLA</span></div>
          <div className="scr-body">
            <div className="tcard"><span className="tpill danger">expira em 0:48</span><div style={{ marginTop: 6 }}><b>Tosse — Ana (4a)</b><br /><span style={{ color: 'var(--muted)' }}>Família Sousa</span></div></div>
            <div className="tcard"><span className="tpill warn">SLA 3h12</span><div style={{ marginTop: 6 }}><b>Febre — Leo (8m)</b></div></div>
            <div className="tcard surface"><span className="tpill ok">respondida</span> <b>Otite — Pedro</b></div>
          </div>
          <div className="scr-tab"><span>📥<b>Consultas</b></span><span>📅 Agenda</span><span>€ Finanças</span><span>◍ Perfil</span></div>
        </div>
      </Step>

      {/* 14 — Respond & close */}
      <Step n="14" title="Responder e encerrar" desc="Histórico da criança + rascunho de resumo por IA (a validar). Ao encerrar: captura, comissão e fatura.">
        <div className="scr">
          <Bar />
          <div className="scr-top"><h2>Febre — Leo, 8m</h2><span className="sub">Triagem: 38.5º · 2 dias</span></div>
          <div className="scr-body">
            <div className="tcard surface" style={{ fontSize: 12 }}>🧠 <b>Rascunho IA (rever)</b><br />“Lactente 8m, febre 2 dias, otalgia…”</div>
            <div className="tbubble them">Pelos sintomas parece otite. Vigie a febre e…</div>
            <div className="tinput">responder… 📎</div>
            <div className="tbtn">Encerrar com resumo</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 6 }}>→ captura pagamento · comissão · fatura</div>
          </div>
        </div>
      </Step>

      <footer style={{ textAlign: 'center', marginTop: 48, color: 'var(--muted)' }}>
        <p>Este é um tour ilustrativo do design. A app real (iOS/Android) é em Flutter.</p>
        <Link className="cta" href="/marketplace">Ver marketplace →</Link>
      </footer>
    </div>
  );
}
