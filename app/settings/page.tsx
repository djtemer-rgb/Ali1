"use client";
import { useState } from 'react';

export default function SettingsPage() {
  const [open, setOpen] = useState(true);
  return (
    <section className="card" style={{ padding: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="title">Настройки</div>
        <button className="btn secondary" onClick={() => setOpen(v => !v)}>Показать/скрыть</button>
      </div>
      {open && <div className="section" style={{ marginTop: 8 }}>
        <div className="subtitle">Профили детей</div>
        <div>Ali • full</div>
        <div>Said • little-hero</div>
        <div className="subtitle" style={{ marginTop: 12 }}>PIN & Recovery</div>
        <div>Two PIN slots and an emergency recovery word (механизм хранится на сервере).</div>
      </div>}
    </section>
  );
}
