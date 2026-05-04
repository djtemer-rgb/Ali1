"use client";

import { useState } from "react";
import Header from "../components/Header";
import Navigation from "../components/Navigation";
import { Plus, Trash2, Lock, Unlock } from "lucide-react";

export default function SchedulePage() {
  const [currentChild, setCurrentChild] = useState({ id: "ali", name: "Али", letter: "А", mode: "full" });
  
  const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  // Дни по умолчанию пустые (разовая задача)
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  
  // Имитация ввода PIN-кода
  const [isParentMode, setIsParentMode] = useState(false);

  const switchChild = () => {
    setCurrentChild(prev => 
      prev.id === "ali" 
        ? { id: "said", name: "Саид", letter: "С", mode: "little-hero" } 
        : { id: "ali", name: "Али", letter: "А", mode: "full" }
    );
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] font-sans text-slate-800 pb-20">
      <Header currentChild={currentChild} onSwitchChild={switchChild} stars={0} />
      <Navigation isLittleHero={currentChild.mode === "little-hero"} />

      <main className="max-w-5xl mx-auto px-4 md:px-6">
        
        {/* Кнопка-заглушка для включения режима родителя (PIN) */}
        <div className="flex justify-end mb-4">
          <button 
            onClick={() => setIsParentMode(!isParentMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm ${
              isParentMode ? "bg-red-100 text-red-600 border border-red-200" : "bg-slate-200 text-slate-600 border border-slate-300"
            }`}
          >
            {isParentMode ? <Unlock size={16} /> : <Lock size={16} />}
            {isParentMode ? "Выйти из режима родителя" : "Ввести PIN (Родитель)"}
          </button>
        </div>

        <section className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-8 shadow-sm border border-slate-100">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 mb-5 md:mb-6">Создать новую задачу</h2>
          
          <div className="mb-5 md:mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">Что нужно сделать?</label>
            <input 
              type="text" 
              placeholder="Например: Выучить стих, Убрать игрушки..." 
              className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-sm md:text-base"
            />
          </div>

          <div className="mb-6 md:mb-8">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-slate-700">В какие дни повторять?</label>
              <span className="text-xs font-medium text-slate-400">Если пусто — задача разовая</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {days.map((day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`w-11 h-11 md:w-12 md:h-12 rounded-xl font-bold transition-all border-2 flex items-center justify-center text-sm md:text-base ${
                    selectedDays.includes(day)
                      ? "bg-white text-slate-800 border-slate-300"
                      : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <button className="w-full md:w-auto bg-[#22C55E] text-white px-8 py-3.5 rounded-xl font-bold text-base md:text-lg hover:bg-green-600 transition-colors shadow-sm flex items-center justify-center gap-2">
            <Plus size={20} /> Добавить в расписание
          </button>

          <hr className="my-8 md:my-10 border-slate-100" />

          <h3 className="text-lg md:text-xl font-extrabold text-slate-800 mb-5 md:mb-6">Все задачи:</h3>
          
          <div className="space-y-3">
            {[
              { title: "Сделать домашку", active: ["Пн", "Вт", "Ср", "Чт", "Пт"] },
              { title: "Прочитать 10 страниц", active: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] },
              { title: "Собрать портфель", active: ["Пн", "Вт", "Ср", "Чт", "Вс"] },
              { title: "Помыть посуду", active: [] } // Пример разовой задачи
            ].map((task, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 group">
                <span className="font-bold text-slate-800 text-base md:text-lg">{task.title}</span>
                
                <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 md:gap-6">
                  <div className="flex flex-wrap gap-1">
                    {task.active.length > 0 ? (
                      days.map(day => (
                        <span 
                          key={day} 
                          className={`text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded ${
                            task.active.includes(day) ? "bg-blue-100 text-blue-600" : "text-slate-300"
                          }`}
                        >
                          {day}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs font-bold px-2 py-1 rounded bg-amber-100 text-amber-600">Разовая</span>
                    )}
                  </div>
                  
                  {/* Корзина показывается только если включен режим родителя */}
                  {isParentMode && (
                    <button className="text-slate-300 hover:text-red-500 transition-colors p-1">
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

        </section>
      </main>
    </div>
  );
}