import { NextResponse } from 'next/server';
import { getJson, setJson } from '../../upstash';
import { getChildSettings } from '@/app/lib/settings-shared';

async function getDailyLimit(): Promise<number> {
  const settings = await getJson('aq:settings') as any;
  if (settings?.aiLimit) return parseInt(String(settings.aiLimit)) || 3;
  return parseInt(process.env.HERO_AI_DAILY_LIMIT_PER_CHILD || '3');
}

function getFallbackMessage(childName: string, completedCount: number, totalCount: number): string {
  if (completedCount === totalCount && totalCount > 0) {
    const messages = [
      `${childName}, ты сегодня просто герой! Все дела сделаны — горжусь тобой! 💪`,
      `Отличная работа, ${childName}! Ты справился со всеми задачами. Так держать! 🌟`,
      `${childName}, сегодня ты показал настоящий характер! Все квесты выполнены! ⚡`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  if (completedCount > 0) {
    const messages = [
      `${childName}, ты уже кое-что сделал! Продолжай в том же духе, у тебя всё получится! 💪`,
      `Хороший старт, ${childName}! Осталось ещё немного — ты справишься! 🌟`,
      `${childName}, каждый маленький шаг приближает тебя к цели. Продолжай! 🔥`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  const messages = [
    `Привет, ${childName}! Новый день — новые возможности. Посмотри, какие квесты тебя ждут! 🚀`,
    `${childName}, сегодня отличный день, чтобы стать лучше! Загляни в свои квесты 💪`,
    `Эй, ${childName}! Герои не ждут — они действуют! Посмотри, что нужно сделать сегодня ⚡`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function getSupportiveMessage(grade: number): string | null {
  if (grade === 5) return null;
  if (grade === 4) return 'Хорошая работа, но есть к чему стремиться!';
  if (grade === 3) return 'Не переживай, завтра будет новый день! Ты старался — это главное. 🌟';
  if (grade === 2) return 'Каждый герой иногда ошибается. Важно не сдаваться! В следующий раз получится лучше! 💪';
  return null;
}

export async function POST(request: Request) {
  try {
    const { childId, childName, mode, tasks, todayGrades, resetCounter } = await request.json();

    const DAILY_LIMIT = await getDailyLimit();
    const today = new Date().toISOString().split('T')[0];
    const usageKey = `aq:ai:usage:${childId}:${today}`;

    if (resetCounter) {
      await setJson(usageKey, 0);
      return NextResponse.json({ message: 'Счётчик сброшен', remaining: DAILY_LIMIT, ai: false });
    }

    let usage = await getJson(usageKey) || 0;

    if (usage >= DAILY_LIMIT) {
      return NextResponse.json({
        message: `${childName}, ты сегодня уже получил все свои послания (${DAILY_LIMIT}/${DAILY_LIMIT})! Возвращайся завтра. А пока — действуй! 💪`,
        remaining: 0
      });
    }

    const completedCount = Array.isArray(tasks) ? tasks.filter((t: any) => t.completed).length : 0;
    const totalCount = Array.isArray(tasks) ? tasks.length : 0;

    const settings = await getJson('aq:settings') as any || {};
    const childSettings = getChildSettings(settings, childId as 'ali' | 'said');
    const aiPrefs = childSettings.ai;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const openRouterUrl = aiPrefs.openRouterUrl || settings?.openRouterUrl || process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    const configuredModel = aiPrefs.aiModel || settings?.aiModel || process.env.HERO_AI_MODEL || 'openai/gpt-4o-mini';
    const fallbackModel = aiPrefs.aiModelFallback || settings?.aiModelFallback || process.env.HERO_AI_MODEL_FALLBACK || configuredModel;
    const baseSystemPrompt = (aiPrefs.systemPrompt || settings?.systemPrompt || process.env.HERO_AI_SYSTEM_PROMPT || 'Ты — герой-наставник для ребёнка. Отвечай коротко, тепло и по делу.').trim();
    const deepPrompt = (aiPrefs.deepPrompt || settings?.deepPrompt || process.env.HERO_AI_DEEP_PROMPT || 'Если глубокий режим включён, добавь один дополнительный смысловой слой: внутреннюю силу, дисциплину, честность, границы или умение учиться на ошибках. Не раздувай ответ.').trim();
    const systemPrompt = aiPrefs.richMode ? `${baseSystemPrompt} ${deepPrompt}`.trim() : baseSystemPrompt;
    if (!aiPrefs.enabled) {
      usage += 1;
      await setJson(usageKey, usage);
      return NextResponse.json({
        message: getFallbackMessage(childName, completedCount, totalCount),
        remaining: DAILY_LIMIT - usage,
        ai: false,
        mode: 'local'
      });
    }

    if (!openRouterKey || openRouterKey.length < 10) {
      usage += 1;
      await setJson(usageKey, usage);
      return NextResponse.json({
        message: getFallbackMessage(childName, completedCount, totalCount),
        remaining: DAILY_LIMIT - usage,
        ai: false,
        mode: 'fallback'
      });
    }

    const runtimeContext = await buildRuntimeContext({
      childId: childId as 'ali' | 'said',
      childName,
      mode,
      tasks,
      todayGrades,
      usage,
      dailyLimit: DAILY_LIMIT,
    });

    try {
      const controller = new AbortController();
      const aiResponse = await callOpenRouter({
        openRouterUrl,
        openRouterKey,
        model: configuredModel,
        systemPrompt,
        userPrompt: runtimeContext,
        controller,
        maxTokens: 200,
        temperature: 0.7,
      });

      let data = aiResponse.ok ? await aiResponse.json() : null;
      let message = data?.choices?.[0]?.message?.content?.trim();
      let usedModel = configuredModel;

      if (!aiResponse.ok || !message) {
        if (fallbackModel && fallbackModel !== configuredModel) {
          const fallbackResponse = await callOpenRouter({
            openRouterUrl,
            openRouterKey,
            model: fallbackModel,
            systemPrompt,
            userPrompt: runtimeContext,
            controller,
            maxTokens: 200,
            temperature: 0.7,
          });

          if (fallbackResponse.ok) {
            data = await fallbackResponse.json();
            message = data?.choices?.[0]?.message?.content?.trim();
            if (message) {
              usedModel = fallbackModel;
            }
          }
        }
      }

      if (!message) {
        throw new Error('Empty AI response');
      }

      usage += 1;
      await setJson(usageKey, usage);

      return NextResponse.json({
        message,
        remaining: DAILY_LIMIT - usage,
        ai: true,
        mode: 'openrouter',
        model: usedModel
      });
    } catch (aiError) {
      console.error('AI error, using fallback:', aiError);
      usage += 1;
      await setJson(usageKey, usage);
      return NextResponse.json({
        message: getFallbackMessage(childName, completedCount, totalCount),
        remaining: DAILY_LIMIT - usage,
        ai: false,
        mode: 'fallback'
      });
    }
  } catch (error) {
    console.error('Error in hero message:', error);
    return NextResponse.json({
      message: 'Привет, герой! Сегодня отличный день, чтобы стать лучше! 🚀',
      remaining: 0,
      ai: false
    });
  }
}

async function buildRuntimeContext(params: {
  childId: 'ali' | 'said';
  childName: string;
  mode: string;
  tasks: any[];
  todayGrades: any[];
  usage: number;
  dailyLimit: number;
}) {
  const { childId, childName, mode, tasks, todayGrades, usage, dailyLimit } = params;
  const today = new Date();
  const todayLabel = today.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const taskList = Array.isArray(tasks) ? tasks : [];
  const completedTasks = taskList.filter((task: any) => task?.completed);
  const remainingTasks = taskList.filter((task: any) => !task?.completed);
  const ledger = await getJson(`aq:star-ledger:${childId}`);
  const starsBalance = Array.isArray(ledger)
    ? ledger.reduce((sum: number, item: any) => sum + (Number(item?.amount) || 0), 0)
    : 0;

  const rewards = await getJson('aq:rewards');
  const statuses = await getJson(`aq:reward-status:${childId}`);
  const statusMap = new Map<string, string>();
  if (Array.isArray(statuses)) {
    statuses.forEach((item: any) => {
      if (item?.rewardId) statusMap.set(String(item.rewardId), String(item.status || 'available'));
    });
  }

  const availableRewards = Array.isArray(rewards)
    ? rewards
        .filter((reward: any) => reward?.active && (reward?.childId === childId || reward?.childId === 'both'))
        .slice(0, 5)
        .map((reward: any) => `${reward.title}${statusMap.get(String(reward.id)) ? ` (${statusMap.get(String(reward.id))})` : ''}`)
    : [];

  const gradeList = Array.isArray(todayGrades)
    ? todayGrades
        .filter((grade: any) => grade?.subjectName)
        .slice(0, 6)
        .map((grade: any) => `${grade.subjectName}: ${grade.grade}`)
    : [];

  const taskSummary = [
    completedTasks.length > 0 ? `выполнено: ${completedTasks.slice(0, 4).map((task: any) => task.title).join(', ')}` : null,
    remainingTasks.length > 0 ? `осталось: ${remainingTasks.slice(0, 4).map((task: any) => task.title).join(', ')}` : null,
  ].filter(Boolean).join(' | ');

  return [
    'Сформируй короткое поддерживающее послание для ребёнка.',
    `Дата: ${todayLabel}.`,
    `Ребёнок: ${childName}.`,
    `Профиль: ${mode === 'little-hero' ? 'little-hero' : 'full'}.`,
    `Задач сегодня: ${completedTasks.length} выполнено из ${taskList.length}.`,
    `Осталось посланий сегодня: ${Math.max(0, dailyLimit - usage)} из ${dailyLimit}.`,
    `Звёзды сейчас: ${starsBalance}.`,
    taskSummary ? `Задачи: ${taskSummary}.` : null,
    gradeList.length > 0 ? `Оценки сегодня: ${gradeList.join(', ')}.` : 'Оценок сегодня нет.',
    availableRewards.length > 0 ? `Награды: ${availableRewards.join(', ')}.` : 'Активных наград нет.',
  ].filter(Boolean).join('\n');
}

async function callOpenRouter(params: {
  openRouterUrl: string;
  openRouterKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  controller: AbortController;
  maxTokens: number;
  temperature: number;
}) {
  const {
    openRouterUrl,
    openRouterKey,
    model,
    systemPrompt,
    userPrompt,
    controller,
    maxTokens,
    temperature,
  } = params;

  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    return await fetch(`${openRouterUrl.replace(/\/+$/, '')}/chat/completions`, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });
  } finally {
    clearTimeout(timeout);
  }
}
