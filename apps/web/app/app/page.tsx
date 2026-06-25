'use client';

import { useEffect, useState } from 'react';
import {
  Api,
  hasApi,
  setToken,
  clearToken,
  type ChildDto,
  type ConsultationDto,
  type MessageDto,
  type FinanceDto,
} from '@/lib/client';
import type { PediatricianCard } from '@/lib/types';

interface Profile {
  email: string;
  role: string;
  name: string;
  emoji: string;
  desc: string;
}

const PROFILES: Profile[] = [
  { email: 'marta@demo.pedia', role: 'PARENT', name: 'Marta', emoji: '👩‍👧', desc: 'Mãe / Encarregada' },
  { email: 'ines@demo.pedia', role: 'PEDIATRICIAN', name: 'Dra. Inês', emoji: '👩‍⚕️', desc: 'Pediatra verificada' },
  { email: 'admin@demo.pedia', role: 'PLATFORM_ADMIN', name: 'Admin', emoji: '🛡️', desc: 'Administrador da plataforma' },
  { email: 'financas@demo.pedia', role: 'FINANCE', name: 'Finanças', emoji: '💶', desc: 'Equipa financeira' },
  { email: 'clinica.admin@demo.pedia', role: 'CLINIC_ADMIN', name: 'Clínica · Admin', emoji: '🏥', desc: 'Administrador de clínica' },
  { email: 'clinica.staff@demo.pedia', role: 'CLINIC_STAFF', name: 'Clínica · Staff', emoji: '🧑‍💼', desc: 'Staff de clínica' },
  { email: 'suporte@demo.pedia', role: 'SUPPORT', name: 'Suporte', emoji: '🎧', desc: 'Apoio ao cliente' },
  { email: 'compliance@demo.pedia', role: 'COMPLIANCE', name: 'Compliance', emoji: '📋', desc: 'Conformidade / RGPD' },
];

function euro(cents: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

const STATUS_PT: Record<string, string> = {
  OPEN: 'Aberta',
  TRIAGE: 'Em triagem',
  ANSWERED: 'Respondida',
  CLOSED: 'Fechada',
  CANCELLED: 'Cancelada',
  REFUNDED: 'Reembolsada',
};

function statusLabel(s: string): string {
  return STATUS_PT[s] ?? s;
}

function when(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
}

function isForbidden(e: unknown): boolean {
  const m = String(e);
  return /403|Forbidden/i.test(m);
}

export default function MultiProfileApp() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  // restore session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('pedia_profile');
    if (saved && localStorage.getItem('pedia_token')) {
      const p = PROFILES.find((x) => x.email === saved);
      if (p) setProfile(p);
    }
  }, []);

  async function enter(p: Profile) {
    setBusy(true);
    setMsg('');
    if (!hasApi) {
      setMsg('Backend não configurado (NEXT_PUBLIC_API_BASE). Esta área precisa do backend real.');
      setBusy(false);
      return;
    }
    try {
      const r = await Api.devLogin(p.email);
      setToken(r.accessToken);
      localStorage.setItem('pedia_profile', p.email);
      setProfile(p);
    } catch (e) {
      setMsg(`Não foi possível entrar: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  function leave() {
    clearToken();
    if (typeof window !== 'undefined') localStorage.removeItem('pedia_profile');
    setProfile(null);
    setMsg('');
  }

  if (!profile) {
    return (
      <main>
        <h1>Entrar na app</h1>
        <p className="muted">
          Escolhe um perfil de demonstração para entrar. Cada perfil vê o seu próprio painel, com
          dados reais do backend. Podes trocar de perfil a qualquer momento.
        </p>
        {!hasApi ? (
          <p className="notice warn">
            ⚠️ O backend não está ligado (<code>NEXT_PUBLIC_API_BASE</code> em falta). Para o fluxo
            só do lado do utilizador sem backend, usa a <a href="/demo">/demo</a>.
          </p>
        ) : null}
        {msg ? <p className="notice">{msg}</p> : null}
        <div className="grid">
          {PROFILES.map((p) => (
            <button
              key={p.email}
              className="card"
              onClick={() => enter(p)}
              disabled={busy}
              style={{ textAlign: 'left', cursor: 'pointer' }}
            >
              <div style={{ fontSize: 28 }}>{p.emoji}</div>
              <strong>{p.name}</strong>
              <div className="muted">{p.desc}</div>
            </button>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main>
      <div
        className="section"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <div>
          <div style={{ fontSize: 13 }} className="muted">
            Sessão como
          </div>
          <strong>
            {profile.emoji} {profile.name}
          </strong>{' '}
          <span className="badge">{profile.role}</span>
        </div>
        <button className="btn secondary" onClick={leave}>
          Trocar perfil
        </button>
      </div>

      {msg ? <p className="notice">{msg}</p> : null}

      {profile.role === 'PARENT' ? <ParentPanel onMsg={setMsg} /> : null}
      {profile.role === 'PEDIATRICIAN' ? <PediatricianPanel onMsg={setMsg} /> : null}
      {profile.role === 'PLATFORM_ADMIN' || profile.role === 'FINANCE' ? (
        <AdminPanel onMsg={setMsg} />
      ) : null}
      {['CLINIC_ADMIN', 'CLINIC_STAFF', 'SUPPORT', 'COMPLIANCE'].includes(profile.role) ? (
        <GenericPanel profile={profile} onMsg={setMsg} />
      ) : null}
    </main>
  );
}

// ─────────────────────────── Thread (shared) ───────────────────────────
function Thread({
  consultation,
  canClose,
  onClosed,
  onBack,
  onMsg,
}: {
  consultation: ConsultationDto;
  canClose: boolean;
  onClosed: () => void;
  onBack: () => void;
  onMsg: (m: string) => void;
}) {
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setMessages(await Api.messages(consultation.id));
    } catch (e) {
      onMsg(`Erro a carregar mensagens: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultation.id]);

  async function send() {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await Api.sendMessage(consultation.id, draft.trim());
      setDraft('');
      await load();
    } catch (e) {
      onMsg(`Erro ao enviar: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function close() {
    setBusy(true);
    try {
      await Api.closeConsultation(consultation.id);
      onMsg('Consulta fechada ✓ (pagamento capturado/repartido se houver Stripe configurado).');
      onClosed();
    } catch (e) {
      onMsg(`Erro ao fechar: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <button className="btn secondary" onClick={onBack} style={{ marginBottom: 12 }}>
        ← Voltar
      </button>
      <div className="card">
        <span className="badge">{statusLabel(consultation.status)}</span>{' '}
        <strong>{consultation.type === 'VIDEO' ? 'Videoconsulta' : 'Mensagem'}</strong>
        <div className="muted">
          {euro(consultation.priceCents)} · aberta {when(consultation.openedAt)}
        </div>
      </div>

      <div className="section">
        {messages.length === 0 ? (
          <p className="muted">Ainda sem mensagens.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="card" style={{ marginBottom: 8 }}>
              <div>{m.body}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {when(m.createdAt)}
              </div>
            </div>
          ))
        )}
      </div>

      {consultation.status !== 'CLOSED' ? (
        <div className="card section">
          <textarea
            placeholder="Escrever mensagem…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn" onClick={send} disabled={busy}>
              Enviar
            </button>
            {canClose ? (
              <button className="btn secondary" onClick={close} disabled={busy}>
                Fechar consulta
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─────────────────────────── Parent ───────────────────────────
function ParentPanel({ onMsg }: { onMsg: (m: string) => void }) {
  const [children, setChildren] = useState<ChildDto[]>([]);
  const [peds, setPeds] = useState<PediatricianCard[]>([]);
  const [consults, setConsults] = useState<ConsultationDto[]>([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [consent, setConsent] = useState(false);
  const [open, setOpen] = useState<ConsultationDto | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [c, p, k] = await Promise.all([
        Api.children(),
        Api.pediatricians() as Promise<PediatricianCard[]>,
        Api.myConsultations(),
      ]);
      setChildren(c);
      setPeds(p);
      setConsults(k);
      if (c.length > 0 && !selectedChild) setSelectedChild(c[0].id);
    } catch (e) {
      onMsg(`Erro a carregar: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addChild() {
    if (!name || !birthDate) return onMsg('Indica nome e data de nascimento.');
    if (!consent) return onMsg('Tens de autorizar o tratamento de dados de saúde.');
    setBusy(true);
    try {
      await Api.addChild({ name, birthDate, healthDataConsent: true });
      setName('');
      setBirthDate('');
      setConsent(false);
      onMsg('Criança adicionada ✓');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function consult(p: PediatricianCard) {
    const svc = p.services.find((s) => s.type === 'MESSAGE') ?? p.services[0];
    if (!svc) return onMsg('Pediatra sem serviço disponível.');
    if (!selectedChild) return onMsg('Seleciona uma criança primeiro.');
    setBusy(true);
    try {
      await Api.startConsultation({
        childId: selectedChild,
        serviceId: svc.id,
        question: 'Olá, tenho uma dúvida sobre o meu filho.',
      });
      onMsg('Consulta criada ✓');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (open) {
    return (
      <Thread
        consultation={open}
        canClose={false}
        onClosed={() => {
          setOpen(null);
          void load();
        }}
        onBack={() => setOpen(null)}
        onMsg={onMsg}
      />
    );
  }

  return (
    <>
      <div className="section">
        <h2>As crianças</h2>
        {children.length === 0 ? (
          <p className="muted">Ainda sem crianças. Adiciona a primeira abaixo.</p>
        ) : (
          <div className="grid">
            {children.map((c) => (
              <label key={c.id} className="card" style={{ cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="child"
                  checked={selectedChild === c.id}
                  onChange={() => setSelectedChild(c.id)}
                  style={{ width: 'auto', marginRight: 8 }}
                />
                <strong>{c.name}</strong>
                <div className="muted">{new Date(c.birthDate).toLocaleDateString('pt-PT')}</div>
              </label>
            ))}
          </div>
        )}
        <div className="card section">
          <h3>Adicionar criança</h3>
          <input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          <label className="muted" style={{ display: 'block', margin: '8px 0' }}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              style={{ width: 'auto', marginRight: 8 }}
            />
            Autorizo o tratamento dos dados de saúde do meu filho 🔒
          </label>
          <button className="btn" onClick={addChild} disabled={busy}>
            Adicionar
          </button>
        </div>
      </div>

      <div className="section">
        <h2>Pediatras</h2>
        <div className="grid">
          {peds.map((p) => {
            const svc = p.services.find((s) => s.type === 'MESSAGE') ?? p.services[0];
            return (
              <article key={p.id} className="card">
                <span className="badge">✓ Verificado</span>
                <h3>{p.specialties[0] ?? 'Pediatria geral'}</h3>
                <p className="muted">{p.languages.join(' · ')}</p>
                <p>
                  ⭐ {p.ratingAvg.toFixed(1)}
                  {svc ? ` · ${euro(svc.priceCents)}` : ''}
                </p>
                <button className="btn" onClick={() => consult(p)} disabled={busy}>
                  Iniciar consulta por mensagem
                </button>
              </article>
            );
          })}
        </div>
      </div>

      <div className="section">
        <h2>As minhas consultas</h2>
        {consults.length === 0 ? (
          <p className="muted">Ainda sem consultas.</p>
        ) : (
          <div className="grid">
            {consults.map((c) => (
              <button
                key={c.id}
                className="card"
                onClick={() => setOpen(c)}
                style={{ textAlign: 'left', cursor: 'pointer' }}
              >
                <span className="badge">{statusLabel(c.status)}</span>
                <div>
                  <strong>{c.type === 'VIDEO' ? 'Videoconsulta' : 'Mensagem'}</strong> ·{' '}
                  {euro(c.priceCents)}
                </div>
                <div className="muted">{when(c.openedAt)}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────── Pediatrician ───────────────────────────
function PediatricianPanel({ onMsg }: { onMsg: (m: string) => void }) {
  const [inbox, setInbox] = useState<ConsultationDto[]>([]);
  const [finance, setFinance] = useState<FinanceDto | null>(null);
  const [open, setOpen] = useState<ConsultationDto | null>(null);

  async function load() {
    try {
      const [i, f] = await Promise.all([Api.inbox(), Api.finance()]);
      setInbox(i);
      setFinance(f);
    } catch (e) {
      onMsg(`Erro a carregar: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (open) {
    return (
      <Thread
        consultation={open}
        canClose
        onClosed={() => {
          setOpen(null);
          void load();
        }}
        onBack={() => setOpen(null)}
        onMsg={onMsg}
      />
    );
  }

  return (
    <>
      {finance ? (
        <div className="section">
          <h2>Ganhos</h2>
          <div className="grid">
            <div className="card">
              <div className="muted">Líquido (recebido)</div>
              <strong style={{ fontSize: 22 }}>{euro(finance.netCents)}</strong>
            </div>
            <div className="card">
              <div className="muted">Comissão da plataforma</div>
              <strong style={{ fontSize: 22 }}>{euro(finance.commissionCents)}</strong>
            </div>
            <div className="card">
              <div className="muted">Consultas liquidadas</div>
              <strong style={{ fontSize: 22 }}>{finance.consultationsSettled}</strong>
            </div>
          </div>
          <p className="muted" style={{ fontSize: 13 }}>
            Os valores ficam a zero até existir <code>STRIPE_SECRET_KEY</code> (modo teste) e a
            consulta ser fechada.
          </p>
        </div>
      ) : null}

      <div className="section">
        <h2>Caixa de entrada</h2>
        {inbox.length === 0 ? (
          <p className="muted">Sem consultas pendentes. (Entra como a Marta e cria uma.)</p>
        ) : (
          <div className="grid">
            {inbox.map((c) => (
              <button
                key={c.id}
                className="card"
                onClick={() => setOpen(c)}
                style={{ textAlign: 'left', cursor: 'pointer' }}
              >
                <span className="badge">{statusLabel(c.status)}</span>
                <div>
                  <strong>{c.type === 'VIDEO' ? 'Videoconsulta' : 'Mensagem'}</strong> ·{' '}
                  {euro(c.priceCents)}
                </div>
                <div className="muted">
                  Prazo (SLA): {when(c.slaDueAt)} · aberta {when(c.openedAt)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────── Admin / Finance ───────────────────────────
function AdminPanel({ onMsg }: { onMsg: (m: string) => void }) {
  const [rows, setRows] = useState<ConsultationDto[]>([]);
  const [busy, setBusy] = useState('');

  async function load() {
    try {
      setRows(await Api.allConsultations());
    } catch (e) {
      onMsg(`Erro a carregar: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refund(id: string) {
    setBusy(id);
    try {
      await Api.refund(id);
      onMsg('Reembolso registado ✓ (efetivo no Stripe se configurado).');
      await load();
    } catch (e) {
      onMsg(`Erro no reembolso: ${String(e)}`);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="section">
      <h2>Consultas (plataforma)</h2>
      <p className="muted" style={{ fontSize: 13 }}>
        Visão de Admin/Finanças: as consultas mais recentes, com reembolso.
      </p>
      {rows.length === 0 ? (
        <p className="muted">Sem consultas. (Entra como a Marta e cria uma.)</p>
      ) : (
        <div className="grid">
          {rows.map((c) => (
            <div key={c.id} className="card">
              <span className="badge">{statusLabel(c.status)}</span>
              <div>
                <strong>{c.type === 'VIDEO' ? 'Videoconsulta' : 'Mensagem'}</strong> ·{' '}
                {euro(c.priceCents)}
              </div>
              <div className="muted">{when(c.openedAt)}</div>
              <button
                className="btn danger"
                onClick={() => refund(c.id)}
                disabled={busy === c.id || c.status === 'REFUNDED'}
                style={{ marginTop: 8 }}
              >
                {c.status === 'REFUNDED' ? 'Reembolsada' : 'Reembolsar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── Other roles ───────────────────────────
function GenericPanel({ profile, onMsg }: { profile: Profile; onMsg: (m: string) => void }) {
  const [checked, setChecked] = useState<string | null>(null);

  async function testRbac() {
    try {
      await Api.allConsultations();
      setChecked('Este perfil teve acesso à lista de consultas (inesperado para esta demo).');
    } catch (e) {
      if (isForbidden(e)) {
        setChecked('✓ Acesso negado corretamente — o controlo de acessos (RBAC) está a funcionar.');
      } else {
        onMsg(`Erro: ${String(e)}`);
      }
    }
  }

  return (
    <div className="section">
      <div className="card">
        <div style={{ fontSize: 28 }}>{profile.emoji}</div>
        <h2>{profile.name}</h2>
        <p className="muted">
          Sessão iniciada como <strong>{profile.role}</strong>. Este perfil ainda não tem um ecrã
          dedicado nesta demo, mas a sessão e as permissões são reais.
        </p>
        <button className="btn secondary" onClick={testRbac}>
          Testar permissão (deve ser negado)
        </button>
        {checked ? (
          <p className="notice" style={{ marginTop: 12 }}>
            {checked}
          </p>
        ) : null}
      </div>
    </div>
  );
}
