"use client";

import { useState, useEffect } from "react";
import { Star, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import Header from "./components/Header";
import Navigation from "./components/Navigation";

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

export default function Home() {
  const [currentChild, setCurrentChild] = useState({ id: "ali", name: "Али", letter: "А", mode: "full" });
  const [stars, setStars] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");

  // Load data from API
  useEffect(() => {
    loadData();
  }, [currentChild.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Load tasks for today
      const tasksRes = await fetch(`/api/tasks/day?childId=${currentChild.id}&date=${today}`);
      const tasksData = await tasksRes.json();
      setTasks(tasksData);

      // Load stars balance
      const starsRes = await fetch(`/api/star-ledger?childId=${currentChild.id}`);
      const starsData = await starsRes.json();
      setStars(starsData.balance || 0);

      // Load rewards
      const rewardsRes = await fetch(`/api/rewards?childId=${currentChild.id}`);
      const rewardsData = await rewardsRes.json();
      setRewards(rewardsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchChild = () => {
    setCurrentChild(prev => 
      prev.id === "ali" 
        ? { id: "said", name: "Саид", letter: "С", mode: "little-hero" } 
        : { id: "ali", name: "Али", letter: "А", mode: "full" }
    );
  };

  const completeTask = async (taskId: string, reward: number, isCompleted: boolean) => {
    if (isCompleted) return; 
    
    const today = new Date().toISOString().split('T')[0];
    
    // Update task in state
    const updatedTasks = tasks.map(t => 
      t.id === taskId ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
    );
    setTasks(updatedTasks);
    
    // Save to API
    await fetch(`/api/tasks/day?childId=${currentChild.id}&date=${today}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: currentChild.id, date: today, tasks: updatedTasks })
    });

    // Add stars to ledger
    await fetch('/api/star-ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: currentChild.id,
        amount: reward,
        source: 'task',
        sourceId: taskId,
        reason: `Выполнена задача: ${tasks.find(t => t.id === taskId)?.title}`
      })
    });

    setStars(prev => prev + reward);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#3B82F6', '#F59E0B', '#10B981'] });
  };

  const buyReward = async (cost: number, title: string) => {
    if (stars >= cost) {
      setStars(prev => prev - cost);
      alert(`🎉 Ура! Ты получил: ${title}`);
      
      // Add to ledger
      await fetch('/api/star-ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: currentChild.id,
          amount: -cost,
          source: 'reward-purchase',
          reason: `Покупка награды: ${title}`
        })
      });
    } else {
      alert(`Не хватает звезд! Нужно еще ${cost - stars} ⭐️`);
    }
  };

  const fetchHeroMessage = () => {
    setIsAiModalOpen(true);
    setIsAiLoading(true);
    setAiMessage("");
    const completedCount = tasks.filter(t => t.completed).length;
    const allCompleted = completedCount === tasks.length;

    setTimeout(() => {
      setIsAiLoading(false);
      if (completedCount === 0) {
        setAiMessage(`Привет, ${currentChild.name}! Молодец, рад тебя видеть! Давай, приступай к квестам, у тебя всё обязательно получится! 🥊`);
      } else if (allCompleted) {
        setAiMessage(`Ого, ${currentChild.name}! Ты выполнил абсолютно всё! Ты настоящий чемпион, прям как Мухаммед Али на ринге! Горжусь тобой! 🏆`);
      } else {
        setAiMessage(`Отличный старт, ${currentChild.name}! Ты уже на полпути к победе. Поднажми, чемпион, осталось совсем чуть-чуть! 🚀`);
      }
    }, 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] font-sans text-slate-800 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] font-sans text-slate-800 pb-10">
      <Header currentChild={currentChild} onSwitchChild={switchChild} stars={stars} />
      <Navigation isLittleHero={currentChild.mode === "little-hero"} />

      <main className="max-w-5xl mx-auto px-4 md:px-6 space-y-4 md:space-y-6">
        
        {/* КВЕСТЫ НА СЕГОДНЯ */}
        <section className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-6 shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 md:mb-6">
            <h2 className="text-xl md:text-2xl font-extrabold flex items-center gap-2 text-slate-800">
              <span className="text-xl md:text-2xl">🚀</span> Квесты на сегодня
            </h2>
            <div 
              onClick={fetchHeroMessage}
              className="bg-indigo-50 text-indigo-600 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer hover:bg-indigo-100 transition-colors shadow-sm"
            >
              <SparklesIcon /> Послание от Героя
            </div>
          </div>

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
                    {task.completed && <CheckIcon />}
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
                  <h3 className="text-white font-bold text-base md:text-lg leading-tight">{reward.title}</h3>
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

      {/* МОДАЛЬНОЕ ОКНО AI */}
      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-6 w-full max-w-md shadow-2xl relative border-4 border-indigo-100 m-2"
            >
              <button 
                onClick={() => setIsAiModalOpen(false)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1"
              >
                <XIcon size={20} />
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                  <BotIcon />
                </div>
                <h2 className="text-lg md:text-xl font-extrabold text-slate-800">Послание Героя</h2>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-4 md:p-5 min-h-[100px] flex items-center justify-center border border-slate-100">
                {isAiLoading ? (
                  <div className="flex flex-col items-center text-slate-400 gap-2">
                    <Loader2 className="animate-spin text-indigo-500" size={28} />
                    <span className="text-sm font-medium">Герой печатает сообщение...</span>
                  </div>
                ) : (
                  <p className="text-base md:text-lg font-bold text-slate-700 leading-snug">
                    {aiMessage}
                  </p>
                )}
              </div>

              <button 
                onClick={() => setIsAiModalOpen(false)}
                className="w-full mt-5 bg-indigo-600 text-white py-3 md:py-3.5 rounded-xl font-bold text-base md:text-lg hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
              >
                Понял, спасибо!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SparklesIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor"/></svg>; }
function CheckIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>; }
function BotIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>; }
function XIcon({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>; }
