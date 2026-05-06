"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star, Loader2, Home, BookOpen, Calendar, Settings } from "lucide-react";
import GradeInput from "../../components/GradeInput";
import TaskCard from "../../components/TaskCard";
import confetti from "canvas-confetti";
import { buildTaskCompletionBundle, formatRewardReserveLabel, formatStarAmount } from "@/app/lib/reporting";
import { getChildSettings } from "@/app/lib/settings-shared";

interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

interface Task {
  id: string;
  templateId?: string;
  title: string;
  stars: number;
  completed: boolean;
  completedAt?: string;
  subtasksMode: 'none' | 'checkboxes' | 'plain-list';
  subtasks: Subtask[];
  requiresOpenDetails: boolean;
  detailsOpened: boolean;
  detailsText?: string;
  difficulty?: 'easy' | 'normal' | 'hard';
  askDifficultyAfterDone?: boolean;
  category?: string;
}

interface Reward {
  id: string;
  title: string;
  description?: string;
  costStars: number;
  icon: string;
}

interface ChildProfile {
  id: string;
  name: string;
  avatarLetter: string;
  mode: string;
}

export default function ChildDashboard({ params }: { params: { id: string } }) {
  const childId = params?.id || 'ali';
  const [currentChild, setCurrentChild] = useState<ChildProfile | null>(null);
  const [stars, setStars] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [gradesEnabled, setGradesEnabled] = useState(childId === 'ali');
  const [currencyEnabled, setCurrencyEnabled] = useState(true);
  const [reserveStars, setReserveStars] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (childId) {
      loadData();
    }
  }, [childId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const childrenRes = await fetch('/api/children');
      const children = await childrenRes.json();

      if (!Array.isArray(children)) {
        throw new Error('Invalid children data');
      }

      const child = children.find((c: ChildProfile) => c.id === childId);
      if (child) {
        setCurrentChild(child);
      } else {
        throw new Error(`Child ${childId} not found`);
      }

      const today = new Date().toISOString().split('T')[0];

      const tasksRes = await fetch(`/api/tasks/day?childId=${childId}&date=${today}`);
      const tasksData = await tasksRes.json();
      setTasks(Array.isArray(tasksData) ? tasksData : []);

      const starsRes = await fetch(`/api/star-ledger?childId=${childId}`);
      const starsData = await starsRes.json();
      setStars(starsData?.balance || 0);

      const rewardsRes = await fetch(`/api/rewards?childId=${childId}`);
      const rewardStatusRes = await fetch(`/api/rewards/status?childId=${childId}`);
      const rewardsData = await rewardsRes.json();
      const rewardStatusData = await rewardStatusRes.json();
      setRewards(Array.isArray(rewardsData) ? rewardsData : []);

      const settingsRes = await fetch('/api/settings');
      const settings = await settingsRes.json();
      const childSettings = getChildSettings(settings, childId as 'ali' | 'said');
      setGradesEnabled(childSettings.gradesEnabled ?? childId === 'ali');
      setCurrencyEnabled(settings?.currencyEnabled !== false);
      const reserve = Array.isArray(rewardStatusData)
        ? rewardStatusData.reduce((sum: number, status: any) => {
            if (status?.status !== 'selected') return sum;
            const reward = Array.isArray(rewardsData) ? rewardsData.find((item: any) => item.id === status.rewardId) : null;
            return sum + (Number(reward?.costStars) || 0);
          }, 0)
        : 0;
      setReserveStars(reserve);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const switchChild = () => {
    const newId = childId === 'ali' ? 'said' : 'ali';
    router.push(`/child/${newId}`);
  };

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
      currentChild?.name || childId,
    );

    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          completed: true,
          completedAt: new Date().toISOString(),
          difficulty: difficulty || t.difficulty,
          detailsOpened: true
        };
      }
      return t;
    });
    setTasks(updatedTasks);

    try {
      const allDone = updatedTasks.every(t => t.completed);

      await fetch(`/api/tasks/day?childId=${childId}&date=${today}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, date: today, tasks: updatedTasks })
      });

      await fetch('/api/star-ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          amount: task.stars,
          source: 'task',
          sourceId: taskId,
          reason: completion.ledgerReason,
          details: completion.details
        })
      });

      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          type: 'task-completed',
          title: 'Задача выполнена',
          body: completion.eventBody,
          details: { ...completion.details, childName: currentChild?.name || childId }
        })
      });

      if (allDone) {
        await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId,
            type: 'day-completed',
            title: 'День завершён',
            body: `${currentChild?.name || childId} выполнил все задачи на сегодня! 🎉`
          })
        });
      }

      setStars(prev => prev + task.stars);
    } catch (err) {
      console.error('Error completing task:', err);
    }
  };

  const handleDetailsOpened = async (taskId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedTasks = tasks.map(t =>
      t.id === taskId ? { ...t, detailsOpened: true } : t
    );
    setTasks(updatedTasks);

    await fetch(`/api/tasks/day?childId=${childId}&date=${today}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId, date: today, tasks: updatedTasks })
    });
  };

  const handleSubtasksUpdate = async (taskId: string, subtasks: Subtask[]) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedTasks = tasks.map(t =>
      t.id === taskId ? { ...t, subtasks } : t
    );
    setTasks(updatedTasks);

    await fetch(`/api/tasks/day?childId=${childId}&date=${today}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId, date: today, tasks: updatedTasks })
    });
  };

  const buyReward = async (cost: number, title: string) => {
    if (stars >= cost) {
      setStars(prev => prev - cost);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 }, colors: ['#8B5CF6', '#6366F1', '#F59E0B'] });

      try {
        await fetch('/api/star-ledger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId,
            amount: -cost,
            source: 'reward-purchase',
            reason: `Покупка награды: ${title} (${formatStarAmount(-cost)})`
          })
        });

        await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId,
            type: 'reward-selected',
            title: 'Награда выбрана',
            body: `${currentChild?.name || childId} выбрал награду: ${title} (${formatStarAmount(-cost)})`,
            details: {
              childName: currentChild?.name || childId,
              rewardTitle: title,
              costStars: cost,
              status: 'selected'
            }
          })
        });
      } catch (err) {
        console.error('Error buying reward:', err);
      }
    } else {
      setNotice(`Не хватает звезд! Нужно еще ${formatStarAmount(cost - stars)}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-bold">Ошибка загрузки</p>
          <p className="text-slate-500 mt-2">{error}</p>
          <button
            onClick={() => loadData()}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-xl"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!currentChild) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center">
        <p className="text-slate-400">Ребенок не найден</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] font-sans text-slate-800 pb-10">
      <header className="bg-white px-4 md:px-6 py-3 md:py-5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500 text-white rounded-full flex items-center justify-center text-lg md:text-xl font-bold">
            {currentChild.avatarLetter}
          </div>
          <div>
            <div className="flex items-baseline gap-1 cursor-pointer group" onClick={switchChild}>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-800">Привет, </h1>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-800">{currentChild.name}!</h1>
            </div>
            <p className="text-slate-500 text-xs md:text-sm font-medium mt-0.5">Твои успехи за сегодня</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-[#FEF3C7] border-2 border-[#FDE68A] text-[#D97706] px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-extrabold text-base md:text-lg flex items-center gap-1.5 md:gap-2 shadow-sm">
            <Star className="fill-amber-400 text-amber-400 w-4 h-4 md:w-5 md:h-5" /> {stars}
          </div>
          {currencyEnabled && reserveStars > 0 && (
            <span className="bg-white/90 border border-amber-200 text-amber-500 px-2.5 md:px-3 py-1 md:py-1.5 rounded-xl font-extrabold text-sm md:text-base shadow-sm">
              {formatRewardReserveLabel(reserveStars, true, false)}
            </span>
          )}
        </div>
      </header>

      {notice && (
        <div className="max-w-5xl mx-auto px-4 md:px-6 pt-4">
          <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 text-sm font-medium">
            {notice}
          </div>
        </div>
      )}

      <nav className="flex gap-2 md:gap-3 px-4 md:px-6 py-4 md:py-6 overflow-x-auto no-scrollbar max-w-5xl mx-auto">
        <Link href={`/child/${childId}`}>
          <span className="bg-[#3B82F6] text-white px-4 md:px-6 py-2.5 md:py-3.5 rounded-[14px] md:rounded-2xl font-bold text-sm md:text-base flex items-center gap-1.5 md:gap-2 whitespace-nowrap shadow-md shadow-blue-200 cursor-pointer">
            <Home size={18} /> Главная
          </span>
        </Link>
        {gradesEnabled && (
          <Link href={`/grades`}>
            <span className="bg-white text-slate-700 px-4 md:px-6 py-2.5 md:py-3.5 rounded-[14px] md:rounded-2xl font-bold text-sm md:text-base flex items-center gap-1.5 md:gap-2 whitespace-nowrap shadow-sm hover:bg-slate-50 cursor-pointer transition-colors">
              <BookOpen size={18} className="text-slate-400" /> Оценки
            </span>
          </Link>
        )}
        <Link href={`/schedule`}>
          <span className="bg-white text-slate-700 px-4 md:px-6 py-2.5 md:py-3.5 rounded-[14px] md:rounded-2xl font-bold text-sm md:text-base flex items-center gap-1.5 md:gap-2 whitespace-nowrap shadow-sm hover:bg-slate-50 cursor-pointer transition-colors">
            <Calendar size={18} className="text-slate-400" /> Расписание
          </span>
        </Link>
        <Link href={`/settings`}>
          <span className="bg-white text-slate-700 px-4 md:px-6 py-2.5 md:py-3.5 rounded-[14px] md:rounded-2xl font-bold text-sm md:text-base flex items-center gap-1.5 md:gap-2 whitespace-nowrap shadow-sm hover:bg-slate-50 cursor-pointer transition-colors">
            <Settings size={18} className="text-slate-400" /> Настройки
          </span>
        </Link>
      </nav>

      <main className="max-w-5xl mx-auto px-4 md:px-6 space-y-4 md:space-y-6">

        {gradesEnabled && (
          <GradeInput childId={childId} onGradeAdded={() => loadData()} />
        )}

        <section className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-6 shadow-sm border border-slate-100">
          <h2 className="text-xl md:text-2xl font-extrabold flex items-center gap-2 text-slate-800 mb-5">
            <span className="text-xl md:text-2xl">🚀</span> Квесты на сегодня
          </h2>

          <div className="space-y-2 md:space-y-3">
            {tasks.length === 0 && (
              <p className="text-slate-400 text-center py-8">Нет задач на сегодня</p>
            )}
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={completeTask}
                onDetailsOpened={handleDetailsOpened}
                onSubtasksUpdate={handleSubtasksUpdate}
              />
            ))}
          </div>
        </section>

        <section className="bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-lg shadow-indigo-200">
          <h2 className="text-xl md:text-2xl font-extrabold flex items-center gap-2 text-white mb-5 md:mb-6">
            <span className="text-xl md:text-2xl">🎁</span> Магазин наград
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
            {rewards.map(reward => {
              const canAfford = stars >= reward.costStars;
              return (
                <div
                  key={reward.id}
                  onClick={() => buyReward(reward.costStars, reward.title)}
                  className={`border rounded-2xl p-4 md:p-5 flex flex-row md:flex-col justify-between items-center md:items-stretch h-auto md:h-32 transition-all cursor-pointer ${
                    canAfford ? 'bg-white/20 border-white/40 hover:bg-white/30 hover:-translate-y-0.5 shadow-lg shadow-indigo-500/10' : 'bg-white/5 border-white/10 opacity-70 hover:bg-white/10'
                  }`}
                >
                  <h3 className="text-white font-bold text-base md:text-lg leading-tight">{reward.icon} {reward.title}</h3>
                  {reward.description && (
                    <p className="text-white/70 text-xs md:text-sm mt-1 hidden md:block">{reward.description}</p>
                  )}
                  <div className={`rounded-xl px-3 py-1.5 md:py-2 flex justify-center items-center gap-1 font-extrabold transition-colors text-sm md:text-base mt-0 md:mt-auto ${
                    canAfford ? 'bg-white text-indigo-600 animate-reward-glow' : 'bg-white/20 text-white'
                  }`}>
                    {Math.max(0, Math.abs(reward.costStars))} <Star size={14} className={canAfford ? 'fill-indigo-600' : 'fill-white'} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}


