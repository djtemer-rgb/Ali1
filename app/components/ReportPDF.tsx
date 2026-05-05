"use client";

import { forwardRef } from "react";

interface ReportTemplateProps {
  childName: string;
  days: number;
  data: any;
}

const ReportTemplate = forwardRef<HTMLDivElement, ReportTemplateProps>(({ childName, days, data }, ref) => {
  const { summary, chart, categories, rewards, grades, period } = data;

  return (
    <div ref={ref} style={{
      width: '800px', padding: '40px', fontFamily: 'Arial, sans-serif',
      background: '#ffffff', color: '#1e293b', fontSize: '12px', lineHeight: '1.5'
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 'bold', margin: 0, color: '#1e293b' }}>Путь героя — Отчёт</h1>
        <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>{childName}</p>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{period.startDate} — {period.endDate} ({days} дней)</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { label: '✅ Задач выполнено', value: summary.totalTasksCompleted, color: '#1e293b' },
          { label: '⭐ Заработано звёзд', value: summary.totalStarsEarned, color: '#d97706' },
          { label: '🔥 Лучшая серия', value: `${summary.streakDays} дней`, color: '#16a34a' },
          { label: '💎 Текущий баланс', value: summary.currentBalance, color: '#2563eb' },
        ].map((card, i) => (
          <div key={i} style={{ flex: 1, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
            <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 4px' }}>{card.label}</p>
            <p style={{ fontSize: 18, fontWeight: 'bold', color: card.color, margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />

      {/* Activity table */}
      <h2 style={{ fontSize: 14, fontWeight: 'bold', color: '#334155', margin: '0 0 8px' }}>📊 Активность по дням</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <th style={{ fontSize: 10, color: '#94a3b8', fontWeight: 'bold', textAlign: 'left', padding: '4px 0' }}>Дата</th>
            <th style={{ fontSize: 10, color: '#94a3b8', fontWeight: 'bold', textAlign: 'center', padding: '4px 0' }}>Задач</th>
            <th style={{ fontSize: 10, color: '#94a3b8', fontWeight: 'bold', textAlign: 'right', padding: '4px 0' }}>Звёзд</th>
          </tr>
        </thead>
        <tbody>
          {chart.labels.map((label: string, i: number) => (
            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ fontSize: 11, padding: '3px 0', color: '#334155' }}>{label}</td>
              <td style={{ fontSize: 11, textAlign: 'center', padding: '3px 0', color: '#334155' }}>
                {chart.tasksCompleted[i] > 0 ? chart.tasksCompleted[i] : '—'}
              </td>
              <td style={{ fontSize: 11, textAlign: 'right', padding: '3px 0', color: '#d97706', fontWeight: 'bold' }}>
                {chart.starsEarned[i] > 0 ? `+${chart.starsEarned[i]}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Categories */}
      {Object.keys(categories).length > 0 && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />
          <h2 style={{ fontSize: 14, fontWeight: 'bold', color: '#334155', margin: '0 0 8px' }}>📂 Категории задач</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {Object.entries(categories).map(([cat, count]) => (
              <span key={cat} style={{ padding: '3px 8px', background: '#f1f5f9', borderRadius: 4, fontSize: 10, color: '#475569' }}>
                {String(cat)}: {count as number}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Grades */}
      {grades.length > 0 && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />
          <h2 style={{ fontSize: 14, fontWeight: 'bold', color: '#334155', margin: '0 0 8px' }}>📝 Последние оценки</h2>
          {grades.map((g: any) => (
            <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #f1f5f9', fontSize: 11 }}>
              <span style={{ color: '#334155' }}>
                {g.subjectName}
                {g.createdAt ? ` (${new Date(g.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })})` : ''}
              </span>
              <span style={{ fontWeight: 'bold', color: g.grade >= 4 ? '#16a34a' : g.grade === 3 ? '#d97706' : '#dc2626' }}>{g.grade}</span>
            </div>
          ))}
        </>
      )}

      {/* Rewards */}
      {(rewards.selected > 0 || rewards.fulfilled > 0) && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />
          <h2 style={{ fontSize: 14, fontWeight: 'bold', color: '#334155', margin: '0 0 8px' }}>🎁 Награды</h2>
          <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Выбрано: {rewards.selected} • Получено: {rewards.fulfilled}</p>
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: 32, fontSize: 9, color: '#cbd5e1' }}>
        Сгенерировано «Путь героя» • {new Date().toLocaleDateString('ru-RU')}
      </div>
    </div>
  );
});

ReportTemplate.displayName = 'ReportTemplate';
export default ReportTemplate;
