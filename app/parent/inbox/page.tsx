"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Check, Filter, CircleCheckBig, Ban } from "lucide-react";

interface ParentEvent {
  id: string;
  childId: 'ali' | 'said';
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  rewardId?: string;
}

interface RewardItem {
  id: string;
  childId: 'ali' | 'said' | 'both';
  title: string;
  costStars: number;
}

export default function ParentInbox() {
  const [events, setEvents] = useState<ParentEvent[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
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

      const [eventsRes, aliRewardsRes, saidRewardsRes] = await Promise.all([
        fetch(url),
        fetch('/api/rewards?childId=ali'),
        fetch('/api/rewards?childId=said')
      ]);
      const data = await eventsRes.json();
      const aliRewards = await aliRewardsRes.json();
      const saidRewards = await saidRewardsRes.json();
      setEvents(Array.isArray(data) ? data : []);
      setRewards([...(Array.isArray(aliRewards) ? aliRewards : []), ...(Array.isArray(saidRewards) ? saidRewards : [])]);
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

  const rewardById = (rewardId?: string) => rewards.find(r => r.id === rewardId);

  const confirmReward = async (event: ParentEvent) => {
    if (!event.rewardId) return;
    await fetch('/api/rewards/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: event.childId, rewardId: event.rewardId, status: 'fulfilled' })
    });
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: event.childId,
        type: 'system',
        title: 'Награда подтверждена',
        body: `${getChildName(event.childId)} получил подтверждение на награду: ${rewardById(event.rewardId)?.title || 'Награда'}`
      })
    });
    loadEvents();
  };

  const cancelReward = async (event: ParentEvent) => {
    if (!event.rewardId) return;
    const reward = rewardById(event.rewardId);
    await fetch('/api/rewards/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: event.childId, rewardId: event.rewardId, status: 'available' })
    });
    if (reward) {
      await fetch('/api/star-ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: event.childId,
          amount: reward.costStars,
          source: 'adjustment',
          sourceId: reward.id,
          reason: `Отмена награды: ${reward.title}`
        })
      });
    }
    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: event.childId,
        type: 'system',
        title: 'Награда отменена',
        body: `${getChildName(event.childId)}: награда отменена${reward ? `, звёзды возвращены (+${reward.costStars})` : ''}`
      })
    });
    loadEvents();
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
                    {event.type === 'reward-selected' && event.rewardId && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => confirmReward(event)}
                          className="inline-flex items-center gap-1.5 bg-green-500 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-green-600 transition-colors"
                        >
                          <CircleCheckBig size={14} /> Подтвердить
                        </button>
                        <button
                          onClick={() => cancelReward(event)}
                          className="inline-flex items-center gap-1.5 bg-red-100 text-red-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-200 transition-colors"
                        >
                          <Ban size={14} /> Отменить
                        </button>
                      </div>
                    )}
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
