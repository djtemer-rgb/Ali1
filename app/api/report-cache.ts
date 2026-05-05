import { redis } from './upstash';

const REPORT_PERIODS = [7, 30, 90];

export async function invalidateReportCache(childId?: string | null) {
  if (!childId) return;

  await Promise.all(
    REPORT_PERIODS.map((days) => redis.del(`aq:report:cache:${childId}:${days}`))
  );
}
