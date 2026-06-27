export interface StreakProgress {
  currentStreak: number;
  lastCompletedDate: string;
  freezeHearts?: number;
  lastHeartRestoreDate?: string;
}

function parseUTCDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDate(dateObj: Date): string {
  return dateObj.toISOString().split('T')[0];
}

/**
 * Pure function to calculate updated streak progress and freeze heart usage/restoration.
 * Checks for missed days strictly prior to the current date and consumes hearts or resets streak.
 * Also handles recovery of lost hearts when the child completes tasks for 5 consecutive days.
 */
export function processStreakAndHearts(
  progress: StreakProgress,
  currentDate: string,
  freezeRestoreDays: number
) {
  let currentStreak = Number(progress.currentStreak) || 0;
  let lastCompletedDate = progress.lastCompletedDate || '';
  let freezeHearts = progress.freezeHearts !== undefined ? Number(progress.freezeHearts) : 2;
  let lastHeartRestoreDate = progress.lastHeartRestoreDate || lastCompletedDate || currentDate;

  let progressChanged = false;
  let heartConsumed = 0;
  let streakReset = false;

  // 1. Process missed days prior to currentDate
  if (lastCompletedDate) {
    const tToday = parseUTCDate(currentDate).getTime();
    const tLast = parseUTCDate(lastCompletedDate).getTime();
    const diffMs = tToday - tLast;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
      const missedDays = diffDays - 1;
      if (freezeHearts >= missedDays) {
        // We have enough hearts to protect the streak
        freezeHearts -= missedDays;
        heartConsumed = missedDays;
        currentStreak += missedDays;
        
        // The last protected completed day is yesterday (currentDate - 1 day)
        const lastCompletedDateObj = parseUTCDate(currentDate);
        lastCompletedDateObj.setUTCDate(lastCompletedDateObj.getUTCDate() - 1);
        lastCompletedDate = formatDate(lastCompletedDateObj);
        
        // Heart count changed downwards, reset last restore date to yesterday
        lastHeartRestoreDate = lastCompletedDate;
        progressChanged = true;
      } else {
        // Insufficient hearts: streak resets, hearts are fully refilled
        currentStreak = 0;
        freezeHearts = 2;
        lastHeartRestoreDate = currentDate;
        lastCompletedDate = '';
        streakReset = true;
        progressChanged = true;
      }
    }
  }

  // 2. Process heart recovery if they have less than 2 hearts
  // Note: Recovery only triggers if we did not just consume a heart or reset the streak.
  if (freezeHearts < 2 && !streakReset && heartConsumed === 0) {
    const tToday = parseUTCDate(currentDate).getTime();
    const tLast = parseUTCDate(lastHeartRestoreDate).getTime();
    const diffMs = tToday - tLast;

    if (diffMs > 0) {
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays >= freezeRestoreDays) {
        const intervals = Math.floor(diffDays / freezeRestoreDays);
        freezeHearts = Math.min(2, freezeHearts + intervals);

        const lastRestoreDateObj = parseUTCDate(lastHeartRestoreDate);
        lastRestoreDateObj.setUTCDate(lastRestoreDateObj.getUTCDate() + (intervals * freezeRestoreDays));
        lastHeartRestoreDate = formatDate(lastRestoreDateObj);
        
        if (freezeHearts >= 2) {
          lastHeartRestoreDate = currentDate;
        }
        
        progressChanged = true;
      }
    }
  }

  // If freezeHearts is 2, ensure lastHeartRestoreDate is kept up-to-date
  if (freezeHearts >= 2 && lastHeartRestoreDate !== currentDate) {
    lastHeartRestoreDate = currentDate;
    progressChanged = true;
  }

  return {
    nextProgress: {
      currentStreak,
      lastCompletedDate,
      freezeHearts,
      lastHeartRestoreDate
    } as StreakProgress,
    progressChanged,
    heartConsumed,
    streakReset
  };
}
