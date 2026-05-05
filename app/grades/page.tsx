"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, BookOpen, Star } from "lucide-react";
import Link from "next/link";
import { useChild } from "@/app/lib/ChildContext";
import GradeInput from "../components/GradeInput";

interface GradeRecord { id: string; subjectName: string; grade: number; starsAwarded: number; createdAt: string; }

export default function GradesPage() {
  const { currentChild } = useChild();
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGrades = async () => {
    setLoading(true);
    try {
      const [gradesRes] = await Promise.all([fetch(`/api/grades?type=grades&childId=${currentChild.id}`)]);
      const d = await gradesRes.json();
      setGrades(Array.isArray(d) ? d.reverse() : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadGrades(); }, [currentChild.id]);

  const getGradeColor = (g: number) =>
    g === 5 ? 'bg-green-100 text-green-700 border-green-300' : g === 4 ? 'bg-blue-100 text-blue-700 border-blue-300' : g === 3 ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-red-100 text-red-700 border-red-300';

  return (
    <div className="min-h-screen bg-[#F4F7FB] font-sans text-slate-800 pb-10">
      <header className="bg-white px-4 md:px-6 py-3 md:py-4 flex items-center border-b border-slate-100">
        <Link href="/" className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 transition-colors text-sm font-medium">
          <ArrowLeft size={18} /> Назад
        </Link>
      </header>
      <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 text-center py-4 md:py-5">Оценки</h1>

      <main className="max-w-3xl mx-auto px-4 md:px-6 space-y-4">
        <GradeInput childId={currentChild.id} onGradeAdded={loadGrades} />

        <section className="bg-white rounded-[24px] p-5 shadow-sm border border-slate-100">
          <h2 className="text-base font-extrabold flex items-center gap-2 text-slate-800 mb-4">
            <BookOpen size={18} className="text-blue-500" /> Дневник
          </h2>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
          ) : grades.length === 0 ? (
            <p className="text-slate-400 text-center py-6 text-sm">Пока нет оценок</p>
          ) : (
            <div className="space-y-2">
              {grades.map(g => (
                <div key={g.id} className="flex items-center justify-between bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl font-extrabold text-base flex items-center justify-center border-2 ${getGradeColor(g.grade)}`}>{g.grade}</div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{g.subjectName}</p>
                      <p className="text-[11px] text-slate-400">{new Date(g.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</p>
                    </div>
                  </div>
                    <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                      +{g.grade === 5 ? 5 : g.grade === 4 ? 2 : 0} <Star size={11} className="fill-amber-400" />
                    </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <p className="text-xs font-bold text-slate-500 mb-2">Как начисляются звёзды</p>
          <div className="flex gap-3 text-xs flex-wrap">
            <span><span className="font-bold text-green-600">5</span> = +5 ⭐</span>
            <span><span className="font-bold text-blue-600">4</span> = +2 ⭐</span>
            <span><span className="font-bold text-amber-600">3</span> = +0 ⭐</span>
            <span><span className="font-bold text-red-600">2</span> = +0 ⭐</span>
          </div>
        </section>
      </main>
    </div>
  );
}
