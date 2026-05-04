"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Check, Filter } from "lucide-react";

interface ParentEvent {
  id: string;
  childId: 'ali' | 'said';
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export default function ParentInbox() {
  const [events, setEvents] = useState<ParentEvent[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [childFilter, setChildFilter] = useState<'all' | 'ali' | 'said'>('all');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadEvents();
  }, [filter, childFilter]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      let url = '/api/events?';
      if (childFilter !== 'all') url += `childId=${childFilter}&`;
      if (filter === 'unread') url += 'read=false&';
      
      const res = await fetch(url);
      const data = await res.json();
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, read: true })
      });
      loadEvents();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
      loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const getChildName = (childId: string) => {
    return childId === 'ali' ? 'Али' : 'Саид';
  };

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'reward-available': 'Награда доступна',
      'reward-selected': 'Награда выбрана',
      'day-completed': 'День завершен',
      'task-completed': 'Задача выполнена',
      'grade-added': 'Оценка добавлена',
      'system': 'Система'
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] font-sans text-slate-800 pb-20">
      <header className="bg-white px-6 py-5 flex items-center justify-between border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Входящие</h1>
          <p className="text-slate-500 text-sm mt-1">События и уведомления</p>
        </div>
        <button
          onClick={() => router.push('/parent')}
          className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-bold hover:bg-slate-200 transition-colors"
        >
          Назад
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-4">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
              filter === 'all' ? 'bg-blue-500 text-white' : 'bg-white text-slate-600'
            }`}
          >
            Все
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
              filter === 'unread' ? 'bg-blue-500 text-white' : 'bg-white text-slate-600'
            }`}
          >
            Непрочитанные
          </button>
          <button
            onClick={() => setChildFilter('all')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
              childFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-white text-slate-600'
            }`}
          >
            Все дети
          </button>
          <button
            onClick={() => setChildFilter('ali')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
              childFilter === 'ali' ? 'bg-blue-500 text-white' : 'bg-white text-slate-600'
            }`}
          >
            Али
          </button>
          <button
            onClick={() => setChildFilter('said')}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
              childFilter === 'said' ? 'bg-blue-500 text-white' : 'bg-white text-slate-600'
            }`}
          >
            Саид
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-400">Загрузка...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-slate-400">Нет событий</div>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div
                key={event.id}
                className={`bg-white rounded-2xl p-4 md:p-5 shadow-sm border ${
                  event.read ? 'border-slate-100' : 'border-blue-200 bg-blue-50/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                        event.childId === 'ali' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                      }`}>
                        {getChildName(event.childId)}
                      </span>
                      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-600">
                        {getTypeLabel(event.type)}
                      </span>
                      {!event.read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-800">{event.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{event.body}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {new Date(event.createdAt).toLocaleString('ru-RU')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {!event.read && (
                      <button
                        onClick={() => markAsRead(event.id)}
                        className="text-blue-500 hover:text-blue-600 transition-colors"
                        title="Отметить прочитанным"
                      >
                        <Check size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteEvent(event.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                      title="Удалить"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
