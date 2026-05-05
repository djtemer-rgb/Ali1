import { NextResponse } from 'next/server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_IDS = process.env.TELEGRAM_CHAT_IDS?.split(',') || [];

export async function POST(request: Request) {
  try {
    // If Telegram env is not set, just log and return success
    if (!BOT_TOKEN || CHAT_IDS.length === 0) {
      console.log('Telegram not configured, skipping notification');
      return NextResponse.json({ success: true, skipped: true, reason: 'Telegram not configured' });
    }

    const { message } = await request.json();
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const results = await Promise.allSettled(
      CHAT_IDS.map(async (chatId) => {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId.trim(),
            text: message,
            parse_mode: 'HTML'
          })
        });
        
        if (!res.ok) {
          const error = await res.json();
          throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
        }
        
        return await res.json();
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      sent: successful,
      failed: failed,
      results
    });
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    // Don't crash the app, just log the error
    return NextResponse.json({ success: false, error: 'Failed to send notification' }, { status: 500 });
  }
}
