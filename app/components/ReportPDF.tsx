"use client";

import type { ReactNode } from "react";
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
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
  settings?: {
    gradeHistoryLimit?: number;
    gradeToStars?: Record<string, number>;
  };
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
  red: "#ef4444",
  slate: "#64748b",
  border: "#e2e8f0",
  bg: "#f8fafc",
  text: "#334155",
};

const styles = StyleSheet.create({
  page: {
    padding: 22,
    backgroundColor: "#ffffff",
    fontFamily: "Arial",
    color: theme.text,
    fontSize: 9.5,
    lineHeight: 1.35,
  },
  header: {
    marginBottom: 10,
  },
  title: {
    fontSize: 19,
    fontWeight: 700,
    color: theme.navy,
    marginBottom: 2,
  },
  titleChild: {
    fontSize: 10.5,
    fontWeight: 700,
    color: theme.slate,
    marginBottom: 1,
  },
  period: {
    fontSize: 8.5,
    color: "#94a3b8",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 5,
    marginTop: 8,
    marginBottom: 8,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: 0,
    backgroundColor: theme.bg,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  summaryLabel: {
    fontSize: 6.8,
    color: "#94a3b8",
    fontWeight: 700,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 700,
    color: theme.navy,
  },
  insightRow: {
    flexDirection: "row",
    gap: 5,
  },
  insightCard: {
    flexGrow: 1,
    flexBasis: 0,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 7,
    borderWidth: 1,
    borderColor: theme.border,
  },
  insightLabel: {
    fontSize: 6.8,
    color: "#94a3b8",
    fontWeight: 700,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  insightValue: {
    fontSize: 9.2,
    fontWeight: 700,
    color: theme.text,
  },
  insightSubtitle: {
    fontSize: 7.6,
    color: theme.slate,
    marginTop: 1,
  },
  section: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: theme.navy,
    marginBottom: 5,
  },
  chartWrap: {
    marginTop: 3,
    minHeight: 78,
    position: "relative",
  },
  chartBaseline: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 1,
    backgroundColor: theme.border,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 2,
    minHeight: 78,
  },
  chartColumn: {
    flexGrow: 1,
    flexBasis: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: 10,
  },
  chartBars: {
    width: 8,
    height: 62,
    position: "relative",
  },
  chartTaskBar: {
    position: "absolute",
    left: 0,
    width: 8,
    borderRadius: 4,
    backgroundColor: theme.blue,
  },
  chartStarBarPositive: {
    position: "absolute",
    left: 0,
    width: 8,
    borderRadius: 4,
    backgroundColor: theme.amber,
  },
  chartStarBarNegative: {
    position: "absolute",
    left: 0,
    width: 8,
    borderRadius: 4,
    backgroundColor: theme.red,
  },
  chartLabel: {
    marginTop: 2,
    fontSize: 6.2,
    color: "#94a3b8",
    textAlign: "center",
    height: 7,
  },
  legend: {
    flexDirection: "row",
    gap: 9,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    fontSize: 7.5,
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
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 7,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    backgroundColor: theme.bg,
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  denseCard: {
    width: "24%",
    backgroundColor: theme.bg,
    borderRadius: 8,
    padding: 7,
    borderWidth: 1,
    borderColor: theme.border,
    minHeight: 56,
  },
  denseCardTitle: {
    fontSize: 8.5,
    fontWeight: 700,
    color: theme.navy,
    marginBottom: 2,
  },
  denseCardMeta: {
    fontSize: 7,
    color: theme.slate,
    marginTop: 1,
  },
  footer: {
    marginTop: 10,
    fontSize: 7.2,
    color: "#cbd5e1",
    textAlign: "center",
  },
});

export default function ReportPDF({ childName, days, data }: ReportPdfProps) {
  const chartLabels = compressLabels(data.chart.labels, days);
  const maxTasks = Math.max(...data.chart.tasksCompleted, 1);
  const maxStarMagnitude = Math.max(...data.chart.starsEarned.map((value) => Math.abs(value)), 1);
  const gradeToStars = data.settings?.gradeToStars || { "5": 5, "4": 2, "3": 0, "2": 0 };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Путь героя — Отчёт — {childName}</Text>
          <Text style={styles.titleChild}>Ребёнок: {childName}</Text>
          <Text style={styles.period}>
            {formatLongDate(data.period.startDate)} — {formatLongDate(data.period.endDate)} ({days} дней)
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <PdfCard label="Задач" value={data.summary.totalTasksCompleted} />
          <PdfCard label="Звёзд" value={formatPdfStarAmount(data.summary.totalStarsEarned)} accent={theme.amber} />
          <PdfCard label="Серия" value={`${data.summary.streakDays} дн.`} accent={theme.green} />
          <PdfCard label="Баланс" value={formatPdfStarAmount(data.summary.currentBalance)} accent={theme.blue} />
        </View>

        <View style={styles.insightRow}>
          <InsightCard
            title="Лучший день"
            value={data.insights.bestDay ? `${data.insights.bestDay.label} · ${formatPdfStarAmount(data.insights.bestDay.starsEarned)}` : "Нет данных"}
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
            subtitle={data.insights.topTask ? `${data.insights.topTask.difficultyLabel || "Без сложности"} · ${formatPdfStarAmount(data.insights.topTask.stars)}` : undefined}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Активность по дням</Text>
          <View style={styles.chartWrap}>
            <View style={styles.chartBaseline} />
            <View style={styles.chartRow}>
              {data.chart.labels.map((label, index) => {
                const taskHeight = Math.max((data.chart.tasksCompleted[index] / maxTasks) * 30, data.chart.tasksCompleted[index] > 0 ? 4 : 0);
                const starHeight = Math.max((Math.abs(data.chart.starsEarned[index]) / maxStarMagnitude) * 30, data.chart.starsEarned[index] !== 0 ? 4 : 0);
                const starValue = data.chart.starsEarned[index];

                return (
                  <View key={`${label}-${index}`} style={styles.chartColumn}>
                    <View style={styles.chartBars}>
                      <View style={[styles.chartTaskBar, { bottom: "50%", height: taskHeight }]} />
                      {starValue >= 0 ? (
                        <View style={[styles.chartStarBarPositive, { bottom: "50%", height: starHeight }]} />
                      ) : (
                        <View style={[styles.chartStarBarNegative, { top: "50%", height: starHeight }]} />
                      )}
                    </View>
                    <Text style={styles.chartLabel}>{chartLabels[index]}</Text>
                  </View>
                );
              })}
            </View>
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.blue }]} />
              <Text>Задачи</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.amber }]} />
              <Text>Плюс звёзды</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.red }]} />
              <Text>Минус звёзды</Text>
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

        <DenseSection title="Последние выполненные задачи">
          {data.recentTasks.slice(0, 4).length === 0 ? (
            <Text style={{ color: theme.slate }}>Пока нет выполненных задач</Text>
          ) : (
            <View style={styles.cardGrid}>
              {data.recentTasks.slice(0, 4).map((task) => (
                <View key={task.id} style={styles.denseCard}>
                  <Text style={styles.denseCardTitle}>{shortenText(task.title, 32)}</Text>
                  <Text style={styles.denseCardMeta}>{formatShortDate(task.completedAt)}</Text>
                  <Text style={{ fontSize: 8, fontWeight: 700, color: theme.green, marginTop: 2 }}>
                    {formatPdfStarAmount(task.stars)}
                  </Text>
                  {task.difficultyLabel ? <Text style={styles.denseCardMeta}>Сложность: {task.difficultyLabel}</Text> : null}
                  {task.subtaskSummary ? (
                    <Text style={styles.denseCardMeta}>Подзадачи: {shortenText(task.subtaskSummary, 36)}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </DenseSection>

        <DenseSection title="История звёзд">
          {data.recentStarEntries.slice(0, 4).length === 0 ? (
            <Text style={{ color: theme.slate }}>Пока нет записей</Text>
          ) : (
            <View style={styles.cardGrid}>
              {data.recentStarEntries.slice(0, 4).map((entry) => (
                <View key={entry.id} style={styles.denseCard}>
                  <Text style={styles.denseCardTitle}>{shortenText(entry.taskTitle || entry.sourceLabel, 32)}</Text>
                  <Text style={styles.denseCardMeta}>
                    {entry.sourceLabel} · {formatShortDate(entry.createdAt)}
                  </Text>
                  <Text style={{ fontSize: 8, fontWeight: 700, color: entry.amount >= 0 ? theme.green : theme.red, marginTop: 2 }}>
                    {formatPdfStarAmount(entry.amount)}
                  </Text>
                  <Text style={styles.denseCardMeta}>{shortenText(entry.reason, 64)}</Text>
                </View>
              ))}
            </View>
          )}
        </DenseSection>

        <DenseSection title="Последние оценки">
          {data.grades.slice(0, 4).length === 0 ? (
            <Text style={{ color: theme.slate }}>Пока нет оценок</Text>
          ) : (
            <View style={styles.cardGrid}>
              {data.grades.slice(0, 4).map((grade) => (
                <View key={grade.id} style={styles.denseCard}>
                  <Text style={styles.denseCardTitle}>{shortenText(grade.subjectName, 32)}</Text>
                  <Text style={styles.denseCardMeta}>{grade.createdAt ? formatLongDate(grade.createdAt) : "Без даты"}</Text>
                  <Text style={{ fontSize: 8.3, fontWeight: 700, color: grade.grade >= 4 ? theme.green : grade.grade === 3 ? theme.amber : theme.red, marginTop: 2 }}>
                    Оценка {grade.grade}
                  </Text>
                    <Text style={{ fontSize: 8, fontWeight: 700, color: typeof grade.starsAwarded === "number" && grade.starsAwarded < 0 ? theme.red : theme.amber, marginTop: 2 }}>
                    {formatPdfStarAmount(
                      typeof grade.starsAwarded === "number"
                        ? grade.starsAwarded
                        : (gradeToStars[String(grade.grade)] ?? 0)
                    )}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </DenseSection>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Награды</Text>
          <Text style={{ color: theme.text }}>Выбрано: {data.rewards.selected} • Получено: {data.rewards.fulfilled}</Text>
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
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color: accent }]}>{value}</Text>
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

function DenseSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function compressLabels(labels: string[], days: number) {
  if (days <= 30) return labels;
  const step = days >= 90 ? 3 : 2;
  return labels.map((label, index) => {
    if (index % step === 0 || index === labels.length - 1) return label;
    return "";
  });
}

function formatPdfStarAmount(amount: number) {
  const prefix = amount >= 0 ? "+" : "";
  return `${prefix}${amount} ★`;
}
