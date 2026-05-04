"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Star, CheckCircle, X } from 'lucide-react';

export default function TaskCard({ task, onComplete }: { task: any, onComplete: () => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subtasks, setSubtasks] = useState(task.subtasks || []);
  
  const allSubtasksDone = subtasks.length === 0 || subtasks.every((st: any) => st.done);
  const canComplete = !task.requireAllSubtasksDone || allSubtasksDone;

  const handleComplete = () => {
    if (!canComplete) {
      setIsModalOpen(true); // Форсированно открываем модалку, если нельзя завершить
      return;
    }
    
    // ВАУ-эффект конфетти
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#6366F1', '#EC4899']
    });
    
    setIsModalOpen(false);
    onComplete();
  };

  const toggleSubtask = (id: string) => {
    setSubtasks(subtasks.map((st: any) => st.id === id ? { ...st, done: !st.done } : st));
  };

  return (
    <>
      {/* Главная плашка задачи */}
      <motion.div 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex h-24 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        {/* Левая часть (1/3) - Информация */}
        <div className="w-1/3 p-4 flex flex-col justify-center">
          <h3 className="font-bold text-slate-800 line-clamp-2">{task.title}</h3>
          <div className="flex items-center text-amber-500 font-bold mt-1">
            <Star size={14} className="fill-amber-500 mr-1" />
            {task.stars}
          </div>
        </div>

        {/* Правая часть (2/3) - Яркая зона действия */}
        <div className={`w-2/3 flex items-center justify-center transition-colors ${task.completed ? 'bg-green-100' : 'bg-indigo-50 hover:bg-indigo-100'}`}>
           {task.completed ? (
             <CheckCircle size={40} className="text-green-500" />
           ) : (
             <div className="flex items-center text-indigo-500 font-bold text-lg">
               {task.subtasks?.length > 0 ? 'Открыть подзадачи' : 'Выполнить'}
             </div>
           )}
        </div>
      </motion.div>

      {/* Модальное окно подзадач */}
      <AnimatePresence>
        {isModalOpen && !task.completed && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
              
              <h2 className="text-2xl font-bold text-slate-800 mb-6">{task.title}</h2>
              
              {subtasks.length > 0 && (
                <div className="space-y-3 mb-8">
                  {subtasks.map((st: any) => (
                    <div 
                      key={st.id} 
                      onClick={() => toggleSubtask(st.id)}
                      className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${st.done ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-white'}`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 ${st.done ? 'border-green-500 bg-green-500' : 'border-slate-300'}`}>
                        {st.done && <CheckCircle size={16} className="text-white" />}
                      </div>
                      <span className={`font-medium ${st.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                        {st.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button 
                onClick={handleComplete}
                disabled={!canComplete}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${canComplete ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
              >
                {canComplete ? 'Завершить квест!' : 'Выполни все подзадачи'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}