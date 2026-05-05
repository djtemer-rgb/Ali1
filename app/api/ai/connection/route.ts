import { NextResponse } from 'next/server';
import { getJson } from '../../upstash';
import { getChildSettings } from '@/app/lib/settings-shared';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const childId = (body.childId || 'ali') as 'ali' | 'said';
    const settings = await getJson('aq:settings') as any || {};
    const childSettings = getChildSettings(settings, childId);
    const aiPrefs = {
      ...childSettings.ai,
      ...(body.aiPrefs || {}),
    };
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    if (!aiPrefs.enabled) {
      return NextResponse.json({
        ok: false,
        mode: 'disabled',
        message: 'OpenRouter выключен в настройках.',
      });
    }

    if (!openRouterKey || openRouterKey.length < 10) {
      return NextResponse.json({
        ok: false,
        mode: 'missing-key',
        message: 'OPENROUTER_API_KEY не задан.',
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${aiPrefs.openRouterUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model: aiPrefs.aiModel,
        messages: [
          { role: 'system', content: aiPrefs.richMode ? 'Ты коротко и тепло подтверждаешь, что связь работает.' : 'Ты подтверждаешь связь.' },
          { role: 'user', content: 'Ответь одним коротким предложением: связь работает.' },
        ],
        max_tokens: 24,
        temperature: 0.3,
      }),
    }).finally(() => clearTimeout(timeout));

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        mode: 'error',
        status: res.status,
        message: text.slice(0, 220),
      });
    }

    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    const content = data?.choices?.[0]?.message?.content?.trim() || 'Связь работает.';

    return NextResponse.json({
      ok: true,
      mode: 'openrouter',
      model: aiPrefs.aiModel,
      message: content,
    });
  } catch (error: any) {
    console.error('AI connection test error:', error);
    return NextResponse.json({
      ok: false,
      mode: 'error',
      message: error?.name === 'AbortError' ? 'Таймаут соединения.' : 'Не удалось проверить связь.',
    }, { status: 200 });
  }
}
