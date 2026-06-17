import { NextResponse } from 'next/server';
import { redis } from '../upstash';
import { invalidateReportCache } from '../report-cache';

const PURGE_PATTERNS = [
  'aq:day:*',
  'aq:grades',
  'aq:star-ledger:*',
  'aq:events:parent',
  'aq:reward-status:*',
  'aq:report:cache:*',
  'aq:ai:usage:*',
  'aq:webpush:subs:*',
  'aq:streak-progress:*',
  'aq:streak-rewards:earned:*',
];

const PRESERVE_PATTERNS = [
  'aq:settings',
  'aq:children',
  'aq:child:*:profile',
  'aq:task-templates',
  'aq:subjects',
  'aq:rewards',
  'aq:parent:auth',
  'aq:streak-rewards',
];

export async function POST() {
  try {
    const purgeResult = await purgeByPatterns(PURGE_PATTERNS);
    const preservedResult = await countByPatterns(PRESERVE_PATTERNS);

    await Promise.all(['ali', 'said'].map((childId) => invalidateReportCache(childId)));

    return NextResponse.json({
      success: true,
      deleted: purgeResult,
      preserved: preservedResult,
      message: [
        `Удалено ключей: ${purgeResult.total}`,
        `дни ${purgeResult.byPattern['aq:day:*'] || 0}`,
        `оценки ${purgeResult.byPattern['aq:grades'] || 0}`,
        `ledger ${purgeResult.byPattern['aq:star-ledger:*'] || 0}`,
        `события ${purgeResult.byPattern['aq:events:parent'] || 0}`,
        `награды ${purgeResult.byPattern['aq:reward-status:*'] || 0}`,
        `кэш отчётов ${purgeResult.byPattern['aq:report:cache:*'] || 0}`,
      ].join(', '),
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}

async function purgeByPatterns(patterns: string[]) {
  const deleted = new Set<string>();
  const byPattern: Record<string, number> = {};

  for (const pattern of patterns) {
    const keys = await scanAllKeys(pattern);
    byPattern[pattern] = keys.length;
    keys.forEach((key) => deleted.add(key));
  }

  const allKeys = Array.from(deleted);
  await deleteInBatches(allKeys, 150);

  return { total: allKeys.length, byPattern };
}

async function countByPatterns(patterns: string[]) {
  const totalByPattern: Record<string, number> = {};
  for (const pattern of patterns) {
    totalByPattern[pattern] = (await scanAllKeys(pattern)).length;
  }
  return { total: Object.values(totalByPattern).reduce((sum, value) => sum + value, 0), byPattern: totalByPattern };
}

async function scanAllKeys(match: string) {
  const found = new Set<string>();
  let cursor: string | number = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match, count: 200 });
    cursor = nextCursor;
    keys.forEach((key) => found.add(key));
  } while (`${cursor}` !== '0');

  return Array.from(found);
}

async function deleteInBatches(keys: string[], batchSize: number) {
  for (let index = 0; index < keys.length; index += batchSize) {
    const chunk = keys.slice(index, index + batchSize);
    if (chunk.length > 0) {
      await redis.del(...chunk);
    }
  }
}
