import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { fetchTractionMetrics } from "@/lib/api";
import type { TractionMetrics, WeeklyCount, WeeklyRunCounts } from "@/lib/api";
import { Colors } from "@/lib/colors";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Card, Text } from "react-native-paper";
import Svg, { Rect } from "react-native-svg";

// Chart colors: buttonTeal + gold pass CVD-separation validation on the white
// admin surface (protan ΔE 18.9). buttonTeal sits a hair under the chroma
// floor ("reads gray"), accepted to stay on brand tokens — every chart also
// carries direct value labels, so color is never the only encoding.
const SERIES = Colors.brand.buttonTeal;
const SERIES_ALT = Colors.brand.gold;

const CHART_HEIGHT = 120;
const BAR_GAP = 6;
const SEGMENT_GAP = 2;

// The signed_up event sink (a DB trigger on auth.users) has only existed
// since this date; the trend chart flags older weeks as unrecorded rather
// than letting them read as zero-signup weeks.
const SIGNUP_SINK_START = "2026-08-12";

// Admin gating (loading / Access Denied) lives in app/admin/_layout.tsx.
const DashboardScreen: React.FC = () => {
  const metricsQuery = useQuery({
    queryKey: queryKeys.tractionMetrics,
    queryFn: fetchTractionMetrics,
  });

  const m = metricsQuery.data;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <AdminNavbar
        title="Traction"
        actions={
          <Button
            mode="outlined"
            compact
            icon="refresh"
            loading={metricsQuery.isRefetching}
            onPress={() => metricsQuery.refetch()}
          >
            Refresh
          </Button>
        }
      />

      {metricsQuery.isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      )}

      {metricsQuery.error && (
        <Card mode="contained" style={styles.errorCard}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.errorText}>
              {(metricsQuery.error as Error).message}
            </Text>
          </Card.Content>
        </Card>
      )}

      {m && (
        <>
          <View style={styles.tileRow}>
            <StatTile
              label="Users"
              value={String(m.totalUsers)}
              delta={m.newUsers7d > 0 ? `+${m.newUsers7d} this week` : null}
            />
            <StatTile
              label="Active this week"
              value={String(m.activeUsers7d)}
            />
            <StatTile label="Added a person" value={`${m.activationPct}%`} />
            <StatTile
              label="Gifts chosen"
              value={String(m.giftsChosenTotal)}
              delta={
                m.giftsChosen7d > 0 ? `+${m.giftsChosen7d} this week` : null
              }
            />
          </View>

          <Section title="New signups by week">
            <WeeklyBars data={m.signupsByWeek} />
            {(m.signupsByWeek[0]?.weekStart ?? "") < SIGNUP_SINK_START && (
              <Text variant="bodySmall" style={styles.chartFootnote}>
                Signup tracking began Aug 12, 2026 — weeks before that have no
                data, not zero signups.
              </Text>
            )}
          </Section>

          <Section title="Outbound product clicks by week">
            <WeeklyBars data={m.clicksByWeek} />
          </Section>

          <Section title="Generation runs by week">
            <RunBars data={m.runsByWeek} />
            <View style={styles.legendRow}>
              <LegendSwatch color={SERIES} label="Delivered a full set" />
              <LegendSwatch color={SERIES_ALT} label="Came up short" />
            </View>
          </Section>

          <Section title="Gift decisions">
            {m.feedbackActions.length === 0 ? (
              <EmptyNote text="No gift feedback recorded yet." />
            ) : (
              <ActionBars actions={m.feedbackActions} />
            )}
          </Section>

          <Section title="Upcoming occasions">
            <Text variant="bodyLarge">
              <Text variant="titleLarge" style={styles.inlineNumber}>
                {String(m.upcomingOccasions30d)}
              </Text>
              {"  in the next 30 days"}
            </Text>
          </Section>

          <Section title="Trials & subscriptions">
            {m.trialStatusCounts.length === 0 &&
            m.subscriptionStatusCounts.length === 0 ? (
              <EmptyNote text="Nothing here yet — this section fills in when the trial funnel goes live." />
            ) : (
              <View style={styles.statusColumns}>
                <StatusList title="Trials" rows={m.trialStatusCounts} />
                <StatusList
                  title="Subscriptions"
                  rows={m.subscriptionStatusCounts}
                />
              </View>
            )}
          </Section>

          <Section title="Generation health, trailing 7 days">
            {m.runs7d.total === 0 ? (
              <EmptyNote text="No generation runs recorded this week." />
            ) : (
              <Text variant="bodyMedium" style={styles.opsLine}>
                {`${m.runs7d.total} runs · ${Math.round(
                  (100 * m.runs7d.ok) / m.runs7d.total
                )}% delivered a full set · ${m.runs7d.errors} error${
                  m.runs7d.errors === 1 ? "" : "s"
                } · ${m.runs7d.timeouts} timeout${
                  m.runs7d.timeouts === 1 ? "" : "s"
                }`}
              </Text>
            )}
          </Section>
        </>
      )}
    </ScrollView>
  );
};

const StatTile: React.FC<{
  label: string;
  value: string;
  delta?: string | null;
}> = ({ label, value, delta = null }) => (
  <Card mode="contained" style={styles.tile}>
    <Card.Content style={styles.tileContent}>
      <Text variant="displaySmall" style={styles.tileValue}>
        {value}
      </Text>
      <Text variant="bodySmall" style={styles.tileLabel}>
        {label}
      </Text>
      {delta && (
        <Text variant="bodySmall" style={styles.tileDelta}>
          {delta}
        </Text>
      )}
    </Card.Content>
  </Card>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <Card mode="contained" style={styles.sectionCard}>
    <Card.Content>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </Card.Content>
  </Card>
);

const EmptyNote: React.FC<{ text: string }> = ({ text }) => (
  <Text variant="bodyMedium" style={styles.emptyNote}>
    {text}
  </Text>
);

const LegendSwatch: React.FC<{ color: string; label: string }> = ({
  color,
  label,
}) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <Text variant="bodySmall" style={styles.legendLabel}>
      {label}
    </Text>
  </View>
);

/** Measures its own width so SVG bars can use real pixels (no viewBox
 * stretching, which would distort nothing here but breaks on text). */
const useChartWidth = () => {
  const [width, setWidth] = useState(0);
  const onLayout = (e: { nativeEvent: { layout: { width: number } } }) =>
    setWidth(e.nativeEvent.layout.width);
  return { width, onLayout };
};

const WeeklyBars: React.FC<{ data: WeeklyCount[] }> = ({ data }) => {
  const { width, onLayout } = useChartWidth();
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const barWidth =
    data.length > 0 ? (width - BAR_GAP * (data.length - 1)) / data.length : 0;
  // Selective labels: the peak and the latest week, not every bar.
  const labeled = new Set<number>([
    data.findIndex((d) => d.count === max),
    data.length - 1,
  ]);

  return (
    <View onLayout={onLayout}>
      {total === 0 ? (
        <EmptyNote text="Nothing in the last 8 weeks." />
      ) : (
        width > 0 && (
          <>
            <View style={styles.chartLabelRow}>
              {data.map((d, i) => (
                <Text
                  key={d.weekStart}
                  variant="bodySmall"
                  style={[styles.barValueLabel, { width: barWidth }]}
                >
                  {labeled.has(i) && d.count > 0 ? String(d.count) : " "}
                </Text>
              ))}
            </View>
            <Svg width={width} height={CHART_HEIGHT}>
              {data.map((d, i) => {
                const h = Math.max(
                  d.count === 0 ? 0 : 4,
                  (d.count / max) * CHART_HEIGHT
                );
                return (
                  <Rect
                    key={d.weekStart}
                    x={i * (barWidth + BAR_GAP)}
                    y={CHART_HEIGHT - h}
                    width={barWidth}
                    height={h}
                    rx={2}
                    fill={SERIES}
                  />
                );
              })}
            </Svg>
            <WeekAxis data={data.map((d) => d.weekStart)} />
          </>
        )
      )}
    </View>
  );
};

const RunBars: React.FC<{ data: WeeklyRunCounts[] }> = ({ data }) => {
  const { width, onLayout } = useChartWidth();
  const max = Math.max(...data.map((d) => d.ok + d.shortfall), 1);
  const total = data.reduce((sum, d) => sum + d.ok + d.shortfall, 0);
  const barWidth =
    data.length > 0 ? (width - BAR_GAP * (data.length - 1)) / data.length : 0;

  return (
    <View onLayout={onLayout}>
      {total === 0 ? (
        <EmptyNote text="No runs recorded yet — the table started collecting with DEV-391." />
      ) : (
        width > 0 && (
          <>
            <Svg width={width} height={CHART_HEIGHT}>
              {data.map((d, i) => {
                const x = i * (barWidth + BAR_GAP);
                // Scale into a plot area that leaves headroom for the segment
                // gap, so the busiest week's top segment isn't clipped by the
                // SVG edge; floors feed the y positions too, or a floored bar
                // grows down past the baseline instead of up.
                const plotHeight = CHART_HEIGHT - SEGMENT_GAP - 3;
                const okH =
                  d.ok > 0 ? Math.max((d.ok / max) * plotHeight, 3) : 0;
                const shortH =
                  d.shortfall > 0
                    ? Math.max((d.shortfall / max) * plotHeight, 3)
                    : 0;
                const okGap = d.ok > 0 ? SEGMENT_GAP : 0;
                return (
                  <React.Fragment key={d.weekStart}>
                    {d.shortfall > 0 && (
                      <Rect
                        x={x}
                        y={CHART_HEIGHT - okH - okGap - shortH}
                        width={barWidth}
                        height={shortH}
                        rx={2}
                        fill={SERIES_ALT}
                      />
                    )}
                    {d.ok > 0 && (
                      <Rect
                        x={x}
                        y={CHART_HEIGHT - okH}
                        width={barWidth}
                        height={okH}
                        rx={2}
                        fill={SERIES}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </Svg>
            <WeekAxis data={data.map((d) => d.weekStart)} />
          </>
        )
      )}
    </View>
  );
};

/** First and last week-start only; eight date labels under 40px bars collide. */
const WeekAxis: React.FC<{ data: string[] }> = ({ data }) => {
  if (data.length === 0) return null;
  const fmt = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  return (
    <View style={styles.axisRow}>
      <Text variant="bodySmall" style={styles.axisLabel}>
        {fmt(data[0])}
      </Text>
      <Text variant="bodySmall" style={styles.axisLabel}>
        {fmt(data[data.length - 1])}
      </Text>
    </View>
  );
};

const ACTION_LABELS: { [action: string]: string } = {
  chose: "Chose this gift",
  keep_in_mix: "Kept in the mix",
  already_have: "Already have it",
  not_for_them: "Not for them",
  price_off: "Price felt off",
  product_problem: "Product problem",
  remove: "Removed",
};

const ActionBars: React.FC<{
  actions: TractionMetrics["feedbackActions"];
}> = ({ actions }) => {
  const max = Math.max(...actions.map((a) => a.count), 1);
  return (
    <View style={styles.actionList}>
      {actions.map((a) => (
        <View key={a.action} style={styles.actionRow}>
          <Text
            variant="bodySmall"
            style={[
              styles.actionLabel,
              a.action === "chose" && styles.actionLabelChose,
            ]}
          >
            {ACTION_LABELS[a.action] ?? a.action}
          </Text>
          <View style={styles.actionBarTrack}>
            <View
              style={[
                styles.actionBarFill,
                { width: `${(100 * a.count) / max}%` },
              ]}
            />
          </View>
          <Text variant="bodySmall" style={styles.actionCount}>
            {String(a.count)}
          </Text>
        </View>
      ))}
    </View>
  );
};

const StatusList: React.FC<{
  title: string;
  rows: { status: string; count: number }[];
}> = ({ title, rows }) => (
  <View style={styles.statusList}>
    <Text variant="titleSmall" style={styles.statusTitle}>
      {title}
    </Text>
    {rows.length === 0 ? (
      <EmptyNote text="None yet." />
    ) : (
      rows.map((r) => (
        <Text key={r.status} variant="bodyMedium" style={styles.statusRow}>
          {`${r.status}: ${r.count}`}
        </Text>
      ))
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
  },
  center: {
    paddingVertical: 48,
    alignItems: "center",
  },
  errorCard: {
    marginBottom: 12,
    backgroundColor: "#fee",
    borderRadius: 8,
  },
  errorText: {
    color: "#900",
  },
  tileRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  tile: {
    flexGrow: 1,
    flexBasis: 150,
    borderRadius: 8,
    backgroundColor: Colors.brand.beigeLight,
  },
  tileContent: {
    alignItems: "flex-start",
    gap: 2,
  },
  tileValue: {
    fontWeight: "700",
    color: Colors.darks.black,
  },
  tileLabel: {
    color: Colors.grays.text,
  },
  tileDelta: {
    color: Colors.brand.buttonTeal,
  },
  sectionCard: {
    borderRadius: 8,
    backgroundColor: Colors.white,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: 12,
  },
  emptyNote: {
    color: Colors.grays.text,
  },
  chartLabelRow: {
    flexDirection: "row",
    gap: BAR_GAP,
    marginBottom: 2,
  },
  barValueLabel: {
    textAlign: "center",
    color: Colors.grays.text,
  },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  axisLabel: {
    color: Colors.grays.placeholder,
  },
  chartFootnote: {
    marginTop: 8,
    color: Colors.grays.placeholder,
  },
  legendRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLabel: {
    color: Colors.grays.text,
  },
  actionList: {
    gap: 8,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionLabel: {
    width: 130,
    color: Colors.grays.dark,
  },
  actionLabelChose: {
    fontWeight: "700",
  },
  actionBarTrack: {
    flex: 1,
    height: 14,
    borderRadius: 4,
    backgroundColor: Colors.grays.hairline,
    overflow: "hidden",
  },
  actionBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: Colors.brand.buttonTeal,
  },
  actionCount: {
    width: 32,
    textAlign: "right",
    color: Colors.grays.dark,
  },
  inlineNumber: {
    fontWeight: "700",
  },
  opsLine: {
    color: Colors.grays.dark,
  },
  statusColumns: {
    flexDirection: "row",
    gap: 32,
    flexWrap: "wrap",
  },
  statusList: {
    gap: 4,
    minWidth: 140,
  },
  statusTitle: {
    fontWeight: "600",
    marginBottom: 2,
  },
  statusRow: {
    color: Colors.grays.dark,
  },
});

export default DashboardScreen;
