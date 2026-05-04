"use client";

import { useState } from "react";
import { Star, Trophy, BookOpen, Calendar, Settings, Rocket, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ChildDashboard() {
  const [currentChild, setCurrentChild] = useState({ id: "ali", name: "Али", letter: "А" });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Для Саида (младшего) скроем вкладку оценок
  const isLittleHero = currentChild.id === "said";

  const switchChild = () => {
    setCurrentChild(prev => 
      prev.id === "ali" 
        ? { id: "said", name: "Саид", letter: "С" } 
        : { id: "ali", name: "Али", letter: "А" }
    );
    setIsDropdownOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] font-sans text-slate-800 pb-10">
      
      {/* 1. ШАПКА (Header) */}
      <header className="bg-white px-6 py-5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold">
            {currentChild.letter}
          </div>
          <div className="relative">
            <div 
              className="flex items-baseline gap-1 cursor-pointer group"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <h1 className="text-2xl font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors">
                Привет,
              </h1>
              <div className="relative h-8 flex items-center min-w-[60px] border border-transparent group-hover:border-blue-200 rounded px-1 -ml-1">
                <AnimatePresence mode="popLayout">
                  <motion.h1
                    key={currentChild.id}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="text-2xl font-extrabold text-slate-800 absolute"
                  >
                    {currentChild.name}!
                  </motion.h1>
                </AnimatePresence>
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium">Твои успехи за сегодня</p>

            {/* Выпадающий список для смены ребенка */}
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full mt-2 left-0 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-50 w-48"
                >
                  <div 
                    onClick={switchChild}
                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-slate-700 font-medium"
                  >
                    Переключить на {currentChild.id === "ali" ? "Саида" : "Али"}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="bg-[#FEF3C7] border-2 border-[#FDE68A] text-[#D97706] px-4 py-2 rounded-xl font-extrabold text-lg flex items-center gap-2 shadow-sm">
          <Star className="fill-amber-400 text-amber-400" size={20} /> 0
        </div>
      </header>

      {/* 2. НАВИГАЦИЯ (Tabs) */}
      <nav className="flex gap-3 px-6 py-6 overflow-x-auto no-scrollbar max-w-5xl mx-auto">
        <button className="bg-[#3B82F6] text-white px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 whitespace-nowrap shadow-md shadow-blue-200 hover:bg-blue-600 transition-colors">
          <Trophy size={20} /> Главная
        </button>
        {!isLittleHero && (
          <button className="bg-white text-slate-700 px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 whitespace-nowrap shadow-sm hover:bg-slate-50 transition-colors">
            <BookOpen size={20} className="text-slate-400" /> Оценки
          </button>
        )}
        <button className="bg-white text-slate-700 px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 whitespace-nowrap shadow-sm hover:bg-slate-50 transition-colors">
          <Calendar size={20} className="text-slate-400" /> Расписание
        </button>
        <button className="bg-white text-slate-700 px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2 whitespace-nowrap shadow-sm hover:bg-slate-50 transition-colors">
          <Settings size={20} className="text-slate-400" /> Настройки
        </button>
      </nav>

      <main className="max-w-5xl mx-auto px-6 space-y-6">
        
        {/* 3. КВЕСТЫ НА СЕГОДНЯ */}
        <section className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold flex items-center gap-2 text-slate-800">
              <span className="text-2xl">🚀</span> Квесты на сегодня
            </h2>
            <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5">
              <SparklesIcon /> Послание от Героя
            </div>
          </div>

          <div className="space-y-3">
            {/* Карточка квеста 1 */}
            <div className="border border-slate-200 rounded-2xl p-5 flex items-center gap-4 cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
              <div className="w-8 h-8 rounded-full border-[3px] border-slate-300 flex-shrink-0"></div>
              <span className="font-bold text-lg text-slate-700">Прочитать 10 страниц</span>
            </div>

            {/* Карточка квеста 2 */}
            <div className="border border-slate-200 rounded-2xl p-5 flex items-center gap-4 cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
              <div className="w-8 h-8 rounded-full border-[3px] border-slate-300 flex-shrink-0"></div>
              <span className="font-bold text-lg text-slate-700">Собрать портфель</span>
            </div>
          </div>
        </section>

        {/* 4. МАГАЗИН НАГРАД */}
        <section className="bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] rounded-[32px] p-8 shadow-lg shadow-indigo-200">
          <h2 className="text-2xl font-extrabold flex items-center gap-2 text-white mb-6">
            <span className="text-2xl">🎁</span> Магазин наград
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Награда 1 */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-5 flex flex-col justify-between h-32 hover:bg-white/20 transition-colors cursor-pointer">
              <h3 className="text-white font-bold text-lg">1 час видеоигр</h3>
              <div className="bg-white/20 rounded-xl py-2 flex justify-center items-center gap-1 text-white font-extrabold">
                10 <Star size={16} className="fill-white" />
              </div>
            </div>

            {/* Награда 2 */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-5 flex flex-col justify-between h-32 hover:bg-white/20 transition-colors cursor-pointer">
              <h3 className="text-white font-bold text-lg">Поход в кино</h3>
              <div className="bg-white/20 rounded-xl py-2 flex justify-center items-center gap-1 text-white font-extrabold">
                50 <Star size={16} className="fill-white" />
              </div>
            </div>

            {/* Награда 3 */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-5 flex flex-col justify-between h-32 hover:bg-white/20 transition-colors cursor-pointer">
              <h3 className="text-white font-bold text-lg">Новое Лего</h3>
              <div className="bg-white/20 rounded-xl py-2 flex justify-center items-center gap-1 text-white font-extrabold">
                200 <Star size={16} className="fill-white" />
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

// Вспомогательная иконка звездочек для кнопки "Послание героя"
function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor"/>
    </svg>
  );
}