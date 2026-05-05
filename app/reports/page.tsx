"use client";

import { Children, useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Download, Gift, Star, Sparkles, Trophy, ChartBar, FileText, CalendarDays, BadgeInfo } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useChild } from "@/app/lib/ChildContext";
import {
  formatDifficultyLabel,
  formatLongDate,
  formatShortDate,
  shortenText,
} from "@/app/lib/reporting";

interface ReportInsightItem {
  label: string;
  date: string;
  tasksCompleted: number;
  starsEarned: number;
}

interface ReportData {
  period: { days: number; startDate: string; endDate: string };
  summary: {
    totalTasksCompleted: number;
    totalStarsEarned: number;
    totalGradesCount: number;
    streakDays: number;
    currentBalance: number;
  };
  insights: {
    bestDay: ReportInsightItem | null;
    topCategory: { name: string; count: number } | null;
    topTask: { title: string; stars: number; completedAt: string; difficultyLabel: string | null } | null;
  };
  chart: { labels: string[]; tasksCompleted: number[]; starsEarned: number[] };
  categories: Record<string, number>;
  rewards: { selected: number; fulfilled: number };
  grades: any[];
  recentTasks: Array<{
    id: string;
    title: string;
    stars: number;
    completedAt: string;
    difficultyLabel: string | null;
    category: string;
    subtaskSummary: string | null;
    subtaskCount: number;
    detailsText?: string;
  }>;
  recentStarEntries: Array<{
    id: string;
    amount: number;
    sourceLabel: string;
    reason: string;
    createdAt: string;
    taskTitle?: string;
    difficultyLabel?: string | null;
    subtaskSummary?: string | null;
  }>;
  settings?: { gradeHistoryLimit?: number };
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

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChild.id, days]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?childId=${currentChild.id}&days=${days}`);
      if (!res.ok) {
        setData(null);
        return;
      }

      const json = await res.json();
      if (!json || json.error) {
        setData(null);
        return;
      }

      setData(json);

      const statusRes = await fetch(`/api/rewards/status?childId=${currentChild.id}`);
      const statusData = await statusRes.json();
      if (Array.isArray(statusData)) {
        const fulfilledIds = statusData.filter((s: any) => s.status === 'fulfilled').map((s: any) => s.rewardId);
        const rewardsRes = await fetch(`/api/rewards?childId=${currentChild.id}`);
        const allRewards = await rewardsRes.json();
        if (Array.isArray(allRewards)) {
          setRewardList(allRewards.filter((r: any) => fulfilledIds.includes(r.id)));
        } else {
          setRewardList([]);
        }
      } else {
        setRewardList([]);
      }
    } catch (error) {
      console.error('Error loading report:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    if (!data) return;
    setShowPdfError(false);

    try {
      const [{ pdf }, { default: ReportPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../components/ReportPDF'),
      ]);

      const blob = await pdf(
        <ReportPDF
          childName={currentChild.name}
          days={days}
          data={data}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${currentChild.name}-${days}days.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF error:', error);
      setShowPdfError(true);
    } finally {
      setShowExport(false);
    }
  };

  const exportMD = () => {
    if (!data) return;
    let md = `# Отчёт: ${currentChild.name}\n**Период:** ${data.period.startDate} — ${data.period.endDate}\n\n`;
    md += `## Сводка\n- **Выполнено задач:** ${data.summary.totalTasksCompleted}\n- **Заработано звёзд:** ${data.summary.totalStarsEarned}\n- **Оценок:** ${data.summary.totalGradesCount}\n- **Текущий баланс:** ${data.summary.currentBalance}\n- **Серия дней:** ${data.summary.streakDays}\n`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `report-${currentChild.name}-${days}days.md`;
    a.click();
    setShowExport(false);
  };

  const maxVal = data ? Math.max(...data.chart.tasksCompleted, ...data.chart.starsEarned, 1) : 1;
  const gradeLimit = data?.settings?.gradeHistoryLimit || 20;

  return (
    <div className="min-h-screen bg-[#F4F7FB] font-sans text-slate-800 pb-10">
      <header className="bg-white px-4 md:px-6 py-3 md:py-4 flex items-center justify-between border-b border-slate-100">
        <Link href="/" className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium">
          <ArrowLeft size={18} /> Назад
        </Link>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowExport(!showExport)}
              className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all"
            >
              <Download size={16} />
            </button>
            <AnimatePresence>
              {showExport && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute right-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-50 min-w-[120px]"
                >
                  <button onClick={exportMD} className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                    MD
                  </button>
                  <button onClick={exportPDF} className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                    PDF
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={() => setShowRewards(!showRewards)}
            className="flex items-center gap-1.5 bg-purple-50 text-purple-600 px-3 py-2 rounded-xl font-bold text-xs hover:bg-purple-100 transition-colors"
          >
            <Gift size={14} /> Награды
          </button>
        </div>
      </header>

      <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 text-center py-4">Отчёты</h1>

      <main className="max-w-5xl mx-auto px-4 md:px-6 space-y-5">
        <section className="bg-white rounded-[24px] p-4 md:p-5 shadow-sm border border-slate-100">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[7, 30, 90].map((value) => (
              <button
                key={value}
                onClick={() => setDays(value)}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
                  days === value ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 shadow-sm'
                }`}
              >
                {value} дней
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {loading ? (
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}
            </>
          ) : !data ? (
            <div className="col-span-full text-slate-400 text-center py-10 text-sm bg-white rounded-[24px] border border-slate-100">
              Нет данных для отчёта
            </div>
          ) : (
            <>
              <StatCard label="Задач" value={data.summary.totalTasksCompleted} accent="text-slate-800" icon={<FileText size={16} />} />
              <StatCard label="Звёзд" value={data.summary.totalStarsEarned} accent="text-amber-500" icon={<Star size={16} className="fill-amber-400" />} />
              <StatCard label="Серия" value={`${data.summary.streakDays} дн.`} accent="text-green-500" icon={<Sparkles size={16} />} />
              <StatCard label="Баланс" value={data.summary.currentBalance} accent="text-blue-500" icon={<Trophy size={16} />} />
              <StatCard label="Оценок" value={data.summary.totalGradesCount} accent="text-indigo-500" icon={<BadgeInfo size={16} />} />
              <StatCard label="Наград" value={`${data.rewards.selected}/${data.rewards.fulfilled}`} accent="text-purple-500" icon={<Gift size={16} />} />
            </>
          )}
        </section>

        {data && (
          <section className="bg-white rounded-[24px] p-4 md:p-5 shadow-sm border border-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-extrabold text-base">
              <ChartBar size={18} className="text-blue-500" />
              Быстрые итоги
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <InsightPill
                title="Лучший день"
                value={data.insights.bestDay ? `${data.insights.bestDay.label} · +${data.insights.bestDay.starsEarned}` : 'Нет данных'}
                subtitle={data.insights.bestDay ? `${data.insights.bestDay.tasksCompleted} задач` : undefined}
              />
              <InsightPill
                title="Сильная категория"
                value={data.insights.topCategory ? data.insights.topCategory.name : 'Нет данных'}
                subtitle={data.insights.topCategory ? `${data.insights.topCategory.count} раз` : undefined}
              />
              <InsightPill
                title="Топ-квест"
                value={data.insights.topTask ? data.insights.topTask.title : 'Нет данных'}
                subtitle={data.insights.topTask ? `${data.insights.topTask.difficultyLabel || 'Без сложности'} · +${data.insights.topTask.stars} ⭐` : undefined}
              />
            </div>
          </section>
        )}

        {!loading && data ? (
          <>
            <section className="bg-white rounded-[24px] p-4 md:p-5 shadow-sm border border-slate-100">
              <h2 className="text-base font-extrabold text-slate-800 mb-4">Активность</h2>
              <div className="overflow-x-auto -mx-4 px-4 pb-2">
                <div className="flex gap-1.5 items-end h-40" style={{ minWidth: `${Math.max(data.chart.labels.length * 14, 260)}px` }}>
                  {data.chart.labels.map((label, i) => {
                    const tasksHeight = Math.max((data.chart.tasksCompleted[i] / maxVal) * 100, 4);
                    const starsHeight = Math.max((data.chart.starsEarned[i] / maxVal) * 100, 4);
                    const showLabel = data.chart.labels.length <= 31 || i % 3 === 0 || i === data.chart.labels.length - 1;
                    return (
                      <div key={`${label}-${i}`} className="flex-1 flex flex-col items-center gap-1" style={{ minWidth: '14px' }}>
                        <div className="w-full flex flex-col justify-end items-center h-28 gap-0.5">
                          <div className="w-2 md:w-2.5 rounded-full bg-amber-400 transition-all" style={{ height: `${starsHeight}%` }} />
                          <div className="w-2 md:w-2.5 rounded-full bg-blue-400 transition-all" style={{ height: `${tasksHeight}%` }} />
                        </div>
                        <span className="text-[7px] text-slate-400 font-medium truncate w-full text-center h-3">
                          {showLabel ? label : ' '}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-4 mt-2 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-blue-400" /> Задачи</span>
                <span className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-amber-400" /> Звёзды</span>
              </div>
            </section>

            <section className="bg-white rounded-[24px] p-4 md:p-5 shadow-sm border border-slate-100">
              <h2 className="text-base font-extrabold text-slate-800 mb-3">Категории</h2>
              {Object.keys(data.categories).length === 0 ? (
                <p className="text-slate-400 text-sm">Пока нет категорий</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(data.categories).map(([cat, count]) => (
                    <span key={cat} className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-bold">
                      {cat}: {count}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CompactListSection
                title="Последние выполненные задачи"
                icon={<FileText size={18} className="text-blue-500" />}
                emptyLabel="Пока нет выполненных задач"
              >
                {data.recentTasks.map((task) => (
                  <div key={task.id} className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 text-sm leading-tight">{task.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {formatLongDate(task.completedAt)}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <MiniBadge label={`+${task.stars} ⭐`} tone="amber" />
                          {task.difficultyLabel && <MiniBadge label={`Сложность: ${task.difficultyLabel}`} tone="blue" />}
                          {task.subtaskSummary && <MiniBadge label={`Подзадачи: ${task.subtaskSummary}`} tone="slate" />}
                        </div>
                        {task.detailsText && (
                          <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">
                            {shortenText(task.detailsText, 120)}
                          </p>
                        )}
                      </div>
                      <details className="shrink-0">
                        <summary className="cursor-pointer list-none text-[11px] font-bold text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-1">
                          i
                        </summary>
                        <div className="mt-2 bg-white rounded-xl border border-slate-200 p-3 text-[11px] text-slate-600 max-w-[14rem] shadow-sm">
                          <p className="font-bold text-slate-800 mb-1">Детали</p>
                          <p>Категория: {task.category}</p>
                          <p>Подзадач: {task.subtaskCount}</p>
                          {task.subtaskSummary && <p className="mt-1">{task.subtaskSummary}</p>}
                        </div>
                      </details>
                    </div>
                  </div>
                ))}
              </CompactListSection>

              <CompactListSection
                title="История звёзд"
                icon={<Star size={18} className="fill-amber-400 text-amber-400" />}
                emptyLabel="Пока нет записей"
              >
                {data.recentStarEntries.map((entry) => (
                  <div key={entry.id} className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-800">{entry.taskTitle || entry.sourceLabel}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-500 border border-slate-200">
                            {entry.sourceLabel}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{formatShortDate(entry.createdAt)}</p>
                        <p className="text-[12px] text-slate-600 mt-2 leading-relaxed">{entry.reason}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {entry.difficultyLabel && <MiniBadge label={`Сложность: ${entry.difficultyLabel}`} tone="blue" />}
                          {entry.subtaskSummary && <MiniBadge label={`Подзадачи: ${entry.subtaskSummary}`} tone="slate" />}
                        </div>
                      </div>
                      <div className={`shrink-0 text-sm font-extrabold ${entry.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {entry.amount >= 0 ? '+' : ''}{entry.amount} ⭐
                      </div>
                    </div>
                  </div>
                ))}
              </CompactListSection>
            </section>

            {data.grades.length > 0 && (
              <section className="bg-white rounded-[24px] p-4 md:p-5 shadow-sm border border-slate-100">
                <div className="flex items-end justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-800">Последние оценки</h2>
                    <p className="text-xs text-slate-400">Показываем последние {gradeLimit} записей</p>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    {data.summary.totalGradesCount} в периоде
                  </span>
                </div>
                <div className="max-h-[22rem] overflow-y-auto space-y-1.5 pr-1">
                  {data.grades.map((grade: any) => (
                    <div key={grade.id} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">{grade.subjectName}</span>
                          <span className="text-[11px] text-slate-400">
                            {grade.createdAt ? `(${formatLongDate(grade.createdAt)})` : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {grade.starsAwarded > 0 ? `+${grade.starsAwarded} ⭐` : 'Без звёзд'}
                        </p>
                      </div>
                      <span className={`text-sm font-extrabold shrink-0 ml-2 ${grade.grade >= 4 ? 'text-green-600' : grade.grade === 3 ? 'text-amber-600' : 'text-red-600'}`}>
                        {grade.grade}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {showPdfError && (
              <p className="text-xs text-amber-600 text-center">PDF временно недоступен. Используйте экспорт в MD.</p>
            )}
          </>
        ) : null}
      </main>

      <AnimatePresence>
        {showRewards && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowRewards(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-5 w-full max-w-md max-h-[70vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <Gift size={18} className="text-purple-500" /> Полученные награды
                </h2>
                <button onClick={() => setShowRewards(false)} className="text-slate-400 hover:text-slate-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto flex-1 space-y-2">
                {rewardList.length === 0 ? (
                  <p className="text-slate-400 text-center py-6 text-sm">Нет полученных наград</p>
                ) : rewardList.map((reward) => (
                  <div key={reward.id} className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex items-center gap-3">
                    <span className="text-xl">{reward.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{reward.title}</p>
                      {reward.description && <p className="text-xs text-slate-400 truncate">{reward.description}</p>}
                    </div>
                    <span className="text-xs font-extrabold text-amber-500 shrink-0">{reward.costStars} ⭐</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, accent, icon }: { label: string; value: string | number; accent: string; icon: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
        {icon} {label}
      </p>
      <p className={`text-2xl font-extrabold mt-1 ${accent}`}>{value}</p>
    </div>
  );
}

function InsightPill({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{title}</p>
      <p className="text-sm font-extrabold text-slate-800 mt-1 leading-tight">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function CompactListSection({ title, icon, emptyLabel, children }: { title: string; icon: ReactNode; emptyLabel: string; children: ReactNode }) {
  const hasContent = Children.toArray(children).length > 0;

  return (
    <section className="bg-white rounded-[24px] p-4 md:p-5 shadow-sm border border-slate-100">
      <div className="flex items-center gap-2 mb-3 text-slate-800 font-extrabold text-base">
        {icon}
        {title}
      </div>
      {hasContent ? (
        <div className="max-h-[22rem] overflow-y-auto space-y-2 pr-1">{children}</div>
      ) : (
        <p className="text-slate-400 text-sm">{emptyLabel}</p>
      )}
    </section>
  );
}

function MiniBadge({ label, tone }: { label: string; tone: 'amber' | 'blue' | 'slate' }) {
  const classes = {
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  }[tone];

  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${classes}`}>{label}</span>;
}
