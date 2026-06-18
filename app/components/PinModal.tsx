"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { X, Lock, KeyRound } from "lucide-react";

export default function PinModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pin, setPin] = useState("");
  const [recoveryWord, setRecoveryWord] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch('/api/auth/parent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(useRecovery ? { recoveryWord } : { pin })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onClose();
        router.push('/settings');
      } else {
        setError(data.error || 'Ошибка входа');
      }
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch('/api/auth/parent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bypass: true })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onClose();
        router.push('/settings');
      } else {
        setError(data.error || 'Ошибка Dev-входа');
      }
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-extrabold text-slate-800">Родительская зона</h2>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              {useRecovery ? (
                <input type="text" placeholder="Recovery слово" value={recoveryWord} onChange={e => setRecoveryWord(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-center text-base font-bold outline-none focus:border-blue-500 transition-colors" autoFocus />
              ) : (
                <input type="password" inputMode="numeric" maxLength={6} placeholder="Введите PIN (4-6 цифр)" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-widest outline-none focus:border-blue-500 transition-colors" autoFocus />
              )}

              {error && <p className="text-red-500 text-center mt-3 text-sm font-medium">{error}</p>}

              <button type="submit" disabled={loading || (useRecovery ? recoveryWord.length < 4 : pin.length < 4)}
                className="w-full mt-4 bg-blue-500 text-white py-3 rounded-xl font-bold text-base hover:bg-blue-600 transition-colors disabled:opacity-50">
                {loading ? 'Проверка...' : 'Войти'}
              </button>
            </form>

            <button onClick={() => { setUseRecovery(!useRecovery); setError(""); setPin(""); setRecoveryWord(""); }}
              className="w-full mt-3 text-slate-400 hover:text-blue-500 text-xs font-medium transition-colors flex items-center justify-center gap-1.5">
              <KeyRound size={14} />
              {useRecovery ? 'Ввести PIN' : 'Забыли PIN?'}
            </button>

            {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
              <button
                type="button"
                onClick={handleDevBypass}
                className="w-full mt-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-2.5 rounded-xl font-bold text-xs transition-colors border border-emerald-200 cursor-pointer"
              >
                🛠️ Войти для разработки (без PIN)
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
