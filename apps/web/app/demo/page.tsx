'use client';

import { useEffect, useState } from 'react';
import { Api, hasApi, setToken, clearToken, type ChildDto } from '@/lib/client';
import { DEMO_PEDIATRICIANS } from '@/lib/demo';
import type { PediatricianCard } from '@/lib/types';

// When no backend is configured, the page runs fully on local mock state.
const MOCK = !hasApi;

function euro(cents: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(
    cents / 100,
  );
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `c${Date.now()}`;
}

export default function DemoApp() {
  const [authed, setAuthed] = useState(false);
  const [children, setChildren] = useState<ChildDto[]>([]);
  const [peds, setPeds] = useState<PediatricianCard[]>([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!MOCK && typeof window !== 'undefined' && localStorage.getItem('pedia_token')) {
      setAuthed(true);
      void load();
    }
  }, []);

  async function load() {
    if (MOCK) {
      setPeds(DEMO_PEDIATRICIANS);
      return;
    }
    try {
      const [c, p] = await Promise.all([Api.children(), Api.pediatricians()]);
      setChildren(c);
      setPeds(p);
      if (c.length > 0) setSelectedChild(c[0].id);
    } catch (e) {
      setMsg(`Erro a carregar: ${String(e)}`);
    }
  }

  async function login() {
    setBusy(true);
    setMsg('');
    if (MOCK) {
      setAuthed(true);
      setPeds(DEMO_PEDIATRICIANS);
      setMsg('Modo demonstração — sem backend (dados locais).');
      setBusy(false);
      return;
    }
    try {
      const r = await Api.devLogin();
      setToken(r.accessToken);
      setAuthed(true);
      await load();
      setMsg('Sessão iniciada como marta@demo.pedia');
    } catch (e) {
      setMsg(`Erro no login: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    if (!MOCK) clearToken();
    setAuthed(false);
    setChildren([]);
    setPeds([]);
    setSelectedChild('');
    setMsg('Sessão terminada.');
  }

  async function addChild() {
    if (!name || !birthDate) {
      setMsg('Indica o nome e a data de nascimento.');
      return;
    }
    if (!consent) {
      setMsg('Tens de autorizar o tratamento de dados de saúde.');
      return;
    }
    setBusy(true);
    if (MOCK) {
      const child: ChildDto = { id: newId(), name, birthDate };
      setChildren((prev) => [...prev, child]);
      setSelectedChild(child.id);
      setName('');
      setBirthDate('');
      setConsent(false);
      setMsg('Criança adicionada ✓ (demonstração)');
      setBusy(false);
      return;
    }
    try {
      await Api.addChild({ name, birthDate, healthDataConsent: true });
      setName('');
      setBirthDate('');
      setConsent(false);
      await load();
      setMsg('Criança adicionada ✓');
    } catch (e) {
      setMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function consult(ped: PediatricianCard) {
    const svc = ped.services.find((s) => s.type === 'MESSAGE') ?? ped.services[0];
    if (!svc) {
      setMsg('Este pediatra não tem serviço disponível.');
      return;
    }
    if (!selectedChild) {
      setMsg('Adiciona e seleciona uma criança primeiro.');
      return;
    }
    const childName = children.find((c) => c.id === selectedChild)?.name ?? 'a criança';
    setBusy(true);
    if (MOCK) {
      setMsg(
        `✓ Consulta por mensagem iniciada sobre ${childName} (${euro(svc.priceCents)}). ` +
          'Na app real seguia para pagamento e chat com o pediatra.',
      );
      setBusy(false);
      return;
    }
    try {
      const r = await Api.startConsultation({
        childId: selectedChild,
        serviceId: svc.id,
        question: 'Olá, tenho uma dúvida sobre o meu filho.',
      });
      setMsg(`Consulta criada ✓ (estado: ${r.status}). Pagamento e chat seguem na app.`);
    } catch (e) {
      setMsg(`Erro: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Demo interativa</h1>
      {MOCK ? (
        <p className="notice">
          ⓘ <strong>Modo demonstração</strong> (sem backend, dados locais no browser).
          Para dados reais, liga uma API em <code>NEXT_PUBLIC_API_BASE</code>.
        </p>
      ) : null}
      {msg ? <p className="notice">{msg}</p> : null}

      {!authed ? (
        <div className="section">
          <p className="muted">Entra como a família demo para experimentar o fluxo.</p>
          <button className="btn" onClick={login} disabled={busy}>
            Entrar em modo demo
          </button>
        </div>
      ) : (
        <>
          <div className="section">
            <button className="btn secondary" onClick={logout}>
              Terminar sessão
            </button>
          </div>

          <div className="section">
            <h2>As crianças</h2>
            {children.length === 0 ? (
              <p className="muted">Ainda não há crianças. Adiciona a primeira abaixo.</p>
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
                    <div className="muted">
                      {new Date(c.birthDate).toLocaleDateString('pt-PT')}
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="card section">
              <h3>Adicionar criança</h3>
              <input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
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
            <h2>Escolher pediatra e consultar</h2>
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
        </>
      )}
    </main>
  );
}
