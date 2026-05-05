"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-[28px] shadow-lg border border-slate-100 p-6 md:p-8 text-center">
        <div className="text-3xl mb-3">⚠️</div>
        <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Что-то пошло не так</h1>
        <p className="text-slate-500 text-sm md:text-base mb-5">
          Страница временно не загрузилась. Это бывает при разработке.
          Попробуй обновить или вернуться на главную.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              window.location.href = '/';
            }}
            className="w-full bg-[#3B82F6] text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition-colors"
          >
            На главную
          </button>
          <button
            onClick={() => reset()}
            className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    </div>
  );
}
