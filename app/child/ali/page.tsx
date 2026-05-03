"use client";
import { useEffect, useState } from 'react';

type Profile = {
  id: 'ali' | 'said';
  name: string;
  mode: 'full' | 'little-hero';
  avatarLetter: string;
};

export default function AliPage() {
  const [profile, setProfile] = useState<Profile>({ id: 'ali', name: 'Али', mode: 'full', avatarLetter: 'A' });

  // In a real app we'd fetch from Upstash; here we show a minimal UI with per-profile state.
  return (
    <section className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="row">
          <div style={{ width: 40, height: 40, borderRadius: 8, background: '#1e4ed8', color: '#fff', display: 'grid', placeItems: 'center' }}>
            {profile.avatarLetter}
          </div>
          <div>
            <span className="subtitle" style={{ fontWeight: 700 }}>Привет, {profile.name}!</span>
          </div>
        </div>
        <div>
          <span className="pill">Ali</span>
        </div>
      </div>

      <div className="section" style={{ marginTop: 12 }}>
        <div className="title">Главная</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          <div className="card" style={{ padding: 16 }}>
            <div className="subtitle">Задания на сегодня</div>
            <div className="section"><span>Квесты: Прочитать 10 страниц</span></div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div className="subtitle">Награды</div>
            <div>10★</div>
          </div>
        </div>
      </div>
    </section>
  );
}
