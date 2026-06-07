"use client";

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Star, X, Circle, Check } from 'lucide-react';
import { getCategoryLabel } from '@/app/lib/reporting';

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
  customCategory?: string;
}

interface TaskCardProps {
  task: TaskData;
  onComplete: (taskId: string, difficulty?: 'easy' | 'normal' | 'hard') => void;
  onDetailsOpened: (taskId: string) => void;
  onSubtasksUpdate: (taskId: string, subtasks: Subtask[]) => void;
  onRevert?: (taskId: string) => void;
}

export default function TaskCard({ task, onComplete, onDetailsOpened, onSubtasksUpdate, onRevert }: TaskCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>(task.subtasks || []);
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [detailsOpened, setDetailsOpened] = useState(task.detailsOpened);

  useEffect(() => {
    setLocalSubtasks(task.subtasks || []);
    setDetailsOpened(task.detailsOpened);
  }, [task.id, task.subtasks, task.detailsOpened]);

  const allSubtasksDone = localSubtasks.length === 0 || localSubtasks.every(st => st.done);
  const subtasksEnabled = task.subtasksMode !== 'none' && localSubtasks.length > 0;
  const requiresDetails = task.requiresOpenDetails && !detailsOpened;
  const requiresSubtaskCompletion = task.requiresOpenDetails && subtasksEnabled && !allSubtasksDone;
  const needsFirstOpen = !detailsOpened && (task.requiresOpenDetails || subtasksEnabled);
  const cardSubtitle = useMemo(() => {
    if (requiresDetails) return 'Сначала открой условия квеста';
    if (requiresSubtaskCompletion) return detailsOpened ? 'Нужно закрыть все условия' : 'Есть обязательные условия';
    if (subtasksEnabled && !allSubtasksDone) return detailsOpened ? 'Условия можно пропустить' : 'Есть подзадачи';
    return '';
  }, [allSubtasksDone, detailsOpened, requiresDetails, requiresSubtaskCompletion, subtasksEnabled]);

  const handleClick = () => {
    if (!task.completed) {
      if (!needsFirstOpen && !requiresSubtaskCompletion) {
        completeTask();
        return;
      }
      setIsModalOpen(true);
    }
  };

  const completeTask = (difficulty?: 'easy' | 'normal' | 'hard') => {
    if (requiresSubtaskCompletion) return;

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3B82F6', '#F59E0B', '#10B981']
    });

    if (task.askDifficultyAfterDone && !difficulty) {
      setIsModalOpen(false);
      setShowDifficulty(true);
      return;
    }

    setIsModalOpen(false);
    setShowDifficulty(false);
    onComplete(task.id, difficulty);
  };

  const handleModalComplete = () => {
    if (!detailsOpened && subtasksEnabled && !task.requiresOpenDetails) {
      onDetailsOpened(task.id);
      setDetailsOpened(true);
      setIsModalOpen(false);
      return;
    }
    if (task.requiresOpenDetails && !detailsOpened) {
      onDetailsOpened(task.id);
      setDetailsOpened(true);
      if (!subtasksEnabled) setIsModalOpen(false);
      return;
    }
    if (requiresSubtaskCompletion) {
      setIsModalOpen(false);
      return;
    }
    completeTask();
  };

  const toggleSubtask = (id: string) => {
    const updated = localSubtasks.map(st =>
      st.id === id ? { ...st, done: !st.done } : st
    );
    setLocalSubtasks(updated);
    onSubtasksUpdate(task.id, updated);
    if (task.requiresOpenDetails && updated.length > 0 && updated.every(st => st.done)) {
      if (!detailsOpened) {
        setDetailsOpened(true);
        onDetailsOpened(task.id);
      }
      completeTask();
    }
  };

  const categoryLabel = getCategoryLabel(task.category, task.customCategory || '');

  return (
    <>
      <div
        data-task-id={task.id}
        className={`relative border rounded-2xl p-3 md:p-4 flex items-stretch gap-3 cursor-pointer transition-all ${
          task.completed
            ? 'border-green-200 bg-green-50'
            : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
        }`}
      >
        <button
          type="button"
          data-task-primary-action="true"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className={`w-7 h-7 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors mt-0.5 ${
            task.completed ? 'border-green-500 bg-green-500 text-white' : 'border-slate-300 text-slate-300 hover:border-blue-300 hover:text-blue-600'
          }`}
          aria-label={task.completed ? 'Задача выполнена' : 'Выполнить задачу'}
        >
          {task.completed ? <Check size={15} className="text-white" /> : <Circle size={14} />}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-start gap-2.5 md:gap-3">
            <div className="min-w-0 flex-1">
              <span className={`font-bold text-sm md:text-base transition-colors block leading-tight line-clamp-2 ${
              task.completed ? 'text-slate-400 line-through' : 'text-slate-700'
            }`}>
              {task.title}
            </span>
              {cardSubtitle && !task.completed && (
                <span className={`text-[11px] font-medium mt-1 block ${requiresDetails ? 'text-amber-500' : 'text-slate-400'}`}>
                  {requiresDetails ? '🔍 ' : ''}{cardSubtitle}
                </span>
              )}
              {task.difficulty && (
                <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">
                  Сложность: {task.difficulty === 'easy' ? 'Легко' : task.difficulty === 'normal' ? 'Нормально' : 'Сложно'}
                </span>
              )}
              {task.detailsText && (
                <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                  {task.detailsText}
                </span>
              )}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 font-extrabold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full text-[10px] md:text-[11px]">
              +{task.stars} <Star size={11} className="fill-amber-400" />
            </div>
            {task.completed && onRevert && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRevert(task.id);
                }}
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                aria-label="Отменить выполнение"
              >
                <X size={10} />
                Отменить
              </button>
            )}
          </div>
      </div>
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
              </div>

              <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 mt-3 mb-4 leading-tight">
                {task.title}
              </h2>

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
                          {st.done && <Check size={12} className="text-white" />}
                        </div>
                      ) : (
                        <div className="w-1.5 h-1.5 mt-2 bg-blue-400 rounded-full flex-shrink-0" />
                      )}
                      <span className={`text-sm leading-relaxed whitespace-pre-wrap ${
                        st.done ? 'text-slate-400 line-through' : 'text-slate-700'
                      }`}>
                        {st.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {task.requiresOpenDetails && !detailsOpened && (
                <button
                  onClick={() => {
                    setDetailsOpened(true);
                    onDetailsOpened(task.id);
                  }}
                  className="w-full mb-3 bg-amber-50 border-2 border-amber-200 text-amber-700 py-3 rounded-xl font-bold hover:bg-amber-100 transition-colors"
                >
                  ✅ Я прочитал(а) и понял(а) условия
                </button>
              )}

              <button
                onClick={handleModalComplete}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  allSubtasksDone
                    ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {task.requiresOpenDetails && !detailsOpened
                  ? 'Я прочитал(а)'
                  : task.requiresOpenDetails && subtasksEnabled && !allSubtasksDone
                    ? 'Закрыть'
                    : subtasksEnabled && !detailsOpened
                      ? 'Понятно'
                      : 'Завершить квест!'}
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
