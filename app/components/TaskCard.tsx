"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Star, X, AlertTriangle, CheckCircle } from 'lucide-react';

interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

interface TaskData {
  id: string;
  title: string;
  stars: number;
  completed: boolean;
  completedAt?: string;
  detailsOpened: boolean;
  requiresOpenDetails: boolean;
  detailsText?: string;
  subtasksMode: 'none' | 'checkboxes' | 'plain-list';
  subtasks: Subtask[];
  difficulty?: 'easy' | 'normal' | 'hard';
  askDifficultyAfterDone?: boolean;
  category?: string;
}

interface TaskCardProps {
  task: TaskData;
  onComplete: (taskId: string, difficulty?: 'easy' | 'normal' | 'hard') => void;
  onDetailsOpened: (taskId: string) => void;
  onSubtasksUpdate: (taskId: string, subtasks: Subtask[]) => void;
}

export default function TaskCard({ task, onComplete, onDetailsOpened, onSubtasksUpdate }: TaskCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(task.subtasks || []);
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  const allSubtasksDone = localSubtasks.length === 0 || localSubtasks.every(st => st.done);

  const handleClick = () => {
    if (task.completed) return;

    const needsModal = task.requiresOpenDetails || localSubtasks.length > 0;

    if (needsModal) {
      if (task.requiresOpenDetails && !task.detailsOpened) {
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 1200);
      }
      setIsModalOpen(true);
      return;
    }

    completeTask();
  };

  const completeTask = (difficulty?: 'easy' | 'normal' | 'hard') => {
    if (!allSubtasksDone) return;

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3B82F6', '#F59E0B', '#10B981']
    });

    if (task.askDifficultyAfterDone && !difficulty) {
      setJustCompleted(true);
      setShowDifficulty(true);
      return;
    }

    setIsModalOpen(false);
    setShowDifficulty(false);
    onComplete(task.id, difficulty);
  };

  const handleModalComplete = () => {
    if (!allSubtasksDone) return;
    if (task.requiresOpenDetails && !task.detailsOpened) {
      onDetailsOpened(task.id);
    }
    completeTask();
  };

  const toggleSubtask = (id: string) => {
    const updated = localSubtasks.map(st =>
      st.id === id ? { ...st, done: !st.done } : st
    );
    setLocalSubtasks(updated);
    onSubtasksUpdate(task.id, updated);
  };

  const needsModal = task.requiresOpenDetails || localSubtasks.length > 0;

  return (
    <>
      <div
        onClick={handleClick}
        className={`relative border rounded-2xl p-4 md:p-5 flex items-center justify-between cursor-pointer transition-all ${
          task.completed
            ? 'border-green-200 bg-green-50'
            : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
        }`}
      >
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
          <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full border-[3px] flex items-center justify-center flex-shrink-0 transition-colors ${
            task.completed ? 'border-green-500 bg-green-500' : 'border-slate-300'
          }`}>
            {task.completed && (
              <CheckCircle size={14} className="text-white" />
            )}
          </div>
          <div className="min-w-0">
            <span className={`font-bold text-base md:text-lg transition-colors block truncate ${
              task.completed ? 'text-slate-400 line-through' : 'text-slate-700'
            }`}>
              {task.title}
            </span>
            {task.requiresOpenDetails && !task.detailsOpened && !task.completed && (
              <span className="text-xs text-amber-500 font-medium mt-0.5 block">
                🔍 Требуется открыть условия
              </span>
            )}
            {task.difficulty && (
              <span className="text-xs text-slate-400 font-medium mt-0.5 block">
                Сложность: {task.difficulty === 'easy' ? 'Легко' : task.difficulty === 'normal' ? 'Нормально' : 'Сложно'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {needsModal && !task.completed && (
            <span className="text-xs text-blue-400 font-medium">
              Подробнее
            </span>
          )}
          <div className="flex items-center gap-1 font-extrabold text-amber-500 bg-amber-50 px-2.5 py-1 rounded-lg text-sm md:text-base">
            +{task.stars} <Star size={14} className="fill-amber-400" />
          </div>
        </div>

        <AnimatePresence>
          {showWarning && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-sm"
            >
              <AlertTriangle size={12} className="inline mr-1" />
              Сначала открой условия квеста 🙂
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Task Modal */}
      <AnimatePresence>
        {isModalOpen && !task.completed && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl relative"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>

              <div className="flex items-center gap-3 mb-1">
                <div className="font-extrabold text-amber-500 bg-amber-50 px-2.5 py-1 rounded-lg text-sm flex items-center gap-1">
                  +{task.stars} <Star size={14} className="fill-amber-400" />
                </div>
                {task.category && (
                  <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-lg capitalize">
                    {task.category}
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-extrabold text-slate-800 mt-3 mb-4">{task.title}</h2>

              {task.detailsText && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5">
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{task.detailsText}</p>
                </div>
              )}

              {localSubtasks.length > 0 && (
                <div className="space-y-2 mb-6">
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                    {task.subtasksMode === 'checkboxes' ? 'Подзадачи' : 'Инструкции'}
                  </p>
                  {localSubtasks.map(st => (
                    <div
                      key={st.id}
                      onClick={() => task.subtasksMode === 'checkboxes' && toggleSubtask(st.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                        task.subtasksMode === 'checkboxes'
                          ? st.done
                            ? 'bg-green-50 border border-green-200 cursor-pointer'
                            : 'bg-slate-50 border border-slate-100 cursor-pointer hover:border-blue-200'
                          : 'bg-slate-50 border border-slate-100'
                      }`}
                    >
                      {task.subtasksMode === 'checkboxes' ? (
                        <div className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          st.done ? 'border-green-500 bg-green-500' : 'border-slate-300'
                        }`}>
                          {st.done && <CheckCircle size={12} className="text-white" />}
                        </div>
                      ) : (
                        <div className="w-1.5 h-1.5 mt-2 bg-blue-400 rounded-full flex-shrink-0" />
                      )}
                      <span className={`text-sm leading-relaxed ${
                        st.done ? 'text-slate-400 line-through' : 'text-slate-700'
                      }`}>
                        {st.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {task.requiresOpenDetails && !task.detailsOpened && (
                <button
                  onClick={() => {
                    onDetailsOpened(task.id);
                  }}
                  className="w-full mb-3 bg-amber-50 border-2 border-amber-200 text-amber-700 py-3 rounded-xl font-bold hover:bg-amber-100 transition-colors"
                >
                  ✅ Я прочитал(а) и понял(а) условия
                </button>
              )}

              <button
                onClick={handleModalComplete}
                disabled={(task.subtasksMode === 'checkboxes' && !allSubtasksDone)}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  allSubtasksDone
                    ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-200'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {allSubtasksDone ? 'Завершить квест!' : 'Выполни все подзадачи'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Difficulty selector */}
      <AnimatePresence>
        {showDifficulty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center"
            >
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">Квест завершён! 🎉</h3>
              <p className="text-slate-500 mb-6">Как тебе было?</p>
              <div className="flex gap-3">
                {[
                  { key: 'easy' as const, label: 'Легко', emoji: '😊', color: 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200' },
                  { key: 'normal' as const, label: 'Нормально', emoji: '💪', color: 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200' },
                  { key: 'hard' as const, label: 'Сложно', emoji: '🔥', color: 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setShowDifficulty(false);
                      setJustCompleted(false);
                      setIsModalOpen(false);
                      onComplete(task.id, opt.key);
                    }}
                    className={`flex-1 py-4 rounded-2xl font-bold text-base border-2 transition-all ${opt.color}`}
                  >
                    <div className="text-2xl mb-1">{opt.emoji}</div>
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
