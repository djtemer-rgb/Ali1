"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogOut } from "lucide-react";

export default function ParentPage() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/parent/me');
      if (res.ok) {
        setAuthenticated(true);
      } else {
        router.push('/parent/login');
      }
    } catch (error) {
      router.push('/parent/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    document.cookie = 'parent-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/parent/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] font-sans text-slate-800 pb-20">
      <header className="bg-white px-6 py-5 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center">
            <Lock size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Родительская зона</h1>
            <p className="text-slate-500 text-sm">Управляй настройками и следи за прогрессом</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-bold hover:bg-slate-200 transition-colors"
        >
          <LogOut size={18} /> Выйти
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <section className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
          <h2 className="text-2xl font-extrabold text-slate-800 mb-4">Добро пожаловать, Родитель!</h2>
          <p className="text-slate-600 mb-6">Здесь будет Inbox с событиями и уведомлениями.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-6 rounded-2xl">
              <h3 className="font-bold text-blue-600 mb-2">Настройки</h3>
              <p className="text-sm text-slate-600">Настрой задачи, оценки, награды</p>
              <a href="/settings" className="inline-block mt-4 bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors">
                Перейти
              </a>
            </div>
            
            <div className="bg-green-50 p-6 rounded-2xl">
              <h3 className="font-bold text-green-600 mb-2">Отчеты</h3>
              <p className="text-sm text-slate-600">Посмотри прогресс детей</p>
              <a href="/reports" className="inline-block mt-4 bg-green-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-green-600 transition-colors">
                Перейти
              </a>
            </div>
            
            <div className="bg-amber-50 p-6 rounded-2xl">
              <h3 className="font-bold text-amber-600 mb-2">Inbox</h3>
              <p className="text-sm text-slate-600">События и уведомления</p>
              <a href="/parent/inbox" className="inline-block mt-4 bg-amber-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors">
                Открыть
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
