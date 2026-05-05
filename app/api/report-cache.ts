import { redis } from './upstash';

const REPORT_PERIODS = [7, 30, 90];
const REPORT_GRADE_LIMITS = Array.from({ length: 31 }, (_, index) => 20 + index);

export async function invalidateReportCache(childId?: string | null) {
  if (!childId) return;

  await Promise.all(
    REPORT_PERIODS.flatMap((days) => [
      redis.del(`aq:report:cache:${childId}:${days}`),
      ...REPORT_GRADE_LIMITS.map((limit) => redis.del(`aq:report:cache:${childId}:${days}:grades-${limit}`)),
    ])
  );
}
