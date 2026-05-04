"use client";

import { useState, useEffect } from "react";
import { Star, Check, X } from "lucide-react";

interface Subject { id: string; name: string; order: number; }
interface Grade { id: string; subjectName: string; grade: number; starsAwarded: number; createdAt: string; }

interface GradeInputProps {
  childId: string;
  onGradeAdded?: () => void;
}

export default function GradeInput({ childId, onGradeAdded }: GradeInputProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<5 | 4 | 3 | 2>(5);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const res = await fetch('/api/grades');
      const data = await res.json();
      if (Array.isArray(data)) {
        setSubjects(data);
        if (data.length > 0) setSelectedSubject(data[0].name);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const addGrade = async () => {
    if (!selectedSubject) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          subjectName: selectedSubject,
          grade: selectedGrade,
          date: new Date().toISOString().split('T')[0]
        })
      });
      
      if (res.ok) {
        alert(`✅ Оценка ${selectedGrade} по предмету ${selectedSubject} добавлена!`);
        if (onGradeAdded) onGradeAdded();
      }
    } catch (error) {
      console.error('Error adding grade:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade === 5) return 'bg-green-100 text-green-700 border-green-300';
    if (grade === 4) return 'bg-blue-100 text-blue-700 border-blue-300';
    if (grade === 3) return 'bg-amber-100 text-amber-700 border-amber-300';
    return 'bg-red-100 text-red-700 border-red-300';
  };

  const getSupportText = (grade: number) => {
    if (grade === 5) return 'Отлично! Так держать! 🎉';
    if (grade === 4) return 'Хороший результат! 💪';
    if (grade === 3) return 'У тебя всё получится, главное стараться! Ты молодец! 🌟';
    return 'Не расстраивайся, завтра будет новый шанс! Ты герой! 🥊';
  };

  return (
    <div className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-6 shadow-sm border border-slate-100">
      <h2 className="text-xl md:text-2xl font-extrabold flex items-center gap-2 text-slate-800 mb-5 md:mb-6">
        <span className="text-xl md:text-2xl">📖</span> Добавить оценку
      </h2>

      <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="flex-1 border border-slate-200 rounded-xl px-3 md:px-4 py-2.5 md:py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-sm md:text-base"
        >
          {subjects.map(subj => (
            <option key={subj.id} value={subj.name}>{subj.name}</option>
          ))}
        </select>

        <div className="flex gap-2">
          {[5, 4, 3, 2].map(grade => (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade as 5 | 4 | 3 | 2)}
              className={`w-12 h-12 md:w-14 md:h-14 rounded-xl font-extrabold text-lg md:text-xl border-2 transition-all ${
                selectedGrade === grade
                  ? getGradeColor(grade) + ' scale-110'
                  : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
              }`}
            >
              {grade}
            </button>
          ))}
        </div>

        <button
          onClick={addGrade}
          disabled={loading || !selectedSubject}
          className="bg-blue-500 text-white px-6 md:px-8 py-2.5 md:py-3 rounded-xl font-bold hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap text-sm md:text-base"
        >
          {loading ? 'Добавление...' : 'Добавить'}
        </button>
      </div>

      {selectedGrade && (
        <p className="mt-4 text-sm font-medium text-slate-600 bg-slate-50 p-3 rounded-xl">
          {getSupportText(selectedGrade)}
        </p>
      )}
    </div>
  );
}
