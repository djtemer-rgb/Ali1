"use client";

import { useState, useEffect } from "react";
import Header from "../components/Header";
import Navigation from "../components/Navigation";
import { Trash2, Plus, Lock, Bot, BookOpen, Trophy, Star, Key, Shield } from "lucide-react";

interface Subject { id: string; name: string; order: number; }
interface Reward { id: string; title: string; description?: string; costStars: number; icon: string; active: boolean; }
interface ChildProfile { id: string; name: string; letter: string; mode: string; }

export default function SettingsPage() {
  const [currentChild, setCurrentChild] = useState<ChildProfile>({ id: "ali", name: "Али", letter: "А", mode: "full" });
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState("");

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [newRewardName, setNewRewardName] = useState("");
  const [newRewardCost, setNewRewardCost] = useState("");
  const [newRewardDesc, setNewRewardDesc] = useState("");

  const [systemPrompt, setSystemPrompt] = useState("Мотивируй ребенка. Хвали за усилия.");
  const [heroes, setHeroes] = useState("Мухаммед Али, Тайсон, Роналду");  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // PIN settings
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [recoveryWord, setRecoveryWord] = useState('');
  const [pinStatus, setPinStatus] = useState<{ hasPin1: boolean; hasPin2: boolean; hasRecovery: boolean }>({ hasPin1: false, hasPin2: false, hasRecovery: false });

  useEffect(() => {
    loadData();
    loadPinStatus();
  }, [currentChild.id]);

  const loadPinStatus = async () => {
    try {
      const res = await fetch('/api/auth/parent/settings');
      const data = await res.json();
      setPinStatus(data);
    } catch (error) {
      console.error('Error loading PIN status:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load subjects
      const subjRes = await fetch('/api/grades');
      const subjectsData = await subjRes.json();
      if (Array.isArray(subjectsData)) {
        setSubjects(subjectsData);
      }

      // Load rewards
      const rewardsRes = await fetch(`/api/rewards?childId=${currentChild.id}`);
      const rewardsData = await rewardsRes.json();
      setRewards(rewardsData);

      // Load settings
      const settingsRes = await fetch('/api/settings');
      const settingsData = await settingsRes.json();
      if (settingsData.systemPrompt) setSystemPrompt(settingsData.systemPrompt);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchChild = () => {
    setCurrentChild(prev => 
      prev.id === "ali" ? { id: "said", name: "Саид", letter: "С", mode: "little-hero" } : { id: "ali", name: "Али", letter: "А", mode: "full" }
    );
  };

  const addSubject = async () => {
    if (!newSubject.trim()) return;
    const newSubj: Subject = {
      id: `subj-${Date.now()}`,
      name: newSubject.trim(),
      order: subjects.length + 1
    };
    const updated = [...subjects, newSubj];
    setSubjects(updated);
    setNewSubject("");
    
    // Save to API
    await fetch('/api/grades', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjects: updated })
    });
  };

  const removeSubject = async (id: string) => {
    const updated = subjects.filter(s => s.id !== id);
    setSubjects(updated);
    
    await fetch('/api/grades', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subjects: updated })
    });
  };

  const addReward = async () => {
    if (!newRewardName.trim() || !newRewardCost) return;
    
    try {
      const res = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: currentChild.id,
          title: newRewardName.trim(),
          description: newRewardDesc.trim() || undefined,
          costStars: parseFloat(newRewardCost),
          icon: '🎁',
          iconStyle: 'color',
          active: true
        })
      });
      
      const newReward = await res.json();
      setRewards([...rewards, newReward]);
      setNewRewardName("");
      setNewRewardCost("");
      setNewRewardDesc("");
    } catch (error) {
      console.error('Error adding reward:', error);
    }
  };

  const removeReward = async (id: string) => {
    try {
      await fetch(`/api/rewards?id=${id}`, { method: 'DELETE' });
      setRewards(rewards.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting reward:', error);
    }
  };

  const saveAISettings = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, heroes: heroes.split(',').map(h => h.trim()) })
      });
      alert('Настройки ИИ сохранены!');
    } catch (error) {
      console.error('Error saving AI settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] font-sans text-slate-800 pb-20">
      <Header currentChild={currentChild} onSwitchChild={switchChild} stars={0} />
      <Navigation isLittleHero={currentChild.mode === "little-hero"} />

      <main className="max-w-5xl mx-auto px-4 md:px-6 space-y-4 md:space-y-6">
        
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-800">Настройки для: {currentChild.name}</h2>
          <div className="bg-slate-200 text-slate-600 px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5">
            <Lock size={14} /> Зона родителя
          </div>
        </div>

        {/* Сетка настроек: 1 колонка на мобильном, 2 колонки на ПК */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          
          <section className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-8 shadow-sm border border-slate-100">
            <h3 className="text-lg md:text-xl font-extrabold text-slate-800 mb-4 md:mb-6 flex items-center gap-2">
              <BookOpen className="text-blue-500 w-5 h-5 md:w-6 md:h-6" /> Предметы
            </h3>
            
            <div className="flex gap-2 mb-5 md:mb-6">
              <input 
                type="text" 
                placeholder="Новый предмет..." 
                className="flex-1 border border-slate-200 rounded-xl px-3 md:px-4 py-2.5 md:py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-sm md:text-base"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSubject()}
              />
              <button onClick={addSubject} className="bg-blue-500 text-white w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center hover:bg-blue-600 transition-colors shadow-sm shrink-0">
                <Plus size={20} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {subjects.map((subj) => (
                <div key={subj.id} className="bg-slate-100 text-slate-700 px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 group">
                  {subj.name}
                  <button onClick={() => removeSubject(subj.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-8 shadow-sm border border-slate-100">
            <h3 className="text-lg md:text-xl font-extrabold text-slate-800 mb-4 md:mb-6 flex items-center gap-2">
              <Trophy className="text-amber-500 w-5 h-5 md:w-6 md:h-6" /> Настройки наград
            </h3>

            <div className="flex flex-col gap-2 md:gap-3 mb-5 md:mb-6">
              <input 
                type="text" 
                placeholder="Название (например: Кино)" 
                className="w-full border border-slate-200 rounded-xl px-3 md:px-4 py-2.5 md:py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all font-medium text-sm md:text-base"
                value={newRewardName}
                onChange={(e) => setNewRewardName(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="Описание (необязательно)" 
                className="w-full border border-slate-200 rounded-xl px-3 md:px-4 py-2.5 md:py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all font-medium text-sm md:text-base"
                value={newRewardDesc}
                onChange={(e) => setNewRewardDesc(e.target.value)}
              />
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input 
                    type="number" 
                    placeholder="Цена" 
                    className="w-full border border-slate-200 rounded-xl px-3 md:px-4 py-2.5 md:py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all font-medium text-sm md:text-base"
                    value={newRewardCost}
                    onChange={(e) => setNewRewardCost(e.target.value)}
                  />
                  <Star size={16} className="absolute right-3 top-3 md:top-3.5 fill-amber-400 text-amber-400" />
                </div>
                <button onClick={addReward} className="bg-[#EAB308] text-white px-4 md:px-6 rounded-xl font-bold hover:bg-[#D97706] transition-colors shadow-sm whitespace-nowrap text-sm md:text-base">
                  Добавить
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {rewards.map(reward => (
                <div key={reward.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 md:p-4 flex items-center justify-between group">
                  <div>
                    <span className="font-bold text-slate-800 text-sm md:text-base">{reward.title}</span>
                    {reward.description && <p className="text-xs text-slate-500 mt-1">{reward.description}</p>}
                  </div>
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="flex items-center gap-1 font-extrabold text-slate-700 text-sm md:text-base">
                      {reward.costStars} <Star size={14} className="fill-amber-400 text-amber-400" />
                    </div>
                    <button onClick={() => removeReward(reward.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-8 shadow-sm border border-slate-100 md:col-span-2 border-t-4 border-t-red-500">
            <h3 className="text-lg md:text-xl font-extrabold text-slate-800 mb-4 md:mb-6 flex items-center gap-2">
              <Key className="text-red-500 w-5 h-5 md:w-6 md:h-6" /> Настройки доступа (PIN и восстановление)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1 md:mb-2">PIN-код 1</label>
                <p className="text-xs text-slate-400 mb-2 md:mb-3">
                  {pinStatus.hasPin1 ? 'Уже установлен' : 'Не установлен'}
                </p>
                <input 
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="4-6 цифр"
                  className="w-full border border-slate-200 rounded-xl px-3 md:px-4 py-2.5 md:py-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all font-medium text-sm md:text-base"
                  value={pin1}
                  onChange={(e) => setPin1(e.target.value.replace(/\D/g, ''))}
                />
                <button 
                  onClick={async () => {
                    if (pin1.length >= 4) {
                      await fetch('/api/auth/parent/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pin: pin1, pinSlot: 1 })
                      });
                      alert('PIN 1 сохранен!');
                      setPin1('');
                      loadPinStatus();
                    }
                  }}
                  className="mt-2 w-full bg-red-500 text-white py-2 rounded-xl font-bold hover:bg-red-600 transition-colors text-sm"
                >
                  Сохранить PIN 1
                </button>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1 md:mb-2">PIN-код 2 (резервный)</label>
                <p className="text-xs text-slate-400 mb-2 md:mb-3">
                  {pinStatus.hasPin2 ? 'Уже установлен' : 'Не установлен'}
                </p>
                <input 
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="4-6 цифр"
                  className="w-full border border-slate-200 rounded-xl px-3 md:px-4 py-2.5 md:py-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all font-medium text-sm md:text-base"
                  value={pin2}
                  onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))}
                />
                <button 
                  onClick={async () => {
                    if (pin2.length >= 4) {
                      await fetch('/api/auth/parent/settings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pin: pin2, pinSlot: 2 })
                      });
                      alert('PIN 2 сохранен!');
                      setPin2('');
                      loadPinStatus();
                    }
                  }}
                  className="mt-2 w-full bg-red-500 text-white py-2 rounded-xl font-bold hover:bg-red-600 transition-colors text-sm"
                >
                  Сохранить PIN 2
                </button>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1 md:mb-2">Recovery слово</label>
                <p className="text-xs text-slate-400 mb-2 md:mb-3">
                  {pinStatus.hasRecovery ? 'Уже установлено' : 'Не установлено'}
                </p>
                <input 
                  type="text"
                  placeholder="Секретное слово"
                  className="w-full border border-slate-200 rounded-xl px-3 md:px-4 py-2.5 md:py-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all font-medium text-sm md:text-base"
                  value={recoveryWord}
                  onChange={(e) => setRecoveryWord(e.target.value)}
                />
                <button 
                  onClick={async () => {
                    if (recoveryWord.length >= 4) {
                      await fetch('/api/auth/parent/settings', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ recoveryWord })
                      });
                      alert('Recovery слово сохранено!');
                      setRecoveryWord('');
                      loadPinStatus();
                    }
                  }}
                  className="mt-2 w-full bg-red-500 text-white py-2 rounded-xl font-bold hover:bg-red-600 transition-colors text-sm"
                >
                  Сохранить слово
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-8 shadow-sm border border-slate-100 md:col-span-2 border-t-4 border-t-indigo-500">
            <h3 className="text-lg md:text-xl font-extrabold text-slate-800 mb-4 md:mb-6 flex items-center gap-2">
              <Bot className="text-indigo-500 w-5 h-5 md:w-6 md:h-6" /> Настройки AI (Послание Героя)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1 md:mb-2">Любимые герои и авторитеты</label>
                <p className="text-xs text-slate-400 mb-2 md:mb-3">Кто будет вдохновлять ребенка? (через запятую)</p>
                <input 
                  type="text" 
                  className="w-full border border-slate-200 rounded-xl px-3 md:px-4 py-2.5 md:py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium mb-2 md:mb-4 text-sm md:text-base"
                  value={heroes}
                  onChange={(e) => setHeroes(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1 md:mb-2">Системный Промпт (Инструкция)</label>
                <p className="text-xs text-slate-400 mb-2 md:mb-3">Как ИИ должен отвечать на выполненные/невыполненные задачи.</p>
                <textarea 
                  rows={4}
                  className="w-full border border-slate-200 rounded-xl px-3 md:px-4 py-2.5 md:py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium resize-none text-sm md:text-base"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-2 md:mt-4 flex justify-end">
              <button 
                onClick={saveAISettings}
                disabled={saving}
                className="w-full md:w-auto bg-indigo-500 text-white px-6 md:px-8 py-3 rounded-xl font-bold hover:bg-indigo-600 transition-colors shadow-sm shadow-indigo-200 text-sm md:text-base disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : 'Сохранить настройки AI'}
              </button>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

function Loader2({ size, className }: { size: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="60" strokeDashoffset="20"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle></svg>;
}
