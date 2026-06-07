import { NextResponse } from 'next/server';
import { getJson, setJson } from '../upstash';
import { defaultChildSettings, defaultGradeToStars, defaultSubjects, getChildSettings, normalizeAiPrefs, normalizeGradeToStars, normalizeNotificationPrefs, normalizeSubjects, normalizeTaskCategories } from '@/app/lib/settings-shared';

export const dynamic = 'force-dynamic';

const SETTINGS_KEY = 'aq:settings';
const GRADES_LAYER_SETTINGS_VERSION = 1;

const DEFAULT_SETTINGS = {
  gradeToStars: defaultGradeToStars(),
  subjects: defaultSubjects(),
  gradeHistoryLimit: 20,
  starExpirationDays: 90,
  telegramEnabled: false,
  aiEnabled: false,
  aiDailyLimitPerChild: 3,
  aiModel: '',
  aiModelFallback: '',
  systemPrompt: 'Ты — герой-наставник для ребенка. Мотивируй, хвали за усилия, поддерживай. Не используй стыд или наказания.',
  deepPrompt: 'Если глубокий режим включён, добавь один дополнительный смысловой слой: внутреннюю силу, дисциплину, честность, границы или умение учиться на ошибках. Не раздувай ответ.',
  childSettings: {
    ali: defaultChildSettings('ali'),
    said: defaultChildSettings('said')
  }
};

export async function GET() {
  try {
    const storedSettings = await getJson(SETTINGS_KEY);
    if (!storedSettings) {
      const settings = {
        ...DEFAULT_SETTINGS,
        childSettings: {
          ali: defaultChildSettings('ali'),
          said: defaultChildSettings('said')
        },
        gradesLayerSettingsVersion: GRADES_LAYER_SETTINGS_VERSION,
      };
      await setJson(SETTINGS_KEY, settings);
      return NextResponse.json(settings);
    } else {
      const settings = { ...DEFAULT_SETTINGS, ...storedSettings };
      if (settings.gradeHistoryLimit === undefined) settings.gradeHistoryLimit = DEFAULT_SETTINGS.gradeHistoryLimit;
      settings.childSettings = storedSettings.childSettings || {};
      settings.childSettings.ali = getChildSettings(storedSettings, 'ali');
      settings.childSettings.said = getChildSettings(storedSettings, 'said');
      if (settings.gradesLayerSettingsVersion !== GRADES_LAYER_SETTINGS_VERSION) {
        settings.childSettings.ali.gradesEnabled = true;
        settings.childSettings.said.gradesEnabled = false;
        settings.gradesLayerSettingsVersion = GRADES_LAYER_SETTINGS_VERSION;
      }
      settings.gradeToStars = settings.childSettings.ali.gradeToStars;
      settings.subjects = settings.childSettings.ali.subjects;
      await setJson(SETTINGS_KEY, settings);
      return NextResponse.json(settings);
    }
  } catch (error) {
    console.error('Error getting settings:', error);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const current = await getJson(SETTINGS_KEY) || DEFAULT_SETTINGS;
    const incomingChildSettings = body.childSettings || current.childSettings || DEFAULT_SETTINGS.childSettings;
    const childSettings = {
      ali: {
        taskCategories: normalizeTaskCategories(incomingChildSettings?.ali?.taskCategories),
        notifications: normalizeNotificationPrefs(incomingChildSettings?.ali?.notifications),
        ai: normalizeAiPrefs(incomingChildSettings?.ali?.ai),
        gradesEnabled: incomingChildSettings?.ali?.gradesEnabled !== undefined ? !!incomingChildSettings.ali.gradesEnabled : true,
        subjects: normalizeSubjects(incomingChildSettings?.ali?.subjects ?? body.subjects ?? current.subjects ?? DEFAULT_SETTINGS.subjects),
        gradeToStars: normalizeGradeToStars(incomingChildSettings?.ali?.gradeToStars ?? body.gradeToStars ?? current.gradeToStars ?? DEFAULT_SETTINGS.gradeToStars),
      },
      said: {
        taskCategories: normalizeTaskCategories(incomingChildSettings?.said?.taskCategories),
        notifications: normalizeNotificationPrefs(incomingChildSettings?.said?.notifications),
        ai: normalizeAiPrefs(incomingChildSettings?.said?.ai),
        gradesEnabled: incomingChildSettings?.said?.gradesEnabled !== undefined ? !!incomingChildSettings.said.gradesEnabled : false,
        subjects: normalizeSubjects(incomingChildSettings?.said?.subjects ?? DEFAULT_SETTINGS.subjects),
        gradeToStars: normalizeGradeToStars(incomingChildSettings?.said?.gradeToStars ?? DEFAULT_SETTINGS.gradeToStars),
      }
    };
    const settings = {
      ...DEFAULT_SETTINGS,
      ...body,
      childSettings,
      gradesLayerSettingsVersion: current.gradesLayerSettingsVersion || GRADES_LAYER_SETTINGS_VERSION,
      gradeToStars: childSettings.ali.gradeToStars,
      subjects: childSettings.ali.subjects,
      gradeHistoryLimit: Number.isFinite(Number(body.gradeHistoryLimit)) ? Math.min(50, Math.max(20, Number(body.gradeHistoryLimit))) : DEFAULT_SETTINGS.gradeHistoryLimit,
      updatedAt: new Date().toISOString()
    };
    await setJson(SETTINGS_KEY, settings);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
