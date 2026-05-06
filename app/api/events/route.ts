import { NextResponse } from 'next/server';
import { getJson, setJson } from '../upstash';
import { getChildSettings, NOTIFICATION_EVENT_KEYS } from '@/app/lib/settings-shared';
import { sendTelegramIfEnabled, sendWebPushToChild } from '@/app/lib/notifications';
import { buildSubtaskSummary, formatDifficultyLabel, formatRewardReserveLabel, formatStarAmount, getRewardStatusLabel } from '@/app/lib/reporting';

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getChildName(childId: string) {
  return childId === 'ali' ? 'Али' : 'Саид';
}

function buildTaskNotificationTexts(event: any) {
  const details = event?.details || {};
  const childName = details.childName || getChildName(event.childId);
  const taskTitle = details.taskTitle || event.title || 'Задача';
  const difficultyLabel = details.difficultyLabel || formatDifficultyLabel(details.difficulty) || null;
  const subtasks = Array.isArray(details.subtasks) ? details.subtasks : [];
  const subtaskBundle = buildSubtaskSummary(subtasks, 8);
  const starSummary = typeof details.stars === 'number' ? formatStarAmount(details.stars) : null;

  const telegramParts = [
    `<b>${escapeHtml(childName)} выполнил задачу:</b> ${escapeHtml(taskTitle)}`,
    difficultyLabel ? `Сложность: ${escapeHtml(difficultyLabel)}` : null,
    details.category || details.customCategory ? `Категория: ${escapeHtml(details.customCategory || details.category)}` : null,
    details.detailsText ? `Заметка: ${escapeHtml(String(details.detailsText))}` : null,
    starSummary ? `Звёзды: ${escapeHtml(starSummary)}` : null,
    subtaskBundle.count > 0
      ? `Подзадачи:\n${subtasks.map((subtask: any) => `• ${escapeHtml(String(subtask.title || ''))}${subtask.done ? ' ✅' : ''}`).join('\n')}`
      : null,
  ].filter(Boolean);

  const pushParts = [
    taskTitle,
    difficultyLabel ? `Сложность: ${difficultyLabel}` : null,
    typeof details.stars === 'number' ? formatStarAmount(details.stars) : null,
  ].filter(Boolean);

  return {
    telegram: telegramParts.join('\n'),
    push: pushParts.join(' · '),
  };
}

function buildRewardNotificationTexts(event: any, currencyEnabled = true) {
  const details = event?.details || {};
  const childName = details.childName || getChildName(event.childId);
  const rewardTitle = details.rewardTitle || event.body || event.title || 'Награда';
  const costStars = typeof details.costStars === 'number' ? details.costStars : null;
  const status = details.status || event.type;
  const reserveLabel = costStars ? formatRewardReserveLabel(costStars, currencyEnabled) : '';
  const statusLabel = getRewardStatusLabel(status);

  const telegramParts = [
    `<b>${escapeHtml(childName)} выбрал награду:</b> ${escapeHtml(rewardTitle)}`,
    reserveLabel ? `Сумма: ${escapeHtml(reserveLabel)}` : null,
    `Статус: ${escapeHtml(statusLabel)}`,
  ].filter(Boolean);

  const pushParts = [
    rewardTitle,
    reserveLabel ? `Сумма: ${reserveLabel}` : null,
    `Статус: ${statusLabel}`,
  ].filter(Boolean);

  return {
    telegram: telegramParts.join('\n'),
    push: pushParts.join(' · '),
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const childId = url.searchParams.get('childId');
    const type = url.searchParams.get('type');
    const read = url.searchParams.get('read');
    
    let events = await getJson('aq:events:parent') || [];
    
    if (childId) {
      events = events.filter((e: any) => e.childId === childId);
    }
    if (type) {
      events = events.filter((e: any) => e.type === type);
    }
    if (read !== null) {
      const isRead = read === 'true';
      events = events.filter((e: any) => e.read === isRead);
    }
    
    // Sort by newest first
    events.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error getting events:', error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const events = await getJson('aq:events:parent') || [];
    
    const newEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...body,
      read: false,
      createdAt: new Date().toISOString()
    };

    events.push(newEvent);
    await setJson('aq:events:parent', events);

    const settings = await getJson('aq:settings') as any || {};
    const childSettings = getChildSettings(settings, newEvent.childId);
    const defaultMessage = `🔔 <b>Новое событие!</b>\n\n<b>${escapeHtml(newEvent.title)}</b>\n${escapeHtml(newEvent.body)}`;
    const taskMessages = newEvent.type === 'task-completed' ? buildTaskNotificationTexts(newEvent) : null;
    const rewardMessages = newEvent.type === 'reward-selected' || newEvent.type === 'reward-fulfilled'
      ? buildRewardNotificationTexts(newEvent, settings?.currencyEnabled !== false)
      : null;
    const message = taskMessages?.telegram || rewardMessages?.telegram || defaultMessage;

    if (NOTIFICATION_EVENT_KEYS.includes(newEvent.type)) {
      await sendTelegramIfEnabled(settings, newEvent.childId, newEvent.type as any, message);
      if (childSettings.notifications.webPush.enabled && childSettings.notifications.webPush.events[newEvent.type as any]) {
        await sendWebPushToChild(newEvent.childId, {
          title: newEvent.title,
          body: taskMessages?.push || rewardMessages?.push || newEvent.body,
          tag: newEvent.type,
          url: '/parent/inbox',
          data: {
            childId: newEvent.childId,
            eventId: newEvent.id,
            type: newEvent.type,
            details: newEvent.details || null,
          },
        });
      }
    }
    
    return NextResponse.json(newEvent);
  } catch (error) {
    console.error('Error adding event:', error);
    return NextResponse.json({ error: 'Failed to add event' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, read, markAllRead, childId, type, ...updates } = body;

    let events = await getJson('aq:events:parent') || [];

    if (markAllRead) {
      events = events.map((e: any) => {
        if (childId && e.childId !== childId) return e;
        if (type && e.type !== type) return e;
        return { ...e, read: true };
      });
    } else {
      events = events.map((e: any) => 
        e.id === id ? { ...e, ...(read !== undefined ? { read } : updates) } : e
      );
    }

    await setJson('aq:events:parent', events);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    let events = await getJson('aq:events:parent') || [];
    events = events.filter((e: any) => e.id !== id);
    
    await setJson('aq:events:parent', events);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
