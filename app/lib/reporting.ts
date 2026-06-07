export type TaskSubtask = {
  id: string;
  title: string;
  done: boolean;
};

export type TaskCompletionSnapshot = {
  id: string;
  title: string;
  stars: number;
  category?: string;
  customCategory?: string;
  completedAt?: string;
  difficulty?: 'easy' | 'normal' | 'hard';
  subtasksMode?: 'none' | 'checkboxes' | 'plain-list';
  subtasks?: TaskSubtask[];
  detailsText?: string;
};

export type TaskCompletionBundle = {
  eventBody: string;
  telegramBody: string;
  pushBody: string;
  ledgerReason: string;
  details: {
    childName?: string;
    taskId: string;
    taskTitle: string;
    stars: number;
    difficulty?: 'easy' | 'normal' | 'hard';
    difficultyLabel: string | null;
    category?: string;
    customCategory?: string;
    completedAt?: string;
    subtasks: TaskSubtask[];
    subtaskSummary: string | null;
    detailsText?: string;
  };
};

export type ReportTaskEntry = {
  id: string;
  title: string;
  stars: number;
  completedAt: string;
  difficulty?: 'easy' | 'normal' | 'hard';
  difficultyLabel: string | null;
  category: string;
  customCategory?: string;
  subtaskSummary: string | null;
  subtaskCount: number;
  detailsText?: string;
  source: 'task';
};

export type ReportStarEntry = {
  id: string;
  amount: number;
  source: string;
  sourceLabel: string;
  reason: string;
  createdAt: string;
  taskTitle?: string;
  difficultyLabel?: string | null;
  subtaskSummary?: string | null;
};

export type ReportInsightSource = 'period' | 'all-time';

const DIFFICULTY_LABELS: Record<'easy' | 'normal' | 'hard', string> = {
  easy: 'Легко',
  normal: 'Нормально',
  hard: 'Сложно',
};

const STAR_SOURCE_LABELS: Record<string, string> = {
  task: 'Задача',
  grade: 'Оценка',
  manual: 'Ручное',
  'reward-purchase': 'Награда',
  reset: 'Сброс',
  adjustment: 'Корректировка',
};

const INBOX_EVENT_TYPE_LABELS: Record<string, string> = {
  'reward-available': 'Награда доступна',
  'task-completed': 'Задача выполнена',
  'day-completed': 'День завершён',
  'grade-added': 'Оценка добавлена',
  'reward-selected': 'Награда выбрана',
  'reward-fulfilled': 'Награда подтверждена',
  'manual-stars': 'Управление звёздами',
  system: 'Система',
};

const LEGACY_INBOX_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bAlly\b/gi, 'Али'],
  [/\bSaid\b/gi, 'Саид'],
  [/\bSystem\b/gi, 'Система'],
  [/\bTest completed\b/gi, 'Тест выполнен'],
  [/\bcompleted\b/gi, 'выполнено'],
  [/\bTBD\b/gi, 'Не указано'],
  [/\bSport\b/gi, 'Спорт'],
];

export const TASK_CATEGORY_LABELS: Record<string, string> = {
  study: 'Учёба',
  sport: 'Спорт',
  boxing: 'Бокс',
  chess: 'Шахматы',
  reading: 'Чтение',
  order: 'Порядок',
  'home-help': 'Помощь дома',
  rest: 'Отдых',
  other: 'Другое',
};

export function formatDifficultyLabel(difficulty?: 'easy' | 'normal' | 'hard') {
  if (!difficulty) return null;
  return DIFFICULTY_LABELS[difficulty] || null;
}

export function formatShortDate(isoDate?: string | null) {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatLongDate(isoDate?: string | null) {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatStarAmount(amount: number, includeIcon = true) {
  const prefix = amount >= 0 ? '+' : '';
  return includeIcon ? `${prefix}${amount} ⭐` : `${prefix}${amount}`;
}

export function formatRewardReserveLabel(costStars?: number, currencyEnabled = true, includeIcon = true) {
  if (!currencyEnabled || typeof costStars !== 'number' || costStars <= 0) return '';
  return includeIcon ? `(${formatStarAmount(costStars, false)} ★)` : `(${formatStarAmount(costStars, false)})`;
}

export function getRewardStatusLabel(status?: string) {
  if (status === 'fulfilled') return 'Подтверждено';
  if (status === 'selected') return 'Ожидает подтверждения';
  return 'Доступно';
}

export function getCategoryLabel(category?: string, customCategory = '') {
  if (customCategory.trim()) return customCategory.trim();
  return TASK_CATEGORY_LABELS[category || 'other'] || category || 'Другое';
}

export function formatReportSourceLabel(source?: ReportInsightSource) {
  if (source === 'all-time') return 'за всё время';
  return '';
}

export function getInboxEventTypeLabel(type?: string) {
  const normalized = type || '';
  return INBOX_EVENT_TYPE_LABELS[normalized] || normalized || 'Событие';
}

export function normalizeInboxText(text?: string) {
  if (!text) return '';
  return LEGACY_INBOX_TEXT_REPLACEMENTS.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text);
}

export function buildSubtaskSummary(subtasks?: TaskSubtask[], limit = 3) {
  const items = Array.isArray(subtasks) ? subtasks.filter((item) => !!item?.title) : [];
  if (items.length === 0) {
    return {
      list: [] as string[],
      summary: null as string | null,
      count: 0,
      hasMore: false,
    };
  }

  const list = items.map((item) => item.title.trim()).filter(Boolean);
  const preview = list.slice(0, limit);
  const hasMore = list.length > limit;
  return {
    list,
    summary: `${preview.join(' • ')}${hasMore ? ` • +${list.length - limit}` : ''}`,
    count: list.length,
    hasMore,
  };
}

export function buildTaskCompletionBundle(task: TaskCompletionSnapshot, childName: string): TaskCompletionBundle {
  const difficultyLabel = formatDifficultyLabel(task.difficulty);
  const subtaskBundle = buildSubtaskSummary(task.subtasks, 3);
  const childLabel = childName?.trim() || 'Ребёнок';

  const baseTaskLine = `${childLabel} выполнил задачу: ${task.title}`;
  const detailsLines = [
    `Сложность: ${difficultyLabel || 'не указана'}`,
    task.category || task.customCategory ? `Категория: ${getCategoryLabel(task.category, task.customCategory || '')}` : null,
    subtaskBundle.count > 0 ? `Подзадачи: ${subtaskBundle.list.join(' • ')}` : null,
  ].filter(Boolean) as string[];

  const telegramBody = [baseTaskLine, ...detailsLines].join('\n');
  const pushBodyParts = [
    task.title,
    difficultyLabel ? `Сложность: ${difficultyLabel}` : null,
    typeof task.stars === 'number' ? `+${task.stars} ⭐` : null,
  ].filter(Boolean);

  return {
    eventBody: baseTaskLine,
    telegramBody,
    pushBody: pushBodyParts.join(' · '),
    ledgerReason: [
      `Выполнена задача: ${task.title}`,
      difficultyLabel ? `Сложность: ${difficultyLabel}` : null,
      subtaskBundle.summary ? `Подзадачи: ${subtaskBundle.summary}` : null,
    ].filter(Boolean).join(' — '),
    details: {
      childName,
      taskId: task.id,
      taskTitle: task.title,
      stars: task.stars,
      difficulty: task.difficulty,
      difficultyLabel,
      category: task.category,
      customCategory: task.customCategory,
      completedAt: task.completedAt,
      subtasks: Array.isArray(task.subtasks) ? task.subtasks.filter((item) => !!item?.title) : [],
      subtaskSummary: subtaskBundle.summary,
      detailsText: task.detailsText,
    },
  };
}

export function formatStarSourceLabel(source: string) {
  return STAR_SOURCE_LABELS[source] || source || 'Другое';
}

export function buildReportTaskEntry(task: TaskCompletionSnapshot): ReportTaskEntry {
  const subtaskBundle = buildSubtaskSummary(task.subtasks, 4);
  return {
    id: task.id,
    title: task.title,
    stars: task.stars,
    completedAt: task.completedAt || new Date().toISOString(),
    difficulty: task.difficulty,
    difficultyLabel: formatDifficultyLabel(task.difficulty),
    category: getCategoryLabel(task.category, task.customCategory || ''),
    customCategory: task.customCategory,
    subtaskSummary: subtaskBundle.summary,
    subtaskCount: subtaskBundle.count,
    detailsText: task.detailsText,
    source: 'task',
  };
}

export function shortenText(text: string, max = 90) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}
