import { NextResponse } from 'next/server';
import { getJson, setJson, redis } from '../../upstash';
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
    const { childId, childName, mode, tasks, todayGrades, favoriteHeroes, resetCounter } = await request.json();

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

    try {
      const savedHeroes = aiPrefs.heroes || settings?.heroes;
      const heroesList = Array.isArray(favoriteHeroes) && favoriteHeroes.length > 0
        ? favoriteHeroes.slice(0, 10)
        : (typeof savedHeroes === 'string' ? savedHeroes.split(',').map((h: string) => h.trim()).filter(Boolean) : ['Мухаммед Али', 'Тайсон', 'Роналду']);

      const heroesPrompt = heroesList.length > 0
        ? `Любимые герои ребёнка: ${heroesList.join(', ')}. Иногда мягко упоминай их как примеры силы, дисциплины и смелости.`
        : '';

      const richPrompt = [
        'Ты — тёплый герой-наставник для ребёнка.',
        'Отвечай 2-4 предложениями, живо, по-человечески и с небольшой глубиной.',
        'Не будь сухим или канцелярским. Не пиши слишком общо.',
        'Поддерживай усилие, характер, смелость и маленькие победы.',
        'Не стыди и не угрожай. Не превращай ответ в бесконечный чат.',
        'Старайся делать ответ запоминающимся, но не пафосным.',
        heroesPrompt,
      ].filter(Boolean).join(' ');

      const basicPrompt = [
        'Ты — герой-наставник для ребёнка.',
        'Отвечай коротко и поддерживающе.',
        'Не используй стыд и наказания.',
        'Не создавай бесконечный диалог.',
        heroesPrompt,
      ].filter(Boolean).join(' ');

      const configuredSystemPrompt = (aiPrefs.systemPrompt || settings?.systemPrompt || process.env.HERO_AI_SYSTEM_PROMPT || '').trim();
      const systemPrompt = configuredSystemPrompt
        ? `${configuredSystemPrompt} ${aiPrefs.richMode ? heroesPrompt : ''}`.trim()
        : (aiPrefs.richMode ? richPrompt : basicPrompt);

      const userPrompt = `Ребёнок: ${childName} (${mode === 'little-hero' ? 'little-hero режим' : 'полный режим'}). Выполнено задач сегодня: ${completedCount} из ${totalCount}. ${todayGrades && todayGrades.length > 0 ? `Сегодняшние оценки: ${todayGrades.map((g: any) => `${g.subjectName}: ${g.grade}`).join(', ')}.` : 'Оценок сегодня нет.'} Напиши короткое поддерживающее сообщение.`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const aiResponse = await fetch(`${openRouterUrl.replace(/\/+$/, '')}/chat/completions`, {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        },
        body: JSON.stringify({
          model: configuredModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 200,
          temperature: 0.7,
        })
      });
      clearTimeout(timeout);

      if (!aiResponse.ok) {
        throw new Error(`OpenRouter API error: ${aiResponse.status}`);
      }

      const data = await aiResponse.json();
      const message = data?.choices?.[0]?.message?.content?.trim();

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
        model: configuredModel
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
