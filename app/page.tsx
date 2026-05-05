"use client";

import { useState, useEffect } from "react";
import { Star, Home as HomeIcon, BookOpen, BarChart3, Sparkles, Circle, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useChild } from "@/app/lib/ChildContext";
import TaskCard from "./components/TaskCard";
import HeroMessage from "./components/HeroMessage";
import StarHistoryModal from "./components/StarHistoryModal";
import PinModal from "./components/PinModal";
import { buildTaskCompletionBundle, formatStarAmount } from "@/app/lib/reporting";

interface Task {
  id: string; templateId?: string; title: string; stars: number; completed: boolean; completedAt?: string;
  subtasksMode: 'none' | 'checkboxes' | 'plain-list'; subtasks: { id: string; title: string; done: boolean }[];
  requiresOpenDetails: boolean; detailsOpened: boolean; detailsText?: string;
  difficulty?: 'easy' | 'normal' | 'hard'; askDifficultyAfterDone?: boolean; category?: string; customCategory?: string;
}
interface Reward { id: string; title: string; description?: string; costStars: number; icon: string; }
interface TaskTemplate { id: string; title: string; category: string; repeatDays: number[]; stars: number; }

const DAY_NAMES_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function getNextRepeatInfo(repeatDays: number[], from = new Date()) {
  if (!Array.isArray(repeatDays) || repeatDays.length === 0) {
    return { label: 'Одноразово', date: '' };
  }

  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  const currentDay = today.getDay();
  const sorted = DAY_ORDER.filter((day) => repeatDays.includes(day));
  const todayIncluded = sorted.includes(currentDay);

  if (todayIncluded) {
    return { label: 'Сегодня', date: today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) };
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + offset);
    if (repeatDays.includes(candidate.getDay())) {
      return {
        label: DAY_NAMES_SHORT[candidate.getDay()],
        date: candidate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      };
    }
  }

  return { label: 'По графику', date: '' };
}

function getRewardOrder(reward: any, childId: string) {
  return Number.isFinite(Number(reward?.sortOrderByChild?.[childId]))
    ? Number(reward.sortOrderByChild[childId])
    : Number.isFinite(Number(reward?.sortOrderByChild?.both))
      ? Number(reward.sortOrderByChild.both)
      : 9999;
}

export default function Home() {
  const { currentChild, switchChild } = useChild();
  const [stars, setStars] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingRewards, setLoadingRewards] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showStarHistory, setShowStarHistory] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  useEffect(() => {
    document.cookie.split('; ').find(c => c.startsWith('parent-session=')) ? setIsLoggedIn(true) : setIsLoggedIn(false);
  }, []);

  useEffect(() => {
    const doLoad = async () => {
      const today = new Date().toISOString().split('T')[0];
      setLoadingTasks(true); setLoadingRewards(true);
      try {
        const [tasksRes, starsRes, rewardsRes, tplRes] = await Promise.all([
          fetch(`/api/tasks/day?childId=${currentChild.id}&date=${today}`),
          fetch(`/api/star-ledger?childId=${currentChild.id}`),
          fetch(`/api/rewards?childId=${currentChild.id}`),
          fetch(`/api/tasks/templates`)
        ]);
        const [tasksData, starsData, rewardsData, tplData] = await Promise.all([
          tasksRes.json(), starsRes.json(), rewardsRes.json(), tplRes.json()
        ]);
        setTasks(Array.isArray(tasksData) ? tasksData : []);
        setStars(starsData.balance || 0);
        setRewards(Array.isArray(rewardsData) ? [...rewardsData].sort((a: any, b: any) => getRewardOrder(a, currentChild.id) - getRewardOrder(b, currentChild.id)) : []);
        setTemplates(Array.isArray(tplData) ? tplData.filter((t: any) => (t.childId === currentChild.id || t.childId === 'both') && t.repeatDays?.length > 0) : []);
      } catch (e) { console.error(e); }
      finally { setLoadingTasks(false); setLoadingRewards(false); }
    };
    doLoad();
  }, [currentChild.id]);

  const completeTask = async (taskId: string, difficulty?: 'easy' | 'normal' | 'hard') => {
    const today = new Date().toISOString().split('T')[0];
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.completed) return;

    const completion = buildTaskCompletionBundle(
      {
        ...task,
        completedAt: new Date().toISOString(),
        difficulty: difficulty || task.difficulty,
      },
      currentChild.name,
    );

    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, completed: true, completedAt: new Date().toISOString(), difficulty: difficulty || t.difficulty, detailsOpened: true } : t);
    setTasks(updatedTasks);
    const allDone = updatedTasks.every(t => t.completed);

    await Promise.all([
      fetch(`/api/tasks/day?childId=${currentChild.id}&date=${today}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: currentChild.id, date: today, tasks: updatedTasks }) }),
      fetch('/api/star-ledger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: currentChild.id, amount: task.stars, source: 'task', sourceId: taskId, reason: completion.ledgerReason, details: completion.details }) }),
      fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: currentChild.id, type: 'task-completed', title: 'Задача выполнена', body: completion.eventBody, details: { ...completion.details, childName: currentChild.name } }) }),
      ...(allDone ? [fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: currentChild.id, type: 'day-completed', title: 'День завершён', body: `${currentChild.name} выполнил все задачи на сегодня! 🎉` }) })] : [])
    ]);
    setStars(prev => prev + task.stars);
  };

  const handleDetailsOpened = async (taskId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, detailsOpened: true } : t);
    setTasks(updatedTasks);
    await fetch(`/api/tasks/day?childId=${currentChild.id}&date=${today}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: currentChild.id, date: today, tasks: updatedTasks }) });
  };

  const handleSubtasksUpdate = async (taskId: string, subtasks: any[]) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, subtasks } : t);
    setTasks(updatedTasks);
    await fetch(`/api/tasks/day?childId=${currentChild.id}&date=${today}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: currentChild.id, date: today, tasks: updatedTasks }) });
  };

  const buyReward = async (reward: Reward) => {
    if (stars >= reward.costStars) {
      setStars(prev => prev - reward.costStars);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 }, colors: ['#8B5CF6', '#6366F1', '#F59E0B'] });
      await Promise.all([
        fetch('/api/star-ledger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: currentChild.id, amount: -reward.costStars, source: 'reward-purchase', sourceId: reward.id, reason: `Покупка награды: ${reward.title} (${formatStarAmount(-reward.costStars)})` }) }),
        fetch('/api/rewards/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: currentChild.id, rewardId: reward.id, status: 'selected' }) }),
        fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: currentChild.id, type: 'reward-selected', title: 'Награда выбрана', body: `${currentChild.name} выбрал награду: ${reward.title} (${formatStarAmount(-reward.costStars)})`, rewardId: reward.id, details: { childName: currentChild.name, rewardTitle: reward.title, costStars: reward.costStars, status: 'selected' } }) })
      ]);
    } else {
      setModalMessage(`Не хватает звёзд! Нужно ещё ${formatStarAmount(reward.costStars - stars)}`);
    }
  };

  const navItems = [
    { href: "/", label: "Главная", icon: HomeIcon },
    ...(currentChild.mode !== "little-hero" ? [{ href: "/grades", label: "Оценки", icon: BookOpen }] : []),
    { href: "/reports", label: "Отчёты", icon: BarChart3 },
    { href: "#hero", label: "Послание героя", icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FB] font-sans text-slate-800 pb-10">
      {/* HEADER */}
      <header className="bg-white px-4 md:px-6 py-3 md:py-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 md:w-11 md:h-11 bg-blue-500 text-white rounded-full flex items-center justify-center text-base md:text-lg font-bold shrink-0 overflow-hidden">
            {currentChild.avatarUrl ? (
              <img src={currentChild.avatarUrl} alt={currentChild.name} className="w-full h-full object-cover" />
            ) : (
              currentChild.letter
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg md:text-xl font-extrabold text-slate-600">Привет,</span>
            <div className="relative">
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="text-lg md:text-xl font-extrabold text-slate-800 hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer">
                <AnimatePresence mode="popLayout">
                  <motion.span key={currentChild.id} initial={{ y: -15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 15, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="block">
                    {currentChild.name}!
                  </motion.span>
                </AnimatePresence>
                <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute top-full mt-1 left-0 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-50 min-w-[120px]">
                    {(["ali", "said"] as const).filter(id => id !== currentChild.id).map(id => (
                      <button key={id} onClick={() => { switchChild(id); setIsDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 cursor-pointer font-extrabold text-lg transition-colors">
                        {id === "ali" ? "Али" : "Саид"}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowStarHistory(true)}
            className="relative bg-[#FEF3C7] border-2 border-[#FDE68A] text-[#D97706] px-3 py-1.5 rounded-xl font-extrabold text-sm md:text-base flex items-center gap-1.5 shadow-sm hover:bg-amber-100 transition-colors cursor-pointer">
            <Star className="fill-amber-400 text-amber-400 w-4 h-4" /> {stars}
          </button>

          <button onClick={() => setShowPinModal(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
            title={isLoggedIn ? "Выйти" : "Войти"}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {isLoggedIn ? (
                <>
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                  <line x1="12" y1="2" x2="12" y2="12" />
                </>
              ) : (
                <>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </>
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* NAV */}
      <nav className="flex gap-2 px-4 md:px-6 py-3 md:py-4 overflow-x-auto no-scrollbar max-w-5xl mx-auto">
        {navItems.map(item => {
          if (item.href === "#hero") {
            return (
              <div key="hero" className="flex-shrink-0">
                <HeroMessage childId={currentChild.id} childName={currentChild.name} mode={currentChild.mode} tasks={tasks} />
              </div>
            );
          }
          return (
            <Link key={item.href} href={item.href}
              className="bg-white text-slate-700 px-4 py-2.5 rounded-[14px] font-bold text-sm flex items-center gap-1.5 whitespace-nowrap shadow-sm hover:bg-slate-50 transition-colors">
              <item.icon size={16} className="text-slate-400" /> {item.label}
            </Link>
          );
        })}
      </nav>

      {/* MAIN */}
      <main className="max-w-5xl mx-auto px-4 md:px-6 space-y-4">

        {/* ЗАДАЧИ НА СЕГОДНЯ */}
        <section id="today-tasks" className="bg-white rounded-[24px] p-4 md:p-5 shadow-sm border border-slate-100">
          <h2 className="text-lg md:text-xl font-extrabold flex items-center gap-2 text-slate-800 mb-4">
            <span>🚀</span> Задачи на сегодня
          </h2>
          <div className="space-y-2">
            {loadingTasks && <>{[1,2,3].map(i => <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />)}</>}
            {!loadingTasks && tasks.length === 0 && <p className="text-slate-400 text-center py-6 text-sm">Нет задач на сегодня</p>}
            {!loadingTasks && tasks.map(task => (
            <TaskCard key={task.id} task={task} onComplete={completeTask} onDetailsOpened={handleDetailsOpened} onSubtasksUpdate={handleSubtasksUpdate} />
          ))}
          </div>
        </section>

        {/* РАСПИСАНИЕ (read-only) */}
        {templates.length > 0 && (
          <section className="bg-white rounded-[24px] p-4 md:p-5 shadow-sm border border-slate-100">
            <h2 className="text-lg md:text-xl font-extrabold flex items-center gap-2 text-slate-800 mb-4">
              <span>📅</span> Расписание
            </h2>
            <div className="space-y-2">
              {templates.map(t => {
                const repeatInfo = getNextRepeatInfo(t.repeatDays);
                const currentTask = tasks.find(task => task.templateId === t.id);
                const canRunNow = !!currentTask && !currentTask.completed && repeatInfo.label === 'Сегодня';
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      if (!canRunNow || !currentTask) {
                        if (currentTask) {
                          document.querySelector(`[data-task-id="${currentTask.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        } else {
                          document.getElementById('today-tasks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                        return;
                      }
                      const actionButton = document.querySelector(
                        `[data-task-id="${currentTask.id}"] [data-task-primary-action="true"]`
                      ) as HTMLButtonElement | null;
                      if (actionButton) {
                        actionButton.click();
                        return;
                      }
                      document.querySelector(`[data-task-id="${currentTask.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    disabled={!canRunNow}
                    title={canRunNow ? 'Нажмите, чтобы выполнить задачу' : 'Задача доступна только в свой день'}
                    className={`w-full flex items-start gap-2 bg-slate-50 rounded-2xl p-3 border border-slate-100 text-left transition-colors ${
                      canRunNow ? 'hover:bg-slate-100 cursor-pointer' : 'opacity-70 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start pt-0.5 shrink-0">
                      {currentTask ? (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${currentTask.completed ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-300 text-slate-300'}`}>
                          {currentTask.completed ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center border-2 bg-white border-slate-200 text-slate-200">
                          <Circle size={13} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span
                        className="font-bold text-slate-800 text-sm leading-tight block overflow-hidden"
                        style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}
                      >
                        {t.title}
                      </span>
                      {currentTask && (
                        <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${currentTask.completed ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                          {currentTask.completed ? 'Выполнена сегодня' : 'На сегодня'}
                        </span>
                      )}
                      {!currentTask && repeatInfo.label !== 'Сегодня' && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500">
                          Откроется {repeatInfo.label}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 max-w-[55%]">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-600 whitespace-nowrap">
                        {repeatInfo.label}
                      </span>
                      {repeatInfo.date && (
                        <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                          {repeatInfo.date}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-amber-500 shrink-0 ml-1 whitespace-nowrap">+{t.stars} ⭐</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* МАГАЗИН НАГРАД */}
        <section className="bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] rounded-[24px] p-4 md:p-6 shadow-lg shadow-indigo-200">
          <h2 className="text-lg md:text-xl font-extrabold flex items-center gap-2 text-white mb-4">
            <span>🎁</span> Магазин наград
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {loadingRewards && <>{[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-white/15 animate-pulse" />)}</>}
            {!loadingRewards && rewards.map(reward => {
              const canAfford = stars >= reward.costStars;
              return (
                <div key={reward.id} onClick={() => buyReward(reward)}
                  className={`border rounded-2xl p-3 flex flex-col gap-2 transition-all cursor-pointer ${canAfford ? 'bg-white/20 border-white/40 hover:bg-white/30 shadow-md' : 'bg-white/5 border-white/10 opacity-70'}`}>
                   <h3 className="text-white font-bold text-sm leading-tight truncate"><span>{reward.icon}</span> {reward.title}</h3>
                  {reward.description && <p className="text-white/60 text-[11px] leading-tight line-clamp-2">{reward.description}</p>}
                  <div className="flex items-center gap-2 mt-auto">
                    <div className={`rounded-lg px-2.5 py-1 flex items-center gap-1 font-extrabold text-xs ${canAfford ? 'bg-white text-indigo-600' : 'bg-white/20 text-white'}`}>
                      {formatStarAmount(reward.costStars, false)} <Star size={11} className={canAfford ? 'fill-indigo-600' : 'fill-white'} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {!loadingRewards && rewards.length === 0 && <p className="text-white/60 text-center py-4 text-sm">Пока нет наград</p>}
        </section>
      </main>

      <StarHistoryModal childId={currentChild.id} open={showStarHistory} onClose={() => setShowStarHistory(false)} />
      <PinModal open={showPinModal} onClose={() => setShowPinModal(false)} />
      <AnimatePresence>
        {modalMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setModalMessage(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              onClick={e => e.stopPropagation()} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
              <p className="text-slate-700 text-base mb-5">{modalMessage}</p>
              <button onClick={() => setModalMessage(null)} className="bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors">Понятно</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
