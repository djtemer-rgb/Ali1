"use client";

import { useState, useEffect } from "react";
import { Book, Trophy, Star, Key, Bot, Plus, Trash2, Edit3, Check, RefreshCw, Calendar, DollarSign, Save, User, Camera, X, Bell, CheckCheck, ChevronUp, ChevronDown, CheckCircle2, Wifi, Crown, BellRing, ArrowUp, ArrowDown, ToggleLeft, ToggleRight, ShieldCheck, Webhook, Ban } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useChild } from "@/app/lib/ChildContext";
import AccordionSection from "../components/AccordionSection";
import { COLOR_ICONS, MINIMAL_ICONS, getIconDisplay } from "../lib/icons";
import { Switch } from "@/components/ui/switch";
import { BUILTIN_TASK_CATEGORIES, NOTIFICATION_EVENT_KEYS, NOTIFICATION_EVENT_LABELS, defaultAiPrefs, defaultNotificationPrefs, getChildSettings, normalizeGradeToStars, normalizeSubjects } from "@/app/lib/settings-shared";
import type { TaskCategory, Subject } from "@/app/lib/settings-shared";
import { formatRewardReserveLabel, formatStarAmount, getCategoryLabel, getInboxEventTypeLabel, getRewardStatusLabel, normalizeInboxText } from "@/app/lib/reporting";

interface Reward { id: string; childId?: string; title: string; description?: string; costStars: number; icon: string; iconStyle: 'color' | 'minimal'; active: boolean; sortOrderByChild?: Record<string, number>; image?: string | null; }
interface TaskTemplate {
  id: string;
  title: string;
  category: string;
  customCategory?: string;
  repeatDays: number[];
  stars: number;
  active: boolean;
  childId: string;
  oneTimeDate?: string;
  sortOrder?: number;
  inactiveAt?: string | null;
  detailsText?: string;
  requiresOpenDetails?: boolean;
  subtasksMode?: 'none' | 'checkboxes' | 'plain-list';
  subtasks?: { id: string; title: string; done?: boolean }[];
  createdAt?: string;
  updatedAt?: string;
}
interface GradeRecord {
  id: string;
  subjectName: string;
  grade: number;
  starsAwarded: number;
  createdAt: string;
}
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
interface ChildSettingsForm {
  taskCategories: TaskCategory[];
  notifications: ReturnType<typeof defaultNotificationPrefs>;
  ai: ReturnType<typeof defaultAiPrefs>;
  gradesEnabled: boolean;
}
interface TaskCategoryItem {
  id: string;
  label: string;
  active: boolean;
  builtIn: boolean;
  order: number;
}

const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAY_INDEX = [1, 2, 3, 4, 5, 6, 0]; // maps display index to Date.getDay() index
const CHILD_IDS = ['ali', 'said'] as const;

export default function SettingsPage() {
  const { currentChild, switchChild } = useChild();
  const [settingsChildId, setSettingsChildId] = useState(currentChild.id);
  const childName = settingsChildId === 'ali' ? 'Али' : 'Саид';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [settingsData, setSettingsData] = useState<any>(null);

  // Subjects
  const [subjects, setSubjects] = useState<{ id: string; name: string; order: number }[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [gradeMapping, setGradeMapping] = useState({ '5': '+5', '4': '+2', '3': '0', '2': '0' });

  // Star economy
  const [currencyEnabled, setCurrencyEnabled] = useState(true);
  const [resetEnabled, setResetEnabled] = useState(false);
  const [resetDays, setResetDays] = useState('90');

  // Rewards
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [rName, setRName] = useState(''); const [rCost, setRCost] = useState(''); const [rDesc, setRDesc] = useState('');
  const [rIcon, setRIcon] = useState('🎁'); const [rStyle, setRStyle] = useState<'color' | 'minimal'>('color'); const [showIcons, setShowIcons] = useState(false);
  const [rImage, setRImage] = useState<string | null>(null);

  // PIN
  const [pin1, setPin1] = useState(''); const [pin2, setPin2] = useState(''); const [recovery, setRecovery] = useState('');
  const [pinStatus, setPinStatus] = useState({ hasPin1: false, hasPin2: false, hasRecovery: false });

  // AI
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiRichMode, setAiRichMode] = useState(true);
  const [gradesEnabled, setGradesEnabled] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [deepPrompt, setDeepPrompt] = useState('Если глубокий режим включён, добавь один дополнительный смысловой слой: внутреннюю силу, дисциплину, честность, границы или умение учиться на ошибках. Не раздувай ответ.');
  const [openRouterUrl, setOpenRouterUrl] = useState('https://openrouter.ai/api/v1');
  const [aiModel, setAiModel] = useState('openai/gpt-4o-mini');
  const [aiModelFallback, setAiModelFallback] = useState('openai/gpt-4o-mini');
  const [aiLimit, setAiLimit] = useState('3');
  const [aiConnectionStatus, setAiConnectionStatus] = useState('');
  const [testingAiConnection, setTestingAiConnection] = useState(false);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [webPushStatus, setWebPushStatus] = useState('');
  const [testingWebPush, setTestingWebPush] = useState(false);

  // Interface / avatars
  const [avatarAli, setAvatarAli] = useState<string | null>(null);
  const [avatarSaid, setAvatarSaid] = useState<string | null>(null);
  const [showInbox, setShowInbox] = useState(false);
  const [events, setEvents] = useState<ParentEvent[]>([]);
  const [eventFilter, setEventFilter] = useState<'all' | 'unread'>('all');
  const [eventChildFilter, setEventChildFilter] = useState<'all' | 'ali' | 'said'>('all');
  const [eventsLoading, setEventsLoading] = useState(false);
  const [gradeHistoryLimit, setGradeHistoryLimit] = useState('20');
  const [showGradeHistory, setShowGradeHistory] = useState(false);
  const [gradeHistory, setGradeHistory] = useState<GradeRecord[]>([]);
  const [gradeHistoryLoading, setGradeHistoryLoading] = useState(false);
  const [childCategories, setChildCategories] = useState<TaskCategoryItem[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState(defaultNotificationPrefs());
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleanupMode, setCleanupMode] = useState<'test-data' | 'inactive-tasks'>('test-data');
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState('');
  const [showInactiveTemplates, setShowInactiveTemplates] = useState(false);
  const [revertTarget, setRevertTarget] = useState<ParentEvent | null>(null);
  const [revertLoading, setRevertLoading] = useState(false);
  const [revertError, setRevertError] = useState('');

  // Tasks (schedule)
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [newTitle, setNewTitle] = useState(''); const [newStars, setNewStars] = useState('1');
  const [newCategory, setNewCategory] = useState('study'); const [newDays, setNewDays] = useState<number[]>([]);
  const [newDetailsText, setNewDetailsText] = useState('');
  const [newRequiresOpenDetails, setNewRequiresOpenDetails] = useState(false);
  const [newSubtasksMode, setNewSubtasksMode] = useState<'none' | 'checkboxes' | 'plain-list'>('none');
  const [newSubtasks, setNewSubtasks] = useState<{ id: string; title: string; done?: boolean }[]>([]);

  useEffect(() => { setSettingsChildId(currentChild.id); }, [currentChild.id]);
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/parent/me');
        if (!res.ok) window.location.href = '/parent/login';
        setAuthChecked(true);
      } catch {
        window.location.href = '/parent/login';
      }
    };
    checkAuth();
  }, []);
  useEffect(() => { loadAll(); }, [settingsChildId]);
  useEffect(() => {
    if (!showInbox) return;
    loadEvents();
  }, [showInbox, eventFilter, eventChildFilter]);
  useEffect(() => {
    if (!showGradeHistory) return;
    loadGradeHistory();
  }, [showGradeHistory, gradeHistoryLimit, settingsChildId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [subjRes, rewRes, authRes, setRes, tplRes] = await Promise.all([
        fetch(`/api/grades?childId=${settingsChildId}`), fetch(`/api/rewards?childId=${settingsChildId}&includeInactive=1`), fetch('/api/auth/parent/settings'),
        fetch('/api/settings'), fetch('/api/tasks/templates')
      ]);
      const subjData = await subjRes.json();
      const rewData = await rewRes.json(); setRewards(Array.isArray(rewData) ? rewData : []);
      setPinStatus(await authRes.json());
      const setData = await setRes.json();
      const childSettings = getChildSettings(setData, settingsChildId);
      if (setData.systemPrompt) setSystemPrompt(setData.systemPrompt);
      if (setData.currencyEnabled !== undefined) setCurrencyEnabled(setData.currencyEnabled);
      if (setData.resetEnabled !== undefined) setResetEnabled(setData.resetEnabled);
      if (setData.resetDays) setResetDays(String(setData.resetDays));
      if (setData.gradeHistoryLimit !== undefined) setGradeHistoryLimit(String(setData.gradeHistoryLimit));
      if (Array.isArray(subjData)) setSubjects(normalizeSubjects(subjData));
      setChildCategories(childSettings.taskCategories);
      setNotificationPrefs(childSettings.notifications);
      setAiEnabled(childSettings.ai.enabled);
      setAiRichMode(childSettings.ai.richMode);
      setGradesEnabled(childSettings.gradesEnabled ?? settingsChildId === 'ali');
      setSubjects(childSettings.subjects);
      setGradeMapping({
        '5': `${childSettings.gradeToStars['5'] >= 0 ? '+' : ''}${childSettings.gradeToStars['5']}`,
        '4': `${childSettings.gradeToStars['4'] >= 0 ? '+' : ''}${childSettings.gradeToStars['4']}`,
        '3': `${childSettings.gradeToStars['3'] >= 0 ? '+' : ''}${childSettings.gradeToStars['3']}`,
        '2': `${childSettings.gradeToStars['2'] >= 0 ? '+' : ''}${childSettings.gradeToStars['2']}`,
      });
      setOpenRouterUrl(childSettings.ai.openRouterUrl || setData.openRouterUrl || 'https://openrouter.ai/api/v1');
      setAiModel(childSettings.ai.aiModel || setData.aiModel || 'openai/gpt-4o-mini');
      setAiModelFallback(childSettings.ai.aiModelFallback || setData.aiModelFallback || 'openai/gpt-4o-mini');
      setSystemPrompt(childSettings.ai.systemPrompt || setData.systemPrompt || '');
      setDeepPrompt(childSettings.ai.deepPrompt || setData.deepPrompt || 'Если глубокий режим включён, добавь один дополнительный смысловой слой: внутреннюю силу, дисциплину, честность, границы или умение учиться на ошибках. Не раздувай ответ.');
      setAiLimit(String(childSettings.ai.aiLimit || setData.aiLimit || 3));
      // Load avatars from children API
      const childrenRes = await fetch('/api/children');
      const childrenData = await childrenRes.json();
      if (Array.isArray(childrenData)) {
        const ali = childrenData.find((c: any) => c.id === 'ali');
        const said = childrenData.find((c: any) => c.id === 'said');
        if (ali?.avatarUrl) setAvatarAli(ali.avatarUrl);
        if (said?.avatarUrl) setAvatarSaid(said.avatarUrl);
      }
      const tplData = await tplRes.json();
      setSettingsData(setData);
      setTemplates(Array.isArray(tplData)
        ? tplData
            .filter((t: TaskTemplate) => t.childId === settingsChildId || t.childId === 'both')
            .sort((a: TaskTemplate, b: TaskTemplate) => {
              const orderA = Number.isFinite(Number(a.sortOrder)) ? Number(a.sortOrder) : 9999;
              const orderB = Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 9999;
              return orderA - orderB || new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            })
        : []);
      if (Array.isArray(childSettings.taskCategories) && childSettings.taskCategories.length > 0) {
        const selectedCategory = childSettings.taskCategories.find(cat => cat.id === newCategory);
        if (!selectedCategory) {
          setNewCategory(childSettings.taskCategories.find(cat => cat.active) ? childSettings.taskCategories.find(cat => cat.active)!.id : childSettings.taskCategories[0].id);
        }
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadEvents = async () => {
    setEventsLoading(true);
    try {
      let url = '/api/events?';
      if (eventChildFilter !== 'all') url += `childId=${eventChildFilter}&`;
      if (eventFilter === 'unread') url += 'read=false&';
      const res = await fetch(url);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  const loadGradeHistory = async () => {
    setGradeHistoryLoading(true);
    try {
      const limit = Math.min(50, Math.max(20, parseInt(gradeHistoryLimit) || 20));
      const res = await fetch(`/api/grades?type=grades&childId=${settingsChildId}`);
      const data = await res.json();
      const ordered = Array.isArray(data) ? [...data].reverse().slice(0, limit) : [];
      setGradeHistory(ordered);
    } catch (error) {
      console.error('Error loading grade history:', error);
      setGradeHistory([]);
    } finally {
      setGradeHistoryLoading(false);
    }
  };

  const markEventRead = async (id: string) => {
    await fetch('/api/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, read: true })
    });
    loadEvents();
  };

  const markAllEventsRead = async () => {
    await fetch('/api/events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        markAllRead: true,
        childId: eventChildFilter === 'all' ? undefined : eventChildFilter,
        read: true
      })
    });
    loadEvents();
  };

  const deleteEvent = async (id: string) => {
    await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
    loadEvents();
  };

  const getChildName = (id: 'ali' | 'said') => (id === 'ali' ? 'Али' : 'Саид');

  const rewardById = (rewardId?: string) => rewards.find(r => r.id === rewardId);

  const confirmRewardEvent = async (event: ParentEvent) => {
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
    await refreshRewards();
    loadEvents();
  };

  const cancelRewardEvent = async (event: ParentEvent) => {
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
    await refreshRewards();
    loadEvents();
  };

  const revertTask = async (event: ParentEvent) => {
    if (!event.details?.taskId) return;
    setRevertError('');
    setRevertTarget(event);
  };

  const confirmRevertTask = async () => {
    if (!revertTarget?.details?.taskId) return;
    const taskTitle = revertTarget.details.taskTitle || revertTarget.body || 'Задача';
    const date = revertTarget.details.completedAt ? new Date(revertTarget.details.completedAt).toISOString().split('T')[0] : new Date(revertTarget.createdAt).toISOString().split('T')[0];
    setRevertLoading(true);

    try {
      const revertRes = await fetch('/api/tasks/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: revertTarget.childId, date, taskId: revertTarget.details.taskId })
      });
      const revertData = await revertRes.json();
      if (!revertRes.ok) {
        setRevertError(revertData?.error || 'Не удалось отменить задачу');
        return;
      }

      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: revertTarget.childId,
          type: 'system',
          title: 'Задача отменена',
          body: `${getChildName(revertTarget.childId)} отменил выполнение задачи: ${taskTitle}${typeof revertData?.removedStars === 'number' ? ` (${formatStarAmount(-Math.abs(revertData.removedStars), false)} ⭐)` : ''}`,
          details: {
            childName: getChildName(revertTarget.childId),
            taskId: revertTarget.details.taskId,
            taskTitle,
            stars: typeof revertData?.removedStars === 'number' ? -Math.abs(revertData.removedStars) : undefined,
            completedAt: revertTarget.details.completedAt || revertTarget.createdAt,
          }
        })
      });

      showSaved('Задача отменена');
      loadEvents();
      setRevertTarget(null);
    } finally {
      setRevertLoading(false);
    }
  };

  const showSaved = (msg: string) => { setSaved(msg); setTimeout(() => setSaved(''), 2000); };

  // Subjects
  const addSubject = async () => {
    if (!newSubject.trim()) return;
    const ordered = normalizeSubjects(subjects);
    const updated = [...ordered, { id: `s-${Date.now()}`, name: newSubject.trim(), order: ordered.length }];
    await saveSubjects(updated);
    setNewSubject('');
    showSaved('Предмет добавлен');
  };
  const removeSubject = async (id: string) => {
    const updated = normalizeSubjects(subjects).filter(s => s.id !== id);
    await saveSubjects(updated);
    showSaved('Предмет удалён');
  };
  const moveSubject = async (index: number, dir: -1 | 1) => {
    const ordered = normalizeSubjects(subjects);
    const currentIndex = index + dir;
    if (currentIndex < 0 || currentIndex >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[currentIndex]] = [next[currentIndex], next[index]];
    await saveSubjects(next);
  };

  const saveGradeMapping = async () => {
    const parseVal = (s: string) => {
      const cleaned = s
        .replace(/[−–]/g, '-')
        .replace(/[^0-9.-]/g, '')
        .trim();
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : 0;
    };
    const gradeToStars = { '5': parseVal(gradeMapping['5']), '4': parseVal(gradeMapping['4']), '3': parseVal(gradeMapping['3']), '2': parseVal(gradeMapping['2']) };
    const settings = await (await fetch('/api/settings')).json();
    settings.childSettings = settings.childSettings || {};
    settings.childSettings[settingsChildId] = {
      ...getChildSettings(settings, settingsChildId),
      gradeToStars: normalizeGradeToStars(gradeToStars),
    };
    if (settingsChildId === 'ali') {
      settings.gradeToStars = settings.childSettings[settingsChildId].gradeToStars;
    }
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    showSaved('Маппинг оценок сохранён');
  };

  const saveGradeHistoryLimit = async () => {
    const limit = Math.min(50, Math.max(20, parseInt(gradeHistoryLimit) || 20));
    const settings = await (await fetch('/api/settings')).json();
    settings.gradeHistoryLimit = limit;
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    setGradeHistoryLimit(String(limit));
    showSaved('Лимит истории сохранён');
  };

  // Star economy
  const saveEconomy = async () => {
    const settings = await (await fetch('/api/settings')).json();
    settings.currencyEnabled = currencyEnabled;
    settings.resetEnabled = resetEnabled;
    settings.resetDays = parseInt(resetDays) || 90;
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    showSaved('Экономика сохранена');
  };

  const getTaskCategoryLabel = (categoryId: string, customLabel?: string) => {
    if (customLabel?.trim()) return customLabel.trim();
    const item = childCategories.find(cat => cat.id === categoryId);
    if (item) return item.label;
    const builtin = BUILTIN_TASK_CATEGORIES.find(cat => cat.id === categoryId);
    return builtin?.label || categoryId;
  };

  const sortedRewards = [...rewards].sort((a, b) => {
    const orderA = Number.isFinite(Number(a.sortOrderByChild?.[settingsChildId])) ? Number(a.sortOrderByChild?.[settingsChildId]) : 9999;
    const orderB = Number.isFinite(Number(b.sortOrderByChild?.[settingsChildId])) ? Number(b.sortOrderByChild?.[settingsChildId]) : 9999;
    return orderA - orderB;
  });
  const orderedSubjects = normalizeSubjects(subjects);
  const activeTemplates = templates.filter((template) => template.active);
  const inactiveTemplates = templates
    .filter((template) => !template.active)
    .sort((a, b) => {
      const dateA = new Date((a as any).inactiveAt || (a as any).updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date((b as any).inactiveAt || (b as any).updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

  const getRewardOrder = (reward: Reward) => Number.isFinite(Number(reward.sortOrderByChild?.[settingsChildId]))
    ? Number(reward.sortOrderByChild?.[settingsChildId])
    : 9999;

  const refreshRewards = async () => {
    const res = await fetch(`/api/rewards?childId=${settingsChildId}&includeInactive=1`);
    const data = await res.json();
    setRewards(Array.isArray(data) ? data : []);
  };

  const refreshSubjects = async () => {
    const res = await fetch(`/api/grades?childId=${settingsChildId}`);
    const data = await res.json();
    setSubjects(Array.isArray(data) ? normalizeSubjects(data) : []);
  };

  const refreshTemplates = async () => {
    const res = await fetch('/api/tasks/templates');
    const data = await res.json();
    setTemplates(Array.isArray(data) ? data.filter((t: TaskTemplate) => t.childId === settingsChildId || t.childId === 'both') : []);
  };

  const deleteTemplatesByIds = async (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    await fetch('/api/tasks/templates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: uniqueIds, childId: settingsChildId, date: today })
    });
    await refreshTemplates();
  };

  const saveSubjects = async (nextSubjects: Subject[]) => {
    const normalized = normalizeSubjects(nextSubjects);
    setSubjects(normalized);
    await fetch('/api/grades', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: settingsChildId, subjects: normalized })
    });
    await refreshSubjects();
  };

  const saveChildSettings = async (patch: Partial<ChildSettingsForm>) => {
    const settings = await (await fetch('/api/settings')).json();
    const currentChild = getChildSettings(settings, settingsChildId);
    settings.childSettings = settings.childSettings || {};
    settings.childSettings[settingsChildId] = {
      ...currentChild,
      ...(patch.taskCategories ? { taskCategories: patch.taskCategories } : {}),
      ...(patch.notifications ? { notifications: patch.notifications } : {}),
      ...(patch.ai ? { ai: { ...patch.ai, aiModelFallback: patch.ai.aiModelFallback || aiModelFallback } } : {}),
      ...(patch.gradesEnabled !== undefined ? { gradesEnabled: patch.gradesEnabled } : {}),
    };
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    setSettingsData(settings);
  };

  const saveChildGradesEnabled = async (childId: 'ali' | 'said', enabled: boolean) => {
    const settings = await (await fetch('/api/settings')).json();
    const currentChild = getChildSettings(settings, childId);
    settings.childSettings = settings.childSettings || {};
    settings.childSettings[childId] = {
      ...currentChild,
      gradesEnabled: enabled,
    };
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    setSettingsData(settings);
  };

  const saveNotifications = async () => {
    setNotificationSaving(true);
    try {
      await saveChildSettings({ notifications: notificationPrefs });
      showSaved('Уведомления сохранены');
      setWebPushStatus(notificationPrefs.webPush.enabled ? 'Настройки Web Push обновлены.' : 'Web Push выключен.');
      if (notificationPrefs.webPush.enabled) {
        const subscribed = await ensureWebPushSubscription();
        if (subscribed) {
          setWebPushStatus('Web Push подключён.');
        }
      }
    } finally {
      setNotificationSaving(false);
    }
  };

  const toggleNotificationChannel = (channel: 'telegram' | 'webPush', enabled: boolean) => {
    setNotificationPrefs(prev => ({ ...prev, [channel]: { ...prev[channel], enabled } }));
  };

  const toggleNotificationEvent = (channel: 'telegram' | 'webPush', eventKey: keyof typeof NOTIFICATION_EVENT_LABELS, enabled: boolean) => {
    setNotificationPrefs(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        events: {
          ...prev[channel].events,
          [eventKey]: enabled,
        },
      },
    }));
  };

  const ensureWebPushSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setWebPushStatus('Web Push не поддерживается этим браузером.');
      return false;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setWebPushStatus('Нет NEXT_PUBLIC_VAPID_PUBLIC_KEY.');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setWebPushStatus('Нужно разрешить уведомления.');
      return false;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      setWebPushStatus('Service worker не зарегистрирован.');
      return false;
    }

    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: settingsChildId, subscription: existing.toJSON() })
      });
      return true;
    }

    const appServerKey = urlBase64ToUint8Array(vapidKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey,
    });

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: settingsChildId, subscription: subscription.toJSON() })
    });
    return true;
  };

  const unsubscribeWebPush = async () => {
    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: settingsChildId, endpoint: subscription.endpoint })
      });
      await subscription.unsubscribe();
    }
    return true;
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const moveReward = async (index: number, dir: -1 | 1) => {
    const currentIndex = index + dir;
    if (currentIndex < 0 || currentIndex >= sortedRewards.length) return;
    const reordered = [...sortedRewards];
    [reordered[index], reordered[currentIndex]] = [reordered[currentIndex], reordered[index]];
    const updated = reordered.map((reward, nextIndex) => ({
      ...reward,
      sortOrderByChild: {
        ...(reward.sortOrderByChild || {}),
        [settingsChildId]: nextIndex,
      },
    }));
    setRewards(updated);
    await fetch('/api/rewards', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: updated.map((reward) => ({
          id: reward.id,
          sortOrderByChild: reward.sortOrderByChild,
        }))
      })
    });
    await refreshRewards();
  };

  const toggleRewardActive = async (reward: Reward, nextActive: boolean) => {
    await fetch('/api/rewards', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reward.id, active: nextActive })
    });
    await refreshRewards();
    showSaved(nextActive ? 'Награда включена' : 'Награда выключена');
  };

  const persistTemplateActiveState = async (template: TaskTemplate, nextActive: boolean) => {
    const today = new Date().toISOString().split('T')[0];
    const nextTemplates = templates.map((item) => {
      if (item.id !== template.id) return item;
      return {
        ...item,
        active: nextActive,
        oneTimeDate: nextActive && (!Array.isArray(item.repeatDays) || item.repeatDays.length === 0) ? (item.oneTimeDate || today) : item.oneTimeDate,
        inactiveAt: nextActive ? null : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
    const normalized = nextTemplates.map((item, index) => ({ ...item, sortOrder: index }));
    setTemplates(normalized);
    await fetch('/api/tasks/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized)
    });
    await refreshTemplates();
    showSaved(nextActive ? 'Задача включена' : 'Задача выключена');
  };

  const saveTaskCategories = async (categories: TaskCategoryItem[]) => {
    setCategorySaving(true);
    try {
      await saveChildSettings({ taskCategories: categories.map((cat, index) => ({ ...cat, order: index })) });
      showSaved('Разделы сохранены');
      setChildCategories(categories.map((cat, index) => ({ ...cat, order: index })));
    } finally {
      setCategorySaving(false);
    }
  };

  const addCategory = async () => {
    const label = newCategoryName.trim();
    if (!label) return;
    const normalizedId = label.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-+|-+$/g, '') || `cat-${Date.now()}`;
    if (childCategories.some(cat => cat.label.toLowerCase() === label.toLowerCase() || cat.id === normalizedId)) {
      setNewCategoryName('');
      return;
    }
    const next = [...childCategories, { id: normalizedId, label, active: true, builtIn: false, order: childCategories.length }];
    await saveTaskCategories(next);
    setNewCategoryName('');
    if (!newCategory || !next.some(cat => cat.id === newCategory)) {
      setNewCategory(normalizedId);
    }
  };

  const removeCategory = async (id: string) => {
    const next = childCategories.filter(cat => cat.id !== id).map((cat, index) => ({ ...cat, order: index }));
    await saveTaskCategories(next);
    if (newCategory === id) {
      setNewCategory(next.find(cat => cat.active)?.id || next[0]?.id || 'study');
    }
  };

  const moveCategory = async (index: number, dir: -1 | 1) => {
    const currentIndex = index + dir;
    if (currentIndex < 0 || currentIndex >= childCategories.length) return;
    const next = [...childCategories];
    [next[index], next[currentIndex]] = [next[currentIndex], next[index]];
    await saveTaskCategories(next);
  };

  // Rewards
  const addReward = async () => {
    if (!rName.trim() || !rCost) return;
    const nextOrder = sortedRewards.reduce((max, reward) => Math.max(max, getRewardOrder(reward)), -1) + 1;
    await fetch('/api/rewards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childId: settingsChildId, title: rName.trim(), description: rDesc || undefined, costStars: parseFloat(rCost), icon: rIcon, iconStyle: rStyle, image: rImage || undefined, active: true, sortOrderByChild: { [settingsChildId]: nextOrder } }) });
    resetReward();
    await refreshRewards();
    showSaved('Награда добавлена');
  };
  const editReward = (r: Reward) => { setEditId(r.id); setRName(r.title); setRCost(String(r.costStars)); setRDesc(r.description || ''); setRIcon(r.icon); setRStyle(r.iconStyle); setRImage(r.image || null); };
  const saveEditReward = async () => {
    if (!editId) return;
    const reward = rewards.find(item => item.id === editId);
    await fetch('/api/rewards', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editId, title: rName.trim(), description: rDesc || '', costStars: parseFloat(rCost), icon: rIcon, iconStyle: rStyle, image: rImage || null, sortOrderByChild: reward?.sortOrderByChild || {} }) });
    setEditId(null); resetReward(); await refreshRewards(); showSaved('Награда обновлена');
  };
  const removeReward = async (id: string) => { await fetch(`/api/rewards?id=${id}`, { method: 'DELETE' }); await refreshRewards(); showSaved('Награда удалена'); };
  const resetReward = () => { setRName(''); setRCost(''); setRDesc(''); setRIcon('🎁'); setRStyle('color'); setRImage(null); setEditId(null); };

  // PIN
  const savePin = async (slot: number, val: string) => {
    if (val.length < 4) return;
    await fetch('/api/auth/parent/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: val, pinSlot: slot }) });
    showSaved(`PIN ${slot} сохранён`); slot === 1 ? setPin1('') : setPin2('');
    const res = await fetch('/api/auth/parent/settings'); setPinStatus(await res.json());
  };
  const saveRecovery = async () => {
    if (recovery.length < 4) return;
    await fetch('/api/auth/parent/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recoveryWord: recovery }) });
    showSaved('Recovery слово сохранено'); setRecovery('');
    const res = await fetch('/api/auth/parent/settings'); setPinStatus(await res.json());
  };

  // AI
  const saveAI = async () => {
    setSaving(true);
    try {
      const settings = await (await fetch('/api/settings')).json();
      const childSettings = getChildSettings(settings, settingsChildId);
      settings.systemPrompt = systemPrompt;
      settings.deepPrompt = deepPrompt;
      settings.openRouterUrl = openRouterUrl;
      settings.aiModel = aiModel;
      settings.aiModelFallback = aiModelFallback;
      settings.aiLimit = parseInt(aiLimit) || 3;
      settings.aiEnabled = aiEnabled;
      settings.childSettings = settings.childSettings || {};
      settings.childSettings[settingsChildId] = {
        ...childSettings,
        ai: {
          ...childSettings.ai,
          enabled: aiEnabled,
          richMode: aiRichMode,
          openRouterUrl,
          aiModel,
          aiModelFallback,
          aiLimit: parseInt(aiLimit) || 3,
          systemPrompt,
          deepPrompt,
        }
      };
      await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      showSaved('Настройки AI сохранены');
    } finally {
      setSaving(false);
    }
  };

  const testAiConnection = async () => {
    setTestingAiConnection(true);
    setAiConnectionStatus('');
    try {
      const res = await fetch('/api/ai/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: settingsChildId,
          aiPrefs: {
            enabled: aiEnabled,
            richMode: aiRichMode,
            openRouterUrl,
            aiModel,
            aiModelFallback,
            aiLimit: parseInt(aiLimit) || 3,
            systemPrompt,
            deepPrompt,
          }
        })
      });
      const data = await res.json();
      setAiConnectionStatus(data.ok ? `Связь есть: ${data.message}` : `Связь не прошла: ${data.message || data.mode}`);
    } catch (error) {
      setAiConnectionStatus('Не удалось проверить связь.');
    } finally {
      setTestingAiConnection(false);
    }
  };

  // Tasks
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const toggleDay = (day: number) => { setNewDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]); };
  const editTemplate = (t: TaskTemplate) => {
    setEditTemplateId(t.id); setNewTitle(t.title); setNewStars(String(t.stars));
    setNewCategory(t.category); setNewDays(t.repeatDays || []);
  };
  const addTemplate = async () => {
    if (!newTitle.trim() || !newStars) return;
    const current = await (await fetch('/api/tasks/templates')).json();
    let updated = Array.isArray(current) ? [...current] : [];
    const selectedCategory = childCategories.find(cat => cat.id === newCategory);
    const categoryId = selectedCategory?.id || newCategory;
    const customCategory = selectedCategory && !selectedCategory.builtIn ? selectedCategory.label : '';
    const oneTimeDate = newDays.length === 0 ? new Date().toISOString().split('T')[0] : undefined;
    if (editTemplateId) {
      updated = updated.map((t: any) => t.id === editTemplateId ? {
        ...t,
        title: newTitle.trim(),
        category: categoryId,
        customCategory,
        repeatDays: newDays,
        oneTimeDate,
        stars: parseFloat(newStars),
        detailsText: newDetailsText,
        requiresOpenDetails: newRequiresOpenDetails,
        subtasksMode: newSubtasksMode,
        subtasks: newSubtasks,
        inactiveAt: newDays.length === 0 ? t.inactiveAt || null : t.inactiveAt || null,
        updatedAt: new Date().toISOString()
      } : t);
    } else {
      updated.push({
        id: `tpl-${Date.now()}`,
        childId: settingsChildId,
        title: newTitle.trim(),
        category: categoryId,
        customCategory,
        repeatDays: newDays,
        oneTimeDate,
        stars: parseFloat(newStars),
        active: true,
        sortOrder: updated.length,
        inactiveAt: null,
        requiresOpenDetails: newRequiresOpenDetails,
        detailsText: newDetailsText,
        subtasksMode: newSubtasksMode,
        subtasks: newSubtasks,
        askDifficultyAfterDone: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    const normalized = updated.map((template: any, index: number) => ({ ...template, sortOrder: index, updatedAt: template.updatedAt || new Date().toISOString() }));
    await fetch('/api/tasks/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(normalized) });
    setTemplates(normalized);
    setNewTitle(''); setNewStars('1'); setNewDays([]); setNewDetailsText(''); setNewRequiresOpenDetails(false); setNewSubtasksMode('none'); setNewSubtasks([]); setEditTemplateId(null); loadAll();
  };
  const deleteTemplate = async (id: string) => {
    await deleteTemplatesByIds([id]);
    showSaved('Задача удалена');
  };
  const moveTemplate = async (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= activeTemplates.length) return;
    const reordered = [...activeTemplates];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    const inactive = templates.filter(template => !template.active);
    const updated = [...reordered, ...inactive].map((template, nextIndex) => ({ ...template, sortOrder: nextIndex }));
    await fetch('/api/tasks/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    await refreshTemplates();
  };
  const clearInactiveTemplates = async () => {
    await deleteTemplatesByIds(inactiveTemplates.map((template) => template.id));
    setShowInactiveTemplates(false);
    showSaved('Неактивные задачи очищены');
  };
  const cancelEdit = () => { setEditTemplateId(null); setNewTitle(''); setNewStars('1'); setNewDays([]); setNewDetailsText(''); setNewRequiresOpenDetails(false); setNewSubtasksMode('none'); setNewSubtasks([]); };
  const beginEditTemplate = (t: TaskTemplate) => {
    setEditTemplateId(t.id);
    setNewTitle(t.title);
    setNewStars(String(t.stars));
    setNewCategory(t.category);
    setNewDays(t.repeatDays || []);
    setNewDetailsText((t as any).detailsText || '');
    setNewRequiresOpenDetails(!!(t as any).requiresOpenDetails);
    setNewSubtasksMode((t as any).subtasksMode || 'none');
    setNewSubtasks(Array.isArray((t as any).subtasks) ? (t as any).subtasks.map((st: any, idx: number) => ({ id: st.id || `subtask-${idx}`, title: st.title || '', done: !!st.done })) : []);
  };
  const addTemplateSubtask = () => {
    setNewSubtasks(prev => [...prev, { id: `subtask-${Date.now()}-${prev.length}`, title: '' }]);
  };
  const updateTemplateSubtask = (id: string, title: string) => {
    setNewSubtasks(prev => prev.map(st => st.id === id ? { ...st, title } : st));
  };
  const removeTemplateSubtask = (id: string) => {
    setNewSubtasks(prev => prev.filter(st => st.id !== id));
  };

  if (!authChecked || loading) return (
    <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center">
      <svg width={48} height={48} viewBox="0 0 24 24" fill="none" className="animate-spin text-blue-500"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="60" strokeDashoffset="20"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle></svg>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FB] font-sans text-slate-800 pb-10">
      <header className="bg-white px-4 md:px-6 py-3 md:py-4 flex items-center justify-between border-b border-slate-100 sticky top-0 z-40">
        <h1 className="text-lg md:text-xl font-extrabold text-slate-800">Настройки</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowInbox(true)}
            className="w-10 h-10 rounded-xl border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors flex items-center justify-center"
            title="Входящие"
          >
            <Bell size={18} />
          </button>
          <div className="bg-slate-100 rounded-xl p-1 flex">
            {(['ali', 'said'] as const).map(id => (
              <button key={id} onClick={() => setSettingsChildId(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${settingsChildId === id ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{id === 'ali' ? 'Али' : 'Саид'}</button>
            ))}
          </div>
        </div>
      </header>

      {saved && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg">✅ {saved}</div>}

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-4 space-y-3">

        {/* 1. PIN AND ACCESS */}
        <AccordionSection id="pin" title="PIN и восстановление" accentColor="border-t-4 border-t-red-500"
          icon={<Key size={18} className="text-red-500" />}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            {[
              { label: 'PIN 1', val: pin1, set: setPin1, slot: 1, has: pinStatus.hasPin1 },
              { label: 'PIN 2 (резерв)', val: pin2, set: setPin2, slot: 2, has: pinStatus.hasPin2 },
              { label: 'Recovery слово', val: recovery, set: setRecovery, slot: 3, has: pinStatus.hasRecovery, text: true },
            ].map(item => (
              <div key={item.slot}>
                <label className="block text-xs font-bold text-slate-500 mb-1">{item.label}</label>
                <p className="text-[10px] text-slate-400 mb-1.5">{item.has ? '✅ Установлен' : '❌ Не установлен'}</p>
                <input type={item.text ? 'text' : 'password'} inputMode={item.text ? undefined : 'numeric'} maxLength={item.text ? undefined : 6}
                  placeholder={item.text ? 'Секретное слово' : '4-6 цифр'} value={item.val}
                  onChange={e => item.text ? item.set(e.target.value) : item.set(e.target.value.replace(/\D/g, ''))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all font-medium text-sm" />
                <button onClick={() => item.slot === 3 ? saveRecovery() : savePin(item.slot, item.val)}
                  disabled={(item.text ? item.val.length : item.val.length) < 4}
                  className="mt-1.5 w-full bg-red-500 text-white py-1.5 rounded-xl font-bold text-xs hover:bg-red-600 transition-colors disabled:opacity-50">Сохранить</button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button onClick={async () => {
              await fetch('/api/auth/parent/settings', { method: 'DELETE' });
              setPinStatus({ hasPin1: false, hasPin2: false, hasRecovery: false });
              showSaved('PIN сброшен до 199991');
            }} className="text-[11px] text-red-400 hover:text-red-600 font-medium underline">Сбросить PIN</button>
          </div>
        </AccordionSection>

        {/* 2. TASKS (SCHEDULE) */}
        <AccordionSection id="tasks" title="Задачи (расписание)" accentColor="border-t-4 border-t-green-500"
          icon={<Calendar size={18} className="text-green-500" />}>
          <div className="space-y-3 mb-4">
            <input type="text" placeholder="Что нужно сделать?" value={newTitle} onChange={e => setNewTitle(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all font-medium text-sm" />
            <div className="flex gap-2">
              <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-green-500 transition-all font-medium text-sm bg-white">
                {childCategories.filter(cat => cat.active).map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
              <input type="number" step="0.5" min="0.5" placeholder="⭐" value={newStars} onChange={e => setNewStars(e.target.value)}
                className="w-20 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-amber-500 transition-all font-medium text-sm" />
              {editTemplateId ? (
                <button onClick={cancelEdit} className="bg-slate-300 text-white w-11 h-11 rounded-xl flex items-center justify-center hover:bg-slate-400 shrink-0"><X size={20} /></button>
              ) : null}
              <button onClick={addTemplate} className={editTemplateId ? 'bg-blue-500 text-white w-11 h-11 rounded-xl flex items-center justify-center hover:bg-blue-600 shrink-0' : 'bg-green-500 text-white w-11 h-11 rounded-xl flex items-center justify-center hover:bg-green-600 shrink-0'}>
                {editTemplateId ? <Check size={20} /> : <Plus size={20} />}
              </button>
            </div>
            <input type="text" placeholder="Описание квеста (необязательно)" value={newDetailsText} onChange={e => setNewDetailsText(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-500 transition-all font-medium text-sm" />
            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-3">
              <button
                type="button"
                onClick={() => setShowCategoryPanel(v => !v)}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <div>
                  <p className="text-sm font-bold text-slate-700">Разделы задач</p>
                  <p className="text-xs text-slate-400">Добавляй новые и скрывай ненужные разделы отдельно для каждого ребёнка</p>
                </div>
                <ChevronDown size={18} className={`text-slate-400 transition-transform ${showCategoryPanel ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {showCategoryPanel && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={e => setNewCategoryName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addCategory()}
                          placeholder="Новый раздел, например: прогулка"
                          className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-green-500 transition-all font-medium text-sm bg-white"
                        />
                        <button
                          type="button"
                          onClick={addCategory}
                          className="bg-green-500 text-white w-11 h-11 rounded-xl flex items-center justify-center hover:bg-green-600 shrink-0"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {childCategories.map((cat, idx) => (
                          <div key={cat.id} className="flex items-center justify-between gap-2 bg-white rounded-xl border border-slate-200 px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-700 truncate">{cat.label}</p>
                              <p className="text-[11px] text-slate-400">{cat.builtIn ? 'Встроенный раздел' : 'Пользовательский раздел'}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => moveCategory(idx, -1)}
                                disabled={idx === 0}
                                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 disabled:opacity-30 flex items-center justify-center"
                                title="Выше"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveCategory(idx, 1)}
                                disabled={idx === childCategories.length - 1}
                                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-blue-600 disabled:opacity-30 flex items-center justify-center"
                                title="Ниже"
                              >
                                <ArrowDown size={14} />
                              </button>
                              {!cat.builtIn && (
                                <button
                                  type="button"
                                  onClick={() => removeCategory(cat.id)}
                                  className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 flex items-center justify-center"
                                  title="Удалить"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-400">Встроенные разделы оставляем, чтобы старые задачи не ломались. Новые разделы добавляются сразу и появляются на главной странице в выпадающем списке.</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => saveTaskCategories(childCategories)}
                          disabled={categorySaving}
                          className="bg-green-500 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                          {categorySaving ? 'Сохранение...' : 'Сохранить разделы'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
              <div>
                <p className="text-sm font-bold text-slate-700">Требовать открыть условия</p>
                <p className="text-xs text-slate-400">Для сложных квестов перед завершением</p>
              </div>
              <Switch checked={newRequiresOpenDetails} onCheckedChange={setNewRequiresOpenDetails} />
            </div>
            <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
              <div>
                <p className="text-sm font-bold text-slate-700">Подзадачи</p>
                <p className="text-xs text-slate-400">Чекбоксы, список инструкций или без них</p>
              </div>
              <select value={newSubtasksMode} onChange={e => setNewSubtasksMode(e.target.value as any)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold bg-white">
                <option value="none">Без подзадач</option>
                <option value="checkboxes">Чекбоксы</option>
                <option value="plain-list">Список</option>
              </select>
            </div>
            {newSubtasksMode !== 'none' && (
              <div className="space-y-2 bg-slate-50 rounded-2xl border border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Подзадачи</p>
                  <button onClick={addTemplateSubtask} className="text-xs font-bold text-blue-600 hover:text-blue-700">+ Добавить</button>
                </div>
                <div className="space-y-2">
                  {newSubtasks.map((st, idx) => (
                    <div key={st.id} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 w-5 shrink-0">{idx + 1}.</span>
                      <input value={st.title} onChange={e => updateTemplateSubtask(st.id, e.target.value)}
                        placeholder="Текст подзадачи"
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white" />
                      <button onClick={() => removeTemplateSubtask(st.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-1.5">
              {DAYS_SHORT.map((day, i) => {
                const di = DAY_INDEX[i];
                return (
                <button key={i} onClick={() => toggleDay(di)}
                  className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all border ${newDays.includes(di) ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300'}`}>{day}</button>
                );
              })}
            </div>
            {newDays.length === 0 && <p className="text-[11px] text-slate-400">Если дни не выбраны — задача разовая</p>}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-800">Активные</p>
                <p className="text-xs text-slate-400">Сверху только рабочие задачи, их можно переставлять стрелками</p>
              </div>
              <button
                type="button"
                onClick={() => { setCleanupMode('inactive-tasks'); setShowCleanupModal(true); }}
                className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Очистить неактивные
              </button>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {activeTemplates.length === 0 && <p className="text-slate-400 text-center py-4 text-sm">Нет активных задач</p>}
              {activeTemplates.map((t, idx) => (
                <div key={t.id} className="rounded-2xl p-3 flex items-start justify-between gap-2 group border bg-slate-50 border-slate-100">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-800 text-sm truncate">{t.title}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">{getTaskCategoryLabel(t.category, t.customCategory)}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">ON</span>
                    </div>
                    {(t as any).subtasks?.length > 0 && (
                      <div className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                        {(t as any).subtasks.map((st: any) => st.title).filter(Boolean).join(' • ')}
                      </div>
                    )}
                    <div className="flex items-center gap-0.5 mt-1 flex-wrap">
                      {DAYS_SHORT.map((day, i) => (
                        t.repeatDays?.includes(DAY_INDEX[i]) ? <span key={i} className="text-[9px] font-bold px-1.5 h-4 rounded flex items-center justify-center bg-blue-100 text-blue-600">{day}</span> : null
                      ))}
                      <span className="ml-1.5 text-[11px] font-bold text-amber-500">+{t.stars} ⭐</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => persistTemplateActiveState(t as TaskTemplate, false)}
                      className={`text-xs font-bold px-2 py-1 rounded-lg ${t.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}
                    >
                      Выключить
                    </button>
                    <button type="button" onClick={() => moveTemplate(idx, -1)} disabled={idx === 0} className="text-slate-300 hover:text-blue-500 disabled:opacity-20 p-0.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg></button>
                    <button type="button" onClick={() => moveTemplate(idx, 1)} disabled={idx === activeTemplates.length - 1} className="text-slate-300 hover:text-blue-500 disabled:opacity-20 p-0.5"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg></button>
                    <button type="button" onClick={() => beginEditTemplate(t as any)} className="text-slate-300 hover:text-blue-500 transition-colors p-1"><Edit3 size={13} /></button>
                    <button type="button" onClick={() => deleteTemplate(t.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowInactiveTemplates(prev => !prev)}
                className="flex items-center justify-between w-full text-left text-sm font-bold text-slate-700"
              >
                <span>Неактивные</span>
                <span className="text-xs text-slate-400">{inactiveTemplates.length}</span>
              </button>
              {showInactiveTemplates && (
                <div className="mt-3 space-y-1.5 max-h-60 overflow-y-auto">
                  {inactiveTemplates.length === 0 && <p className="text-slate-400 text-center py-4 text-sm">Нет неактивных задач</p>}
                  {inactiveTemplates.map((t) => (
                    <div key={t.id} className="rounded-2xl p-3 flex items-start justify-between gap-2 border bg-slate-100 border-slate-200 opacity-85">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-700 text-sm truncate">{t.title}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">{getTaskCategoryLabel(t.category, t.customCategory)}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">OFF</span>
                        </div>
                        {(t as any).subtasks?.length > 0 && (
                          <div className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                            {(t as any).subtasks.map((st: any) => st.title).filter(Boolean).join(' • ')}
                          </div>
                        )}
                        <div className="flex items-center gap-0.5 mt-1 flex-wrap">
                          {DAYS_SHORT.map((day, i) => (
                            t.repeatDays?.includes(DAY_INDEX[i]) ? <span key={i} className="text-[9px] font-bold px-1.5 h-4 rounded flex items-center justify-center bg-slate-200 text-slate-600">{day}</span> : null
                          ))}
                          <span className="ml-1.5 text-[11px] font-bold text-amber-500">+{t.stars} ⭐</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => persistTemplateActiveState(t as TaskTemplate, true)}
                          className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-200 text-slate-700 hover:bg-green-100 hover:text-green-700"
                        >
                          Включить
                        </button>
                        <button type="button" onClick={() => beginEditTemplate(t as any)} className="text-slate-300 hover:text-blue-500 transition-colors p-1"><Edit3 size={13} /></button>
                        <button type="button" onClick={() => deleteTemplate(t.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AccordionSection>

        {/* 3. SUBJECTS */}
        <AccordionSection id="subjects" title="Предметы" accentColor="border-t-4 border-t-blue-500"
          icon={<Book size={18} className="text-blue-500" />}>
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="Новый предмет..." value={newSubject} onChange={e => setNewSubject(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubject()}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-medium text-sm" />
            <button type="button" onClick={addSubject} className="bg-blue-500 text-white w-11 h-11 rounded-xl flex items-center justify-center hover:bg-blue-600 shrink-0"><Plus size={20} /></button>
          </div>
          <div className="space-y-1.5 mb-4">
            {orderedSubjects.map((s, idx) => (
              <div key={s.id} className="bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">{s.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => moveSubject(idx, -1)} disabled={idx === 0} className="text-slate-400 hover:text-blue-500 disabled:opacity-25 p-0.5" title="Выше">
                    <ArrowUp size={12} />
                  </button>
                  <button type="button" onClick={() => moveSubject(idx, 1)} disabled={idx === orderedSubjects.length - 1} className="text-slate-400 hover:text-blue-500 disabled:opacity-25 p-0.5" title="Ниже">
                    <ArrowDown size={12} />
                  </button>
                  <button type="button" onClick={() => removeSubject(s.id)} className="text-slate-400 hover:text-red-500 p-0.5" title="Удалить">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
            {subjects.length === 0 && <p className="text-slate-400 text-xs">Нет предметов</p>}
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-bold text-slate-500 mb-3">Маппинг оценок → звёзды</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              {[5, 4, 3, 2].map(g => (
                <div key={g} className="flex items-center gap-1.5 bg-white rounded-xl px-3 py-2 border border-slate-200">
                  <span className="font-bold text-sm">{g}</span>
                  <span className="text-slate-300 text-xs">=</span>
                  <input value={gradeMapping[String(g)]} onChange={e => setGradeMapping(prev => ({ ...prev, [String(g)]: e.target.value }))}
                    className="flex-1 min-w-0 text-sm font-bold text-center outline-none bg-transparent tabular-nums" />
                  <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />
                </div>
              ))}
            </div>
            <button onClick={saveGradeMapping} className="bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-600 transition-colors"><Save size={14} className="inline mr-1" />Сохранить маппинг</button>
          </div>

          <div className="mt-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-700">История оценок</p>
                <p className="text-xs text-slate-400">Компактное окно с лимитом от 20 до 50 записей</p>
              </div>
              <button onClick={() => setShowGradeHistory(true)} className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold hover:border-blue-300 hover:text-blue-600 transition-colors">
                Открыть
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Лимит:</span>
              <input
                type="number"
                min="20"
                max="50"
                value={gradeHistoryLimit}
                onChange={e => setGradeHistoryLimit(e.target.value)}
                className="w-20 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 transition-all font-medium text-sm text-center bg-white"
              />
              <button onClick={saveGradeHistoryLimit} className="bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors">
                Сохранить
              </button>
            </div>
          </div>
        </AccordionSection>

        {/* 4. STAR ECONOMY */}
        <AccordionSection id="economy" title="Экономика звёзд" accentColor="border-t-4 border-t-amber-500"
          icon={<DollarSign size={18} className="text-amber-500" />}>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm font-bold text-slate-700">Списание звёзд при наградах</p>
                <p className="text-xs text-slate-400">При покупке награды звёзды списываются и могут вернуться при отмене</p>
              </div>
              <Switch checked={currencyEnabled} onCheckedChange={setCurrencyEnabled} />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm font-bold text-slate-700">Обнуление через N дней</p>
                <p className="text-xs text-slate-400">Баланс сбрасывается каждые N дней</p>
              </div>
              <Switch checked={resetEnabled} onCheckedChange={setResetEnabled} />
            </div>
            {resetEnabled && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Каждые</span>
                <input type="number" value={resetDays} onChange={e => setResetDays(e.target.value)}
                  className="w-20 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-amber-500 transition-all font-medium text-sm text-center" />
                <span className="text-xs font-bold text-slate-500">дней</span>
              </div>
            )}
            <button onClick={saveEconomy} className="bg-amber-500 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-amber-600 transition-colors"><Save size={14} className="inline mr-1" />Сохранить экономику</button>
          </div>
        </AccordionSection>

        {/* 5. REWARDS */}
        <AccordionSection id="rewards" title="Награды" accentColor="border-t-4 border-t-purple-500"
          icon={<Trophy size={18} className="text-purple-500" />}>
          <div className="space-y-2 mb-4">
            <input type="text" placeholder="Название" value={rName} onChange={e => setRName(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all font-medium text-sm" />
            <div className="grid grid-cols-[1fr_44px_44px] gap-2">
              <input type="number" placeholder="Цена" value={rCost} onChange={e => setRCost(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-all font-medium text-sm" />
              <button type="button" onClick={() => setShowIcons(!showIcons)}
                className="w-11 h-11 rounded-xl border-2 border-slate-200 flex items-center justify-center text-xl hover:border-purple-300 transition-colors justify-self-center">{rIcon}</button>
              {editId ? (
                <button type="button" onClick={saveEditReward} className="bg-green-500 text-white w-11 h-11 rounded-xl flex items-center justify-center hover:bg-green-600 justify-self-center"><Check size={20} /></button>
              ) : (
                <button type="button" onClick={addReward} className="bg-purple-500 text-white w-11 h-11 rounded-xl flex items-center justify-center hover:bg-purple-600 justify-self-center"><Plus size={20} /></button>
              )}
            </div>
            <input type="text" placeholder="Описание (необязательно)" value={rDesc} onChange={e => setRDesc(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 transition-all font-medium text-sm" />
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="relative shrink-0">
                {rImage ? (
                  <img src={rImage} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-slate-200" />
                ) : (
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center text-sm font-bold border border-slate-200">
                    <Trophy size={20} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-700">Изображение награды</p>
                <p className="text-[10px] text-slate-400">JPEG, PNG, BMP (до 1MB)</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:border-purple-300 cursor-pointer transition-colors">
                  Загрузить
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 1 * 1024 * 1024) { showSaved('Файл слишком большой (макс 1MB)'); return; }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const dataUrl = ev.target?.result as string;
                      setRImage(dataUrl);
                    };
                    reader.readAsDataURL(file);
                  }} />
                </label>
                {rImage && (
                  <button type="button" onClick={() => setRImage(null)} className="text-xs text-red-500 hover:text-red-700 font-medium">
                    Удалить
                  </button>
                )}
              </div>
            </div>
          </div>
          {showIcons && (
            <div className="mb-4 bg-slate-50 rounded-2xl p-3 max-h-40 overflow-y-auto border border-slate-200">
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setRStyle('color')} className={`px-3 py-1 rounded-lg text-xs font-bold ${rStyle === 'color' ? 'bg-blue-500 text-white' : 'bg-white text-slate-600'}`}>Цветные</button>
                <button type="button" onClick={() => setRStyle('minimal')} className={`px-3 py-1 rounded-lg text-xs font-bold ${rStyle === 'minimal' ? 'bg-blue-500 text-white' : 'bg-white text-slate-600'}`}>Минимал</button>
              </div>
              <div className="grid grid-cols-8 gap-1">
                {(rStyle === 'color' ? COLOR_ICONS : MINIMAL_ICONS.map(i => getIconDisplay(i, 'minimal'))).map((icon, idx) => (
                  <button key={idx} type="button" onClick={() => { setRIcon(icon); setShowIcons(false); }}
                    className={`w-8 h-8 rounded-lg text-base flex items-center justify-center hover:bg-blue-100 transition-colors ${rIcon === icon ? 'bg-blue-200 ring-2 ring-blue-400' : ''}`}>{icon}</button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {sortedRewards.map((r, idx) => (
              <div key={r.id} className={`group relative overflow-hidden rounded-2xl p-3 flex items-center justify-between transition-all duration-500 ${r.active ? 'bg-slate-50 border border-slate-100 shadow-sm shadow-amber-100/30' : 'bg-slate-100 border border-slate-200 opacity-75'}`}>
                <div className={`pointer-events-none absolute inset-0 rounded-2xl ${r.active ? 'bg-gradient-to-r from-amber-100/55 via-transparent to-amber-50/20 animate-reward-glow' : 'bg-gradient-to-r from-slate-200/20 via-transparent to-slate-100/10 opacity-40'}`} />
                <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                  {r.image ? (
                    <img src={r.image} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                  ) : (
                    <span className="text-lg shrink-0">{r.icon}</span>
                  )}
                  <div className="min-w-0">
                    <span className={`font-bold text-sm block truncate ${r.active ? 'text-slate-800' : 'text-slate-500'}`}>{r.title}</span>
                    {r.description && <p className="text-[11px] text-slate-400 truncate">{r.description}</p>}
                  </div>
                </div>
                <div className="relative z-10 flex items-center gap-2 shrink-0 ml-2">
                  <span className={`text-xs font-extrabold ${r.active ? 'text-amber-600' : 'text-slate-400'}`}>{Math.max(0, Math.abs(r.costStars))} ★</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                    {r.active ? 'ON' : 'OFF'}
                  </span>
                  <Switch checked={r.active} onCheckedChange={(checked) => toggleRewardActive(r, checked)} />
                  <button
                    type="button"
                    onClick={() => moveReward(idx, -1)}
                    disabled={idx === 0}
                    className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-blue-500 disabled:opacity-30 flex items-center justify-center"
                    title="Выше"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveReward(idx, 1)}
                    disabled={idx === sortedRewards.length - 1}
                    className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-blue-500 disabled:opacity-30 flex items-center justify-center"
                    title="Ниже"
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button type="button" onClick={() => editReward(r)} className="text-slate-300 hover:text-blue-500"><Edit3 size={13} /></button>
                  <button type="button" onClick={() => removeReward(r.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
            {sortedRewards.length === 0 && <p className="text-slate-400 text-center py-4 text-sm">Нет наград</p>}
          </div>
        </AccordionSection>

        {/* 6. NOTIFICATIONS */}
        <AccordionSection id="notifications" title="Уведомления" accentColor="border-t-4 border-t-pink-500"
          icon={<BellRing size={18} className="text-pink-500" />}>
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-700">Telegram</p>
                  <p className="text-xs text-slate-400">Уведомления в чат семьи</p>
                </div>
                <Switch checked={notificationPrefs.telegram.enabled} onCheckedChange={v => toggleNotificationChannel('telegram', v)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {NOTIFICATION_EVENT_KEYS.map((eventKey) => (
                  <label key={`tg-${eventKey}`} className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2.5">
                    <span className="text-xs font-bold text-slate-600">{NOTIFICATION_EVENT_LABELS[eventKey]}</span>
                    <Switch checked={notificationPrefs.telegram.events[eventKey]} onCheckedChange={v => toggleNotificationEvent('telegram', eventKey, v)} />
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-700">Web Push</p>
                  <p className="text-xs text-slate-400">Уведомления в браузер и PWA</p>
                </div>
                <Switch checked={notificationPrefs.webPush.enabled} onCheckedChange={v => toggleNotificationChannel('webPush', v)} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={ensureWebPushSubscription}
                  className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  Подключить Web Push
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await unsubscribeWebPush();
                    setWebPushStatus('Web Push отключён.');
                  }}
                  className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold hover:border-red-300 hover:text-red-600 transition-colors"
                >
                  Отключить Web Push
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {NOTIFICATION_EVENT_KEYS.map((eventKey) => (
                  <label key={`wp-${eventKey}`} className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2.5">
                    <span className="text-xs font-bold text-slate-600">{NOTIFICATION_EVENT_LABELS[eventKey]}</span>
                    <Switch checked={notificationPrefs.webPush.events[eventKey]} onCheckedChange={v => toggleNotificationEvent('webPush', eventKey, v)} />
                  </label>
                ))}
              </div>
              {webPushStatus && <p className="text-[11px] text-slate-500">{webPushStatus}</p>}
            </div>

            <button
              type="button"
              onClick={saveNotifications}
              disabled={notificationSaving}
              className="bg-pink-500 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-pink-600 transition-colors disabled:opacity-50"
            >
              {notificationSaving ? 'Сохранение...' : 'Сохранить уведомления'}
            </button>
          </div>
        </AccordionSection>

        {/* 7. AI */}
        <AccordionSection id="ai" title="Послание героя" accentColor="border-t-4 border-t-indigo-500"
          icon={<Bot size={18} className="text-indigo-500" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100 md:col-span-2">
              <div>
                <p className="text-sm font-bold text-slate-700">OpenRouter</p>
                <p className="text-xs text-slate-400">Включает реальный ответ модели</p>
              </div>
              <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
            </div>
            <div className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100 md:col-span-2">
              <div>
                <p className="text-sm font-bold text-slate-700">Глубокий режим</p>
                <p className="text-xs text-slate-400">Добавляет один дополнительный смысловой слой к ответу</p>
              </div>
              <Switch checked={aiRichMode} onCheckedChange={setAiRichMode} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">OpenRouter Base URL</label>
              <input type="text" value={openRouterUrl} onChange={e => setOpenRouterUrl(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Модель</label>
              <input type="text" value={aiModel} onChange={e => setAiModel(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Модель fallback</label>
              <input type="text" value={aiModelFallback} onChange={e => setAiModelFallback(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Лимит посланий в день</label>
              <input type="number" min="1" max="10" value={aiLimit} onChange={e => setAiLimit(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Системный промпт</label>
              <textarea rows={3} value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium text-sm resize-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Промпт глубокого режима</label>
              <textarea rows={4} value={deepPrompt} onChange={e => setDeepPrompt(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium text-sm resize-none" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={saveAI} disabled={saving}
              className="bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-600 transition-colors disabled:opacity-50">
              {saving ? 'Сохранение...' : <><Save size={14} className="inline mr-1" />Сохранить</>}
            </button>
            <button onClick={testAiConnection} disabled={testingAiConnection}
              className="bg-white border border-indigo-200 text-indigo-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors disabled:opacity-50">
              {testingAiConnection ? 'Проверяем...' : <><Wifi size={14} className="inline mr-1" />Проверить связь</>}
            </button>
            {aiConnectionStatus && <div className="text-xs font-medium text-slate-500 self-center">{aiConnectionStatus}</div>}
            <button onClick={async () => {
              const today = new Date().toISOString().split('T')[0];
              await fetch(`/api/ai/hero-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ childId: settingsChildId, childName: childName, mode: 'full', tasks: [], resetCounter: true })
              });
              showSaved('Счётчик сброшен');
            }}
              className="bg-orange-100 text-orange-600 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-200 transition-colors">
              🔄 Сбросить счётчик
            </button>
          </div>
        </AccordionSection>

        {/* 8. INTERFACE */}
        <AccordionSection id="interface" title="Интерфейс" accentColor="border-t-4 border-t-teal-500"
          icon={<User size={18} className="text-teal-500" />}>
          <div className="space-y-4">
            {(['ali', 'said'] as const).map(id => {
              const isAli = id === 'ali';
              const avatar = isAli ? avatarAli : avatarSaid;
              const label = isAli ? 'Али' : 'Саид';
              const childGradesEnabled = settingsData ? getChildSettings(settingsData, id).gradesEnabled : (id === 'ali');
              return (
                <div key={id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {avatar ? (
                        <img src={avatar} alt={label} className="w-14 h-14 rounded-full object-cover border-2 border-slate-200" />
                      ) : (
                        <div className="w-14 h-14 bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold">
                          {isAli ? 'А' : 'С'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-700">{label}</p>
                      <p className="text-xs text-slate-400 mb-2">Фото профиля</p>
                      <label className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:border-blue-300 cursor-pointer transition-colors">
                        <Camera size={14} />
                        {avatar ? 'Изменить' : 'Загрузить'}
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 1 * 1024 * 1024) { showSaved('Файл слишком большой (макс 1MB)'); return; }
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            const dataUrl = ev.target?.result as string;
                            if (isAli) setAvatarAli(dataUrl); else setAvatarSaid(dataUrl);
                            await fetch('/api/children', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, avatarUrl: dataUrl }) });
                            showSaved(`Фото ${label} обновлено`);
                          };
                          reader.readAsDataURL(file);
                        }} />
                      </label>
                      {avatar && (
                        <button onClick={async () => {
                          if (isAli) setAvatarAli(null); else setAvatarSaid(null);
                          await fetch('/api/children', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, avatarUrl: null }) });
                          showSaved(`Фото ${label} удалено`);
                        }} className="ml-2 text-xs text-red-400 hover:text-red-600 font-medium">Удалить</button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                    <div>
                      <p className="text-sm font-bold text-slate-700">Показывать оценки</p>
                    </div>
                    <Switch
                      checked={childGradesEnabled}
                      onCheckedChange={async (checked) => {
                        if (id === settingsChildId) setGradesEnabled(checked);
                        await saveChildGradesEnabled(id, checked);
                        showSaved(`${label}: оценки ${checked ? 'включены' : 'скрыты'}`);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </AccordionSection>

        {/* 9. SYSTEM */}
        <AccordionSection id="system" title="Система" accentColor="border-t-4 border-t-slate-500"
          icon={<RefreshCw size={18} className="text-slate-500" />}>
          <div className="space-y-2">
            <button onClick={() => { setCleanupMode('test-data'); setShowCleanupModal(true); }}
              className="w-full bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors text-left">
              🗑 Очистить тестовые данные
            </button>
            <button onClick={() => {
              const d = new Date(); d.setTime(d.getTime() - 1);
              document.cookie = 'parent-session=; expires=' + d.toUTCString() + '; path=/;';
              window.location.href = '/';
            }}
              className="w-full bg-red-100 text-red-600 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-red-200 transition-colors text-left">
              🚪 Завершить сессию
            </button>
          </div>
        </AccordionSection>

      </main>

      <AnimatePresence>
        {showGradeHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowGradeHistory(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[80vh] overflow-hidden"
            >
              <div className="p-4 md:p-5 border-b border-slate-100 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg md:text-xl font-extrabold text-slate-800">История оценок</h2>
                  <p className="text-sm text-slate-500">Показываем последние {Math.min(50, Math.max(20, parseInt(gradeHistoryLimit) || 20))} записей</p>
                </div>
                <button onClick={() => setShowGradeHistory(false)} className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 md:p-5 overflow-y-auto space-y-2">
                {gradeHistoryLoading ? (
                  <div className="space-y-2">
                    {[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />)}
                  </div>
                ) : gradeHistory.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">Пока нет оценок</div>
                ) : (
                  gradeHistory.map(g => (
                    <div key={g.id} className="flex items-center justify-between bg-slate-50 rounded-2xl p-3 border border-slate-100">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl font-extrabold text-base flex items-center justify-center border-2 ${g.grade === 5 ? 'bg-green-100 text-green-700 border-green-300' : g.grade === 4 ? 'bg-blue-100 text-blue-700 border-blue-300' : g.grade === 3 ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-red-100 text-red-700 border-red-300'}`}>{g.grade}</div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{g.subjectName}</p>
                          <p className="text-[11px] text-slate-400">{new Date(g.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500 font-bold text-xs shrink-0 ml-3">
                        {typeof g.starsAwarded === 'number'
                          ? formatStarAmount(g.starsAwarded, false)
                          : formatStarAmount(g.grade === 5 ? 5 : g.grade === 4 ? 2 : 0, false)}
                        <Star size={11} className="fill-amber-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
        {showInbox && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowInbox(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-3xl max-h-[85vh] overflow-hidden bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col"
            >
              <div className="p-4 md:p-5 border-b border-slate-100 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg md:text-xl font-extrabold text-slate-800">Входящие</h2>
                  <p className="text-sm text-slate-500">Последние действия и события детей</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={markAllEventsRead}
                    className="h-9 px-3 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 flex items-center gap-1.5 text-xs font-bold"
                    title="Прочитать все"
                  >
                    <CheckCheck size={15} />
                    Прочитать все
                  </button>
                  <button onClick={() => setShowInbox(false)} className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="p-4 md:p-5 border-b border-slate-100 flex flex-wrap gap-2">
                <button onClick={() => setEventFilter('all')} className={`px-3 py-2 rounded-xl text-xs font-bold ${eventFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>Все</button>
                <button onClick={() => setEventFilter('unread')} className={`px-3 py-2 rounded-xl text-xs font-bold ${eventFilter === 'unread' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>Непрочитанные</button>
                <button onClick={() => setEventChildFilter('all')} className={`px-3 py-2 rounded-xl text-xs font-bold ${eventChildFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>Все дети</button>
                <button onClick={() => setEventChildFilter('ali')} className={`px-3 py-2 rounded-xl text-xs font-bold ${eventChildFilter === 'ali' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>Али</button>
                <button onClick={() => setEventChildFilter('said')} className={`px-3 py-2 rounded-xl text-xs font-bold ${eventChildFilter === 'said' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>Саид</button>
              </div>
              <div className="p-4 md:p-5 overflow-y-auto space-y-3">
                {eventsLoading ? (
                  <div className="text-center py-8 text-slate-400">Загрузка...</div>
                ) : events.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">Нет событий</div>
                ) : events.map(event => (
                  <div key={event.id} className={`rounded-2xl border p-4 ${event.read ? 'border-slate-100 bg-white' : 'border-blue-200 bg-blue-50/30'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`text-[11px] font-bold px-2 py-1 rounded-lg ${event.childId === 'ali' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                            {event.childId === 'ali' ? 'Али' : 'Саид'}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-600">
                            {getInboxEventTypeLabel(event.type)}
                          </span>
                          {!event.read && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                        </div>
                        <h3 className="font-bold text-slate-800 leading-tight">{normalizeInboxText(event.title)}</h3>
                        <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{normalizeInboxText(event.body)}</p>
                        {event.rewardId && event.details && (
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                              <span className="px-2 py-1 rounded-full bg-white text-slate-500 border border-slate-200">
                                {event.details.rewardTitle || 'Награда'}
                              </span>
                              <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                {getRewardStatusLabel(event.details.status)}
                              </span>
                              {typeof event.details.costStars === 'number' && currencyEnabled && (
                                <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                  {formatRewardReserveLabel(event.details.costStars, currencyEnabled)}
                                </span>
                              )}
                            </div>
                            {event.type === 'reward-selected' && event.details?.status === 'selected' && (
                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  onClick={() => confirmRewardEvent(event)}
                                  className="w-8 h-8 rounded-xl border border-slate-200 text-green-600 hover:bg-green-50 flex items-center justify-center"
                                  title="Подтвердить"
                                >
                                  <CheckCheck size={16} />
                                </button>
                                <button
                                  onClick={() => cancelRewardEvent(event)}
                                  className="w-8 h-8 rounded-xl border border-slate-200 text-red-500 hover:bg-red-50 flex items-center justify-center"
                                  title="Отменить"
                                >
                                  <Ban size={16} />
                                </button>
                              </div>
                            )}
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
                                <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 flex items-center gap-1">
                                  <Star size={11} className="fill-amber-400" />
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
                          </div>
                        )}
                        <p className="text-xs text-slate-400 mt-2">{new Date(event.createdAt).toLocaleString('ru-RU')}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-2">
                          {!event.read && (
                            <button onClick={() => markEventRead(event.id)} className="w-8 h-8 rounded-xl border border-slate-200 text-blue-500 hover:bg-blue-50 flex items-center justify-center" title="Прочитано">
                              <CheckCheck size={16} />
                            </button>
                          )}
                          <button onClick={() => deleteEvent(event.id)} className="w-8 h-8 rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center" title="Удалить">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {event.type === 'task-completed' && event.details && (
                          <button
                            onClick={() => revertTask(event)}
                            className="w-8 h-8 rounded-xl border border-slate-200 text-red-500 hover:bg-red-50 flex items-center justify-center"
                            title="Отменить выполнение задачи"
                          >
                            <Ban size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {revertTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => !revertLoading && setRevertTarget(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6"
            >
              <h2 className="text-lg font-extrabold text-slate-800">Отменить выполнение?</h2>
              <p className="text-sm text-slate-500 mt-1">
                Задача вернётся в невыполненные, а начисленные звёзды будут пересчитаны.
              </p>
              {revertError && (
                <div className="mt-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">
                  {revertError}
                </div>
              )}
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => !revertLoading && setRevertTarget(null)}
                  disabled={revertLoading}
                  className="flex-1 bg-slate-100 text-slate-700 px-4 py-3 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Не отменять
                </button>
                <button
                  onClick={confirmRevertTask}
                  disabled={revertLoading}
                  className="flex-1 bg-red-500 text-white px-4 py-3 rounded-2xl font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {revertLoading ? 'Отмена...' : 'Да, отменить'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCleanupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => !cleanupLoading && setShowCleanupModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800">
                    {cleanupMode === 'inactive-tasks' ? 'Очистить неактивные задачи?' : 'Очистить тестовые данные?'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {cleanupMode === 'inactive-tasks'
                      ? 'Будут удалены только неактивные задачи. Активные и выполненные сегодня останутся на месте.'
                      : 'Будут очищены тестовые и runtime-данные: оценки, звёздные истории, входящие, статусы наград, кэши отчётов и дневные инстансы.'}
                  </p>
                </div>
                <button
                  onClick={() => !cleanupLoading && setShowCleanupModal(false)}
                  className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center disabled:opacity-50"
                  disabled={cleanupLoading}
                >
                  <X size={18} />
                </button>
              </div>

              {cleanupMessage && (
                <div className="mb-4 rounded-2xl bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3">
                  {cleanupMessage}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setCleanupLoading(true);
                    setCleanupMessage('');
                    try {
                      if (cleanupMode === 'inactive-tasks') {
                        await clearInactiveTemplates();
                        setCleanupMessage('Неактивные задачи очищены');
                        loadAll();
                      } else {
                        const res = await fetch('/api/cleanup', { method: 'POST' });
                        const data = await res.json();
                        if (!res.ok) {
                          throw new Error(data?.error || 'Cleanup failed');
                        }
                        setCleanupMessage(data?.message || 'Тестовые данные очищены');
                        setEvents([]);
                        setGradeHistory([]);
                        if (showInbox) {
                          loadEvents();
                        }
                        if (showGradeHistory) {
                          loadGradeHistory();
                        }
                        showSaved(data?.message || 'Тестовые данные очищены');
                      }
                    } catch (error) {
                      const message = error instanceof Error ? error.message : 'Не удалось очистить данные';
                      setCleanupMessage(message);
                    } finally {
                      setCleanupLoading(false);
                    }
                  }}
                  disabled={cleanupLoading}
                  className="flex-1 bg-red-500 text-white px-4 py-3 rounded-2xl font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {cleanupLoading ? 'Удаление...' : cleanupMode === 'inactive-tasks' ? 'Очистить' : 'Удалить'}
                </button>
                <button
                  onClick={() => !cleanupLoading && setShowCleanupModal(false)}
                  disabled={cleanupLoading}
                  className="flex-1 bg-slate-100 text-slate-700 px-4 py-3 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Отмена
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

