"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2 } from "lucide-react";
import GradeInput from "../../components/GradeInput";

interface Task {
  id: string;
  title: string;
  stars: number;
  completed: boolean;
  completedAt?: string;
  subtasksMode: 'none' | 'checkboxes' | 'plain-list';
  subtasks: { id: string; title: string; done: boolean }[];
  requiresOpenDetails: boolean;
  detailsOpened: boolean;
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
  letter: string;
  mode: string;
}

export default function ChildDashboard({ params }: { params: { id: string } }) {
  const childId = params.id;
  const [currentChild, setCurrentChild] = useState<ChildProfile | null>(null);
  const [stars, setStars] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, [childId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load child profile
      const childrenRes = await fetch('/api/children');
      const children = await childrenRes.json();
      const child = children.find((c: ChildProfile) => c.id === childId);
      if (child) {
        setCurrentChild(child);
      }

      const today = new Date().toISOString().split('T')[0];
      
      // Load tasks for today
      const tasksRes = await fetch(`/api/tasks/day?childId=${childId}&date=${today}`);
      const tasksData = await tasksRes.json();
      setTasks(tasksData);

      // Load stars balance
      const starsRes = await fetch(`/api/star-ledger?childId=${childId}`);
      const starsData = await starsRes.json();
      setStars(starsData.balance || 0);

      // Load rewards
      const rewardsRes = await fetch(`/api/rewards?childId=${childId}`);
      const rewardsData = await rewardsRes.json();
      setRewards(rewardsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchChild = () => {
    const newId = childId === 'ali' ? 'said' : 'ali';
    router.push(`/child/${newId}`);
  };

  const completeTask = async (taskId: string, reward: number, isCompleted: boolean) => {
    if (isCompleted) return; 
    
    const today = new Date().toISOString().split('T')[0];
    
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, completed: true, completedAt: new Date().toISOString() };
      }
      return t;
    });
    setTasks(updatedTasks);
    
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
        amount: reward,
        source: 'task',
        sourceId: taskId,
        reason: `Выполнена задача: ${tasks.find(t => t.id === taskId)?.title}`
      })
    });

    setStars(prev => prev + reward);
  };

  const buyReward = async (cost: number, title: string) => {
    if (stars >= cost) {
      setStars(prev => prev - cost);
      alert(`🎉 Ура! Ты получил: ${title}`);
      
      await fetch('/api/star-ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          amount: -cost,
          source: 'reward-purchase',
          reason: `Покупка награды: ${title}`
        })
      });
    } else {
      alert(`Не хватает звезд! Нужно еще ${cost - stars} ⭐️`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
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

  const isLittleHero = currentChild.mode === 'little-hero';

  return (
    <div className="min-h-screen bg-[#F4F7FB] font-sans text-slate-800 pb-10">
      <header className="bg-white px-4 md:px-6 py-3 md:py-5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500 text-white rounded-full flex items-center justify-center text-lg md:text-xl font-bold">
            {currentChild.letter}
          </div>
          <div>
            <div className="flex items-baseline gap-1 cursor-pointer group" onClick={switchChild}>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-800">Привет, </h1>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-800">{currentChild.name}!</h1>
            </div>
            <p className="text-slate-500 text-xs md:text-sm font-medium mt-0.5">Твои успехи за сегодня</p>
          </div>
        </div>
        <div className="bg-[#FEF3C7] border-2 border-[#FDE68A] text-[#D97706] px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-extrabold text-base md:text-lg flex items-center gap-1.5 md:gap-2 shadow-sm">
          <Star className="fill-amber-400 text-amber-400 w-4 h-4 md:w-5 md:h-5" /> {stars}
        </div>
      </header>

      <nav className="flex gap-2 md:gap-3 px-4 md:px-6 py-4 md:py-6 overflow-x-auto no-scrollbar max-w-5xl mx-auto">
        <button className="bg-[#3B82F6] text-white px-4 md:px-6 py-2.5 md:py-3.5 rounded-[14px] md:rounded-2xl font-bold text-sm md:text-base flex items-center gap-1.5 md:gap-2 whitespace-nowrap shadow-md shadow-blue-200">
          🚀 Главная
        </button>
        {!isLittleHero && (
          <button className="bg-white text-slate-700 px-4 md:px-6 py-2.5 md:py-3.5 rounded-[14px] md:rounded-2xl font-bold text-sm md:text-base flex items-center gap-1.5 md:gap-2 whitespace-nowrap shadow-sm hover:bg-slate-50">
            📖 Оценки
          </button>
        )}
        <button className="bg-white text-slate-700 px-4 md:px-6 py-2.5 md:py-3.5 rounded-[14px] md:rounded-2xl font-bold text-sm md:text-base flex items-center gap-1.5 md:gap-2 whitespace-nowrap shadow-sm hover:bg-slate-50">
          📅 Расписание
        </button>
      </nav>

      <main className="max-w-5xl mx-auto px-4 md:px-6 space-y-4 md:space-y-6">
        
        {/* ОЦЕНКИ */}
        {!isLittleHero && (
          <section className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-6 shadow-sm border border-slate-100">
            <h2 className="text-xl md:text-2xl font-extrabold flex items-center gap-2 text-slate-800 mb-5 md:mb-6">
              <span className="text-xl md:text-2xl">📖</span> Добавить оценку
            </h2>
            <GradeInput childId={childId} onGradeAdded={() => loadData()} />
          </section>
        )}

        {/* КВЕСТЫ НА СЕГОДНЯ */}
        <section className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-6 shadow-sm border border-slate-100">
          <h2 className="text-xl md:text-2xl font-extrabold flex items-center gap-2 text-slate-800 mb-5 md:mb-6">
            <span className="text-xl md:text-2xl">🚀</span> Квесты на сегодня
          </h2>

          <div className="space-y-2 md:space-y-3">
            {tasks.length === 0 && (
              <p className="text-slate-400 text-center py-8">Нет задач на сегодня</p>
            )}
            {tasks.map(task => (
              <div 
                key={task.id}
                onClick={() => completeTask(task.id, task.stars, task.completed)}
                className={`border rounded-2xl p-4 md:p-5 flex items-center justify-between cursor-pointer transition-all ${
                  task.completed ? 'border-green-200 bg-green-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                }`}
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full border-[3px] flex items-center justify-center flex-shrink-0 transition-colors ${
                    task.completed ? 'border-green-500 bg-green-500' : 'border-slate-300'
                  }`}>
                    {task.completed && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                  <span className={`font-bold text-base md:text-lg transition-colors ${
                    task.completed ? 'text-slate-400 line-through' : 'text-slate-700'
                  }`}>
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-1 font-extrabold text-amber-500 bg-amber-50 px-2.5 py-1 rounded-lg text-sm md:text-base">
                  +{task.stars} <Star size={14} className="fill-amber-400" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* МАГАЗИН НАГРАД */}
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
                    canAfford ? 'bg-white/20 border-white/40 hover:bg-white/30 shadow-lg' : 'bg-white/5 border-white/10 opacity-70 hover:bg-white/10'
                  }`}
                >
                  <h3 className="text-white font-bold text-base md:text-lg leading-tight">{reward.icon} {reward.title}</h3>
                  {reward.description && (
                    <p className="text-white/70 text-xs md:text-sm mt-1 hidden md:block">{reward.description}</p>
                  )}
                  <div className={`rounded-xl px-3 py-1.5 md:py-2 flex justify-center items-center gap-1 font-extrabold transition-colors text-sm md:text-base mt-0 md:mt-auto ${
                    canAfford ? 'bg-white text-indigo-600' : 'bg-white/20 text-white'
                  }`}>
                    {reward.costStars} <Star size={14} className={canAfford ? 'fill-indigo-600' : 'fill-white'} />
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
