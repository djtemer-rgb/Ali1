import Link from 'next/link'

export default function Home() {
  return (
    <section className="card" style={{ padding: 20 }}>
      <h1>Добро пожаловать в Ali Quest</h1>
      <p className="subtitle">Выберите профиль ребенка и начните настройку MVP Iteration 1.</p>
      <div className="grid" style={{ marginTop: 12 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="title">Ali</div>
          <p className="subtitle">Full режим</p>
          <Link href="/child/ali" className="link">Перейти к панели Али</Link>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div className="title">Said</div>
          <p className="subtitle">Little-hero режим</p>
          <Link href="/child/said" className="link">Перейти к панели Саида</Link>
        </div>
      </div>
    </section>
  )
}
