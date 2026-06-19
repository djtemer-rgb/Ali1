"use client";

import { useState, useEffect, useRef } from "react";
import { Star, Home as HomeIcon, BookOpen, BarChart3, Sparkles, X, Award } from "lucide-react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useChild } from "@/app/lib/ChildContext";
import TaskCard from "./components/TaskCard";
import HeroMessage from "./components/HeroMessage";
import StarHistoryModal from "./components/StarHistoryModal";
import PinModal from "./components/PinModal";
import { buildTaskCompletionBundle, formatRewardReserveLabel, formatStarAmount } from "@/app/lib/reporting";
import { getChildSettings } from "@/app/lib/settings-shared";

interface Task {
  id: string; templateId?: string; title: string; stars: number; completed: boolean; completedAt?: string;
  subtasksMode: 'none' | 'checkboxes' | 'plain-list'; subtasks: { id: string; title: string; done: boolean }[];
  requiresOpenDetails: boolean; detailsOpened: boolean; detailsText?: string; oneTimeDate?: string | null;
  difficulty?: 'easy' | 'normal' | 'hard'; askDifficultyAfterDone?: boolean; category?: string; customCategory?: string;
  createdAt?: string; updatedAt?: string;
}
interface Reward { id: string; title: string; description?: string; costStars: number; icon: string; image?: string | null; }
interface TaskTemplate { id: string; title: string; category: string; repeatDays: number[]; stars: number; oneTimeDate?: string; sortOrder?: number; createdAt?: string; }

const DAY_NAMES_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function getNextRepeatInfo(template: Pick<TaskTemplate, 'repeatDays' | 'oneTimeDate'>, from = new Date()) {
  if (!Array.isArray(template.repeatDays) || template.repeatDays.length === 0) {
    const oneTimeDate = normalizeDate(template.oneTimeDate);
    if (oneTimeDate) {
      const todayKey = from.toISOString().split('T')[0];
      if (oneTimeDate === todayKey) {
        return { label: 'Сегодня', date: from.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) };
      }
      return { label: 'Одноразово', date: oneTimeDate };
    }
    return { label: 'Одноразово', date: '' };
  }

  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  const currentDay = today.getDay();
  const sorted = DAY_ORDER.filter((day) => template.repeatDays.includes(day));
  const todayIncluded = sorted.includes(currentDay);

  if (todayIncluded) {
    return { label: 'Сегодня', date: today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) };
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + offset);
    if (template.repeatDays.includes(candidate.getDay())) {
      return {
        label: DAY_NAMES_SHORT[candidate.getDay()],
        date: candidate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      };
    }
  }

  return { label: 'По графику', date: '' };
}

function normalizeDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split('T')[0];
}

function getRewardOrder(reward: any, childId: string) {
  return Number.isFinite(Number(reward?.sortOrderByChild?.[childId]))
    ? Number(reward.sortOrderByChild[childId])
    : Number.isFinite(Number(reward?.sortOrderByChild?.both))
      ? Number(reward.sortOrderByChild.both)
      : 9999;
}

function sortTasksByTemplateOrder(tasks: Task[], templates: TaskTemplate[]) {
  const templateOrder = new Map(
    templates.map((template) => [
      template.id,
      Number.isFinite(Number(template.sortOrder)) ? Number(template.sortOrder) : 9999,
    ]),
  );

  return [...tasks].sort((a, b) => {
    const orderA = a.templateId && templateOrder.has(a.templateId)
      ? Number(templateOrder.get(a.templateId))
      : 9999;
    const orderB = b.templateId && templateOrder.has(b.templateId)
      ? Number(templateOrder.get(b.templateId))
      : 9999;
    if (orderA !== orderB) return orderA - orderB;

    const timeA = new Date(a.oneTimeDate || a.completedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.oneTimeDate || b.completedAt || b.createdAt || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;

    return String(a.title || '').localeCompare(String(b.title || ''), 'ru');
  });
}

function getScheduleSortKey(template: Pick<TaskTemplate, 'repeatDays' | 'oneTimeDate' | 'sortOrder' | 'createdAt'>, from = new Date()) {
  const repeatDays = Array.isArray(template.repeatDays) ? template.repeatDays : [];
  if (repeatDays.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  const currentDay = today.getDay();

  if (repeatDays.includes(currentDay)) {
    return today.getTime();
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const candidate = new Date(today);
    candidate.setDate(today.getDate() + offset);
    if (repeatDays.includes(candidate.getDay())) {
      return candidate.getTime();
    }
  }

  const oneTimeDate = template.oneTimeDate ? new Date(template.oneTimeDate) : null;
  if (oneTimeDate && !Number.isNaN(oneTimeDate.getTime())) {
    return oneTimeDate.getTime();
  }

  return Number.POSITIVE_INFINITY;
}

function sortScheduleTemplates(list: TaskTemplate[]) {
  return [...list].sort((a, b) => {
    const orderA = getScheduleSortKey(a);
    const orderB = getScheduleSortKey(b);
    if (orderA !== orderB) return orderA - orderB;

    const manualA = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : 9999;
    const manualB = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 9999;
    if (manualA !== manualB) return manualA - manualB;

    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });
}

const playMagicSound = () => {
  if (typeof window === "undefined") return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      gain.gain.setValueAtTime(0.12, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.4);
    });
  } catch (e) {
    console.error('Audio play error:', e);
  }
};

const playSuccessSound = () => {
  if (typeof window === "undefined") return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    // Joyful Success Chime
    const notes = [587.33, 659.25, 698.46, 880.00, 1046.50]; // D5, E5, F5, A5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      
      gain.gain.setValueAtTime(0.15, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.45);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.5);
    });

    // Whistle/sweep frequency rising
    const oscSweep = ctx.createOscillator();
    const gainSweep = ctx.createGain();
    
    oscSweep.type = 'sine';
    oscSweep.frequency.setValueAtTime(550, now);
    oscSweep.frequency.exponentialRampToValueAtTime(1600, now + 0.28);
    
    gainSweep.gain.setValueAtTime(0.06, now);
    gainSweep.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    
    oscSweep.connect(gainSweep);
    gainSweep.connect(ctx.destination);
    oscSweep.start(now);
    oscSweep.stop(now + 0.3);
  } catch (e) {
    console.error('Audio play error:', e);
  }
};

const playTriumphSound = () => {
  if (typeof window === "undefined") return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    // Magical harp arpeggio (C major 7 / 9)
    const notes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1318.51, 1567.98]; // C5, E5, G5, B5, D6, E6, G6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      
      gain.gain.setValueAtTime(0.1, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.95);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 1.0);
    });
  } catch (e) {
    console.error('Audio play error:', e);
  }
};

const playRewardOpenSound = () => {
  if (typeof window === "undefined") return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    // Pentatonic ascending arpeggio for a magical opening feeling
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C4, E4, G4, C5, E5, G5, C6, E6, G6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);
      
      gain.gain.setValueAtTime(0.08, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.75);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.85);
    });

    // Warm sub-bass glide for opening impact
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130.81, now); // C3
    subOsc.frequency.exponentialRampToValueAtTime(329.63, now + 0.35); // E4
    subGain.gain.setValueAtTime(0.08, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.4);
  } catch (e) {
    console.error('Audio play error:', e);
  }
};

function getTextColorClass(color: string = 'blue') {
  const c = color.toLowerCase();
  switch (c) {
    case 'blue': return 'text-blue-700 font-extrabold';
    case 'orange': return 'text-orange-700 font-extrabold';
    case 'red': return 'text-red-700 font-extrabold';
    case 'purple': return 'text-purple-700 font-extrabold';
    case 'green': return 'text-emerald-700 font-extrabold';
    case 'teal': return 'text-teal-700 font-extrabold';
    case 'pink': return 'text-pink-700 font-extrabold';
    case 'yellow': return 'text-amber-800 font-extrabold';
    case 'cyan': return 'text-cyan-700 font-extrabold';
    case 'indigo': return 'text-indigo-700 font-extrabold';
    default: return 'text-slate-700 font-extrabold';
  }
}

function getBadgeStyleClasses(color: string = 'blue') {
  const c = color.toLowerCase();
  switch (c) {
    case 'blue': return 'bg-blue-100 text-blue-800 border border-blue-200 shadow-sm';
    case 'orange': return 'bg-orange-100 text-orange-800 border border-orange-200 shadow-sm';
    case 'red': return 'bg-red-100 text-red-800 border border-red-200 shadow-sm';
    case 'purple': return 'bg-purple-100 text-purple-800 border border-purple-200 shadow-sm';
    case 'green': return 'bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm';
    case 'teal': return 'bg-teal-100 text-teal-800 border border-teal-200 shadow-sm';
    case 'pink': return 'bg-pink-100 text-pink-800 border border-pink-200 shadow-sm';
    case 'yellow': return 'bg-amber-100 text-amber-900 border border-amber-200 shadow-sm';
    case 'cyan': return 'bg-cyan-100 text-cyan-800 border border-cyan-200 shadow-sm';
    case 'indigo': return 'bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-sm';
    default: return 'bg-slate-100 text-slate-800 border border-slate-200 shadow-sm';
  }
}

function getLockedQuestionMarkColor(color: string = 'blue') {
  const c = color.toLowerCase();
  switch (c) {
    case 'blue': return 'text-blue-500/85 drop-shadow-[0_2px_8px_rgba(59,130,246,0.6)]';
    case 'orange': return 'text-orange-500/85 drop-shadow-[0_2px_8px_rgba(249,115,22,0.6)]';
    case 'red': return 'text-red-500/85 drop-shadow-[0_2px_8px_rgba(239,68,68,0.6)]';
    case 'purple': return 'text-purple-500/85 drop-shadow-[0_2px_8px_rgba(168,85,247,0.6)]';
    case 'green': return 'text-emerald-500/85 drop-shadow-[0_2px_8px_rgba(16,185,129,0.6)]';
    case 'teal': return 'text-teal-500/85 drop-shadow-[0_2px_8px_rgba(20,184,166,0.6)]';
    case 'pink': return 'text-pink-500/85 drop-shadow-[0_2px_8px_rgba(236,72,153,0.6)]';
    case 'yellow': return 'text-amber-500/85 drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]';
    case 'cyan': return 'text-cyan-500/85 drop-shadow-[0_2px_8px_rgba(6,182,212,0.6)]';
    case 'indigo': return 'text-indigo-500/85 drop-shadow-[0_2px_8px_rgba(99,102,241,0.6)]';
    default: return 'text-slate-400/85 drop-shadow-[0_2px_8px_rgba(148,163,184,0.5)]';
  }
}

function getLockedRadialGradient(color: string = 'blue') {
  const c = color.toLowerCase();
  switch (c) {
    case 'blue': return 'rgba(59,130,246,0.3)';
    case 'orange': return 'rgba(249,115,22,0.3)';
    case 'red': return 'rgba(239,68,68,0.3)';
    case 'purple': return 'rgba(168,85,247,0.3)';
    case 'green': return 'rgba(16,185,129,0.3)';
    case 'teal': return 'rgba(20,184,166,0.3)';
    case 'pink': return 'rgba(236,72,153,0.3)';
    case 'yellow': return 'rgba(245,158,11,0.3)';
    case 'cyan': return 'rgba(6,182,212,0.3)';
    case 'indigo': return 'rgba(99,102,241,0.3)';
    default: return 'rgba(148,163,184,0.15)';
  }
}

function getLockedConicColors(color: string = 'blue') {
  const c = color.toLowerCase();
  switch (c) {
    case 'blue': return 'rgba(59,130,246,0.4)';
    case 'orange': return 'rgba(249,115,22,0.4)';
    case 'red': return 'rgba(239,68,68,0.4)';
    case 'purple': return 'rgba(168,85,247,0.4)';
    case 'green': return 'rgba(16,185,129,0.4)';
    case 'teal': return 'rgba(20,184,166,0.4)';
    case 'pink': return 'rgba(236,72,153,0.4)';
    case 'yellow': return 'rgba(245,158,11,0.4)';
    case 'cyan': return 'rgba(6,182,212,0.4)';
    case 'indigo': return 'rgba(99,102,241,0.4)';
    default: return 'rgba(148,163,184,0.25)';
  }
}

function getCardStyleClasses(color: string = 'blue', isUnlocked: boolean) {
  const c = color.toLowerCase();
  
  if (isUnlocked) {
    switch (c) {
      case 'blue': return 'border-2 border-blue-500 bg-gradient-to-br from-[#E0F2FE] via-[#BAE6FD] to-[#38BDF8]/40 hover:shadow-[0_8px_24px_rgba(56,189,248,0.35)] hover:border-blue-600';
      case 'orange': return 'border-2 border-orange-500 bg-gradient-to-br from-[#FFE7D3] via-[#FFD3B4] to-[#FFA768]/40 hover:shadow-[0_8px_24px_rgba(249,115,22,0.35)] hover:border-orange-600';
      case 'red': return 'border-2 border-red-500 bg-gradient-to-br from-[#FFE4E6] via-[#FECDD3] to-[#FDA4AF]/40 hover:shadow-[0_8px_24px_rgba(239,68,68,0.35)] hover:border-red-600';
      case 'purple': return 'border-2 border-purple-500 bg-gradient-to-br from-[#F3E8FF] via-[#E9D5FF] to-[#D8B4FE]/40 hover:shadow-[0_8px_24px_rgba(168,85,247,0.35)] hover:border-purple-600';
      case 'green': return 'border-2 border-emerald-500 bg-gradient-to-br from-[#D1FAE5] via-[#A7F3D0] to-[#6EE7B7]/40 hover:shadow-[0_8px_24px_rgba(16,185,129,0.35)] hover:border-emerald-600';
      case 'teal': return 'border-2 border-teal-500 bg-gradient-to-br from-[#CCFBF1] via-[#99F6E4] to-[#5EEAD4]/40 hover:shadow-[0_8px_24px_rgba(20,184,166,0.35)] hover:border-teal-600';
      case 'pink': return 'border-2 border-pink-500 bg-gradient-to-br from-[#FCE7F3] via-[#FBCFE8] to-[#F9A8D4]/40 hover:shadow-[0_8px_24px_rgba(236,72,153,0.35)] hover:border-pink-600';
      case 'yellow': return 'border-2 border-amber-500 bg-gradient-to-br from-[#FEF3C7] via-[#FDE68A] to-[#FCD34D]/40 hover:shadow-[0_8px_24px_rgba(245,158,11,0.35)] hover:border-amber-600';
      case 'cyan': return 'border-2 border-cyan-500 bg-gradient-to-br from-[#E0F7FA] via-[#B2EBF2] to-[#80DEEA]/40 hover:shadow-[0_8px_24px_rgba(6,182,212,0.35)] hover:border-cyan-600';
      case 'indigo': return 'border-2 border-indigo-500 bg-gradient-to-br from-[#E0E7FF] via-[#C7D2FE] to-[#93C5FD]/40 hover:shadow-[0_8px_24px_rgba(99,102,241,0.35)] hover:border-indigo-600';
      default: return 'border-2 border-slate-350 bg-gradient-to-br from-[#F1F5F9] to-[#E2E8F0] hover:shadow-[0_8px_24px_rgba(71,85,105,0.2)] hover:border-slate-450';
    }
  } else {
    // Locked card styles: gradient of color series but faded, desaturated and border-dashed
    switch (c) {
      case 'blue': return 'border-2 border-dashed border-blue-400 bg-gradient-to-br from-[#F0F9FF] to-[#DBEAFE] hover:border-blue-500';
      case 'orange': return 'border-2 border-dashed border-orange-400 bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5] hover:border-orange-500';
      case 'red': return 'border-2 border-dashed border-red-400 bg-gradient-to-br from-[#FFF5F5] to-[#FFE4E6] hover:border-red-500';
      case 'purple': return 'border-2 border-dashed border-purple-400 bg-gradient-to-br from-[#FAF5FF] to-[#F3E8FF] hover:border-purple-500';
      case 'green': return 'border-2 border-dashed border-emerald-400 bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] hover:border-emerald-500';
      case 'teal': return 'border-2 border-dashed border-teal-400 bg-gradient-to-br from-[#F0FDFA] to-[#CCFBF1] hover:border-teal-500';
      case 'pink': return 'border-2 border-dashed border-pink-400 bg-gradient-to-br from-[#DFE7F6] to-[#FCE7F3] hover:border-pink-500';
      case 'yellow': return 'border-2 border-dashed border-amber-400 bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] hover:border-amber-500';
      case 'cyan': return 'border-2 border-dashed border-cyan-400 bg-gradient-to-br from-[#E0F7FA] to-[#E0F7FA]/60 hover:border-cyan-500';
      case 'indigo': return 'border-2 border-dashed border-indigo-400 bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] hover:border-indigo-500';
      default: return 'border-2 border-dashed border-slate-400 bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] hover:border-slate-500';
    }
  }
}

function getConicGradient1(color: string = 'blue') {
  const c = color.toLowerCase();
  switch (c) {
    case 'blue': return 'conic-gradient(from 0deg, #3b82f6 0%, #ffffff 25%, #60a5fa 50%, #ffffff 75%, #3b82f6 100%)';
    case 'orange': return 'conic-gradient(from 0deg, #f97316 0%, #ffffff 25%, #fbbf24 50%, #ffffff 75%, #f97316 100%)';
    case 'red': return 'conic-gradient(from 0deg, #ef4444 0%, #ffffff 25%, #f43f5e 50%, #ffffff 75%, #ef4444 100%)';
    case 'purple': return 'conic-gradient(from 0deg, #a855f7 0%, #ffffff 25%, #ec4899 50%, #ffffff 75%, #a855f7 100%)';
    case 'green': return 'conic-gradient(from 0deg, #10b981 0%, #ffffff 25%, #34d399 50%, #ffffff 75%, #10b981 100%)';
    case 'teal': return 'conic-gradient(from 0deg, #14b8a6 0%, #ffffff 25%, #2dd4bf 50%, #ffffff 75%, #14b8a6 100%)';
    case 'pink': return 'conic-gradient(from 0deg, #ec4899 0%, #ffffff 25%, #f472b6 50%, #ffffff 75%, #ec4899 100%)';
    case 'yellow': return 'conic-gradient(from 0deg, #f59e0b 0%, #ffffff 25%, #fcd34d 50%, #ffffff 75%, #f59e0b 100%)';
    case 'cyan': return 'conic-gradient(from 0deg, #06b6d4 0%, #ffffff 25%, #22d3ee 50%, #ffffff 75%, #06b6d4 100%)';
    case 'indigo': return 'conic-gradient(from 0deg, #6366f1 0%, #ffffff 25%, #818cf8 50%, #ffffff 75%, #6366f1 100%)';
    default: return 'conic-gradient(from 0deg, #64748b 0%, #ffffff 25%, #94a3b8 50%, #ffffff 75%, #64748b 100%)';
  }
}

function getConicGradient2(color: string = 'blue') {
  const c = color.toLowerCase();
  switch (c) {
    case 'blue': return 'conic-gradient(from 0deg, #93c5fd 0%, #ffffff 15%, #3b82f6 30%, #ffffff 50%, #60a5fa 70%, #ffffff 85%, #93c5fd 100%)';
    case 'orange': return 'conic-gradient(from 0deg, #fed7aa 0%, #ffffff 15%, #f97316 30%, #ffffff 50%, #fbbf24 70%, #ffffff 85%, #fed7aa 100%)';
    case 'red': return 'conic-gradient(from 0deg, #fecdd3 0%, #ffffff 15%, #ef4444 30%, #ffffff 50%, #f43f5e 70%, #ffffff 85%, #fecdd3 100%)';
    case 'purple': return 'conic-gradient(from 0deg, #e9d5ff 0%, #ffffff 15%, #a855f7 30%, #ffffff 50%, #ec4899 70%, #ffffff 85%, #e9d5ff 100%)';
    case 'green': return 'conic-gradient(from 0deg, #a7f3d0 0%, #ffffff 15%, #10b981 30%, #ffffff 50%, #34d399 70%, #ffffff 85%, #a7f3d0 100%)';
    case 'teal': return 'conic-gradient(from 0deg, #99f6e4 0%, #ffffff 15%, #14b8a6 30%, #ffffff 50%, #2dd4bf 70%, #ffffff 85%, #99f6e4 100%)';
    case 'pink': return 'conic-gradient(from 0deg, #fbcfe8 0%, #ffffff 15%, #ec4899 30%, #ffffff 50%, #f472b6 70%, #ffffff 85%, #fbcfe8 100%)';
    case 'yellow': return 'conic-gradient(from 0deg, #fde68a 0%, #ffffff 15%, #f59e0b 30%, #ffffff 50%, #fcd34d 70%, #ffffff 85%, #fde68a 100%)';
    case 'cyan': return 'conic-gradient(from 0deg, #b2ebf2 0%, #ffffff 15%, #06b6d4 30%, #ffffff 50%, #22d3ee 70%, #ffffff 85%, #b2ebf2 100%)';
    case 'indigo': return 'conic-gradient(from 0deg, #c7d2fe 0%, #ffffff 15%, #6366f1 30%, #ffffff 50%, #818cf8 70%, #ffffff 85%, #c7d2fe 100%)';
    default: return 'conic-gradient(from 0deg, #cbd5e1 0%, #ffffff 15%, #64748b 30%, #ffffff 50%, #94a3b8 70%, #ffffff 85%, #cbd5e1 100%)';
  }
}

export default function Home() {
  const { currentChild, switchChild } = useChild();
  const [stars, setStars] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingRewards, setLoadingRewards] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showStarHistory, setShowStarHistory] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [gradesEnabled, setGradesEnabled] = useState(true);
  const [currencyEnabled, setCurrencyEnabled] = useState(true);
  const [reserveStars, setReserveStars] = useState(0);
  const [showAvatarZoom, setShowAvatarZoom] = useState(false);
  const [bonusAllTasksToday, setBonusAllTasksToday] = useState(5);

  // Streak Rewards States
  const [streakRewards, setStreakRewards] = useState<any[]>([]);
  const [streakProgress, setStreakProgress] = useState<any>({ currentStreak: 0, lastCompletedDate: '', earned: {} });
  const [showStreakRewardsModal, setShowStreakRewardsModal] = useState(false);
  const [zoomedReward, setZoomedReward] = useState<any | null>(null);
  const [earnedStreakReward, setEarnedStreakReward] = useState<any | null>(null);
  const [rewardsTestMode, setRewardsTestMode] = useState(false);
  const isZoomedUnlocked = zoomedReward ? (rewardsTestMode || (streakProgress.earned?.[zoomedReward.id] || 0) > 0) : false;
  const [animationStep, setAnimationStep] = useState<'idle' | 'award' | 'fly'>('idle');
  const [flyCoords, setFlyCoords] = useState({ x: 0, y: 0 });
  const [animateNavButton, setAnimateNavButton] = useState(false);
  const animatingCardRef = useRef<HTMLDivElement>(null);
  const [freezeRestoreDays, setFreezeRestoreDays] = useState(5);

  useEffect(() => {
    document.cookie.split('; ').find(c => c.startsWith('parent-session=')) ? setIsLoggedIn(true) : setIsLoggedIn(false);

    if (typeof window !== 'undefined') {
      const isDemo = window.location.search.includes('demo=1') || localStorage.getItem('aq:rewards-test-mode') === 'true';
      if (isDemo) {
        localStorage.setItem('aq:rewards-test-mode', 'true');
        setRewardsTestMode(true);
        setShowStreakRewardsModal(true);
      }
    }
  }, []);

  useEffect(() => {
    const doLoad = async () => {
      const today = new Date().toISOString().split('T')[0];
      setLoadingTasks(true); setLoadingRewards(true);
      try {
        const [tasksRes, starsRes, rewardsRes, tplRes, rewardStatusRes, streakRewRes, streakProgRes] = await Promise.all([
          fetch(`/api/tasks/day?childId=${currentChild.id}&date=${today}`),
          fetch(`/api/star-ledger?childId=${currentChild.id}`),
          fetch(`/api/rewards?childId=${currentChild.id}`),
          fetch(`/api/tasks/templates`),
          fetch(`/api/rewards/status?childId=${currentChild.id}`),
          fetch('/api/streak-rewards'),
          fetch(`/api/streak/progress?childId=${currentChild.id}&date=${today}`)
        ]);
        const [tasksData, starsData, rewardsData, tplData, rewardStatusData, streakRewData, streakProgData] = await Promise.all([
          tasksRes.json(), starsRes.json(), rewardsRes.json(), tplRes.json(), rewardStatusRes.json(), streakRewRes.json(), streakProgRes.json()
        ]);
        const settingsRes = await fetch('/api/settings');
        const settingsData = await settingsRes.json();
        if (settingsData?.freezeRestoreDays !== undefined) {
          setFreezeRestoreDays(settingsData.freezeRestoreDays);
        }
        const allTemplates = Array.isArray(tplData) ? tplData : [];
        const templateIds = new Set(allTemplates.map((template: any) => template.id));
        setTasks(Array.isArray(tasksData)
          ? sortTasksByTemplateOrder(
              tasksData.filter((task: any) => !task.templateId || templateIds.has(task.templateId)),
              Array.isArray(allTemplates) ? allTemplates : [],
            )
          : []);
        setStars(starsData.balance || 0);
        const childRewards = Array.isArray(rewardsData) ? rewardsData : [];
        const reserve = Array.isArray(rewardStatusData)
          ? rewardStatusData.reduce((sum: number, status: any) => {
              if (status?.status !== 'selected') return sum;
              const reward = childRewards.find((item: any) => item.id === status.rewardId);
              return sum + (Number(reward?.costStars) || 0);
            }, 0)
          : 0;
        setReserveStars(reserve);
        setRewards([...childRewards].sort((a: any, b: any) => getRewardOrder(a, currentChild.id) - getRewardOrder(b, currentChild.id)));
        setStreakRewards(Array.isArray(streakRewData) ? streakRewData : []);
        setStreakProgress(streakProgData || { currentStreak: 0, lastCompletedDate: '', earned: {} });
        const childSettings = getChildSettings(settingsData, currentChild.id);
        setGradesEnabled(childSettings.gradesEnabled ?? currentChild.id === 'ali');
        setCurrencyEnabled(settingsData?.currencyEnabled !== false);
        setBonusAllTasksToday(childSettings.bonusAllTasksToday ?? 5);
        setTemplates(Array.isArray(tplData)
          ? sortScheduleTemplates(tplData.filter((t: any) =>
              t.active !== false &&
              (t.childId === currentChild.id || t.childId === 'both') &&
              Array.isArray(t.repeatDays) &&
              t.repeatDays.length > 0
            ))
          : []);
      } catch (e) { console.error(e); }
      finally { setLoadingTasks(false); setLoadingRewards(false); }
    };
    doLoad();
  }, [currentChild.id]);

  useEffect(() => {
    if (typeof window !== 'undefined' && streakRewards.length > 0) {
      const trigger = localStorage.getItem('aq:trigger-test-animation');
      if (trigger === 'true') {
        localStorage.removeItem('aq:trigger-test-animation');
        setTimeout(() => {
          triggerTestAnimation();
        }, 600);
      }
    }
  }, [streakRewards]);

  const completeTask = async (taskId: string, difficulty?: 'easy' | 'normal' | 'hard') => {
    const today = new Date().toISOString().split('T')[0];
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.completed) return;

    const completion = buildTaskCompletionBundle(
      {
        ...task,
        completedAt: new Date().toISOString(),
        difficulty: difficulty || task.difficulty,
      },
      currentChild.name,
    );

    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, completed: true, completedAt: new Date().toISOString(), difficulty: difficulty || t.difficulty, detailsOpened: true } : t);
    setTasks(updatedTasks);
    const allDone = updatedTasks.every(t => t.completed);
    const isOneTimeTask = !!task.oneTimeDate;
    const bonusAmount = bonusAllTasksToday;

    // First save the task state, standard task ledger, and completion event concurrently
    await Promise.all([
      fetch(`/api/tasks/day?childId=${currentChild.id}&date=${today}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: currentChild.id, date: today, tasks: updatedTasks }) }),
      fetch('/api/star-ledger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: currentChild.id, amount: task.stars, source: 'task', sourceId: taskId, reason: completion.ledgerReason, details: completion.details }) }),
      fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: currentChild.id, type: 'task-completed', title: 'Задача выполнена', body: completion.eventBody, details: { ...completion.details, childName: currentChild.name } }) }),
    ]);

    // Then, if all tasks are done, save the day completion bonus and event sequentially to avoid race condition on aq:star-ledger
    if (allDone) {
      if (bonusAmount > 0) {
        await Promise.all([
          fetch('/api/star-ledger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              childId: currentChild.id,
              amount: bonusAmount,
              source: 'day-bonus',
              sourceId: today,
              reason: `Бонус за выполнение всех задач за день (+${bonusAmount} ⭐)`
            })
          }),
          fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              childId: currentChild.id,
              type: 'day-completed',
              title: 'День завершён',
              body: `${currentChild.name} выполнил все задачи на сегодня и получил дополнительно ${bonusAmount} ⭐! 🎉`
            })
          })
        ]);
      } else {
        await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId: currentChild.id,
            type: 'day-completed',
            title: 'День завершён',
            body: `${currentChild.name} выполнил все задачи на сегодня! 🎉`
          })
        });
      }

      // Call complete-day streak API
      try {
        const streakRes = await fetch('/api/streak/complete-day', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: currentChild.id, date: today })
        });
        const streakData = await streakRes.json();
        if (streakData.success) {
          setStreakProgress(prev => ({
            ...prev,
            currentStreak: streakData.newStreak,
            lastCompletedDate: today
          }));

          if (streakData.earnedReward) {
            setEarnedStreakReward(streakData.earnedReward);
            setAnimationStep('award');
            if (Number(streakData.earnedReward.bonusStars) > 0) {
              setStars(prev => prev + Number(streakData.earnedReward.bonusStars));
            }
            confetti({ particleCount: 180, spread: 100, origin: { y: 0.4 }, colors: ['#A78BFA', '#FBBF24', '#34D399', '#60A5FA'] });

            setTimeout(() => {
              const targetEl = document.getElementById("nav-item-streak-rewards");
              const cardEl = document.getElementById("animating-streak-card");
              if (targetEl && cardEl) {
                const targetRect = targetEl.getBoundingClientRect();
                const cardRect = cardEl.getBoundingClientRect();
                setFlyCoords({
                  x: (targetRect.left + targetRect.width / 2) - (cardRect.left + cardRect.width / 2),
                  y: (targetRect.top + targetRect.height / 2) - (cardRect.top + cardRect.height / 2)
                });
              }
            }, 100);

            setTimeout(() => {
              setAnimationStep('fly');
            }, 2200);

            setTimeout(async () => {
              setEarnedStreakReward(null);
              setAnimationStep('idle');
              setAnimateNavButton(true);
              setTimeout(() => setAnimateNavButton(false), 800);

              const progressRes = await fetch(`/api/streak/progress?childId=${currentChild.id}`);
              const progressData = await progressRes.json();
              setStreakProgress(progressData);
              confetti({ particleCount: 80, spread: 60, origin: { y: 0.2 } });
            }, 3000);
          }
        }
      } catch (err) {
        console.error('Failed to update streak progress:', err);
      }
    }

    if (isOneTimeTask && task.templateId) {
      try {
        const templatesRes = await fetch('/api/tasks/templates');
        const allTemplates = await templatesRes.json();
        if (Array.isArray(allTemplates)) {
          const updatedTemplates = allTemplates.map((template: any) => {
            if (template.id !== task.templateId) return template;
            const repeatDays = Array.isArray(template.repeatDays) ? template.repeatDays : [];
            if (repeatDays.length > 0) return template;
            return {
              ...template,
              active: false,
              inactiveAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          });
          await fetch('/api/tasks/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedTemplates),
          });
        }
      } catch (error) {
        console.error('Failed to archive one-time template:', error);
      }
    }

    setStars(prev => prev + task.stars + (allDone && bonusAmount > 0 ? bonusAmount : 0));
  };

  const handleDetailsOpened = async (taskId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, detailsOpened: true } : t);
    setTasks(updatedTasks);
    await fetch(`/api/tasks/day?childId=${currentChild.id}&date=${today}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: currentChild.id, date: today, tasks: updatedTasks }) });
  };

  const handleSubtasksUpdate = async (taskId: string, subtasks: any[]) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, subtasks } : t);
    setTasks(updatedTasks);
    await fetch(`/api/tasks/day?childId=${currentChild.id}&date=${today}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: currentChild.id, date: today, tasks: updatedTasks }) });
  };

  const triggerTestAnimation = () => {
    setShowStreakRewardsModal(false);
    
    const sampleReward = streakRewards.find(r => r.image) || streakRewards[0] || {
      id: 'test-reward',
      title: 'Пандочка — Бамбу',
      description: 'Выполняй все задачи 3 дня подряд!\nСерия: Базовые',
      emoji: '🐼',
      daysStreak: 3,
      bonusStars: 10,
      color: 'blue',
      image: '/images/rewards/1.png'
    };
    
    setEarnedStreakReward(sampleReward);
    setAnimationStep('award');
    
    confetti({ particleCount: 180, spread: 100, origin: { y: 0.4 }, colors: ['#A78BFA', '#FBBF24', '#34D399', '#60A5FA'] });

    setTimeout(() => {
      const targetEl = document.getElementById("nav-item-streak-rewards");
      const cardEl = document.getElementById("animating-streak-card");
      if (targetEl && cardEl) {
        const targetRect = targetEl.getBoundingClientRect();
        const cardRect = cardEl.getBoundingClientRect();
        setFlyCoords({
          x: (targetRect.left + targetRect.width / 2) - (cardRect.left + cardRect.width / 2),
          y: (targetRect.top + targetRect.height / 2) - (cardRect.top + cardRect.height / 2)
        });
      }
    }, 100);

    setTimeout(() => {
      setAnimationStep('fly');
    }, 2200);

    setTimeout(() => {
      setEarnedStreakReward(null);
      setAnimationStep('idle');
      setAnimateNavButton(true);
      setTimeout(() => setAnimateNavButton(false), 800);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.2 } });
    }, 3000);
  };

  const buyReward = async (reward: Reward) => {
    if (stars >= reward.costStars) {
      setStars(prev => prev - reward.costStars);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 }, colors: ['#8B5CF6', '#6366F1', '#F59E0B'] });
      await Promise.all([
        fetch('/api/star-ledger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: currentChild.id, amount: -reward.costStars, source: 'reward-purchase', sourceId: reward.id, reason: `Покупка награды: ${reward.title} (${formatStarAmount(-reward.costStars)})` }) }),
        fetch('/api/rewards/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: currentChild.id, rewardId: reward.id, status: 'selected' }) }),
        fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: currentChild.id, type: 'reward-selected', title: 'Награда выбрана', body: `${currentChild.name} выбрал награду: ${reward.title} (${formatStarAmount(-reward.costStars)})`, rewardId: reward.id, details: { childName: currentChild.name, rewardTitle: reward.title, costStars: reward.costStars, status: 'selected' } }) })
      ]);
    } else {
      setModalMessage(`Не хватает звёзд! Нужно ещё ${formatStarAmount(reward.costStars - stars)}`);
    }
  };

  const navItems = [
    { href: "/", label: "Главная", icon: HomeIcon },
    ...(gradesEnabled ? [{ href: "/grades", label: "Оценки", icon: BookOpen }] : []),
    { href: "#rewards", label: "Награды", icon: Award },
    { href: "#hero", label: "Послание героя", icon: Sparkles },
    { href: "/reports", label: "Отчёты", icon: BarChart3 },
  ];

  const isDevOrParent = isLoggedIn || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

  return (
    <div className="min-h-screen bg-[#F4F7FB] font-sans text-slate-800 pb-10">
      {/* FLOATING DEMO MODE BANNER */}
      {rewardsTestMode && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2.5 text-center text-xs font-bold flex items-center justify-center gap-3 shadow-md relative z-50">
          <span>🎭 Режим демонстрации наград активен (данные детей в безопасности)</span>
          <button
            onClick={() => {
              setRewardsTestMode(false);
              setShowStreakRewardsModal(false);
              if (typeof window !== 'undefined') {
                localStorage.removeItem('aq:rewards-test-mode');
                // Remove query param without refresh
                window.history.replaceState({}, document.title, window.location.pathname);
              }
            }}
            className="bg-white text-purple-700 px-3 py-1 rounded-lg hover:bg-slate-100 transition-colors text-[10px] font-black cursor-pointer shadow-sm"
          >
            Выйти из режима демо
          </button>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white px-4 md:px-6 py-3 md:py-4 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div
            onClick={() => setShowAvatarZoom(true)}
            className="w-9 h-9 md:w-11 md:h-11 bg-blue-500 text-white rounded-full flex items-center justify-center text-base md:text-lg font-bold shrink-0 overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200"
            title="Посмотреть фото"
          >
            {currentChild.avatarUrl ? (
              <img src={currentChild.avatarUrl} alt={currentChild.name} className="w-full h-full object-cover" />
            ) : (
              currentChild.letter
            )}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg md:text-xl font-extrabold text-slate-600">Привет,</span>
            <div className="relative">
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="text-lg md:text-xl font-extrabold text-slate-800 hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer">
                <AnimatePresence mode="popLayout">
                  <motion.span key={currentChild.id} initial={{ y: -15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 15, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="block">
                    {currentChild.name}!
                  </motion.span>
                </AnimatePresence>
                <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute top-full mt-1 left-0 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-50 min-w-[120px]">
                    {(["ali", "said"] as const).filter(id => id !== currentChild.id).map(id => (
                      <button key={id} onClick={() => { switchChild(id); setIsDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 cursor-pointer font-extrabold text-lg transition-colors">
                        {id === "ali" ? "Али" : "Саид"}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          {/* Hearts */}
          <div className="flex items-center gap-1 ml-2 self-center shrink-0" title={`Заморозки серии: ${streakProgress.freezeHearts !== undefined ? streakProgress.freezeHearts : 2} из 2 (восстановление раз в ${freezeRestoreDays} дн.)`}>
            {[1, 2].map((heartIndex) => {
              const activeHearts = streakProgress.freezeHearts !== undefined ? streakProgress.freezeHearts : 2;
              const isRed = heartIndex <= activeHearts;
              return (
                <span key={heartIndex} className="transition-transform duration-300 hover:scale-110">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill={isRed ? "#EF4444" : "#E2E8F0"}
                    stroke={isRed ? "#EF4444" : "#CBD5E1"}
                    strokeWidth="1.5"
                    className={`w-5 h-5 ${isRed ? "animate-pulse" : ""}`}
                  >
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowStarHistory(true)}
            className="relative bg-[#FEF3C7] border-2 border-[#FDE68A] text-[#D97706] px-3 py-1.5 rounded-xl font-extrabold text-sm md:text-base flex items-center gap-1.5 shadow-sm hover:bg-amber-100 transition-colors cursor-pointer">
            <Star className="fill-amber-400 text-amber-400 w-4 h-4" /> {stars}
          </button>
          {currencyEnabled && reserveStars > 0 && (
            <span className="bg-white/90 border border-amber-200 text-amber-500 px-2.5 py-1 rounded-xl font-extrabold text-sm md:text-base shadow-sm">
              {formatRewardReserveLabel(reserveStars, true, false)}
            </span>
          )}

          <button onClick={() => setShowPinModal(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
            title={isLoggedIn ? "Выйти" : "Войти"}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {isLoggedIn ? (
                <>
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                  <line x1="12" y1="2" x2="12" y2="12" />
                </>
              ) : (
                <>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </>
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* NAV */}
      <nav className="flex gap-2 px-4 md:px-6 py-3 md:py-4 overflow-x-auto no-scrollbar max-w-5xl mx-auto">
        {navItems.map(item => {
          if (item.href === "#hero") {
            return (
              <div key="hero" className="flex-shrink-0">
                <HeroMessage childId={currentChild.id} childName={currentChild.name} mode={currentChild.mode} tasks={tasks} />
              </div>
            );
          }
          if (item.href === "#rewards") {
            return (
              <button
                key="rewards"
                id="nav-item-streak-rewards"
                onClick={() => setShowStreakRewardsModal(true)}
                className={`bg-white text-slate-700 px-4 py-2.5 rounded-[14px] font-bold text-sm flex items-center gap-1.5 whitespace-nowrap shadow-sm hover:bg-slate-50 transition-all cursor-pointer ${
                  animateNavButton ? 'scale-110 ring-2 ring-yellow-400 bg-yellow-50 animate-bounce' : ''
                }`}
              >
                <item.icon size={16} className={animateNavButton ? 'text-yellow-500' : 'text-slate-400'} />
                {item.label}
                {streakProgress.currentStreak > 0 && (
                  <motion.span 
                    key={streakProgress.currentStreak}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 350, damping: 15 }}
                    className="ml-1 text-[11px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 font-extrabold flex items-center gap-0.5"
                  >
                    {streakProgress.currentStreak} 🔥
                  </motion.span>
                )}
              </button>
            );
          }
          return (
            <Link key={item.href} href={item.href}
              className="bg-white text-slate-700 px-4 py-2.5 rounded-[14px] font-bold text-sm flex items-center gap-1.5 whitespace-nowrap shadow-sm hover:bg-slate-50 transition-colors">
              <item.icon size={16} className="text-slate-400" /> {item.label}
            </Link>
          );
        })}
      </nav>

      {/* MAIN */}
      <main className="max-w-5xl mx-auto px-4 md:px-6 space-y-4">

        {/* ЗАДАЧИ НА СЕГОДНЯ */}
        <section id="today-tasks" className="bg-white rounded-[24px] p-4 md:p-5 shadow-sm border border-slate-100">
          <h2 className="text-lg md:text-xl font-extrabold flex items-center gap-2 text-slate-800 mb-4">
            <span>🚀</span> Задачи на сегодня
          </h2>
          <div className="space-y-2">
            {loadingTasks && <>{[1,2,3].map(i => <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />)}</>}
            {!loadingTasks && tasks.length === 0 && <p className="text-slate-400 text-center py-6 text-sm">Нет задач на сегодня</p>}
            {!loadingTasks && tasks.map(task => (
            <TaskCard key={task.id} task={task} onComplete={completeTask} onDetailsOpened={handleDetailsOpened} onSubtasksUpdate={handleSubtasksUpdate} />
          ))}
          </div>
        </section>

        {/* РАСПИСАНИЕ (read-only) */}
        {templates.length > 0 && (
          <section className="bg-white rounded-[24px] p-4 md:p-5 shadow-sm border border-slate-100">
            <h2 className="text-lg md:text-xl font-extrabold flex items-center gap-2 text-slate-800 mb-4">
              <span>📅</span> Расписание
            </h2>
            <div className="space-y-2">
              {templates.map(t => {
                const repeatInfo = getNextRepeatInfo(t);
                const currentTask = tasks.find(task => task.templateId === t.id);
                return (
                  <div
                    key={t.id}
                    className={`w-full flex items-start gap-3 bg-slate-50 rounded-2xl p-3 border border-slate-100 text-left transition-colors ${
                      currentTask?.completed ? 'bg-green-50 border-green-200' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span
                        className="font-bold text-slate-800 text-sm leading-tight block overflow-hidden"
                        style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}
                      >
                        {t.title}
                      </span>
                      {currentTask && (
                        <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${currentTask.completed ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                          {currentTask.completed ? 'Выполнена сегодня' : 'На сегодня'}
                        </span>
                      )}
                      {!currentTask && repeatInfo.label !== 'Сегодня' && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-500">
                          Откроется {repeatInfo.label}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 max-w-[55%]">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-600 whitespace-nowrap">
                        {repeatInfo.label}
                      </span>
                      {repeatInfo.date && (
                        <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                          {repeatInfo.date}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-amber-500 shrink-0 ml-1 whitespace-nowrap">+{t.stars} ⭐</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* МАГАЗИН НАГРАД */}
        <section className="bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] rounded-[24px] p-4 md:p-6 shadow-lg shadow-indigo-200">
          <h2 className="text-lg md:text-xl font-extrabold flex items-center gap-2 text-white mb-4">
            <span>🎁</span> Магазин наград
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,256px)] justify-center gap-3 auto-rows-[122px] grid-flow-row-dense w-full">
            {loadingRewards && <>{[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-white/15 animate-pulse" />)}</>}
            {!loadingRewards && rewards.map(reward => {
              const canAfford = stars >= reward.costStars;
              const hasImage = !!reward.image;
              return (
                <div
                  key={reward.id}
                  onClick={() => buyReward(reward)}
                  className={`group relative isolate overflow-hidden border rounded-2xl p-2 md:p-2.5 flex flex-col transition-all duration-500 cursor-pointer ${
                    hasImage ? 'row-span-2 h-full justify-between gap-1.5' : 'h-full justify-center gap-1'
                  } ${
                    canAfford
                      ? 'bg-white/30 border-white/45 hover:bg-white/35 hover:-translate-y-0.5 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_9px_20px_rgba(251,191,36,0.10)]'
                      : 'bg-white/7 border-white/12 opacity-80 hover:bg-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_7px_16px_rgba(96,165,250,0.05)]'
                  }`}
                >
                  <div
                    className={`pointer-events-none absolute inset-[1px] rounded-[1rem] ${
                      canAfford
                        ? 'bg-[linear-gradient(115deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_18%,rgba(255,255,255,0.01)_40%,rgba(255,255,255,0.04)_66%,rgba(255,255,255,0.07)_100%)]'
                        : 'bg-[linear-gradient(115deg,rgba(255,255,255,0.04)_0%,rgba(191,219,254,0.08)_18%,rgba(255,255,255,0.03)_38%,rgba(191,219,254,0.12)_62%,rgba(255,255,255,0.04)_100%)]'
                    }`}
                  />
                  {canAfford ? (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                      <div className="absolute inset-y-[9%] left-[12%] w-[18%] skew-x-[-14deg] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.00)_0%,rgba(255,255,255,0.18)_24%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.16)_76%,rgba(255,255,255,0.00)_100%)] opacity-28 blur-[5px]" />
                      <div className="absolute inset-y-[10%] left-[39%] w-[22%] skew-x-[-14deg] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.00)_0%,rgba(255,255,255,0.14)_24%,rgba(255,255,255,0.04)_50%,rgba(255,255,255,0.15)_76%,rgba(255,255,255,0.00)_100%)] opacity-24 blur-[6px]" />
                      <div className="absolute inset-y-[11%] left-[66%] w-[16%] skew-x-[-14deg] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.00)_0%,rgba(255,255,255,0.16)_24%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.14)_76%,rgba(255,255,255,0.00)_100%)] opacity-26 blur-[5px]" />
                    </div>
                  ) : (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                      <div className="absolute inset-y-[8%] left-[-34%] w-[14%] skew-x-[-14deg] rounded-full bg-[linear-gradient(180deg,rgba(191,219,254,0.00)_0%,rgba(191,219,254,0.40)_20%,rgba(255,255,255,0.28)_50%,rgba(191,219,254,0.44)_78%,rgba(191,219,254,0.00)_100%)] blur-[2px] animate-reward-shimmer-cool opacity-100" />
                      <div className="absolute inset-y-[10%] left-[-26%] w-[12%] skew-x-[-14deg] rounded-full bg-[linear-gradient(180deg,rgba(191,219,254,0.00)_0%,rgba(191,219,254,0.34)_20%,rgba(255,255,255,0.22)_50%,rgba(191,219,254,0.40)_78%,rgba(191,219,254,0.00)_100%)] blur-[1.5px] animate-reward-shimmer-cool [animation-delay:0.9s] opacity-100" />
                      <div className="absolute inset-y-[12%] left-[-18%] w-[10%] skew-x-[-14deg] rounded-full bg-[linear-gradient(180deg,rgba(191,219,254,0.00)_0%,rgba(191,219,254,0.30)_24%,rgba(255,255,255,0.18)_50%,rgba(191,219,254,0.34)_78%,rgba(191,219,254,0.00)_100%)] blur-[1px] animate-reward-shimmer-cool [animation-delay:1.8s] opacity-95" />
                    </div>
                  )}
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0">
                        <h3 className="text-white font-bold text-xs md:text-sm leading-tight line-clamp-2">
                          <span>{reward.icon}</span> {reward.title}
                        </h3>
                        {reward.description && (
                          <p className={`text-[10px] md:text-xs leading-tight mt-1 line-clamp-2 ${canAfford ? 'text-white/80' : 'text-white/50'}`}>
                            {reward.description}
                          </p>
                        )}
                      </div>
                      <div
                        className={`rounded-lg px-2 py-0.5 flex items-center gap-0.5 font-extrabold text-[10px] md:text-xs shrink-0 transition-colors ${
                          canAfford ? 'bg-white/95 text-amber-600 shadow-[0_0_24px_rgba(251,191,36,0.24)]' : 'bg-white/15 text-white/55'
                        }`}
                      >
                        {Math.max(0, Math.abs(reward.costStars))} <Star size={10} className={canAfford ? 'fill-amber-400 text-amber-400' : 'fill-white/35 text-white/35'} />
                      </div>
                    </div>
                    {hasImage && (
                      <div className="h-[165px] w-full relative overflow-hidden rounded-xl bg-black/10 border border-white/10 flex items-center justify-center shrink-0">
                        <img src={reward.image!} alt={reward.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {!loadingRewards && rewards.length === 0 && <p className="text-white/60 text-center py-4 text-sm">Пока нет наград</p>}
        </section>
      </main>

      <StarHistoryModal childId={currentChild.id} open={showStarHistory} onClose={() => setShowStarHistory(false)} />
      <PinModal open={showPinModal} onClose={() => setShowPinModal(false)} />
      <AnimatePresence>
        {modalMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setModalMessage(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              onClick={e => e.stopPropagation()} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
              <p className="text-slate-700 text-base mb-5">{modalMessage}</p>
              <button onClick={() => setModalMessage(null)} className="bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors">Понятно</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AVATAR ZOOM MODAL */}
      <AnimatePresence>
        {showAvatarZoom && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setShowAvatarZoom(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="relative bg-white rounded-3xl p-4 md:p-6 shadow-2xl max-w-sm w-full border border-slate-100 flex flex-col items-center"
            >
              <button
                onClick={() => setShowAvatarZoom(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer z-10"
                aria-label="Закрыть"
              >
                <X size={18} />
              </button>

              <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-50 border-4 border-white shadow-xl relative flex items-center justify-center mt-4 mb-2">
                {currentChild.avatarUrl ? (
                  <img
                    src={currentChild.avatarUrl}
                    alt={currentChild.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-8xl font-black">
                    {currentChild.letter}
                  </div>
                )}
              </div>
              <h3 className="text-xl font-black text-slate-800 mt-2 mb-1">
                {currentChild.name}
              </h3>
              <p className="text-xs text-slate-400 font-bold tracking-wide uppercase">
                Профиль героя
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STREAK REWARDS MODAL */}
      <AnimatePresence>
        {showStreakRewardsModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm" 
            onClick={() => setShowStreakRewardsModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-50 rounded-[32px] p-5 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden will-change-transform"
            >
              <div className="flex items-center justify-between mb-4 shrink-0 font-sans">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                    <Award size={22} className="text-purple-500" /> Награды за серию
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 flex-wrap">
                    Твоя серия: <span className="font-extrabold text-slate-700">{streakProgress.currentStreak || 0} дней подряд</span>
                    <motion.span 
                      key={streakProgress.currentStreak}
                      animate={{ scale: [1, 1.25, 1] }} 
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="inline-block"
                    >
                      🔥
                    </motion.span>
                  </p>
                </div>
                <button onClick={() => setShowStreakRewardsModal(false)} className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>
 
              {isDevOrParent && (
                <div className="mx-5 mb-2 px-3 py-2.5 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-between shrink-0 shadow-sm font-sans">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-purple-700">🛠️ Режим тестирования наград</span>
                    <span className="text-[9px] text-purple-500 font-semibold">безопасный слой (не влияет на данные детей)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rewardsTestMode}
                      onChange={(e) => setRewardsTestMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              )}
 
              <div className="flex-1 overflow-y-auto pr-1 font-sans">
                {streakRewards.length === 0 ? (
                  <p className="text-slate-400 text-center py-12 text-sm font-semibold">Пока нет наград за серию. Попроси родителей добавить их в настройках!</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 p-1.5 md:p-3">
                    {streakRewards.map((reward) => {
                      const count = rewardsTestMode ? 1 : (streakProgress.earned?.[reward.id] || 0);
                      const isUnlocked = count > 0;
                      return (
                        <div
                          key={reward.id}
                          onClick={() => {
                            setZoomedReward(reward);
                            if (isUnlocked) {
                              playRewardOpenSound();
                              confetti({
                                particleCount: 120,
                                spread: 75,
                                origin: { y: 0.5 }
                              });
                            } else {
                              playMagicSound();
                            }
                          }}
                          className={`relative flex flex-col border rounded-3xl overflow-hidden aspect-[5/7] p-2 md:p-3 justify-between cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 active:scale-[0.99] shadow-[0_4px_10px_rgba(0,0,0,0.04)] will-change-transform ${
                            getCardStyleClasses(reward.color || 'blue', isUnlocked)
                          }`}
                        >
                          {/* Sticker / Badge */}
                          {isUnlocked && (
                            <div className="absolute top-1.5 right-1.5 bg-gradient-to-br from-amber-400 to-orange-500 text-white w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shadow-md border-2 border-white animate-pulse z-10">
                              {count}
                            </div>
                          )}

                          {!isUnlocked && (
                            <div className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-[10px] font-bold text-[8px] z-10 ${getBadgeStyleClasses(reward.color || 'blue')}`}>
                              {reward.daysStreak} дн.
                            </div>
                          )}

                          <div className="h-[14%] flex items-center gap-1.5 min-w-0">
                            <span className={`text-base shrink-0 ${!isUnlocked ? 'blur-[4px] select-none opacity-40' : ''}`}>
                              {reward.emoji}
                            </span>
                            <h4 className={`font-extrabold text-[11px] md:text-xs leading-tight truncate ${
                              isUnlocked ? 'text-slate-800' : 'text-slate-800/40 blur-[3.5px] select-none'
                            }`}>
                              {reward.title}
                            </h4>
                          </div>
  
                          {/* Row 2: Description (5x1 ratio) */}
                          <div className="h-[14%] flex items-center justify-center text-center w-full px-1">
                            <p className={`text-[9px] md:text-[10px] leading-tight line-clamp-2 text-center w-full ${
                              isUnlocked ? 'text-slate-500 font-semibold' : getTextColorClass(reward.color || 'blue')
                            }`}>
                              {reward.description || 'Без описания'}
                            </p>
                          </div>
  
                          {/* Row 3: Image (5x5 ratio) */}
                          <div className={`h-[72%] w-full aspect-square rounded-2xl overflow-hidden relative flex items-center justify-center border ${
                            isUnlocked ? 'bg-slate-50 border-slate-100/50' : 'bg-white shadow-inner border-slate-100/70'
                          }`}>
                            {isUnlocked && (
                              <>
                                <div 
                                  className="absolute inset-1 rounded-full opacity-[0.58] filter blur-[8px] mix-blend-screen"
                                  style={{
                                    background: getConicGradient1(reward.color),
                                    animation: 'spin 6.5s linear infinite, customPulse 1.3s ease-in-out infinite'
                                  }}
                                />
                                <div 
                                  className="absolute inset-3 rounded-full opacity-[0.72] filter blur-[3.5px]"
                                  style={{
                                    background: getConicGradient2(reward.color),
                                    animation: 'spin 4.5s linear infinite'
                                  }}
                                />
                              </>
                            )}
                            {isUnlocked ? (
                              reward.image ? (
                                <img src={reward.image} alt={reward.title} className="w-full h-full object-contain p-1 relative z-10" />
                              ) : (
                                <div className="text-slate-300 font-extrabold text-3xl">🎁</div>
                              )
                            ) : (
                              <>
                                <div className="absolute inset-0 animate-pulse" style={{ background: `radial-gradient(circle, ${getLockedRadialGradient(reward.color)} 0%, transparent 100%)` }} />
                                <div className="absolute w-28 h-28 rounded-full animate-[spin_16s_linear_infinite] opacity-80" style={{ background: `conic-gradient(from 0deg, transparent 0deg, ${getLockedConicColors(reward.color)} 45deg, transparent 90deg, ${getLockedConicColors(reward.color)} 135deg, transparent 180deg, ${getLockedConicColors(reward.color)} 225deg, transparent 270deg, ${getLockedConicColors(reward.color)} 315deg, transparent 360deg)` }} />
                                <span className={`font-extrabold text-5xl select-none animate-pulse ${getLockedQuestionMarkColor(reward.color)}`}>?</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {(isDevOrParent || rewardsTestMode) && (
                <div className="p-4 bg-white border-t border-slate-100 flex justify-center shrink-0">
                  <button
                    onClick={triggerTestAnimation}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>🎭</span> Проверить анимацию награды (Тест)
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ZOOMED REWARD VIEW */}
      <AnimatePresence>
        {zoomedReward && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-md font-sans" 
            onClick={() => setZoomedReward(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              onClick={e => e.stopPropagation()}
              className={`relative bg-white rounded-[36px] p-4 md:p-5 shadow-2xl max-w-md w-full border flex flex-col items-center transition-colors duration-300 will-change-transform ${
                isZoomedUnlocked ? 'border-slate-100' : 'border-purple-200/80 shadow-[0_8px_32px_rgba(168,85,247,0.12)]'
              }`}
            >
              <button
                onClick={() => setZoomedReward(null)}
                className="absolute top-4 right-4 transition-colors w-8 h-8 rounded-full flex items-center justify-center cursor-pointer z-10 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                <X size={18} />
              </button>

              <div 
                onClick={() => {
                  if (isZoomedUnlocked) {
                    playRewardOpenSound();
                    confetti({
                      particleCount: 100,
                      spread: 70,
                      origin: { y: 0.5 }
                    });
                  }
                }}
                className={`w-full flex flex-col border rounded-3xl overflow-hidden shadow-xl aspect-[5/7] p-3 md:p-4 justify-between relative mt-4 cursor-pointer hover:scale-[1.01] transition-transform will-change-transform ${
                  getCardStyleClasses(zoomedReward.color || 'blue', isZoomedUnlocked)
                }`}
              >
                {/* Row 1 */}
                <div className="h-[14%] flex items-center gap-2 min-w-0">
                  <span className={`text-2xl shrink-0 ${!isZoomedUnlocked ? 'blur-[4px] select-none opacity-40' : ''}`}>
                    {zoomedReward.emoji}
                  </span>
                  <h4 className={`font-extrabold text-base md:text-lg leading-tight truncate ${
                    isZoomedUnlocked ? 'text-slate-800' : 'text-slate-800/40 blur-[3.5px] select-none'
                  }`}>
                    {zoomedReward.title}
                  </h4>
                </div>

                {/* Row 2 */}
                <div className="h-[14%] flex items-center justify-center text-center w-full">
                  <p className="text-xs text-slate-500 leading-normal line-clamp-2 whitespace-pre-line w-full font-medium">
                    {zoomedReward.description || 'Без описания'}
                  </p>
                </div>

                {/* Row 3 */}
                <div className={`h-[72%] w-full aspect-square rounded-2xl overflow-hidden relative flex items-center justify-center border ${
                  isZoomedUnlocked ? 'bg-slate-50 border-slate-100/50' : 'bg-white shadow-inner border-slate-100/70'
                }`}>
                  {isZoomedUnlocked && (
                    <>
                      <div 
                        className="absolute inset-1 rounded-full opacity-[0.58] filter blur-[8px] mix-blend-screen"
                        style={{
                          background: getConicGradient1(zoomedReward.color),
                          animation: 'spin 6.5s linear infinite, customPulse 1.3s ease-in-out infinite'
                        }}
                      />
                      <div 
                        className="absolute inset-3 rounded-full opacity-[0.72] filter blur-[3.5px]"
                        style={{
                          background: getConicGradient2(zoomedReward.color),
                          animation: 'spin 4.5s linear infinite'
                        }}
                      />
                    </>
                  )}
                  {isZoomedUnlocked ? (
                    zoomedReward.image ? (
                      <img src={zoomedReward.image} alt={zoomedReward.title} className="w-full h-full object-contain p-1 md:p-2 relative z-10" />
                    ) : (
                      <div className="text-slate-300 font-extrabold text-5xl">🎁</div>
                    )
                  ) : (
                    <>
                      <div className="absolute inset-0 animate-pulse" style={{ background: `radial-gradient(circle, ${getLockedRadialGradient(zoomedReward.color)} 0%, transparent 100%)` }} />
                      <div className="absolute w-36 h-36 rounded-full animate-[spin_16s_linear_infinite] opacity-80" style={{ background: `conic-gradient(from 0deg, transparent 0deg, ${getLockedConicColors(zoomedReward.color)} 45deg, transparent 90deg, ${getLockedConicColors(zoomedReward.color)} 135deg, transparent 180deg, ${getLockedConicColors(zoomedReward.color)} 225deg, transparent 270deg, ${getLockedConicColors(zoomedReward.color)} 315deg, transparent 360deg)` }} />
                      <span className={`font-extrabold text-7xl select-none animate-pulse ${getLockedQuestionMarkColor(zoomedReward.color)}`}>?</span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-5 text-center w-full font-sans">
                {isZoomedUnlocked ? (
                  <>
                    <p className="text-sm font-extrabold text-slate-700">Необходимо дней подряд: {zoomedReward.daysStreak}</p>
                    <p className="text-xs text-amber-600 font-bold mt-1">Награда: +{zoomedReward.bonusStars} звёзд ⭐</p>
                    <p className="text-[11px] text-green-600 font-bold mt-2 bg-green-50 px-3 py-1 rounded-full border border-green-100 inline-block">
                      Получено раз: {streakProgress.earned?.[zoomedReward.id] || 0}
                    </p>
                  </>
                ) : (
                  <>
                    <p className={`text-sm font-extrabold ${getTextColorClass(zoomedReward.color || 'blue')}`}>
                      Этот секретный трофей откроется через {zoomedReward.daysStreak} дней подряд!
                    </p>
                    <p className="text-xs text-amber-600 font-bold mt-1">
                      Награда: +{zoomedReward.bonusStars} звёзд ⭐
                    </p>
                    <p className={`text-xs font-extrabold mt-3 px-4 py-1.5 rounded-full inline-block animate-pulse ${getBadgeStyleClasses(zoomedReward.color || 'blue')}`}>
                      Продолжай серию! 🔥
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AWARDING OVERLAY ANIMATION */}
      <AnimatePresence>
        {earnedStreakReward && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 pointer-events-auto font-sans"
          >
            {animationStep === 'award' && (
              <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(253,224,71,0.2)_0%,transparent_65%)] pointer-events-none flex items-center justify-center">
                <div className="w-[600px] h-[600px] rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(253,224,71,0.3)_30deg,transparent_60deg,rgba(253,224,71,0.3)_90deg,transparent_120deg,rgba(253,224,71,0.3)_150deg,transparent_180deg,rgba(253,224,71,0.3)_210deg,transparent_240deg,rgba(253,224,71,0.3)_270deg,transparent_300deg,rgba(253,224,71,0.3)_330deg,transparent_360deg)] animate-[spin_10s_linear_infinite] opacity-60 will-change-transform" />
              </div>
            )}

            <div className="text-center flex flex-col items-center relative">
              <AnimatePresence>
                {animationStep === 'award' && (
                  <motion.div
                    initial={{ opacity: 0, y: -40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mb-6 z-10 text-center"
                  >
                    <h2 className="text-2xl md:text-3xl font-black text-yellow-400 tracking-wide drop-shadow-[0_4px_12px_rgba(234,179,8,0.4)] animate-bounce">
                      НОВАЯ НАГРАДА! 🎉
                    </h2>
                    <p className="text-white font-extrabold text-sm md:text-base mt-2 drop-shadow-md">
                      Серия из {earnedStreakReward.daysStreak} дней подряд пройдена!
                    </p>
                    <p className="text-yellow-300 font-black text-lg md:text-xl mt-1 drop-shadow-md">
                      +{earnedStreakReward.bonusStars} звёзд ⭐
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                id="animating-streak-card"
                ref={animatingCardRef}
                initial={{ scale: 0.25, rotate: -35, opacity: 0 }}
                animate={
                  animationStep === 'fly'
                    ? {
                        x: flyCoords.x,
                        y: flyCoords.y,
                        scale: 0.06,
                        opacity: 0,
                        rotate: 360,
                      }
                    : {
                        scale: 1,
                        rotate: 0,
                        opacity: 1,
                      }
                }
                transition={{
                  type: "spring",
                  stiffness: animationStep === 'fly' ? 100 : 160,
                  damping: animationStep === 'fly' ? 18 : 15,
                  mass: 1
                }}
                className={`w-64 flex flex-col border rounded-3xl overflow-hidden shadow-2xl aspect-[5/7] p-4 justify-between relative z-20 origin-center will-change-transform ${
                  getCardStyleClasses(earnedStreakReward.color || 'blue', true)
                }`}
              >
                <div className="h-[14%] flex items-center gap-1.5 min-w-0">
                  <span className="text-2xl shrink-0">{earnedStreakReward.emoji}</span>
                  <h4 className="font-extrabold text-slate-800 text-sm md:text-base leading-tight truncate">{earnedStreakReward.title}</h4>
                </div>

                <div className="h-[14%] flex items-center">
                  <p className="text-xs text-slate-400 leading-tight line-clamp-2">{earnedStreakReward.description}</p>
                </div>

                <div className="h-[72%] w-full aspect-square bg-slate-50 rounded-2xl overflow-hidden relative flex items-center justify-center border border-slate-100/50">
                  <div 
                    className="absolute inset-1 rounded-full opacity-[0.58] filter blur-[8px] mix-blend-screen"
                    style={{
                      background: getConicGradient1(earnedStreakReward.color),
                      animation: 'spin 6.5s linear infinite, customPulse 1.3s ease-in-out infinite'
                    }}
                  />
                  <div 
                    className="absolute inset-3 rounded-full opacity-[0.72] filter blur-[3.5px]"
                    style={{
                      background: getConicGradient2(earnedStreakReward.color),
                      animation: 'spin 4.5s linear infinite'
                    }}
                  />
                  {earnedStreakReward.image ? (
                    <img src={earnedStreakReward.image} alt={earnedStreakReward.title} className="w-full h-full object-contain p-1.5 relative z-10" />
                  ) : (
                    <div className="text-slate-300 font-extrabold text-4xl">🎁</div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


