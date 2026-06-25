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
        <Link className="cta" href="/app">
          Entrar na app (escolher perfil)
        </Link>
        <p className="muted" style={{ marginTop: 16 }}>
          Entra como qualquer perfil demo (Pai, Pediatra, Admin…) com dados reais ·{' '}
          <Link href="/marketplace">marketplace</Link> · <Link href="/tour">tour visual</Link> 📱
        </p>
      </section>
    </main>
  );
}
