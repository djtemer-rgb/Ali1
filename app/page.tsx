"use client";
import { useState } from 'react'
import { ProfileSwitcher } from './components/ProfileSwitcher'

type Profile = 'ali' | 'said'

export default function Home() {
  const [current, setCurrent] = useState<Profile>('ali')
  const isAli = current === 'ali'

  return (
    <section className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <ProfileSwitcher current={current} onChange={setCurrent} />
      </div>

      <nav className="nav" style={{ display: 'flex', gap: 20, marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
        <div className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Главная</div>
        <div className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Оценки</div>
        <div className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Расписание</div>
        <div className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Настройки</div>
      </nav>

      {isAli ? (
        <section className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 16 }}>
          <div className="card" style={{ padding: 16 }}>
            <div className="title">Главная</div>
            <div className="section" style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <div className="subtitle">Задания на сегодня</div>
                <div>Прочитать 10 страниц</div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="subtitle">Награды</div>
                <div>10★</div>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div className="subtitle">Послание от Героя</div>
            <div>Здесь будет текст поддержки</div>
          </div>
        </section>
      ) : (
        <section className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 16 }}>
          <div className="card" style={{ padding: 16 }}>
            <div className="title">Главная</div>
            <div className="section" style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div className="subtitle">Задания на сегодня</div>
                <div>Прочитать 5 страниц</div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="subtitle">Награды</div>
                <div>5★</div>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div className="subtitle">Послание Героя</div>
            <div>Саид получает персональное сообщение</div>
          </div>
        </section>
      )}
    </section>
  )
}
