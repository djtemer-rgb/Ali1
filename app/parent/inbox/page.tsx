"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Check, Filter, CircleCheckBig, Ban, Star } from "lucide-react";
import { formatStarAmount } from "@/app/lib/reporting";

interface ParentEvent {
  id: string;
  childId: 'ali' | 'said';
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  rewardId?: string;
  details?: {
    childName?: string;
    taskId?: string;
    taskTitle?: string;
    stars?: number;
    difficulty?: 'easy' | 'normal' | 'hard';
    difficultyLabel?: string | null;
    category?: string;
    customCategory?: string;
    completedAt?: string;
    subtasks?: Array<{ id?: string; title?: string; done?: boolean }>;
    subtaskSummary?: string | null;
    detailsText?: string;
    rewardTitle?: string;
    costStars?: number;
    status?: 'available' | 'selected' | 'fulfilled';
  };
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

  const markAllRead = async () => {
    try {
      await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markAllRead: true,
          childId: childFilter === 'all' ? undefined : childFilter,
          read: true
        })
      });
      loadEvents();
    } catch (error) {
      console.error('Error marking all read:', error);
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
      'task-reverted': 'Задача отменена',
      'grade-added': 'Оценка добавлена',
      'system': 'Система'
    };
    return labels[type] || type;
  };

  const rewardById = (rewardId?: string) => rewards.find(r => r.id === rewardId);

  const confirmReward = async (event: ParentEvent) => {
    if (!event.rewardId) return;
    const reward = rewardById(event.rewardId);
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
        body: `${getChildName(event.childId)} подтвердил награду: ${reward?.title || 'Награда'}${reward ? ` (${formatStarAmount(-reward.costStars)})` : ''}`,
        details: {
          childName: getChildName(event.childId),
          rewardTitle: reward?.title || 'Награда',
          costStars: reward?.costStars,
          status: 'fulfilled'
        }
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
        body: `${getChildName(event.childId)}: награда отменена${reward ? `, звёзды возвращены (${formatStarAmount(reward.costStars)})` : ''}`,
        details: {
          childName: getChildName(event.childId),
          rewardTitle: reward?.title || 'Награда',
          costStars: reward?.costStars,
          status: 'available'
        }
      })
    });
    loadEvents();
  };

  const revertTask = async (event: ParentEvent) => {
    if (!event.details?.taskId) return;
    const taskTitle = event.details.taskTitle || event.body || 'Задача';
    const date = event.details.completedAt ? new Date(event.details.completedAt).toISOString().split('T')[0] : new Date(event.createdAt).toISOString().split('T')[0];
    const ok = window.confirm(`Отменить выполнение задачи "${taskTitle}" и вернуть её в невыполненные?`);
    if (!ok) return;

    const revertRes = await fetch('/api/tasks/revert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: event.childId, date, taskId: event.details.taskId })
    });
    const revertData = await revertRes.json();
    if (!revertRes.ok) {
      alert(revertData?.error || 'Не удалось отменить задачу');
      return;
    }

    await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: event.childId,
        type: 'system',
        title: 'Задача отменена',
        body: `${getChildName(event.childId)} отменил выполнение задачи: ${taskTitle}${typeof revertData?.removedStars === 'number' ? ` (${formatStarAmount(-Math.abs(revertData.removedStars), false)} ⭐)` : ''}`,
        details: {
          childName: getChildName(event.childId),
          taskId: event.details.taskId,
          taskTitle,
          stars: typeof revertData?.removedStars === 'number' ? -Math.abs(revertData.removedStars) : undefined,
          completedAt: event.details.completedAt || event.createdAt,
        }
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
        <div className="flex items-center gap-2">
          <button
            onClick={markAllRead}
            className="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-xl font-bold hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm"
          >
            ✓ Прочитать все
          </button>
          <button
            onClick={() => router.push('/parent')}
            className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-bold hover:bg-slate-200 transition-colors"
          >
            Назад
          </button>
        </div>
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
                    {event.rewardId && (event.type === 'reward-selected' || event.type === 'reward-fulfilled' || event.type === 'system') && (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                          <span className="px-2 py-1 rounded-full bg-white text-slate-500 border border-slate-200">
                            {rewardById(event.rewardId)?.title || event.details?.rewardTitle || 'Награда'}
                          </span>
                          {typeof event.details?.costStars === 'number' && (
                            <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                              <Star size={11} className="fill-blue-500" />
                              {formatStarAmount(-Math.abs(event.details.costStars), false)}
                            </span>
                          )}
                          {event.details?.status && (
                            <span className="px-2 py-1 rounded-full bg-white text-slate-500 border border-slate-200">
                              {event.details.status === 'selected' ? 'Резерв' : event.details.status === 'fulfilled' ? 'Подтверждено' : 'Доступно'}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {event.type === 'task-completed' && event.details && (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                          {event.details.difficultyLabel && (
                            <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                              Сложность: {event.details.difficultyLabel}
                            </span>
                          )}
                          {typeof event.details.stars === 'number' && (
                            <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                              +{event.details.stars} ⭐
                            </span>
                          )}
                          {event.details.category && (
                            <span className="px-2 py-1 rounded-full bg-white text-slate-500 border border-slate-200">
                              Категория: {event.details.customCategory || event.details.category}
                            </span>
                          )}
                        </div>
                        {event.details.subtaskSummary && (
                          <p className="mt-2 text-[11px] leading-relaxed">
                            Подзадачи: {event.details.subtaskSummary}
                          </p>
                        )}
                          {Array.isArray(event.details.subtasks) && event.details.subtasks.length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer select-none text-[11px] font-bold text-slate-500">
                              Показать подзадачи
                            </summary>
                            <ul className="mt-2 space-y-1 pl-4 list-disc">
                              {event.details.subtasks.map((subtask, index) => (
                                <li key={subtask.id || `${event.id}-subtask-${index}`} className={subtask.done ? 'text-slate-500 line-through' : 'text-slate-700'}>
                                  {subtask.title || 'Без названия'}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    )}
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
                  <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
                    <div className="flex items-center gap-2">
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
                    {event.type === 'task-completed' && event.details && (
                      <button
                        onClick={() => revertTask(event)}
                        className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 px-2.5 py-1.5 rounded-xl text-[11px] font-bold hover:bg-red-100 transition-colors"
                        title="Отменить выполнение задачи"
                      >
                        <Ban size={12} /> Отменить
                      </button>
                    )}
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
