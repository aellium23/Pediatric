import { getPediatricians, DEMO_MODE, type PediatricianCard } from '@/lib/api';

// Rendered per request (never prerendered at build time).
export const dynamic = 'force-dynamic';

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(
    cents / 100,
  );
}

export default async function Marketplace() {
  const pediatricians: PediatricianCard[] = await getPediatricians();

  return (
    <main>
      <h1>Pediatras</h1>
      <p className="muted">Profissionais verificados pela Ordem dos Médicos.</p>

      {DEMO_MODE ? (
        <p className="muted">
          ⓘ A mostrar <strong>dados de demonstração</strong>. Define{' '}
          <code>NEXT_PUBLIC_API_BASE</code> para ligar a uma API real.
        </p>
      ) : null}

      {pediatricians.length === 0 ? (
        <p className="muted">
          Sem resultados neste momento. (Liga a API em <code>NEXT_PUBLIC_API_BASE</code>.)
        </p>
      ) : (
        <div className="grid">
          {pediatricians.map((p) => {
            const cheapest = p.services.reduce<number | null>(
              (min, s) => (min === null ? s.priceCents : Math.min(min, s.priceCents)),
              null,
            );
            return (
              <article key={p.id} className="card">
                <span className="badge">✓ Cédula verificada</span>
                <h3 style={{ marginBottom: 2 }}>{p.displayName ?? p.specialties[0] ?? 'Pediatria geral'}</h3>
                <p className="muted" style={{ marginTop: 0 }}>
                  {p.specialties[0] ?? 'Pediatria geral'}
                  {p.region ? ` · 📍 ${p.region}` : ''}
                </p>
                <p className="muted">
                  {p.languages.join(' · ')}
                  {p.experienceYears ? ` · ${p.experienceYears} anos` : ''}
                </p>
                <p>
                  ⭐ {p.ratingAvg.toFixed(1)}
                  {cheapest !== null ? ` · desde ${formatPrice(cheapest, 'EUR')}` : ''}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
