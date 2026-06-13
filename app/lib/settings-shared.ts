export type ChildId = 'ali' | 'said';

export type Subject = {
  id: string;
  name: string;
  order: number;
};

export type GradeToStars = {
  '5': number;
  '4': number;
  '3': number;
  '2': number;
};

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
  aiModelFallback: string;
  aiLimit: number;
  systemPrompt: string;
  deepPrompt: string;
  heroes: string;
};

export type ChildSettings = {
  taskCategories: TaskCategory[];
  notifications: NotificationPrefs;
  ai: AiChildPrefs;
  gradesEnabled: boolean;
  subjects: Subject[];
  gradeToStars: GradeToStars;
  bonusAllTasksToday?: number;
};

export const BUILTIN_TASK_CATEGORIES: TaskCategory[] = [
  { id: 'study', label: 'Учёба', active: true, builtIn: true, order: 0 },
  { id: 'sport', label: 'Спорт', active: true, builtIn: true, order: 1 },
  { id: 'boxing', label: 'Бокс', active: true, builtIn: true, order: 2 },
  { id: 'chess', label: 'Шахматы', active: true, builtIn: true, order: 3 },
  { id: 'reading', label: 'Чтение', active: true, builtIn: true, order: 4 },
  { id: 'order', label: 'Порядок', active: true, builtIn: true, order: 5 },
  { id: 'home-help', label: 'Помощь дома', active: true, builtIn: true, order: 6 },
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
    aiModelFallback: 'openai/gpt-4o-mini',
    aiLimit: 3,
    systemPrompt: '',
    deepPrompt: 'Если глубокий режим включён, добавь один дополнительный смысловой слой: внутреннюю силу, дисциплину, честность, границы или умение учиться на ошибках. Не раздувай ответ.',
    heroes: 'Мухаммед Али, Тайсон, Роналду',
  };
}

export function defaultChildSettings(childId: ChildId = 'ali'): ChildSettings {
  return {
    taskCategories: [...BUILTIN_TASK_CATEGORIES],
    notifications: defaultNotificationPrefs(),
    ai: defaultAiPrefs(),
    gradesEnabled: childId === 'ali',
    subjects: defaultSubjects(),
    gradeToStars: defaultGradeToStars(),
    bonusAllTasksToday: 5,
  };
}

export function defaultSubjects(): Subject[] {
  return [
    { id: 'subj-1', name: 'Математика', order: 0 },
    { id: 'subj-2', name: 'Русский язык', order: 1 },
    { id: 'subj-3', name: 'Чтение', order: 2 },
    { id: 'subj-4', name: 'Окружающий мир', order: 3 },
    { id: 'subj-5', name: 'Английский язык', order: 4 },
  ];
}

export function defaultGradeToStars(): GradeToStars {
  return {
    '5': 5,
    '4': 2,
    '3': 0,
    '2': 0,
  };
}

export function normalizeSubjects(input: any[] | undefined | null): Subject[] {
  const subjects = Array.isArray(input) ? input : [];
  return subjects
    .filter((subject) => !!subject?.name)
    .map((subject, index) => ({
      id: String(subject?.id || `subj-${index}`),
      name: String(subject?.name || ''),
      order: Number.isFinite(Number(subject?.order)) ? Number(subject.order) : index,
    }))
    .sort((a, b) => {
      const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : 9999;
      const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : 9999;
      return orderA - orderB || a.name.localeCompare(b.name, 'ru');
    })
    .map((subject, index) => ({ ...subject, order: index }));
}

export function normalizeGradeToStars(input: any): GradeToStars {
  const defaults = defaultGradeToStars();
  if (!input || typeof input !== 'object') return defaults;
  return {
    '5': Number.isFinite(Number(input['5'])) ? Number(input['5']) : defaults['5'],
    '4': Number.isFinite(Number(input['4'])) ? Number(input['4']) : defaults['4'],
    '3': Number.isFinite(Number(input['3'])) ? Number(input['3']) : defaults['3'],
    '2': Number.isFinite(Number(input['2'])) ? Number(input['2']) : defaults['2'],
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
    aiModelFallback: typeof ai.aiModelFallback === 'string' && ai.aiModelFallback.trim() ? ai.aiModelFallback : defaults.aiModelFallback,
    aiLimit: Number.isFinite(Number(ai.aiLimit)) ? Math.min(10, Math.max(1, Number(ai.aiLimit))) : defaults.aiLimit,
    systemPrompt: typeof ai.systemPrompt === 'string' ? ai.systemPrompt : defaults.systemPrompt,
    deepPrompt: typeof ai.deepPrompt === 'string' ? ai.deepPrompt : defaults.deepPrompt,
    heroes: typeof ai.heroes === 'string' ? ai.heroes : defaults.heroes,
  };
}

export function getChildSettings(settings: any, childId: ChildId): ChildSettings {
  const root = settings?.childSettings?.[childId] || {};
  const legacySubjects = childId === 'ali' ? settings?.subjects : undefined;
  const legacyGradeToStars = childId === 'ali' ? settings?.gradeToStars : undefined;
  return {
    taskCategories: normalizeTaskCategories(root.taskCategories),
    notifications: normalizeNotificationPrefs(root.notifications),
    ai: normalizeAiPrefs(root.ai),
    gradesEnabled: root.gradesEnabled !== undefined ? !!root.gradesEnabled : childId === 'ali',
    subjects: normalizeSubjects(root.subjects ?? legacySubjects ?? defaultSubjects()),
    gradeToStars: normalizeGradeToStars(root.gradeToStars ?? legacyGradeToStars ?? defaultGradeToStars()),
    bonusAllTasksToday: typeof root.bonusAllTasksToday === 'number' ? root.bonusAllTasksToday : 5,
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
    gradesEnabled: updates.gradesEnabled !== undefined ? !!updates.gradesEnabled : current.gradesEnabled,
    subjects: updates.subjects ? normalizeSubjects(updates.subjects) : current.subjects,
    gradeToStars: updates.gradeToStars ? normalizeGradeToStars(updates.gradeToStars) : current.gradeToStars,
    bonusAllTasksToday: updates.bonusAllTasksToday !== undefined ? Number(updates.bonusAllTasksToday) : current.bonusAllTasksToday,
  };
}
