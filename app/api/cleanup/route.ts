import { NextResponse } from 'next/server';
import { getJson, setJson, redis } from '../upstash';
import { invalidateReportCache } from '../report-cache';

export async function POST() {
  try {
    const retentionDays = parseInt(process.env.AQ_DATA_RETENTION_DAYS || '90');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const cutoffTime = cutoff.getTime();

    const children = ['ali', 'said'];
    let deletedDays = 0;
    let deletedLedger = 0;
    let deletedGrades = 0;
    let deletedEvents = 0;

    for (const childId of children) {
      for (let d = new Date('2024-01-01'); d <= cutoff; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const key = `aq:day:${childId}:${dateStr}`;
        const exists = await redis.exists(key);
        if (exists) {
          await redis.del(key);
          deletedDays++;
        }
      }

      const ledgerKey = `aq:star-ledger:${childId}`;
      const ledger = await getJson(ledgerKey) || [];
      if (Array.isArray(ledger) && ledger.length > 0) {
        const filteredLedger = ledger.filter((item: any) => {
          const time = new Date(item.createdAt || item.date || 0).getTime();
          return Number.isFinite(time) ? time >= cutoffTime : true;
        });
        deletedLedger += ledger.length - filteredLedger.length;
        await setJson(ledgerKey, filteredLedger);
      }
    }

    const grades = await getJson('aq:grades') || [];
    if (Array.isArray(grades) && grades.length > 0) {
      const filteredGrades = grades.filter((item: any) => {
        const time = new Date(item.createdAt || item.date || 0).getTime();
        return Number.isFinite(time) ? time >= cutoffTime : true;
      });
      deletedGrades = grades.length - filteredGrades.length;
      await setJson('aq:grades', filteredGrades);
    }

    const events = await getJson('aq:events:parent') || [];
    if (Array.isArray(events) && events.length > 0) {
      const filteredEvents = events.filter((item: any) => {
        const time = new Date(item.createdAt || 0).getTime();
        return Number.isFinite(time) ? time >= cutoffTime : true;
      });
      deletedEvents = events.length - filteredEvents.length;
      await setJson('aq:events:parent', filteredEvents);
    }

    await Promise.all(children.map((childId) => invalidateReportCache(childId)));

    return NextResponse.json({
      success: true,
      deletedDays,
      deletedLedger,
      deletedGrades,
      deletedEvents,
      retentionDays,
      message: `Очистка выполнена: дни ${deletedDays}, ledger ${deletedLedger}, оценки ${deletedGrades}, события ${deletedEvents}`
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
