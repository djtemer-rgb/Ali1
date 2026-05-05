import { NextResponse } from 'next/server';
import { getJson, setJson, redis } from '../upstash';

export async function POST() {
  try {
    const retentionDays = parseInt(process.env.AQ_DATA_RETENTION_DAYS || '90');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const children = ['ali', 'said'];
    let deleted = 0;

    for (const childId of children) {
      for (let d = new Date('2024-01-01'); d <= cutoff; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const key = `aq:day:${childId}:${dateStr}`;
        const exists = await redis.exists(key);
        if (exists) {
          await redis.del(key);
          deleted++;
        }
      }
    }

    // Clean old events (keep last 500)
    const events = await getJson('aq:events:parent') || [];
    if (Array.isArray(events) && events.length > 500) {
      const sorted = events.sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      await setJson('aq:events:parent', sorted.slice(0, 500));
    }

    return NextResponse.json({
      success: true,
      deleted,
      retentionDays,
      message: `Удалено ${deleted} старых записей (старше ${retentionDays} дней)`
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
