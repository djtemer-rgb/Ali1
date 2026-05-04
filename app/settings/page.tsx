"use client";

import { useState } from "react";
import Header from "../components/Header";
import Navigation from "../components/Navigation";
import { Trash2, Plus, Lock, Bot, BookOpen, Trophy, Star } from "lucide-react";

export default function SettingsPage() {
  const [currentChild, setCurrentChild] = useState({ id: "ali", name: "Али", letter: "А", mode: "full" });
  
  const [subjects, setSubjects] = useState(["Математика", "Русский язык", "Чтение", "Окружающий мир", "Английский язык"]);
  const [newSubject, setNewSubject] = useState("");

  const [rewards, setRewards] = useState([
    { id: 1, title: "1 час видеоигр", cost: 10 },
    { id: 2, title: "Поход в кино", cost: 50 },
    { id: 3, title: "Новое Лего", cost: 200 }
  ]);
  const [newRewardName, setNewRewardName] = useState("");
  const [newRewardCost, setNewRewardCost] = useState("");

  const [systemPrompt, setSystemPrompt] = useState("Мотивируй ребенка. Хвали за усилия.");
  const [heroes, setHeroes] = useState("Мухаммед Али, Тайсон, Роналду");

  const switchChild = () => {
    setCurrentChild(prev => 
      prev.id === "ali" ? { id: "said", name: "Саид", letter: "С", mode: "little-hero" } : { id: "ali", name: "Али", letter: "А", mode: "full" }
    );
  };

  const addSubject = () => {
    if (newSubject.trim()) { setSubjects([...subjects, newSubject.trim()]); setNewSubject(""); }
  };
  const removeSubject = (index: number) => setSubjects(subjects.filter((_, i) => i !== index));

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
              {subjects.map((subj, idx) => (
                <div key={idx} className="bg-slate-100 text-slate-700 px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 group">
                  {subj}
                  <button onClick={() => removeSubject(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
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
                <button className="bg-[#EAB308] text-white px-4 md:px-6 rounded-xl font-bold hover:bg-[#D97706] transition-colors shadow-sm whitespace-nowrap text-sm md:text-base">
                  Добавить
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {rewards.map(reward => (
                <div key={reward.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 md:p-4 flex items-center justify-between group">
                  <span className="font-bold text-slate-800 text-sm md:text-base">{reward.title}</span>
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="flex items-center gap-1 font-extrabold text-slate-700 text-sm md:text-base">
                      {reward.cost} <Star size={14} className="fill-amber-400 text-amber-400" />
                    </div>
                    <button className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
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
              <button className="w-full md:w-auto bg-indigo-500 text-white px-6 md:px-8 py-3 rounded-xl font-bold hover:bg-indigo-600 transition-colors shadow-sm shadow-indigo-200 text-sm md:text-base">
                Сохранить настройки AI
              </button>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}