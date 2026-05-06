"use client";

import type { ReactNode } from "react";
import { Document, Font, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
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
    topCategory: { name: string; count: number; sourceLabel?: string } | null;
    topTask: { title: string; stars: number; completedAt: string; difficultyLabel: string | null; sourceLabel?: string } | null;
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
  pageCompact: {
    padding: 18,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: 700,
    color: theme.navy,
    marginBottom: 4,
    lineHeight: 1.05,
  },
  period: {
    fontSize: 8.5,
    color: "#94a3b8",
    marginTop: 1,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 5,
    marginTop: 8,
    marginBottom: 8,
  },
  summaryRowCompact: {
    gap: 4,
    marginTop: 6,
    marginBottom: 6,
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
  summaryCardCompact: {
    padding: 6,
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
  summaryValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryValueCompact: {
    fontSize: 14,
  },
  insightRow: {
    flexDirection: "row",
    gap: 5,
  },
  insightRowCompact: {
    gap: 4,
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
  insightCardCompact: {
    padding: 6,
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
  sectionCompact: {
    marginTop: 6,
    paddingTop: 6,
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
  chartWrapCompact: {
    minHeight: 48,
    marginTop: 2,
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
  chartRowCompact: {
    minHeight: 42,
    gap: 1,
  },
  chartColumn: {
    flexGrow: 1,
    flexBasis: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: 10,
  },
  chartColumnCompact: {
    minWidth: 8,
  },
  chartBars: {
    width: 8,
    height: 62,
    position: "relative",
  },
  chartBarsCompact: {
    width: 6,
    height: 30,
  },
  chartTaskBar: {
    position: "absolute",
    left: 0,
    width: 8,
    borderRadius: 4,
    backgroundColor: theme.blue,
  },
  chartTaskBarCompact: {
    width: 6,
    borderRadius: 3,
  },
  chartStarBarPositive: {
    position: "absolute",
    left: 0,
    width: 8,
    borderRadius: 4,
    backgroundColor: theme.amber,
  },
  chartStarBarPositiveCompact: {
    width: 6,
    borderRadius: 3,
  },
  chartStarBarNegative: {
    position: "absolute",
    left: 0,
    width: 8,
    borderRadius: 4,
    backgroundColor: theme.red,
  },
  chartStarBarNegativeCompact: {
    width: 6,
    borderRadius: 3,
  },
  chartLabel: {
    marginTop: 2,
    fontSize: 6.2,
    color: "#94a3b8",
    textAlign: "center",
    height: 7,
  },
  chartLabelCompact: {
    marginTop: 1,
    fontSize: 5.6,
    height: 6,
  },
  legend: {
    flexDirection: "row",
    gap: 9,
    marginTop: 4,
  },
  legendCompact: {
    gap: 7,
    marginTop: 2,
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
  denseCardCompact: {
    padding: 6,
    minHeight: 48,
  },
  denseCardTitle: {
    fontSize: 8.5,
    fontWeight: 700,
    color: theme.navy,
    marginBottom: 2,
  },
  denseCardTitleCompact: {
    fontSize: 7.8,
  },
  denseCardMeta: {
    fontSize: 7,
    color: theme.slate,
    marginTop: 1,
  },
  denseCardMetaCompact: {
    fontSize: 6.4,
  },
  denseHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 4,
  },
  footer: {
    marginTop: 10,
    fontSize: 7.2,
    color: "#cbd5e1",
    textAlign: "center",
  },
  footerCompact: {
    marginTop: 6,
  },
  chartStripNote: {
    fontSize: 7,
    fontWeight: 700,
    color: "#94a3b8",
    marginBottom: 3,
  },
  starAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
    marginTop: 2,
  },
  starAmountRowCompact: {
    gap: 1,
  },
  starAmountText: {
    fontSize: 8.8,
    fontWeight: 700,
    lineHeight: 1,
  },
});

export default function ReportPDF({ childName, days, data }: ReportPdfProps) {
  const compactMode = days >= 90;
  const denseLimit = compactMode ? 3 : 4;
  const chartPanels = buildChartPanels(
    data.chart.labels,
    data.chart.tasksCompleted,
    data.chart.starsEarned,
    compactMode ? Math.ceil(data.chart.labels.length / 3) : data.chart.labels.length,
  );
  const gradeToStars = data.settings?.gradeToStars || { "5": 5, "4": 2, "3": 0, "2": 0 };

  return (
    <Document>
      <Page size="A4" style={[styles.page, compactMode && styles.pageCompact]}>
        <View style={styles.header}>
          <Text style={styles.title}>Путь героя — Отчёт — {childName}</Text>
          <Text style={styles.period}>
            {formatLongDate(data.period.startDate)} — {formatLongDate(data.period.endDate)} ({days} дней)
          </Text>
        </View>

        <View style={[styles.summaryRow, compactMode && styles.summaryRowCompact]}>
          <PdfCard label="Задач" value={data.summary.totalTasksCompleted} compact={compactMode} />
          <PdfCard
            label="Звёзд"
            value={<PdfStarAmount amount={data.summary.totalStarsEarned} color={theme.amber} compact={compactMode} />}
            accent={theme.amber}
            compact={compactMode}
          />
          <PdfCard label="Серия" value={`${data.summary.streakDays} дн.`} accent={theme.green} compact={compactMode} />
          <PdfCard
            label="Баланс"
            value={<PdfStarAmount amount={data.summary.currentBalance} color={theme.blue} compact={compactMode} />}
            accent={theme.blue}
            compact={compactMode}
          />
        </View>

        <View style={[styles.insightRow, compactMode && styles.insightRowCompact]}>
          <InsightCard
            title="Лучший день"
            value={data.insights.bestDay ? `${data.insights.bestDay.label} · ${data.insights.bestDay.starsEarned >= 0 ? "+" : ""}${data.insights.bestDay.starsEarned}` : "Нет данных"}
            subtitle={data.insights.bestDay ? `${data.insights.bestDay.tasksCompleted} задач` : undefined}
            compact={compactMode}
          />
          <InsightCard
            title="Сильная категория"
            value={data.insights.topCategory ? data.insights.topCategory.name : "Нет данных"}
            subtitle={data.insights.topCategory ? `${data.insights.topCategory.count} раз${data.insights.topCategory.sourceLabel ? ` · ${data.insights.topCategory.sourceLabel}` : ''}` : undefined}
            compact={compactMode}
          />
          <InsightCard
            title="Топ-квест"
            value={data.insights.topTask ? shortenText(data.insights.topTask.title, 28) : "Нет данных"}
            subtitle={data.insights.topTask ? `${data.insights.topTask.difficultyLabel || "Без сложности"} · ${data.insights.topTask.stars >= 0 ? "+" : ""}${data.insights.topTask.stars}${data.insights.topTask.sourceLabel ? ` · ${data.insights.topTask.sourceLabel}` : ''}` : undefined}
            compact={compactMode}
          />
        </View>

        <View style={[styles.section, compactMode && styles.sectionCompact]}>
          <Text style={styles.sectionTitle}>Активность по дням</Text>
          {chartPanels.map((panel, panelIndex) => (
            <ChartPanel
              key={`panel-${panelIndex}`}
              panelIndex={panelIndex}
              panelsCount={chartPanels.length}
              labels={panel.labels}
              tasks={panel.tasks}
              stars={panel.stars}
              compact={compactMode}
            />
          ))}
          <View style={[styles.legend, compactMode && styles.legendCompact]}>
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

        <View style={[styles.section, compactMode && styles.sectionCompact]}>
          <Text style={styles.sectionTitle}>Категории</Text>
          <View style={styles.chipsWrap}>
            {Object.keys(data.categories).length === 0 ? (
              <View>
                <Text style={{ color: theme.slate }}>Пока нет категорий</Text>
                <Text style={{ color: theme.slate, fontSize: 7 }}>За этот период завершений не было</Text>
              </View>
            ) : (
              Object.entries(data.categories).map(([cat, count]) => (
                <Text key={cat} style={styles.chip}>
                  {getCategoryLabel(cat)}: {count}
                </Text>
              ))
            )}
          </View>
        </View>

        <DenseSection title="Последние выполненные задачи" compact={compactMode}>
          {data.recentTasks.slice(0, denseLimit).length === 0 ? (
            <Text style={{ color: theme.slate }}>Пока нет выполненных задач</Text>
          ) : (
            <View style={styles.cardGrid}>
              {data.recentTasks.slice(0, denseLimit).map((task) => (
                <View key={task.id} style={[styles.denseCard, compactMode && styles.denseCardCompact]}>
                  <Text style={[styles.denseCardTitle, compactMode && styles.denseCardTitleCompact]}>{shortenText(task.title, 32)}</Text>
                  <Text style={[styles.denseCardMeta, compactMode && styles.denseCardMetaCompact]}>{formatShortDate(task.completedAt)}</Text>
                  <PdfStarAmount amount={task.stars} color={theme.green} compact={compactMode} />
                  {task.difficultyLabel ? <Text style={[styles.denseCardMeta, compactMode && styles.denseCardMetaCompact]}>Сложность: {task.difficultyLabel}</Text> : null}
                  {task.subtaskSummary ? (
                    <Text style={[styles.denseCardMeta, compactMode && styles.denseCardMetaCompact]}>Подзадачи: {shortenText(task.subtaskSummary, 36)}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </DenseSection>

        <DenseSection title="История звёзд" compact={compactMode}>
          {data.recentStarEntries.slice(0, denseLimit).length === 0 ? (
            <Text style={{ color: theme.slate }}>Пока нет записей</Text>
          ) : (
            <View style={styles.cardGrid}>
              {data.recentStarEntries.slice(0, denseLimit).map((entry) => (
                <View key={entry.id} style={[styles.denseCard, compactMode && styles.denseCardCompact]}>
                  <View style={styles.denseHeaderRow}>
                    <Text style={[styles.denseCardTitle, compactMode && styles.denseCardTitleCompact]}>
                      {shortenText(entry.taskTitle || entry.sourceLabel, 32)}
                    </Text>
                    <Text style={[styles.denseCardMeta, compactMode && styles.denseCardMetaCompact]}>
                      {formatShortDate(entry.createdAt)}
                    </Text>
                  </View>
                  <PdfStarAmount amount={entry.amount} color={entry.amount >= 0 ? theme.green : theme.red} compact={compactMode} />
                  <Text style={[styles.denseCardMeta, compactMode && styles.denseCardMetaCompact]}>{cleanStarReason(shortenText(entry.reason, 64))}</Text>
                </View>
              ))}
            </View>
          )}
        </DenseSection>

        <DenseSection title="Последние оценки" compact={compactMode}>
          {data.grades.slice(0, denseLimit).length === 0 ? (
            <Text style={{ color: theme.slate }}>Пока нет оценок</Text>
          ) : (
            <View style={styles.cardGrid}>
              {data.grades.slice(0, denseLimit).map((grade) => (
                <View key={grade.id} style={[styles.denseCard, compactMode && styles.denseCardCompact]}>
                  <Text style={[styles.denseCardTitle, compactMode && styles.denseCardTitleCompact]}>{shortenText(grade.subjectName, 32)}</Text>
                  <Text style={[styles.denseCardMeta, compactMode && styles.denseCardMetaCompact]}>{grade.createdAt ? formatLongDate(grade.createdAt) : "Без даты"}</Text>
                  <Text style={{ fontSize: 8.3, fontWeight: 700, color: grade.grade >= 4 ? theme.green : grade.grade === 3 ? theme.amber : theme.red, marginTop: 2 }}>
                    Оценка {grade.grade}
                  </Text>
                  <PdfStarAmount
                    amount={typeof grade.starsAwarded === "number" ? grade.starsAwarded : (gradeToStars[String(grade.grade)] ?? 0)}
                    color={typeof grade.starsAwarded === "number" && grade.starsAwarded < 0 ? theme.red : theme.amber}
                    compact={compactMode}
                  />
                </View>
              ))}
            </View>
          )}
        </DenseSection>

        <View style={[styles.section, compactMode && styles.sectionCompact]}>
          <Text style={styles.sectionTitle}>Награды</Text>
          <Text style={{ color: theme.text }}>Выбрано: {data.rewards.selected} • Получено: {data.rewards.fulfilled}</Text>
        </View>

        <Text style={[styles.footer, compactMode && styles.footerCompact]}>
          Сгенерировано «Путь героя» • {new Date().toLocaleDateString("ru-RU")}
        </Text>
      </Page>
    </Document>
  );
}

function PdfCard({
  label,
  value,
  accent = theme.navy,
  compact = false,
}: {
  label: string;
  value: string | number | ReactNode;
  accent?: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.summaryCard, compact && styles.summaryCardCompact]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <View style={styles.summaryValueRow}>
        {typeof value === "string" || typeof value === "number" ? (
          <Text style={[styles.summaryValue, compact && styles.summaryValueCompact, { color: accent }]}>{value}</Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
}

function InsightCard({ title, value, subtitle, compact = false }: { title: string; value: string; subtitle?: string; compact?: boolean }) {
  return (
    <View style={[styles.insightCard, compact && styles.insightCardCompact]}>
      <Text style={styles.insightLabel}>{title}</Text>
      <Text style={styles.insightValue}>{value}</Text>
      {subtitle ? <Text style={styles.insightSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function DenseSection({ title, children, compact = false }: { title: string; children: ReactNode; compact?: boolean }) {
  return (
    <View style={[styles.section, compact && styles.sectionCompact]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function PdfStarAmount({ amount, color, compact = false }: { amount: number; color: string; compact?: boolean }) {
  const prefix = amount >= 0 ? "+" : "";
  return (
    <View style={[styles.starAmountRow, compact && styles.starAmountRowCompact]}>
      <Text style={[styles.starAmountText, { color }]}>
        {prefix}
        {Math.abs(amount)}
      </Text>
      <Svg width={compact ? 8.5 : 9.5} height={compact ? 8.5 : 9.5} viewBox="0 0 24 24" style={{ marginLeft: 2, marginTop: compact ? -0.4 : -0.6 }}>
        <Path
          d="M12 2.5l2.94 6.1 6.72.98-4.86 4.74 1.15 6.7L12 17.98 6.05 21.02l1.15-6.7L2.34 9.58l6.72-.98L12 2.5z"
          fill={color}
        />
      </Svg>
    </View>
  );
}

function ChartPanel({
  panelIndex,
  panelsCount,
  labels,
  tasks,
  stars,
  compact,
}: {
  panelIndex: number;
  panelsCount: number;
  labels: string[];
  tasks: number[];
  stars: number[];
  compact: boolean;
}) {
  const panelMaxTasks = Math.max(...tasks, 1);
  const panelMaxStarMagnitude = Math.max(...stars.map((value) => Math.abs(value)), 1);
  const barHeight = compact ? 22 : 30;
  const panelLabels = compressLabels(labels, compact ? 30 : labels.length, compact || labels.length <= 30);
  const displayStars = stars.map((value) => Math.max(value, 0));
  const baselineTop = compact ? 56 : 70;

  return (
    <View style={[styles.chartWrap, compact && styles.chartWrapCompact, panelIndex > 0 && { marginTop: compact ? 4 : 6 }]}>
      {compact && (
        <Text style={styles.chartStripNote}>
          Период {panelIndex + 1} из {panelsCount}
        </Text>
      )}
      <View
        style={[
        styles.chartBaseline,
          { top: baselineTop },
        ]}
      />
      <View style={[styles.chartRow, compact && styles.chartRowCompact]}>
        {labels.map((label, index) => {
          const taskHeight = Math.max((tasks[index] / panelMaxTasks) * barHeight, tasks[index] > 0 ? 3 : 0);
          const starHeight = Math.max((displayStars[index] / panelMaxStarMagnitude) * barHeight, displayStars[index] !== 0 ? 3 : 0);
          return (
            <View key={`${label}-${panelIndex}-${index}`} style={[styles.chartColumn, compact && styles.chartColumnCompact]}>
              <View style={[styles.chartBars, compact && styles.chartBarsCompact]}>
                <View
                  style={[
                    styles.chartTaskBar,
                    compact && styles.chartTaskBarCompact,
                    { bottom: 0, height: taskHeight },
                  ]}
                />
                <View
                  style={[
                    styles.chartStarBarPositive,
                    compact && styles.chartStarBarPositiveCompact,
                    { bottom: 0, height: starHeight },
                  ]}
                />
              </View>
              <Text style={[styles.chartLabel, compact && styles.chartLabelCompact]}>{normalizeChartLabel(panelLabels[index])}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function compressLabels(labels: string[], days: number, dense = false) {
  if (dense) {
    return labels.map((label, index) => {
      if (index % 5 === 0 || index === labels.length - 1) return label;
      return "";
    });
  }
  if (days <= 30) return labels;
  const step = days >= 90 ? 3 : 2;
  return labels.map((label, index) => {
    if (index % step === 0 || index === labels.length - 1) return label;
    return "";
  });
}

function buildChartPanels(labels: string[], tasks: number[], stars: number[], panelSize: number) {
  if (panelSize >= labels.length) {
    return [{ labels, tasks, stars }];
  }

  const panels: Array<{ labels: string[]; tasks: number[]; stars: number[] }> = [];
  for (let index = 0; index < labels.length; index += panelSize) {
    panels.push({
      labels: labels.slice(index, index + panelSize),
      tasks: tasks.slice(index, index + panelSize),
      stars: stars.slice(index, index + panelSize),
    });
  }
  return panels;
}

function normalizeChartLabel(label: string) {
  const match = label.match(/\d{1,2}/);
  if (!match) return label;
  return match[0].padStart(2, "0");
}

function cleanStarReason(text: string) {
  return text
    .replace(/\s*\(\s*[-+]?\d+\s*[★⭐PР]\s*\)\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
