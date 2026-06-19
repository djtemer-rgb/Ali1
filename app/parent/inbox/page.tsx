"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Check, CircleCheckBig, Ban } from "lucide-react";
import { formatStarAmount, getCategoryLabel, getInboxEventTypeLabel, normalizeInboxText } from "@/app/lib/reporting";
import { formatRewardReserveLabel, getRewardStatusLabel } from "@/app/lib/reporting";

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
    daysStreak?: number;
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
  const [currencyEnabled, setCurrencyEnabled] = useState(true);
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

      const [eventsRes, aliRewardsRes, saidRewardsRes, settingsRes] = await Promise.all([
        fetch(url),
        fetch('/api/rewards?childId=ali&includeInactive=1'),
        fetch('/api/rewards?childId=said&includeInactive=1'),
        fetch('/api/settings')
      ]);
      const data = await eventsRes.json();
      const aliRewards = await aliRewardsRes.json();
      const saidRewards = await saidRewardsRes.json();
      const settingsData = await settingsRes.json();
      setEvents(Array.isArray(data) ? data : []);
      setRewards([...(Array.isArray(aliRewards) ? aliRewards : []), ...(Array.isArray(saidRewards) ? saidRewards : [])]);
      if (settingsData?.currencyEnabled !== undefined) {
        setCurrencyEnabled(settingsData.currencyEnabled !== false);
      }
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

  const rewardById = (rewardId?: string) => rewards.find(r => r.id === rewardId);

  const confirmReward = async (event: ParentEvent) => {
    if (!event.rewardId) return;
    await fetch('/api/rewards/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: event.childId, rewardId: event.rewardId, status: 'fulfilled' })
    });
    await fetch('/api/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: event.id,
        details: { ...(event.details || {}), status: 'fulfilled' }
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
          reason: `Отмена выбора награды: ${reward.title}`
        })
      });
    }
    await fetch('/api/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: event.id,
        details: { ...(event.details || {}), status: 'available' }
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
            {events.map(event => {
              const isStreakEvent = event.type === 'day-completed' && event.rewardId && event.rewardId.startsWith('streak-reward-');
              const streakNum = isStreakEvent ? event.rewardId.replace('streak-reward-', '') : null;

              const displayTitle = isStreakEvent
                ? `Награда: ${event.details?.rewardTitle || event.body.match(/"([^"]+)"/)?.[1] || 'Серия побед'}`
                : normalizeInboxText(event.title);

              const displayBody = isStreakEvent
                ? `за ${event.details?.daysStreak || event.body.match(/серию из (\d+) дней/)?.[1] || 'несколько'} дней подряд`
                : normalizeInboxText(event.body);

              return (
                <div
                  key={event.id}
                  className={`bg-white rounded-2xl p-4 md:p-5 shadow-sm border ${
                    event.read ? 'border-slate-100' : 'border-blue-200 bg-blue-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {isStreakEvent && streakNum && (
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 p-1">
                          <img src={`/images/rewards/${streakNum}.png`} alt={displayTitle} className="w-10 h-10 object-contain" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                            event.childId === 'ali' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                          }`}>
                            {getChildName(event.childId)}
                          </span>
                          <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-600">
                            {getInboxEventTypeLabel(event.type)}
                          </span>
                          {isStreakEvent && event.details?.costStars && (
                            <span className="text-xs font-bold px-2 py-1 rounded-lg bg-amber-100 text-amber-700 flex items-center gap-1 border border-amber-200">
                              +{event.details.costStars} ⭐
                            </span>
                          )}
                          {!event.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-800">{displayTitle}</h3>
                        <p className="text-sm text-slate-600 mt-1">{displayBody}</p>
                        {event.rewardId && (event.type === 'reward-selected' || event.type === 'reward-fulfilled' || event.type === 'system') && (
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                              <span className="px-2 py-1 rounded-full bg-white text-slate-500 border border-slate-200">
                                {normalizeInboxText(rewardById(event.rewardId)?.title || event.details?.rewardTitle || 'Награда')}
                              </span>
                              {event.details?.status && (
                                <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                  {getRewardStatusLabel(event.details.status)}
                                </span>
                              )}
                              {typeof event.details?.costStars === 'number' && currencyEnabled && (
                                <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                  {formatRewardReserveLabel(event.details.costStars, currencyEnabled)}
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
                                  Категория: {getCategoryLabel(event.details.category, event.details.customCategory || '')}
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
                        {event.type === 'reward-selected' && event.rewardId && event.details?.status === 'selected' && (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => confirmReward(event)}
                              className="w-8 h-8 rounded-xl border border-slate-200 text-green-600 hover:bg-green-50 flex items-center justify-center"
                              title="Подтвердить"
                            >
                              <CircleCheckBig size={16} />
                            </button>
                            <button
                              onClick={() => cancelReward(event)}
                              className="w-8 h-8 rounded-xl border border-slate-200 text-red-500 hover:bg-red-50 flex items-center justify-center"
                              title="Отменить"
                            >
                              <Ban size={16} />
                            </button>
                          </div>
                        )}
                        <p className="text-xs text-slate-400 mt-2">
                          {new Date(event.createdAt).toLocaleString('ru-RU')}
                        </p>
                      </div>
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
