"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Sparkles, X, Loader2 } from "lucide-react";

interface HeroMessageProps {
  childId: string;
  childName: string;
  mode: string;
  tasks: any[];
  todayGrades?: any[];
}

const FALLBACK_TEMPLATES = [
  (name: string) => `Привет, ${name}! Новый день — новые возможности. Посмотри, какие квесты тебя ждут! 🚀`,
  (name: string, hero?: string) => hero
    ? `${name}, ты как ${hero}! Каждый день становись сильнее и увереннее. Я верю в тебя! 💪`
    : `${name}, сегодня отличный день, чтобы стать лучше! Загляни в свои задачи 💪`,
  (name: string, hero?: string) => hero
    ? `Знаешь, ${name}, ${hero} тоже начинал с малого. Но он не сдавался — и ты не сдавайся! 🔥`
    : `${name}, каждый маленький шаг приближает тебя к цели. Продолжай! 🔥`,
  (name: string) => `${name}, ты уже сделал многое! Горжусь тобой. Продолжай в том же духе! 🌟`,
];

export default function HeroMessage({ childId, childName, mode, tasks, todayGrades }: HeroMessageProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(3);
  const [showModal, setShowModal] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      if (s.aiLimit) setRemaining(parseInt(s.aiLimit) || 3);
    }).catch(() => {});
  }, [childId]);

  const getFallback = (completed: number, total: number, heroes: string[]): string => {
    const hero = heroes.length > 0 ? heroes[Math.floor(Math.random() * heroes.length)] : undefined;
    if (total > 0 && completed === total) {
      return `🔥 ${childName}, ты сегодня просто герой! Все дела сделаны — горжусь тобой! ${hero ? `Как ${hero}!` : ''}`;
    }
    if (completed > 0) {
      const tpl = FALLBACK_TEMPLATES[Math.floor(Math.random() * 2) + 1];
      return tpl(childName, hero);
    }
    const tpl = FALLBACK_TEMPLATES[Math.floor(Math.random() * 2)];
    return tpl(childName, hero);
  };

  const fetchHeroMessage = async () => {
    setLoading(true);
    try {
      const completedCount = Array.isArray(tasks) ? tasks.filter((t: any) => t.completed).length : 0;

      const res = await fetch('/api/ai/hero-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          childName,
          mode,
          tasks,
          todayGrades: todayGrades || []
        })
      });
      const data = await res.json();
      if (data.message) {
        setMessage(data.message);
        setRemaining(data.remaining ?? 0);
      } else {
        setMessage(getFallback(completedCount, Array.isArray(tasks) ? tasks.length : 0, []));
        setRemaining(0);
      }
      setShowModal(true);
    } catch {
      const completedCount = Array.isArray(tasks) ? tasks.filter((t: any) => t.completed).length : 0;
      setMessage(getFallback(completedCount, Array.isArray(tasks) ? tasks.length : 0, []));
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU'; utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <>
      <button onClick={fetchHeroMessage} disabled={loading}
        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-[14px] font-bold text-sm whitespace-nowrap shadow-sm transition-all ${
          remaining > 0
            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-indigo-200 hover:shadow-md'
            : 'bg-slate-200 text-slate-400'
        }`}>
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {remaining > 0 ? `Послание героя (${remaining})` : 'Послание героя'}
      </button>

      <AnimatePresence>
        {showModal && message && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setShowModal(false); if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); } }}>
            <motion.div initial={{ opacity: 0, scale: 0.85, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85, y: 30 }}
              onClick={e => e.stopPropagation()} className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
              <button onClick={() => { setShowModal(false); if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); } }} className="absolute top-4 right-4 text-white/70 hover:text-white"><X size={22} /></button>
              <div className="text-3xl mb-3">🦸</div>
              <h2 className="text-lg font-extrabold text-white mb-3">Послание героя</h2>
              <p className="text-white/90 text-base leading-relaxed mb-5">{message}</p>
              <div className="flex gap-2">
                {'speechSynthesis' in window && (
                  <button onClick={() => speak(message)}
                    className="flex items-center gap-1.5 bg-white/20 text-white px-3.5 py-2 rounded-xl font-bold text-sm hover:bg-white/30 transition-colors backdrop-blur-sm">
                    {speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    {speaking ? 'Стоп' : 'Прослушать'}
                  </button>
                )}
                <button onClick={() => { setShowModal(false); if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); } }}
                  className="flex-1 bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-white/90 transition-colors">
                  Понятно!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
