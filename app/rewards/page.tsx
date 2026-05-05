"use client";

import { useState, useEffect } from "react";
import { Star, ArrowLeft } from "lucide-react";
import Link from "next/link";
import confetti from "canvas-confetti";

interface Reward {
  id: string;
  title: string;
  description?: string;
  costStars: number;
  icon: string;
  iconStyle: 'color' | 'minimal';
}

interface ChildProfile {
  id: string;
  name: string;
  letter: string;
  mode: string;
}

export default function RewardsPage() {
  const [currentChild, setCurrentChild] = useState<ChildProfile>({ id: "ali", name: "Али", letter: "А", mode: "full" });
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [stars, setStars] = useState(0);
  const [selectedRewards, setSelectedRewards] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentChild.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rewardsRes, starsRes, statusRes] = await Promise.all([
        fetch(`/api/rewards?childId=${currentChild.id}`),
        fetch(`/api/star-ledger?childId=${currentChild.id}`),
        fetch(`/api/rewards/status?childId=${currentChild.id}`)
      ]);
      const rewardsData = await rewardsRes.json();
      const starsData = await starsRes.json();
      const statusData = await statusRes.json();

      setRewards(Array.isArray(rewardsData) ? rewardsData : []);
      setStars(starsData.balance || 0);
      setSelectedRewards(
        Array.isArray(statusData)
          ? statusData.filter((s: any) => s.status === 'selected').map((s: any) => s.rewardId)
          : []
      );
    } catch (error) {
      console.error('Error loading rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectReward = async (reward: Reward) => {
    if (stars < reward.costStars) {
      alert(`Не хватает звезд! Нужно еще ${reward.costStars - stars} ⭐️`);
      return;
    }

    if (selectedRewards.includes(reward.id)) {
      setSelectedRewards(prev => prev.filter(id => id !== reward.id));
      await fetch('/api/rewards/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: currentChild.id, rewardId: reward.id, status: 'available' })
      });
      return;
    }

    setStars(prev => prev - reward.costStars);
    setSelectedRewards(prev => [...prev, reward.id]);
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 }, colors: ['#8B5CF6', '#6366F1', '#F59E0B'] });

    await fetch('/api/star-ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: currentChild.id,
        amount: -reward.costStars,
        source: 'reward-purchase',
        reason: `Покупка награды: ${reward.title}`
      })
    });

    await fetch('/api/rewards/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: currentChild.id, rewardId: reward.id, status: 'selected' })
    });

    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: currentChild.id,
        type: 'reward-selected',
        title: 'Награда выбрана',
        body: `${currentChild.name} выбрал награду: ${reward.title}`
      })
    });
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] font-sans text-slate-800 pb-10">
      <header className="bg-white px-4 md:px-6 py-3 md:py-5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl md:text-2xl font-extrabold">Магазин наград</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500 font-medium">{currentChild.name}</span>
          <div className="bg-[#FEF3C7] border-2 border-[#FDE68A] text-[#D97706] px-3 py-1.5 rounded-xl font-extrabold flex items-center gap-1.5 shadow-sm">
            <Star className="fill-amber-400 w-4 h-4" /> {stars}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-4">
        <div className="flex gap-2">
          {['ali', 'said'].map(id => (
            <button
              key={id}
              onClick={() => setCurrentChild(
                id === 'ali'
                  ? { id: 'ali', name: 'Али', letter: 'А', mode: 'full' }
                  : { id: 'said', name: 'Саид', letter: 'С', mode: 'little-hero' }
              )}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
                currentChild.id === id
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-200'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {id === 'ali' ? 'Али' : 'Саид'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-44 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : rewards.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-lg font-medium">Нет доступных наград</p>
            <p className="text-slate-300 text-sm mt-2">Попроси родителя добавить награды в настройках</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {rewards.map(reward => {
              const isSelected = selectedRewards.includes(reward.id);
              const canAfford = stars >= reward.costStars;
              return (
                <div
                  key={reward.id}
                  onClick={() => toggleSelectReward(reward)}
                  className={`bg-white rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col ${
                    isSelected
                      ? 'border-green-400 bg-green-50 shadow-lg shadow-green-100'
                      : canAfford
                      ? 'border-slate-100 hover:border-blue-300 hover:shadow-md'
                      : 'border-slate-100 opacity-60 hover:border-slate-200'
                  }`}
                >
                  <div className="text-4xl mb-3 text-center">{reward.icon}</div>
                  <h3 className="font-bold text-slate-800 text-base text-center leading-tight">{reward.title}</h3>
                  {reward.description && (
                    <p className="text-xs text-slate-500 mt-2 text-center line-clamp-2">{reward.description}</p>
                  )}
                  <div className="mt-auto pt-4 flex justify-center">
                    <div className={`rounded-xl px-4 py-2 flex items-center gap-1 font-extrabold text-sm ${
                      isSelected
                        ? 'bg-green-500 text-white'
                        : canAfford
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {isSelected ? '✅ Выбрано' : `${reward.costStars} ⭐`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
