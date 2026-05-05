export type ChildId = 'ali' | 'said';

export type TaskCategory = {
  id: string;
  label: string;
  active: boolean;
  builtIn: boolean;
  order: number;
};

export type NotificationEventKey =
  | 'task-completed'
  | 'day-completed'
  | 'grade-added'
  | 'reward-selected'
  | 'reward-fulfilled'
  | 'system';

export type NotificationChannelPrefs = {
  enabled: boolean;
  events: Record<NotificationEventKey, boolean>;
};

export type NotificationPrefs = {
  telegram: NotificationChannelPrefs;
  webPush: NotificationChannelPrefs;
};

export type AiChildPrefs = {
  enabled: boolean;
  richMode: boolean;
  openRouterUrl: string;
  aiModel: string;
  aiLimit: number;
  systemPrompt: string;
  heroes: string;
};

export type ChildSettings = {
  taskCategories: TaskCategory[];
  notifications: NotificationPrefs;
  ai: AiChildPrefs;
};

export const BUILTIN_TASK_CATEGORIES: TaskCategory[] = [
  { id: 'study', label: 'Учёба', active: true, builtIn: true, order: 0 },
  { id: 'sport', label: 'Спорт', active: true, builtIn: true, order: 1 },
  { id: 'boxing', label: 'Бокс', active: true, builtIn: true, order: 2 },
  { id: 'chess', label: 'Шахматы', active: true, builtIn: true, order: 3 },
  { id: 'reading', label: 'Чтение', active: true, builtIn: true, order: 4 },
  { id: 'order', label: 'Порядок', active: true, builtIn: true, order: 5 },
  { id: 'home-help', label: 'Помощь', active: true, builtIn: true, order: 6 },
  { id: 'rest', label: 'Отдых', active: true, builtIn: true, order: 7 },
];

export const NOTIFICATION_EVENT_LABELS: Record<NotificationEventKey, string> = {
  'task-completed': 'Задача выполнена',
  'day-completed': 'День завершён',
  'grade-added': 'Оценка добавлена',
  'reward-selected': 'Награда выбрана',
  'reward-fulfilled': 'Награда подтверждена',
  system: 'Системное',
};

export const NOTIFICATION_EVENT_KEYS: NotificationEventKey[] = [
  'task-completed',
  'day-completed',
  'grade-added',
  'reward-selected',
  'reward-fulfilled',
  'system',
];

export function defaultNotificationPrefs(): NotificationPrefs {
  const defaults: Record<NotificationEventKey, boolean> = {
    'task-completed': true,
    'day-completed': true,
    'grade-added': true,
    'reward-selected': true,
    'reward-fulfilled': true,
    system: false,
  };

  return {
    telegram: {
      enabled: true,
      events: { ...defaults },
    },
    webPush: {
      enabled: false,
      events: { ...defaults },
    },
  };
}

export function defaultAiPrefs(): AiChildPrefs {
  return {
    enabled: true,
    richMode: true,
    openRouterUrl: 'https://openrouter.ai/api/v1',
    aiModel: 'openai/gpt-4o-mini',
    aiLimit: 3,
    systemPrompt: '',
    heroes: 'Мухаммед Али, Тайсон, Роналду',
  };
}

export function defaultChildSettings(): ChildSettings {
  return {
    taskCategories: [...BUILTIN_TASK_CATEGORIES],
    notifications: defaultNotificationPrefs(),
    ai: defaultAiPrefs(),
  };
}

export function normalizeTaskCategories(categories: any[] | undefined | null) {
  const existing = Array.isArray(categories) ? categories : [];
  const merged = [...BUILTIN_TASK_CATEGORIES];

  existing.forEach((cat, idx) => {
    if (!cat || !cat.id) return;
    if (merged.some((item) => item.id === cat.id)) {
      const index = merged.findIndex((item) => item.id === cat.id);
      merged[index] = {
        id: String(cat.id),
        label: String(cat.label || cat.name || merged[index].label),
        active: cat.active !== false,
        builtIn: !!cat.builtIn,
        order: Number.isFinite(Number(cat.order)) ? Number(cat.order) : merged[index].order,
      };
      return;
    }

    merged.push({
      id: String(cat.id || `cat-${idx}`),
      label: String(cat.label || cat.name || ''),
      active: cat.active !== false,
      builtIn: !!cat.builtIn,
      order: Number.isFinite(Number(cat.order)) ? Number(cat.order) : merged.length,
    });
  });

  return merged
    .map((cat, index) => ({ ...cat, order: Number.isFinite(Number(cat.order)) ? Number(cat.order) : index }))
    .sort((a, b) => a.order - b.order);
}

export function normalizeNotificationPrefs(prefs: any) {
  const defaults = defaultNotificationPrefs();
  if (!prefs || typeof prefs !== 'object') return defaults;

  const mergeChannel = (channel: any, fallback: NotificationChannelPrefs): NotificationChannelPrefs => ({
    enabled: channel?.enabled !== undefined ? !!channel.enabled : fallback.enabled,
    events: NOTIFICATION_EVENT_KEYS.reduce((acc, key) => {
      acc[key] = channel?.events?.[key] !== undefined ? !!channel.events[key] : fallback.events[key];
      return acc;
    }, {} as Record<NotificationEventKey, boolean>),
  });

  return {
    telegram: mergeChannel(prefs.telegram, defaults.telegram),
    webPush: mergeChannel(prefs.webPush, defaults.webPush),
  };
}

export function normalizeAiPrefs(ai: any) {
  const defaults = defaultAiPrefs();
  if (!ai || typeof ai !== 'object') return defaults;

  return {
    enabled: ai.enabled !== undefined ? !!ai.enabled : defaults.enabled,
    richMode: ai.richMode !== undefined ? !!ai.richMode : defaults.richMode,
    openRouterUrl: typeof ai.openRouterUrl === 'string' && ai.openRouterUrl.trim() ? ai.openRouterUrl : defaults.openRouterUrl,
    aiModel: typeof ai.aiModel === 'string' && ai.aiModel.trim() ? ai.aiModel : defaults.aiModel,
    aiLimit: Number.isFinite(Number(ai.aiLimit)) ? Math.min(10, Math.max(1, Number(ai.aiLimit))) : defaults.aiLimit,
    systemPrompt: typeof ai.systemPrompt === 'string' ? ai.systemPrompt : defaults.systemPrompt,
    heroes: typeof ai.heroes === 'string' ? ai.heroes : defaults.heroes,
  };
}

export function getChildSettings(settings: any, childId: ChildId): ChildSettings {
  const root = settings?.childSettings?.[childId] || {};
  return {
    taskCategories: normalizeTaskCategories(root.taskCategories),
    notifications: normalizeNotificationPrefs(root.notifications),
    ai: normalizeAiPrefs(root.ai),
  };
}

export function buildChildSettings(settings: any, childId: ChildId, updates: Partial<ChildSettings>) {
  const current = getChildSettings(settings, childId);
  return {
    ...current,
    ...updates,
    taskCategories: updates.taskCategories ? normalizeTaskCategories(updates.taskCategories) : current.taskCategories,
    notifications: updates.notifications ? normalizeNotificationPrefs(updates.notifications) : current.notifications,
    ai: updates.ai ? normalizeAiPrefs(updates.ai) : current.ai,
  };
}
