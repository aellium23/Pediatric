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
  type PedMeDto,
  type ServiceDto,
  type AvailabilityDto,
  type NotificationDto,
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

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function euro(cents: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
const STATUS_PT: Record<string, string> = {
  OPEN: 'Aberta',
  TRIAGE: 'Em triagem',
  ANSWERED: 'Respondida',
  CLOSED: 'Fechada',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
  REFUNDED: 'Reembolsada',
  DISPUTED: 'Em disputa',
};
function statusLabel(s: string): string {
  return STATUS_PT[s] ?? s;
}
function statusPill(s: string): string {
  if (s === 'CLOSED' || s === 'ANSWERED') return 'pill ok';
  if (s === 'REFUNDED' || s === 'EXPIRED' || s === 'CANCELLED' || s === 'DISPUTED') return 'pill warn';
  return 'pill';
}
function when(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
}
function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}
function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}
function isForbidden(e: unknown): boolean {
  return /403|Forbidden/i.test(String(e));
}
function svcLabel(t: string): string {
  return t === 'VIDEO' ? 'Vídeo' : t === 'MESSAGE' ? 'Mensagem' : t;
}

export default function MultiProfileApp() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('pedia_profile');
    if (saved && localStorage.getItem('pedia_token')) {
      const p = PROFILES.find((x) => x.email === saved);
      if (p) {
        setProfile(p);
        setTab(tabsFor(p.role)[0].key);
      }
    }
  }, []);

  async function enter(p: Profile) {
    setBusy(true);
    setMsg('');
    if (!hasApi) {
      setMsg('Backend não configurado (NEXT_PUBLIC_API_BASE).');
      setBusy(false);
      return;
    }
    try {
      const r = await Api.devLogin(p.email);
      setToken(r.accessToken);
      localStorage.setItem('pedia_profile', p.email);
      setProfile(p);
      setTab(tabsFor(p.role)[0].key);
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
    setTab('');
  }

  if (!profile) {
    return (
      <main>
        <h1>Entrar na app</h1>
        <p className="muted">
          Escolhe um perfil de demonstração. Cada um tem o seu painel, com dados reais do backend.
        </p>
        {!hasApi ? (
          <p className="notice">
            ⚠️ Backend não ligado. Sem dados reais — usa a <a href="/demo">/demo</a> (modo local).
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

  const tabs = tabsFor(profile.role);

  return (
    <main>
      <div className="apphead">
        <div>
          <div style={{ fontSize: 12 }} className="muted">
            Sessão como
          </div>
          <strong>
            {profile.emoji} {profile.name}
          </strong>{' '}
          <span className="pill muted">{profile.role}</span>
        </div>
        <button className="btn secondary small" onClick={leave}>
          Trocar perfil
        </button>
      </div>

      {msg ? <p className="notice">{msg}</p> : null}

      <div style={{ minHeight: '50vh' }}>
        {tab === 'children' ? <ChildrenTab onMsg={setMsg} /> : null}
        {tab === 'consult' ? <ConsultTab onMsg={setMsg} /> : null}
        {tab === 'myconsults' ? <MyConsultsTab onMsg={setMsg} /> : null}
        {tab === 'inbox' ? <InboxTab onMsg={setMsg} /> : null}
        {tab === 'agenda' ? <AgendaTab onMsg={setMsg} /> : null}
        {tab === 'profile' ? <PedProfileTab onMsg={setMsg} /> : null}
        {tab === 'finance' ? <FinanceTab onMsg={setMsg} /> : null}
        {tab === 'admin' ? <AdminTab onMsg={setMsg} /> : null}
        {tab === 'account' ? <GenericTab profile={profile} onMsg={setMsg} /> : null}
        {tab === 'notif' ? <NotifTab onMsg={setMsg} /> : null}
      </div>

      <nav className="appbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'active' : ''}
            onClick={() => {
              setTab(t.key);
              setMsg('');
            }}
          >
            <span className="ico">{t.ico}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </main>
  );
}

function tabsFor(role: string): { key: string; label: string; ico: string }[] {
  const notif = { key: 'notif', label: 'Avisos', ico: '🔔' };
  if (role === 'PARENT')
    return [
      { key: 'children', label: 'Crianças', ico: '👶' },
      { key: 'consult', label: 'Consultar', ico: '🔎' },
      { key: 'myconsults', label: 'Consultas', ico: '💬' },
      notif,
    ];
  if (role === 'PEDIATRICIAN')
    return [
      { key: 'inbox', label: 'Caixa', ico: '📥' },
      { key: 'agenda', label: 'Agenda', ico: '📅' },
      { key: 'profile', label: 'Perfil', ico: '⚙️' },
      { key: 'finance', label: 'Ganhos', ico: '💶' },
      notif,
    ];
  if (role === 'PLATFORM_ADMIN' || role === 'FINANCE')
    return [
      { key: 'admin', label: 'Consultas', ico: '🗂️' },
      notif,
    ];
  return [
    { key: 'account', label: 'Conta', ico: '👤' },
    notif,
  ];
}

// ───────────────────────── Thread (shared) ─────────────────────────
function Thread({
  consultation,
  canClose,
  canCancel,
  onChanged,
  onBack,
  onMsg,
}: {
  consultation: ConsultationDto;
  canClose: boolean;
  canCancel: boolean;
  onChanged: () => void;
  onBack: () => void;
  onMsg: (m: string) => void;
}) {
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [video, setVideo] = useState<string>('');

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
      onMsg('Consulta fechada ✓');
      onChanged();
    } catch (e) {
      onMsg(`Erro ao fechar: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    setBusy(true);
    try {
      await Api.cancelConsultation(consultation.id);
      onMsg('Consulta cancelada e reembolsada ✓');
      onChanged();
    } catch (e) {
      onMsg(`Erro ao cancelar: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function joinVideo() {
    try {
      const r = await Api.videoToken(consultation.id);
      setVideo(`Sala ${r.roomId} · token emitido ✓ (o vídeo real precisa de credenciais LiveKit)`);
    } catch (e) {
      onMsg(`Erro no vídeo: ${String(e)}`);
    }
  }

  return (
    <div className="section">
      <button className="btn secondary small" onClick={onBack} style={{ marginBottom: 12 }}>
        ← Voltar
      </button>
      <div className="card">
        <span className={statusPill(consultation.status)}>{statusLabel(consultation.status)}</span>{' '}
        <strong>{svcLabel(consultation.type)}</strong>
        <div className="muted">
          {euro(consultation.priceCents)} · aberta {when(consultation.openedAt)}
        </div>
        {consultation.type === 'VIDEO' && consultation.status !== 'CLOSED' ? (
          <button className="btn small" onClick={joinVideo} style={{ marginTop: 8 }}>
            🎥 Entrar na videochamada
          </button>
        ) : null}
        {video ? <p className="muted" style={{ fontSize: 12 }}>{video}</p> : null}
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

      {consultation.status !== 'CLOSED' && consultation.status !== 'REFUNDED' ? (
        <div className="card section">
          <textarea
            placeholder="Escrever mensagem…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
          />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn" onClick={send} disabled={busy}>
              Enviar
            </button>
            {canClose ? (
              <button className="btn secondary" onClick={close} disabled={busy}>
                Fechar consulta
              </button>
            ) : null}
            {canCancel && (consultation.status === 'OPEN' || consultation.status === 'TRIAGE') ? (
              <button className="btn danger" onClick={cancel} disabled={busy}>
                Cancelar (reembolso)
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ───────────────────────── Parent: Children ─────────────────────────
function ChildrenTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [children, setChildren] = useState<ChildDto[]>([]);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setChildren(await Api.children());
    } catch (e) {
      onMsg(`Erro a carregar: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add() {
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

  return (
    <div className="section">
      <h2>As crianças</h2>
      {children.length === 0 ? (
        <p className="muted">Ainda sem crianças. Adiciona a primeira abaixo.</p>
      ) : (
        <div className="grid">
          {children.map((c) => (
            <div key={c.id} className="card">
              <strong>{c.name}</strong>
              <div className="muted">{new Date(c.birthDate).toLocaleDateString('pt-PT')}</div>
            </div>
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
        <button className="btn" onClick={add} disabled={busy}>
          Adicionar
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── Parent: Consult (message + video) ─────────────────────────
function ConsultTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [children, setChildren] = useState<ChildDto[]>([]);
  const [peds, setPeds] = useState<PediatricianCard[]>([]);
  const [child, setChild] = useState('');
  const [booking, setBooking] = useState<PediatricianCard | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [c, p] = await Promise.all([
        Api.children(),
        Api.pediatricians() as Promise<PediatricianCard[]>,
      ]);
      setChildren(c);
      setPeds(p);
      if (c.length > 0 && !child) setChild(c[0].id);
    } catch (e) {
      onMsg(`Erro a carregar: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startMessage(p: PediatricianCard) {
    const svc = p.services.find((s) => s.type === 'MESSAGE');
    if (!svc) return onMsg('Sem serviço de mensagem.');
    if (!child) return onMsg('Seleciona uma criança.');
    setBusy(true);
    try {
      await Api.startConsultation({
        childId: child,
        serviceId: svc.id,
        question: 'Olá, tenho uma dúvida sobre o meu filho.',
      });
      onMsg('Consulta por mensagem criada ✓ (vê em "Consultas")');
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (booking) {
    return (
      <BookVideo
        ped={booking}
        childId={child}
        onBack={() => setBooking(null)}
        onDone={() => {
          setBooking(null);
          onMsg('Videoconsulta marcada ✓ (vê em "Consultas")');
        }}
        onMsg={onMsg}
      />
    );
  }

  return (
    <div className="section">
      <h2>Escolher pediatra</h2>
      {children.length === 0 ? (
        <p className="notice">Adiciona uma criança no separador "Crianças" primeiro.</p>
      ) : (
        <label className="muted" style={{ display: 'block' }}>
          Criança:
          <select value={child} onChange={(e) => setChild(e.target.value)} style={{ marginLeft: 8 }}>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="grid">
        {peds.map((p) => {
          const msgSvc = p.services.find((s) => s.type === 'MESSAGE');
          const vidSvc = p.services.find((s) => s.type === 'VIDEO');
          return (
            <article key={p.id} className="card">
              <span className="pill ok">✓ Verificado</span>
              <h3 style={{ margin: '6px 0' }}>{p.specialties[0] ?? 'Pediatria geral'}</h3>
              <p className="muted" style={{ margin: 0 }}>
                {p.languages.join(' · ')} · ⭐ {p.ratingAvg.toFixed(1)}
              </p>
              {msgSvc ? (
                <button className="btn small" onClick={() => startMessage(p)} disabled={busy}>
                  💬 Mensagem · {euro(msgSvc.priceCents)}
                </button>
              ) : null}
              {vidSvc ? (
                <button
                  className="btn small secondary"
                  onClick={() => setBooking(p)}
                  disabled={busy || !child}
                  style={{ marginLeft: 6 }}
                >
                  🎥 Vídeo · {euro(vidSvc.priceCents)}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function BookVideo({
  ped,
  childId,
  onBack,
  onDone,
  onMsg,
}: {
  ped: PediatricianCard;
  childId: string;
  onBack: () => void;
  onDone: () => void;
  onMsg: (m: string) => void;
}) {
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const vidSvc = ped.services.find((s) => s.type === 'VIDEO');

  async function findSlots() {
    if (!date) return onMsg('Escolhe uma data.');
    setBusy(true);
    try {
      setSlots(await Api.slots(ped.id, date));
    } catch (e) {
      onMsg(`Erro a procurar horários: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function book(slot: string) {
    if (!vidSvc) return;
    if (!consent) return onMsg('Confirma o consentimento de teleconsulta.');
    setBusy(true);
    try {
      await Api.book({ childId, serviceId: vidSvc.id, scheduledAt: slot, teleconsultConsent: true });
      onDone();
    } catch (e) {
      onMsg(`Erro a marcar: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <button className="btn secondary small" onClick={onBack} style={{ marginBottom: 12 }}>
        ← Voltar
      </button>
      <h2>Marcar videoconsulta</h2>
      <p className="muted">
        {ped.specialties[0] ?? 'Pediatria geral'} · {vidSvc ? euro(vidSvc.priceCents) : ''}
      </p>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      <label className="muted" style={{ display: 'block', margin: '8px 0' }}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          style={{ width: 'auto', marginRight: 8 }}
        />
        Consinto a teleconsulta (vídeo) 🔒
      </label>
      <button className="btn" onClick={findSlots} disabled={busy}>
        Ver horários
      </button>
      {slots.length > 0 ? (
        <div className="row" style={{ marginTop: 12 }}>
          {slots.map((s) => (
            <button key={s} className="btn small secondary" onClick={() => book(s)} disabled={busy}>
              {new Date(s).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
            </button>
          ))}
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
          Sem horários para esta data. A pediatra define disponibilidade no perfil dela (separador
          "Agenda").
        </p>
      )}
    </div>
  );
}

// ───────────────────────── Parent: My consultations ─────────────────────────
function MyConsultsTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [rows, setRows] = useState<ConsultationDto[]>([]);
  const [open, setOpen] = useState<ConsultationDto | null>(null);
  const [reviewing, setReviewing] = useState<ConsultationDto | null>(null);

  async function load() {
    try {
      setRows(await Api.myConsultations());
    } catch (e) {
      onMsg(`Erro a carregar: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (open)
    return (
      <Thread
        consultation={open}
        canClose={false}
        canCancel
        onChanged={() => {
          setOpen(null);
          void load();
        }}
        onBack={() => setOpen(null)}
        onMsg={onMsg}
      />
    );
  if (reviewing)
    return (
      <ReviewForm
        consultation={reviewing}
        onBack={() => setReviewing(null)}
        onDone={() => {
          setReviewing(null);
          onMsg('Avaliação enviada ✓ obrigado!');
        }}
        onMsg={onMsg}
      />
    );

  return (
    <div className="section">
      <h2>As minhas consultas</h2>
      {rows.length === 0 ? (
        <p className="muted">Ainda sem consultas. Inicia uma no separador "Consultar".</p>
      ) : (
        <div className="grid">
          {rows.map((c) => (
            <div key={c.id} className="card">
              <span className={statusPill(c.status)}>{statusLabel(c.status)}</span>
              <div>
                <strong>{svcLabel(c.type)}</strong> · {euro(c.priceCents)}
              </div>
              <div className="muted">{when(c.openedAt)}</div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn small" onClick={() => setOpen(c)}>
                  Abrir
                </button>
                {c.status === 'CLOSED' ? (
                  <button className="btn small secondary" onClick={() => setReviewing(c)}>
                    ⭐ Avaliar
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewForm({
  consultation,
  onBack,
  onDone,
  onMsg,
}: {
  consultation: ConsultationDto;
  onBack: () => void;
  onDone: () => void;
  onMsg: (m: string) => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await Api.addReview({ consultationId: consultation.id, rating, comment: comment || undefined });
      onDone();
    } catch (e) {
      onMsg(`Erro a avaliar: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <button className="btn secondary small" onClick={onBack} style={{ marginBottom: 12 }}>
        ← Voltar
      </button>
      <h2>Avaliar consulta</h2>
      <div className="row" style={{ fontSize: 28 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} style={{ cursor: 'pointer' }} onClick={() => setRating(n)}>
            {n <= rating ? '⭐' : '☆'}
          </span>
        ))}
      </div>
      <textarea
        placeholder="Comentário (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
      />
      <button className="btn" onClick={submit} disabled={busy}>
        Enviar avaliação
      </button>
    </div>
  );
}

// ───────────────────────── Pediatrician: Inbox ─────────────────────────
function InboxTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [rows, setRows] = useState<ConsultationDto[]>([]);
  const [open, setOpen] = useState<ConsultationDto | null>(null);

  async function load() {
    try {
      setRows(await Api.inbox());
    } catch (e) {
      onMsg(`Erro a carregar: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (open)
    return (
      <Thread
        consultation={open}
        canClose
        canCancel={false}
        onChanged={() => {
          setOpen(null);
          void load();
        }}
        onBack={() => setOpen(null)}
        onMsg={onMsg}
      />
    );

  return (
    <div className="section">
      <h2>Caixa de entrada</h2>
      {rows.length === 0 ? (
        <p className="muted">Sem consultas pendentes. (Entra como Marta e cria uma.)</p>
      ) : (
        <div className="grid">
          {rows.map((c) => (
            <button
              key={c.id}
              className="card"
              onClick={() => setOpen(c)}
              style={{ textAlign: 'left', cursor: 'pointer' }}
            >
              <span className={statusPill(c.status)}>{statusLabel(c.status)}</span>
              <div>
                <strong>{svcLabel(c.type)}</strong> · {euro(c.priceCents)}
              </div>
              <div className="muted">SLA: {when(c.slaDueAt)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Pediatrician: Agenda ─────────────────────────
function AgendaTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [rows, setRows] = useState<AvailabilityDto[]>([]);
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('13:00');
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setRows(await Api.availability());
    } catch (e) {
      onMsg(`Erro a carregar: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add() {
    setBusy(true);
    try {
      await Api.addAvailability({
        weekday,
        startMinute: toMin(start),
        endMinute: toMin(end),
        slotMinutes: 20,
      });
      onMsg('Disponibilidade adicionada ✓');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function del(id: string) {
    setBusy(true);
    try {
      await Api.deleteAvailability(id);
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <h2>Disponibilidade (vídeo)</h2>
      {rows.length === 0 ? (
        <p className="muted">Sem blocos definidos. Os pais só veem horários nos dias que definires.</p>
      ) : (
        <div className="grid">
          {rows.map((a) => (
            <div key={a.id} className="card">
              <strong>{WEEKDAYS[a.weekday]}</strong>
              <div className="muted">
                {hhmm(a.startMinute)}–{hhmm(a.endMinute)} · slots {a.slotMinutes} min
              </div>
              <button className="btn danger small" onClick={() => del(a.id)} disabled={busy}>
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="card section">
        <h3>Adicionar bloco</h3>
        <label className="muted">
          Dia:
          <select
            value={weekday}
            onChange={(e) => setWeekday(Number(e.target.value))}
            style={{ marginLeft: 8 }}
          >
            {WEEKDAYS.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <div className="row" style={{ marginTop: 8 }}>
          <label className="muted">
            Início <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="muted">
            Fim <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        <button className="btn" onClick={add} disabled={busy}>
          Adicionar
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── Pediatrician: Profile + services ─────────────────────────
function PedProfileTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [me, setMe] = useState<PedMeDto | null>(null);
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [stype, setStype] = useState('MESSAGE');
  const [sprice, setSprice] = useState('18');
  const [ssla, setSsla] = useState('4');

  async function load() {
    try {
      const m = await Api.me();
      setMe(m);
      setBio(m.bio ?? '');
    } catch (e) {
      onMsg(`Erro a carregar perfil: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveBio() {
    setBusy(true);
    try {
      await Api.updateMe({ bio });
      onMsg('Perfil atualizado ✓');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function addService() {
    setBusy(true);
    try {
      await Api.addService({
        type: stype,
        priceCents: Math.round(Number(sprice) * 100),
        slaHours: Number(ssla),
      });
      onMsg('Serviço adicionado ✓');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function delService(id: string) {
    setBusy(true);
    try {
      await Api.deleteService(id);
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (!me) return <p className="muted section">A carregar…</p>;

  return (
    <div className="section">
      <h2>O meu perfil</h2>
      <div className="card">
        <span className="pill ok">{me.status}</span> · ⭐ {me.ratingAvg.toFixed(1)} ·{' '}
        {me.experienceYears ?? 0} anos
        <div className="muted">{me.languages.join(' · ')}</div>
      </div>
      <div className="card section">
        <h3>Bio</h3>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
        <button className="btn" onClick={saveBio} disabled={busy}>
          Guardar
        </button>
      </div>

      <h3 style={{ marginTop: 20 }}>Serviços</h3>
      <div className="grid">
        {me.services.map((s: ServiceDto) => (
          <div key={s.id} className="card">
            <strong>{svcLabel(s.type)}</strong> · {euro(s.priceCents)}
            <div className="muted">SLA {s.slaHours}h{s.active === false ? ' · inativo' : ''}</div>
            <button className="btn danger small" onClick={() => delService(s.id)} disabled={busy}>
              Remover
            </button>
          </div>
        ))}
      </div>
      <div className="card section">
        <h3>Adicionar serviço</h3>
        <label className="muted">
          Tipo:
          <select value={stype} onChange={(e) => setStype(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="MESSAGE">Mensagem</option>
            <option value="VIDEO">Vídeo</option>
            <option value="SECOND_OPINION">Segunda opinião</option>
            <option value="FOLLOW_UP">Seguimento</option>
          </select>
        </label>
        <div className="row" style={{ marginTop: 8 }}>
          <label className="muted">
            Preço €
            <input
              type="number"
              value={sprice}
              onChange={(e) => setSprice(e.target.value)}
              style={{ width: 90 }}
            />
          </label>
          <label className="muted">
            SLA (h)
            <input
              type="number"
              value={ssla}
              onChange={(e) => setSsla(e.target.value)}
              style={{ width: 80 }}
            />
          </label>
        </div>
        <button className="btn" onClick={addService} disabled={busy}>
          Adicionar serviço
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── Pediatrician: Finance ─────────────────────────
function FinanceTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [f, setF] = useState<FinanceDto | null>(null);
  useEffect(() => {
    Api.finance()
      .then(setF)
      .catch((e) => onMsg(`Erro: ${String(e)}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!f) return <p className="muted section">A carregar…</p>;
  return (
    <div className="section">
      <h2>Ganhos</h2>
      <div className="grid">
        <div className="card">
          <div className="muted">Líquido recebido</div>
          <strong style={{ fontSize: 22 }}>{euro(f.netCents)}</strong>
        </div>
        <div className="card">
          <div className="muted">Comissão plataforma</div>
          <strong style={{ fontSize: 22 }}>{euro(f.commissionCents)}</strong>
        </div>
        <div className="card">
          <div className="muted">Consultas liquidadas</div>
          <strong style={{ fontSize: 22 }}>{f.consultationsSettled}</strong>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 13 }}>
        Os valores ficam a zero até existir <code>STRIPE_SECRET_KEY</code> e a consulta ser fechada
        com pagamento.
      </p>
    </div>
  );
}

// ───────────────────────── Admin / Finance ─────────────────────────
function AdminTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [rows, setRows] = useState<ConsultationDto[]>([]);
  const [open, setOpen] = useState<ConsultationDto | null>(null);
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
      onMsg('Reembolso registado ✓');
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy('');
    }
  }

  if (open)
    return (
      <Thread
        consultation={open}
        canClose={false}
        canCancel={false}
        onChanged={() => setOpen(null)}
        onBack={() => setOpen(null)}
        onMsg={onMsg}
      />
    );

  return (
    <div className="section">
      <h2>Consultas (plataforma)</h2>
      {rows.length === 0 ? (
        <p className="muted">Sem consultas.</p>
      ) : (
        <div className="grid">
          {rows.map((c) => (
            <div key={c.id} className="card">
              <span className={statusPill(c.status)}>{statusLabel(c.status)}</span>
              <div>
                <strong>{svcLabel(c.type)}</strong> · {euro(c.priceCents)}
              </div>
              <div className="muted">{when(c.openedAt)}</div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn small secondary" onClick={() => setOpen(c)}>
                  Ver
                </button>
                <button
                  className="btn small danger"
                  onClick={() => refund(c.id)}
                  disabled={busy === c.id || c.status === 'REFUNDED'}
                >
                  {c.status === 'REFUNDED' ? 'Reembolsada' : 'Reembolsar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── Notifications (all roles) ─────────────────────────
function NotifTab({ onMsg }: { onMsg: (m: string) => void }) {
  const [rows, setRows] = useState<NotificationDto[]>([]);

  async function load() {
    try {
      setRows(await Api.notifications());
    } catch (e) {
      onMsg(`Erro a carregar: ${String(e)}`);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function read(id: string) {
    try {
      await Api.markRead(id);
      await load();
    } catch (e) {
      onMsg(`Erro: ${String(e)}`);
    }
  }

  return (
    <div className="section">
      <h2>Avisos</h2>
      {rows.length === 0 ? (
        <p className="muted">Sem avisos. As notificações aparecem ao criar/fechar consultas.</p>
      ) : (
        rows.map((n) => (
          <div key={n.id} className="card" style={{ marginBottom: 8, opacity: n.read ? 0.6 : 1 }}>
            <strong>{n.title}</strong>
            {!n.read ? <span className="pill" style={{ marginLeft: 6 }}>novo</span> : null}
            <div className="muted">{n.body}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {when(n.createdAt)}
            </div>
            {!n.read ? (
              <button className="btn small secondary" onClick={() => read(n.id)}>
                Marcar como lido
              </button>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

// ───────────────────────── Other roles ─────────────────────────
function GenericTab({ profile, onMsg }: { profile: Profile; onMsg: (m: string) => void }) {
  const [checked, setChecked] = useState<string | null>(null);
  async function testRbac() {
    try {
      await Api.allConsultations();
      setChecked('Este perfil teve acesso (inesperado nesta demo).');
    } catch (e) {
      if (isForbidden(e)) {
        setChecked('✓ Acesso negado corretamente — o controlo de acessos (RBAC) funciona.');
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
          Sessão como <strong>{profile.role}</strong>. Este perfil ainda não tem ecrã dedicado, mas
          a sessão e as permissões são reais.
        </p>
        <button className="btn secondary" onClick={testRbac}>
          Testar permissão (deve ser negado)
        </button>
        {checked ? <p className="notice" style={{ marginTop: 12 }}>{checked}</p> : null}
      </div>
    </div>
  );
}
