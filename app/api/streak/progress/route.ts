import { NextResponse } from 'next/server';
import { getJson, setJson } from '../../upstash';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const childId = url.searchParams.get('childId') || 'ali';
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

    const progressKey = `aq:streak-progress:${childId}`;
    const progress = await getJson(progressKey) || { currentStreak: 0, lastCompletedDate: '' };
    
    // Fallbacks
    let freezeHearts = progress.freezeHearts !== undefined ? Number(progress.freezeHearts) : 2;
    let lastHeartRestoreDate = progress.lastHeartRestoreDate || progress.lastCompletedDate || date;

    // Load settings for restore interval
    const settings = await getJson('aq:settings') || {};
    const freezeRestoreDays = Number(settings.freezeRestoreDays) || 5;

    // Heart recovery logic
    let progressChanged = false;
    
    // Ensure freezeHearts and lastHeartRestoreDate are correctly stored if first time
    if (progress.freezeHearts === undefined || !progress.lastHeartRestoreDate) {
      progressChanged = true;
    }

    if (freezeHearts >= 2) {
      if (lastHeartRestoreDate !== date) {
        lastHeartRestoreDate = date;
        progressChanged = true;
      }
    } else {
      const parseUTCDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, d));
      };

      const tToday = parseUTCDate(date).getTime();
      const tLast = parseUTCDate(lastHeartRestoreDate).getTime();
      const diffMs = tToday - tLast;

      if (diffMs > 0) {
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays >= freezeRestoreDays) {
          const intervals = Math.floor(diffDays / freezeRestoreDays);
          freezeHearts = Math.min(2, freezeHearts + intervals);

          const lastRestoreDateObj = parseUTCDate(lastHeartRestoreDate);
          lastRestoreDateObj.setUTCDate(lastRestoreDateObj.getUTCDate() + (intervals * freezeRestoreDays));
          lastHeartRestoreDate = lastRestoreDateObj.toISOString().split('T')[0];
          
          if (freezeHearts >= 2) {
            lastHeartRestoreDate = date;
          }
          
          progressChanged = true;
        }
      }
    }

    const nextProgress = {
      ...progress,
      currentStreak: progress.currentStreak || 0,
      lastCompletedDate: progress.lastCompletedDate || '',
      freezeHearts,
      lastHeartRestoreDate
    };

    if (progressChanged) {
      await setJson(progressKey, nextProgress);
    }

    const earned = await getJson(`aq:streak-rewards:earned:${childId}`) || {};

    return NextResponse.json({
      currentStreak: nextProgress.currentStreak,
      lastCompletedDate: nextProgress.lastCompletedDate,
      freezeHearts: nextProgress.freezeHearts,
      lastHeartRestoreDate: nextProgress.lastHeartRestoreDate,
      earned: earned || {}
    });
  } catch (error) {
    console.error('Error getting streak progress:', error);
    return NextResponse.json({
      currentStreak: 0,
      lastCompletedDate: '',
      freezeHearts: 2,
      lastHeartRestoreDate: '',
      earned: {}
    });
  }
}
