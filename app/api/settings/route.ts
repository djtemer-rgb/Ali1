import { NextResponse } from 'next/server';
import { getJson, setJson } from '../upstash';

const SETTINGS_KEY = 'aq:settings';

const DEFAULT_SETTINGS = {
  gradeToStars: {
    '5': 5,
    '4': 2,
    '3': 0,
    '2': 0
  },
  gradeHistoryLimit: 20,
  starExpirationDays: 90,
  telegramEnabled: false,
  aiEnabled: false,
  aiDailyLimitPerChild: 3,
  aiModel: '',
  aiModelFallback: '',
  systemPrompt: 'Ты — герой-наставник для ребенка. Мотивируй, хвали за усилия, поддерживай. Не используй стыд или наказания.'
};

export async function GET() {
  try {
    let settings = await getJson(SETTINGS_KEY);
    if (!settings) {
      settings = DEFAULT_SETTINGS;
      await setJson(SETTINGS_KEY, settings);
    } else {
      settings = { ...DEFAULT_SETTINGS, ...settings };
      if (settings.gradeHistoryLimit === undefined) settings.gradeHistoryLimit = DEFAULT_SETTINGS.gradeHistoryLimit;
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error getting settings:', error);
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const settings = {
      ...DEFAULT_SETTINGS,
      ...body,
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
