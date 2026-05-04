"use client";

import { useState } from "react";
import Header from "../components/Header";
import Navigation from "../components/Navigation";
import { Plus, Star } from "lucide-react";

export default function GradesPage() {
  const [currentChild, setCurrentChild] = useState({ id: "ali", name: "Али", letter: "А", mode: "full" });
  const [selectedGrade, setSelectedGrade] = useState<number | null>(5);

  const switchChild = () => {
    setCurrentChild(prev => 
      prev.id === "ali" 
        ? { id: "said", name: "Саид", letter: "С", mode: "little-hero" } 
        : { id: "ali", name: "Али", letter: "А", mode: "full" }
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] font-sans text-slate-800 pb-20">
      <Header currentChild={currentChild} onSwitchChild={switchChild} stars={0} />
      <Navigation isLittleHero={currentChild.mode === "little-hero"} />

      <main className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* ЛЕВАЯ ЧАСТЬ: Добавить оценку */}
        <section className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
          <h2 className="text-2xl font-extrabold text-slate-800 mb-6">Добавить оценку</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">Предмет</label>
            <select className="w-full border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium appearance-none bg-white">
              <option>Математика</option>
              <option>Русский язык</option>
              <option>Чтение</option>
            </select>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-bold text-slate-700 mb-2">Оценка</label>
            <div className="flex gap-3">
              {[5, 4, 3, 2].map((grade) => (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  className={`flex-1 py-3 rounded-xl font-extrabold text-xl transition-all border-2 ${
                    selectedGrade === grade 
                      ? grade === 5 ? "bg-[#22C55E] text-white border-[#22C55E] shadow-md shadow-green-200" 
                      : grade === 4 ? "bg-[#3B82F6] text-white border-[#3B82F6] shadow-md shadow-blue-200"
                      : "bg-[#F59E0B] text-white border-[#F59E0B] shadow-md shadow-amber-200"
                      : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          <button className="w-full bg-[#5A67D8] text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-600 transition-colors shadow-sm flex items-center justify-center gap-2">
            <Plus size={20} /> Сохранить оценку
          </button>
          
          <div className="mt-4 text-center text-xs text-slate-400 font-medium flex items-center justify-center gap-2">
            5 = +5 <Star size={12} className="fill-amber-400 text-amber-400" /> | 4 = +2 <Star size={12} className="fill-amber-400 text-amber-400" />
          </div>
        </section>

        {/* ПРАВАЯ ЧАСТЬ: Дневник */}
        <section className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col">
          <h2 className="text-2xl font-extrabold text-slate-800 mb-6">Дневник (Недавние)</h2>
          
          <div className="flex-1 flex items-center justify-center text-slate-400 italic font-medium min-h-[200px]">
            Пока нет оценок.
          </div>
        </section>

      </main>
    </div>
  );
}