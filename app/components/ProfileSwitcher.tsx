"use client";
import React, { useState } from 'react'

type Profile = 'ali' | 'said'

export const ProfileSwitcher: React.FC<{ current: Profile; onChange: (p: Profile) => void }> = ({ current, onChange }) => {
  const [open, setOpen] = useState(false)
  const label = current === 'ali' ? 'Али' : 'Саид'
  const other: Profile = current === 'ali' ? 'said' : 'ali'
  const otherName = other === 'ali' ? 'Али' : 'Саид'

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', cursor: 'pointer', background: '#fff' }}
      >
        <span style={{ width: 22, height: 22, borderRadius: 6, background: '#1e4ed8', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>A</span>
        <span style={{ fontWeight: 700 }}>{label}</span>
      </div>
      {open && (
        <div
          style={{ position: 'absolute', top: '100%', left: 0, transform: 'translateY(6px)', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,.15)', padding: 6, minWidth: 140, zIndex: 10 }}
        >
          <div
            onClick={() => { onChange(other); setOpen(false); }}
            style={{ padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >{otherName}</div>
        </div>
      )}
    </div>
  )
}
