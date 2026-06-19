import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <section className="hero">
        <span className="badge">PÉDIA · TELEPEDIATRIA</span>
        <h1>O pediatra de confiança, à distância de uma mensagem.</h1>
        <p className="muted">
          Pediatras verificados · Seguro e privado · Sem ir à urgência por tudo.
        </p>
        <Link className="cta" href="/marketplace">
          Encontrar pediatra
        </Link>
        <p className="muted" style={{ marginTop: 16 }}>
          Ou experimenta a <Link href="/demo">demo interativa</Link> (login →
          criança → consulta) · vê o <Link href="/tour">tour visual</Link> 📱
        </p>
      </section>
    </main>
  );
}
