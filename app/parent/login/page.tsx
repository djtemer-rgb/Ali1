"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Lock, KeyRound } from "lucide-react";

export default function ParentLogin() {
  const [pin, setPin] = useState('');
  const [recoveryWord, setRecoveryWord] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/parent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(useRecovery ? { recoveryWord } : { pin })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push(searchParams.get('redirect') || '/parent');
      } else {
        setError(data.error || 'Ошибка входа');
      }
    } catch (err) {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/parent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bypass: true })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push(searchParams.get('redirect') || '/parent');
      } else {
        setError(data.error || 'Ошибка Dev-входа');
      }
    } catch (err) {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] p-8 shadow-lg max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800">Родительская зона</h1>
          <p className="text-slate-500 mt-2">
            {useRecovery ? 'Введите recovery слово' : 'Введите PIN-код для доступа'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {useRecovery ? (
            <input
              type="text"
              placeholder="Введите recovery слово"
              className="w-full border-2 border-slate-200 rounded-2xl px-4 py-4 text-center text-lg font-bold outline-none focus:border-blue-500 transition-colors"
              value={recoveryWord}
              onChange={(e) => setRecoveryWord(e.target.value)}
              autoFocus
            />
          ) : (
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Введите PIN (4-6 цифр)"
              className="w-full border-2 border-slate-200 rounded-2xl px-4 py-4 text-center text-2xl font-bold tracking-widest outline-none focus:border-blue-500 transition-colors"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
          )}

          {error && (
            <p className="text-red-500 text-center mt-4 font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || (useRecovery ? recoveryWord.length < 4 : pin.length < 4)}
            className="w-full mt-6 bg-blue-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Проверка...' : 'Войти'}
          </button>
        </form>

        <button
          onClick={() => { setUseRecovery(!useRecovery); setError(''); setPin(''); setRecoveryWord(''); }}
          className="w-full mt-4 text-slate-400 hover:text-blue-500 text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <KeyRound size={16} />
          {useRecovery ? 'Ввести PIN вместо recovery' : 'Забыли PIN? Используйте recovery слово'}
        </button>

        {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
          <button
            type="button"
            onClick={handleDevBypass}
            className="w-full mt-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-3.5 rounded-2xl font-bold text-sm transition-colors border border-emerald-200 cursor-pointer"
          >
            🛠️ Войти для разработки (без PIN)
          </button>
        )}

        <p className="text-center text-slate-400 text-sm mt-6">
          Используйте PIN, установленный в настройках
        </p>
      </div>
    </div>
  );
}
