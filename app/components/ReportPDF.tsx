"use client";

import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  formatDifficultyLabel,
  formatLongDate,
  formatShortDate,
  getCategoryLabel,
  shortenText,
} from "@/app/lib/reporting";

Font.register({
  family: "Arial",
  fonts: [
    { src: "/fonts/arial.ttf", fontWeight: 400 },
    { src: "/fonts/arialbd.ttf", fontWeight: 700 },
  ],
});

type ReportPdfData = {
  period: { days: number; startDate: string; endDate: string };
  summary: {
    totalTasksCompleted: number;
    totalStarsEarned: number;
    totalGradesCount: number;
    streakDays: number;
    currentBalance: number;
  };
  insights: {
    bestDay: { label: string; date: string; tasksCompleted: number; starsEarned: number } | null;
    topCategory: { name: string; count: number } | null;
    topTask: { title: string; stars: number; completedAt: string; difficultyLabel: string | null } | null;
  };
  chart: { labels: string[]; tasksCompleted: number[]; starsEarned: number[] };
  categories: Record<string, number>;
  rewards: { selected: number; fulfilled: number };
  grades: Array<{
    id: string;
    subjectName: string;
    grade: number;
    createdAt?: string;
    starsAwarded?: number;
  }>;
  recentTasks: Array<{
    id: string;
    title: string;
    stars: number;
    completedAt: string;
    difficultyLabel: string | null;
    category: string;
    subtaskSummary: string | null;
    subtaskCount: number;
    detailsText?: string;
  }>;
  recentStarEntries: Array<{
    id: string;
    amount: number;
    sourceLabel: string;
    reason: string;
    createdAt: string;
    taskTitle?: string;
    difficultyLabel?: string | null;
    subtaskSummary?: string | null;
  }>;
};

type ReportPdfProps = {
  childName: string;
  days: number;
  data: ReportPdfData;
};

const theme = {
  navy: "#1e293b",
  blue: "#3b82f6",
  amber: "#f59e0b",
  green: "#16a34a",
  slate: "#64748b",
  border: "#e2e8f0",
  bg: "#f8fafc",
  text: "#334155",
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    backgroundColor: "#ffffff",
    fontFamily: "Arial",
    color: theme.text,
    fontSize: 10,
    lineHeight: 1.45,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: theme.navy,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 10,
    color: theme.slate,
    marginBottom: 2,
  },
  period: {
    fontSize: 9,
    color: "#94a3b8",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    marginBottom: 10,
  },
  card: {
    flexGrow: 1,
    flexBasis: 0,
    backgroundColor: theme.bg,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardLabel: {
    fontSize: 7,
    color: "#94a3b8",
    fontWeight: 700,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 700,
    color: theme.navy,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: theme.navy,
    marginBottom: 6,
  },
  section: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  insightRow: {
    flexDirection: "row",
    gap: 6,
  },
  insightCard: {
    flexGrow: 1,
    flexBasis: 0,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  insightLabel: {
    fontSize: 7,
    color: "#94a3b8",
    fontWeight: 700,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  insightValue: {
    fontSize: 10,
    fontWeight: 700,
    color: theme.text,
  },
  insightSubtitle: {
    fontSize: 8,
    color: theme.slate,
    marginTop: 2,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    minHeight: 82,
    marginTop: 4,
  },
  chartColumn: {
    flexGrow: 1,
    flexBasis: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: 14,
  },
  chartBars: {
    width: 8,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 1.5,
    minHeight: 58,
  },
  chartLabel: {
    marginTop: 3,
    fontSize: 6.5,
    color: "#94a3b8",
    textAlign: "center",
    height: 8,
  },
  legend: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    fontSize: 8,
    color: theme.slate,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 7,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    backgroundColor: theme.bg,
  },
  list: {
    gap: 5,
  },
  taskCard: {
    backgroundColor: theme.bg,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 5,
  },
  taskTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  taskTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: theme.navy,
    flexGrow: 1,
    flexBasis: 0,
  },
  taskMeta: {
    fontSize: 7.5,
    color: theme.slate,
    marginTop: 2,
  },
  taskReason: {
    fontSize: 8,
    color: theme.text,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 7,
    borderWidth: 1,
  },
  footer: {
    marginTop: 14,
    fontSize: 7.5,
    color: "#cbd5e1",
    textAlign: "center",
  },
});

export default function ReportPDF({ childName, days, data }: ReportPdfProps) {
  const chartLabels = compressLabels(data.chart.labels, days);
  const chartTaskMax = Math.max(...data.chart.tasksCompleted, 1);
  const chartStarMax = Math.max(...data.chart.starsEarned, 1);
  const gradeLimit = data.grades.length;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Путь героя — Отчёт</Text>
          <Text style={styles.subtitle}>{childName}</Text>
          <Text style={styles.period}>
            {formatLongDate(data.period.startDate)} — {formatLongDate(data.period.endDate)} ({days} дней)
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <PdfCard label="Задач" value={data.summary.totalTasksCompleted} />
          <PdfCard label="Звёзд" value={`+${data.summary.totalStarsEarned}`} accent={theme.amber} />
          <PdfCard label="Серия" value={`${data.summary.streakDays} дн.`} accent={theme.green} />
          <PdfCard label="Баланс" value={data.summary.currentBalance} accent={theme.blue} />
        </View>

        <View style={styles.insightRow}>
          <InsightCard
            title="Лучший день"
            value={data.insights.bestDay ? `${data.insights.bestDay.label} · +${data.insights.bestDay.starsEarned}` : "Нет данных"}
            subtitle={data.insights.bestDay ? `${data.insights.bestDay.tasksCompleted} задач` : undefined}
          />
          <InsightCard
            title="Сильная категория"
            value={data.insights.topCategory ? data.insights.topCategory.name : "Нет данных"}
            subtitle={data.insights.topCategory ? `${data.insights.topCategory.count} раз` : undefined}
          />
          <InsightCard
            title="Топ-квест"
            value={data.insights.topTask ? shortenText(data.insights.topTask.title, 28) : "Нет данных"}
            subtitle={data.insights.topTask ? `${data.insights.topTask.difficultyLabel || "Без сложности"} · +${data.insights.topTask.stars} ⭐` : undefined}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Активность по дням</Text>
          <View style={styles.chartRow}>
            {data.chart.labels.map((label, index) => (
              <View key={`${label}-${index}`} style={styles.chartColumn}>
                <View style={styles.chartBars}>
                  <View
                    style={{
                      width: 7,
                      height: scaleBar(data.chart.starsEarned[index], chartStarMax, 40),
                      borderRadius: 4,
                      backgroundColor: theme.amber,
                    }}
                  />
                  <View
                    style={{
                      width: 7,
                      height: scaleBar(data.chart.tasksCompleted[index], chartTaskMax, 40),
                      borderRadius: 4,
                      backgroundColor: theme.blue,
                    }}
                  />
                </View>
                <Text style={styles.chartLabel}>{chartLabels[index]}</Text>
              </View>
            ))}
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.blue }]} />
              <Text>Задачи</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.amber }]} />
              <Text>Звёзды</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Категории</Text>
          <View style={styles.chipsWrap}>
            {Object.keys(data.categories).length === 0 ? (
              <Text style={{ color: theme.slate }}>Пока нет категорий</Text>
            ) : (
              Object.entries(data.categories).map(([cat, count]) => (
                <Text key={cat} style={styles.chip}>
                  {getCategoryLabel(cat)}: {count}
                </Text>
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Последние выполненные задачи</Text>
          {data.recentTasks.length === 0 ? (
            <Text style={{ color: theme.slate }}>Пока нет выполненных задач</Text>
          ) : (
            <View style={styles.list}>
              {data.recentTasks.slice(0, 8).map((task) => (
                <View key={task.id} style={styles.taskCard}>
                  <View style={styles.taskTitleRow}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    <Text style={{ fontSize: 9, fontWeight: 700, color: theme.green }}>+{task.stars} ⭐</Text>
                  </View>
                  <Text style={styles.taskMeta}>{formatShortDate(task.completedAt)}</Text>
                  <View style={styles.badgeRow}>
                    {task.difficultyLabel && <PdfBadge tone="blue" label={`Сложность: ${task.difficultyLabel}`} />}
                    {task.subtaskSummary && <PdfBadge tone="slate" label={`Подзадачи: ${shortenText(task.subtaskSummary, 42)}`} />}
                    {task.detailsText && <PdfBadge tone="amber" label={shortenText(task.detailsText, 42)} />}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>История звёзд</Text>
          {data.recentStarEntries.length === 0 ? (
            <Text style={{ color: theme.slate }}>Пока нет записей</Text>
          ) : (
            <View style={styles.list}>
              {data.recentStarEntries.slice(0, 8).map((entry) => (
                <View key={entry.id} style={styles.taskCard}>
                  <View style={styles.taskTitleRow}>
                    <Text style={styles.taskTitle}>{entry.taskTitle || entry.sourceLabel}</Text>
                    <Text style={{ fontSize: 9, fontWeight: 700, color: entry.amount >= 0 ? theme.green : "#dc2626" }}>
                      {entry.amount >= 0 ? "+" : ""}
                      {entry.amount} ⭐
                    </Text>
                  </View>
                  <Text style={styles.taskMeta}>
                    {entry.sourceLabel} · {formatShortDate(entry.createdAt)}
                  </Text>
                  <Text style={styles.taskReason}>{shortenText(entry.reason, 120)}</Text>
                  <View style={styles.badgeRow}>
                    {entry.difficultyLabel && <PdfBadge tone="blue" label={`Сложность: ${entry.difficultyLabel}`} />}
                    {entry.subtaskSummary && <PdfBadge tone="slate" label={`Подзадачи: ${shortenText(entry.subtaskSummary, 42)}`} />}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Последние оценки</Text>
          {data.grades.length === 0 ? (
            <Text style={{ color: theme.slate }}>Пока нет оценок</Text>
          ) : (
            <View style={styles.list}>
              {data.grades.slice(0, 8).map((grade) => (
                <View key={grade.id} style={styles.taskCard}>
                  <View style={styles.taskTitleRow}>
                    <Text style={styles.taskTitle}>{grade.subjectName}</Text>
                    <Text style={{ fontSize: 10, fontWeight: 700, color: grade.grade >= 4 ? theme.green : grade.grade === 3 ? theme.amber : "#dc2626" }}>
                      {grade.grade}
                    </Text>
                  </View>
                  <Text style={styles.taskMeta}>
                    {grade.createdAt ? formatLongDate(grade.createdAt) : "Без даты"} {typeof grade.starsAwarded === "number" ? `· +${grade.starsAwarded} ⭐` : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Награды</Text>
          <Text style={{ color: theme.text }}>
            Выбрано: {data.rewards.selected} • Получено: {data.rewards.fulfilled}
          </Text>
          <Text style={{ color: theme.slate, marginTop: 3 }}>
            Лимит оценок в отчёте: {gradeLimit}
          </Text>
        </View>

        <Text style={styles.footer}>
          Сгенерировано «Путь героя» • {new Date().toLocaleDateString("ru-RU")}
        </Text>
      </Page>
    </Document>
  );
}

function PdfCard({ label, value, accent = theme.navy }: { label: string; value: string | number; accent?: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

function InsightCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <View style={styles.insightCard}>
      <Text style={styles.insightLabel}>{title}</Text>
      <Text style={styles.insightValue}>{value}</Text>
      {subtitle ? <Text style={styles.insightSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function PdfBadge({ label, tone }: { label: string; tone: "amber" | "blue" | "slate" }) {
  const palette = {
    amber: { backgroundColor: "#fffbeb", color: "#b45309", borderColor: "#fde68a" },
    blue: { backgroundColor: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" },
    slate: { backgroundColor: "#f1f5f9", color: "#475569", borderColor: "#cbd5e1" },
  }[tone];

  return <Text style={[styles.badge, palette]}>{label}</Text>;
}

function scaleBar(value: number, maxValue: number, maxHeight: number) {
  const safeMax = Math.max(maxValue, 1);
  const scaled = Math.round((Math.max(value, 0) / safeMax) * maxHeight);
  return Math.max(scaled, value > 0 ? 4 : 2);
}

function compressLabels(labels: string[], days: number) {
  if (days <= 30) return labels;
  const step = days >= 90 ? 3 : 2;
  return labels.map((label, index) => {
    if (index % step === 0 || index === labels.length - 1) return label;
    return "";
  });
}
