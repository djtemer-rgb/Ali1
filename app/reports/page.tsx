"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Star, Download, Gift } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useChild } from "@/app/lib/ChildContext";

interface ReportData {
  period: { days: number; startDate: string; endDate: string };
  summary: { totalTasksCompleted: number; totalStarsEarned: number; totalGradesCount: number; streakDays: number; currentBalance: number };
  chart: { labels: string[]; tasksCompleted: number[]; starsEarned: number[] };
  categories: Record<string, number>;
  rewards: { selected: number; fulfilled: number };
  grades: any[];
}

export default function ReportsPage() {
  const { currentChild } = useChild();
  const [days, setDays] = useState(7);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [showPdfError, setShowPdfError] = useState(false);
  const [rewardList, setRewardList] = useState<any[]>([]);

  useEffect(() => { loadReport(); }, [currentChild.id, days]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?childId=${currentChild.id}&days=${days}`);
      if (!res.ok) { setData(null); return; }
      const json = await res.json();
      if (!json || json.error) { setData(null); return; }
      setData(json);

      const statusRes = await fetch(`/api/rewards/status?childId=${currentChild.id}`);
      const statusData = await statusRes.json();
      if (Array.isArray(statusData)) {
        const fulfilledIds = statusData.filter((s: any) => s.status === 'fulfilled').map((s: any) => s.rewardId);
        const rewardsRes = await fetch(`/api/rewards?childId=${currentChild.id}`);
        const allRewards = await rewardsRes.json();
        if (Array.isArray(allRewards)) setRewardList(allRewards.filter((r: any) => fulfilledIds.includes(r.id)));
      }
    } catch (e) { console.error(e); setData(null); } finally { setLoading(false); }
  };

  const exportPDF = async () => {
    if (!data) return;
    setShowPdfError(false);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      const el = document.getElementById('report-pdf-template');
      if (!el) return;
      el.style.display = 'block';
      await new Promise(r => setTimeout(r, 100));
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true });
      el.style.display = 'none';
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
      let remaining = pdfH - pdf.internal.pageSize.getHeight();
      let pos = -pdf.internal.pageSize.getHeight();
      while (remaining > 0) {
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, pos, pdfW, pdfH);
        remaining -= pdf.internal.pageSize.getHeight();
        pos -= pdf.internal.pageSize.getHeight();
      }
      pdf.save(`report-${currentChild.name}-${days}days.pdf`);
    } catch (e) {
      console.error('PDF error:', e);
      setShowPdfError(true);
    }
    setShowExport(false);
  };

  const exportMD = () => {
    if (!data) return;
    let md = `# Отчёт: ${currentChild.name}\n**Период:** ${data.period.startDate} — ${data.period.endDate}\n\n`;
    md += `## Сводка\n- **Выполнено задач:** ${data.summary.totalTasksCompleted}\n- **Заработано звёзд:** ${data.summary.totalStarsEarned}\n- **Оценок:** ${data.summary.totalGradesCount}\n- **Текущий баланс:** ${data.summary.currentBalance}\n- **Серия дней:** ${data.summary.streakDays}\n`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `report-${currentChild.name}-${days}days.md`; a.click();
    setShowExport(false);
  };

  const maxVal = data ? Math.max(...data.chart.tasksCompleted, ...data.chart.starsEarned, 1) : 1;

  return (
    <div className="min-h-screen bg-[#F4F7FB] font-sans text-slate-800 pb-10">
      <header className="bg-white px-4 md:px-6 py-3 md:py-4 flex items-center justify-between border-b border-slate-100">
        <Link href="/" className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium">
          <ArrowLeft size={18} /> Назад
        </Link>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowExport(!showExport)}
              className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all">
              <Download size={16} />
            </button>
            <AnimatePresence>
              {showExport && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                  className="absolute right-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-50 min-w-[120px]">
                  <button onClick={exportMD} className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">MD</button>
                  <button onClick={exportPDF} className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">PDF</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={() => setShowRewards(!showRewards)}
            className="flex items-center gap-1.5 bg-purple-50 text-purple-600 px-3 py-2 rounded-xl font-bold text-xs hover:bg-purple-100 transition-colors">
            <Gift size={14} /> Награды
          </button>
        </div>
      </header>
      <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 text-center py-4">Отчёты</h1>

      <main className="max-w-4xl mx-auto px-4 md:px-6 space-y-4">
        <div className="flex gap-2 justify-center">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${days === d ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 shadow-sm'}`}>{d} дней</button>
          ))}
        </div>

        <div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
          ) : !data ? (
            <p className="text-slate-400 text-center py-10 text-sm">Нет данных для отчёта</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Задач</p>
                  <p className="text-2xl font-extrabold text-slate-800 mt-1">{data.summary.totalTasksCompleted}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Звёзд</p>
                  <p className="text-2xl font-extrabold text-amber-500 mt-1 flex items-center gap-1">{data.summary.totalStarsEarned} <Star size={16} className="fill-amber-400" /></p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Серия</p>
                  <p className="text-2xl font-extrabold text-green-500 mt-1">{data.summary.streakDays} дн.</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Баланс</p>
                  <p className="text-2xl font-extrabold text-blue-500 mt-1">{data.summary.currentBalance}</p>
                </div>
              </div>

              <section className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100">
                <h2 className="text-base font-extrabold text-slate-800 mb-4">Активность</h2>
                <div className="overflow-x-auto -mx-5 px-5">
                  <div className="flex gap-1 items-end h-28" style={{ minWidth: `${Math.max(data.chart.labels.length * 20, 200)}px` }}>
                    {data.chart.labels.map((label, i) => {
                      const tH = Math.max((data.chart.tasksCompleted[i] / maxVal) * 100, 1);
                      const sH = Math.max((data.chart.starsEarned[i] / maxVal) * 100, 1);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5" style={{ minWidth: '18px' }}>
                          <div className="w-full flex flex-col items-center justify-end h-24 gap-0.5">
                            <div className="w-2 md:w-2.5 rounded-full bg-amber-400 transition-all" style={{ height: `${sH}%` }} />
                            <div className="w-2 md:w-2.5 rounded-full bg-blue-400 transition-all" style={{ height: `${tH}%` }} />
                          </div>
                          <span className="text-[7px] text-slate-400 font-medium truncate w-full text-center">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-4 mt-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-blue-400" /> Задачи</span>
                  <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-amber-400" /> Звёзды</span>
                </div>
              </section>

              {Object.keys(data.categories).length > 0 && (
                <section className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100">
                  <h2 className="text-base font-extrabold text-slate-800 mb-3">Категории</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(data.categories).map(([cat, count]) => (
                      <span key={cat} className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-bold">{cat}: {count}</span>
                    ))}
                  </div>
                </section>
              )}

              {data.grades.length > 0 && (
                <section className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100">
                  <h2 className="text-base font-extrabold text-slate-800 mb-3">Последние оценки</h2>
                  <div className="space-y-1.5">
                    {data.grades.map((g: any) => (
                      <div key={g.id} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span className="text-sm font-medium text-slate-700">{g.subjectName}</span>
                          <span className="text-[11px] text-slate-400">
                            {g.createdAt ? `(${new Date(g.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })})` : ''}
                          </span>
                        </div>
                        <span className={`text-sm font-extrabold shrink-0 ml-2 ${g.grade >= 4 ? 'text-green-600' : g.grade === 3 ? 'text-amber-600' : 'text-red-600'}`}>{g.grade}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {showPdfError && (
                <p className="text-xs text-amber-600 text-center">PDF временно недоступен. Используйте экспорт в MD.</p>
              )}
            </>
          )}
        </div>
      </main>

      {/* Rewards Modal */}
      <AnimatePresence>
        {showRewards && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowRewards(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              onClick={e => e.stopPropagation()} className="bg-white rounded-3xl p-5 w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2"><Gift size={18} className="text-purple-500" /> Полученные награды</h2>
                <button onClick={() => setShowRewards(false)} className="text-slate-400 hover:text-slate-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              </div>
              <div className="overflow-y-auto flex-1 space-y-2">
                {rewardList.length === 0 ? (
                  <p className="text-slate-400 text-center py-6 text-sm">Нет полученных наград</p>
                ) : rewardList.map(r => (
                  <div key={r.id} className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex items-center gap-3">
                    <span className="text-xl">{r.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{r.title}</p>
                      {r.description && <p className="text-xs text-slate-400 truncate">{r.description}</p>}
                    </div>
                    <span className="text-xs font-extrabold text-amber-500 shrink-0">{r.costStars} ⭐</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden PDF template (clean document layout) */}
      <div id="report-pdf-template" style={{ display: 'none', position: 'absolute', left: -9999, top: 0, width: '800px', background: '#fff', fontFamily: 'Arial, sans-serif', color: '#1e293b', fontSize: '12px', lineHeight: '1.5', padding: '40px' }}>
        {data && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 4 }}>Путь героя — Отчёт</h1>
            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0' }}>{currentChild.name}</p>
            <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 24 }}>{data.period.startDate} — {data.period.endDate} ({days} дней)</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[['✅ Задач', data.summary.totalTasksCompleted], ['⭐ Звёзд', data.summary.totalStarsEarned], ['🔥 Серия', data.summary.streakDays], ['💎 Баланс', data.summary.currentBalance]].map(([l, v]) => (
                <div key={String(l)} style={{ flex: 1, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 9, color: '#94a3b8', fontWeight: 'bold' }}>
                  <p style={{ margin: '0 0 4px' }}>{String(l)}</p>
                  <p style={{ fontSize: 18, fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{v}</p>
                </div>
              ))}
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />
            <h2 style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>Активность по дням</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ fontSize: 10, color: '#94a3b8', textAlign: 'left', padding: '4px 0' }}>Дата</th>
                <th style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', padding: '4px 0' }}>Задач</th>
                <th style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right', padding: '4px 0' }}>Звёзд</th>
              </tr></thead>
              <tbody>
                {data.chart.labels.map((label: string, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ fontSize: 11, padding: '3px 0', color: '#334155' }}>{label}</td>
                    <td style={{ fontSize: 11, textAlign: 'center', padding: '3px 0' }}>{data.chart.tasksCompleted[i] > 0 ? data.chart.tasksCompleted[i] : '—'}</td>
                    <td style={{ fontSize: 11, textAlign: 'right', padding: '3px 0', color: '#d97706', fontWeight: 'bold' }}>{data.chart.starsEarned[i] > 0 ? `+${data.chart.starsEarned[i]}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {Object.keys(data.categories).length > 0 && (
              <><hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />
              <h2 style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>Категории</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {Object.entries(data.categories).map(([cat, count]) => (
                  <span key={cat} style={{ padding: '3px 8px', background: '#f1f5f9', borderRadius: 4, fontSize: 10, color: '#475569' }}>{String(cat)}: {count}</span>
                ))}
              </div></>
            )}
            {data.grades.length > 0 && (
              <><hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />
              <h2 style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>Оценки</h2>
              {data.grades.map((g: any) => (
                <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #f1f5f9', fontSize: 11 }}>
                  <span style={{ color: '#334155' }}>{g.subjectName}{g.createdAt ? ` (${new Date(g.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })})` : ''}</span>
                  <span style={{ fontWeight: 'bold', color: g.grade >= 4 ? '#16a34a' : g.grade === 3 ? '#d97706' : '#dc2626' }}>{g.grade}</span>
                </div>
              ))}</>
            )}
            <p style={{ textAlign: 'center', marginTop: 32, fontSize: 9, color: '#cbd5e1' }}>Сгенерировано «Путь героя» • {new Date().toLocaleDateString('ru-RU')}</p>
          </>
        )}
      </div>
    </div>
  );
}
