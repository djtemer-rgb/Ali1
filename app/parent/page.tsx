"use client";
import { useState } from 'react'

export default function ParentPage() {
  const [pin, setPin] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    // Very lightweight; real MVP uses server-side JWT with secret in env
    if (pin.length >= 4) {
      setAuthenticated(true);
    }
  };

  if (!authenticated) {
    return (
      <section className="card" style={{ padding: 16 }}>
        <h2>Родительская панель</h2>
        <form onSubmit={login} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input type="password" placeholder="Введите PIN" value={pin} onChange={e => setPin(e.target.value)} />
          <button className="btn" type="submit">Войти</button>
        </form>
        <p className="subtitle" style={{ marginTop: 8 }}>Детальнее аутентификацию и хранение сессии реализую на сервере в Iteration 1.</p>
      </section>
    );
  }

  return (
    <section className="card" style={{ padding: 16 }}>
      <h2>Добро пожаловать, Родитель</h2>
      <p className="subtitle">Доступ к настройкам иInbox.</p>
    </section>
  );
}
