import {
  BAR_GAP,
  CHART_HEIGHT,
  DateAxis,
  EmptyNote,
  LegendSwatch,
  SERIES,
  SERIES_ALT,
  Section,
  StatTile,
  primitiveStyles,
  useChartWidth,
} from "@/components/admin/dashboard-primitives";
import { useAppConfig } from "@/hooks/use-app-config";
import { useAuth } from "@/hooks/use-auth";
import { fetchAiSpendMetrics, saveAiModelPrice } from "@/lib/api";
import type { AiSpendMetrics, NewAiModelPrice } from "@/lib/api";
import { AdminTheme } from "@/lib/admin-theme";
import type { Provider } from "@/lib/ai-models";
import { PROVIDER_MODELS } from "@/lib/ai-models";
import { queryKeys } from "@/lib/query-keys";
import { Typography } from "@/lib/typography";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Dialog,
  Menu,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
} from "react-native-paper";
import Svg, { Rect, Text as SvgText } from "react-native-svg";

// Third series color for a window where more than two models ran; beyond
// that, additional models share it and the legend still names each.
const SERIES_COLORS = [SERIES, SERIES_ALT, AdminTheme.good];
const SEGMENT_GAP = 2;
// Room above the bars for the two direct value labels, drawn inside the SVG
// because thirty bars are too narrow for a per-bar label row.
const LABEL_HEIGHT = 16;
// A "$12.34" label at 11px is about 36px wide; centers closer than this collide.
const LABEL_MIN_SEPARATION = 44;

const money = (v: number): string => `$${v.toFixed(2)}`;
const thousands = (v: number): string => `${(v / 1000).toFixed(1)}k`;

const SOURCE_LABELS: { [source: string]: string } = {
  on_demand: "User asked",
  cron: "Daily cron",
  backfill: "Backfill",
  admin: "Admin",
};

const longDate = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * What gift generation costs, priced from each run's own token counts. Lives
 * at the foot of the Traction page so run counts (above) and their dollar
 * cost read together.
 */
export const AiSpendSection: React.FC = () => {
  const spendQuery = useQuery({
    queryKey: queryKeys.aiSpend,
    queryFn: fetchAiSpendMetrics,
  });
  const { data: config } = useAppConfig();
  const [editOpen, setEditOpen] = useState(false);

  const m = spendQuery.data;
  const production = config
    ? { provider: config.ai_provider, model: config.ai_model }
    : null;
  const isProduction = (provider: string, model: string) =>
    production?.provider === provider && production?.model === model;

  // The tile compares against the first priced model that is not the one in
  // production, which is the candidate the team is weighing. Until the
  // production model is known there is nothing to compare against.
  const comparison = production
    ? m?.projections.find((p) => !isProduction(p.provider, p.model))
    : undefined;
  const colorFor = (model: string): string => {
    const idx = m?.byModel.findIndex((r) => r.model === model) ?? -1;
    return SERIES_COLORS[Math.min(Math.max(idx, 0), SERIES_COLORS.length - 1)];
  };

  return (
    <>
      <View style={styles.headingRow}>
        <Text variant="titleMedium" style={styles.heading}>
          AI spend, gift generation
        </Text>
        {m && (
          <Text variant="bodySmall" style={styles.headingNote}>
            {`Since ${longDate(
              m.trackingStart
            )}, when token tracking began · UTC days`}
          </Text>
        )}
      </View>

      {spendQuery.isLoading && (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      )}

      {spendQuery.error && (
        <Section title="AI spend">
          <Text variant="bodyMedium" style={styles.errorText}>
            {(spendQuery.error as Error).message}
          </Text>
        </Section>
      )}

      {m && (
        <>
          <View style={primitiveStyles.tileRow}>
            <StatTile
              label="Spent"
              value={money(m.spend)}
              caption={`${m.costedRuns} costed run${
                m.costedRuns === 1 ? "" : "s"
              }`}
            />
            <StatTile
              label="Per run"
              value={m.avgCostPerRun == null ? "—" : money(m.avgCostPerRun)}
              caption="One set of gift ideas, average"
            />
            <StatTile
              label="Per gift stored"
              value={m.costPerStored == null ? "—" : money(m.costPerStored)}
              caption={`${m.storedCount} gift${
                m.storedCount === 1 ? "" : "s"
              } reached a user`}
            />
            {comparison && (
              <StatTile
                label={`Same runs on ${comparison.model}`}
                value={money(comparison.cost)}
                caption="Projected at its prices, same tokens"
                delta={
                  m.spend > 0
                    ? `${(comparison.cost / m.spend).toFixed(1)}× the actual`
                    : null
                }
                deltaTone="warn"
              />
            )}
          </View>

          <Section title="Cost per run by model">
            {m.byModel.length === 0 ? (
              <EmptyNote text="No priced runs in the window yet." />
            ) : (
              <>
                <View style={[styles.tableRow, styles.tableHead]}>
                  <Text variant="bodySmall" style={styles.colModelHead}>
                    Model
                  </Text>
                  {[
                    "Runs",
                    "Avg cost",
                    "Input",
                    "Cached",
                    "Output",
                    "Attempts",
                    "Per gift",
                  ].map((h) => (
                    <Text key={h} variant="bodySmall" style={styles.colHead}>
                      {h}
                    </Text>
                  ))}
                </View>
                {m.byModel.map((r) => {
                  const quiet = r.runs === 0;
                  const cell = quiet ? styles.cellQuiet : styles.cell;
                  return (
                    <View
                      key={`${r.provider}/${r.model}`}
                      style={styles.tableRow}
                    >
                      <View style={styles.colModel}>
                        <View
                          style={[
                            styles.swatch,
                            { backgroundColor: colorFor(r.model) },
                          ]}
                        />
                        <Text
                          variant="bodyMedium"
                          style={quiet ? styles.cellQuiet : styles.modelName}
                        >
                          {r.model}
                        </Text>
                        {isProduction(r.provider, r.model) && (
                          <Text
                            variant="bodySmall"
                            style={styles.productionTag}
                          >
                            production
                          </Text>
                        )}
                        {r.unpricedRuns > 0 && (
                          <Text
                            variant="bodySmall"
                            style={styles.productionTag}
                          >
                            {`${r.unpricedRuns} unpriced`}
                          </Text>
                        )}
                      </View>
                      <Text variant="bodyMedium" style={cell}>
                        {String(r.runs)}
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={quiet ? styles.cellQuiet : styles.cellStrong}
                      >
                        {r.avgCost != null
                          ? money(r.avgCost)
                          : r.unpricedRuns > 0
                            ? "no price set"
                            : r.projectedAvgCost != null
                              ? `${money(r.projectedAvgCost)} proj.`
                              : "—"}
                      </Text>
                      <Text variant="bodyMedium" style={cell}>
                        {r.avgInput == null ? "—" : thousands(r.avgInput)}
                      </Text>
                      <Text variant="bodyMedium" style={cell}>
                        {r.avgCached == null ? "—" : thousands(r.avgCached)}
                      </Text>
                      <Text variant="bodyMedium" style={cell}>
                        {r.avgOutput == null ? "—" : thousands(r.avgOutput)}
                      </Text>
                      <Text variant="bodyMedium" style={cell}>
                        {r.avgAttempts == null ? "—" : r.avgAttempts.toFixed(1)}
                      </Text>
                      <Text variant="bodyMedium" style={cell}>
                        {r.costPerStored == null ? "—" : money(r.costPerStored)}
                      </Text>
                    </View>
                  );
                })}
                <Text variant="bodySmall" style={primitiveStyles.chartFootnote}>
                  Token columns are per-run averages; input excludes the cached
                  share. A model with no runs shows what this window&apos;s runs
                  would average at its prices.
                </Text>
              </>
            )}
          </Section>

          <Section title="Spend by day, last 30 days">
            <DailyBars data={m} colorFor={colorFor} />
          </Section>

          <View style={styles.twoUp}>
            <View style={styles.twoUpCol}>
              <Section title="Spend by what started the run">
                {m.bySource.length === 0 ? (
                  <EmptyNote text="No priced runs in the window yet." />
                ) : (
                  <SourceBars data={m.bySource} />
                )}
              </Section>
            </View>
            <View style={styles.twoUpCol}>
              <Section title="Prices used, per million tokens">
                {m.prices.length === 0 ? (
                  <EmptyNote text="No prices set." />
                ) : (
                  <>
                    <View style={[styles.tableRow, styles.tableHead]}>
                      <Text variant="bodySmall" style={styles.colModelHead}>
                        Model
                      </Text>
                      {["Input", "Cached", "Output"].map((h) => (
                        <Text
                          key={h}
                          variant="bodySmall"
                          style={styles.colHead}
                        >
                          {h}
                        </Text>
                      ))}
                    </View>
                    {m.prices.map((p) => (
                      <View key={p.id} style={styles.tableRow}>
                        <Text variant="bodyMedium" style={styles.colModel}>
                          {p.model}
                        </Text>
                        <Text variant="bodyMedium" style={styles.cell}>
                          {money(p.input_per_m)}
                        </Text>
                        <Text variant="bodyMedium" style={styles.cell}>
                          {money(p.cached_input_per_m)}
                        </Text>
                        <Text variant="bodyMedium" style={styles.cell}>
                          {money(p.output_per_m)}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
                <Button
                  mode="outlined"
                  compact
                  icon="pencil"
                  textColor={AdminTheme.text}
                  style={styles.editButton}
                  onPress={() => setEditOpen(true)}
                >
                  Edit prices
                </Button>
                <Text variant="bodySmall" style={primitiveStyles.chartFootnote}>
                  A run on a model with no price here shows as unpriced, never
                  $0. A new price applies from the date entered; earlier runs
                  keep the price in force on their day.
                </Text>
              </Section>
            </View>
          </View>

          <Section title="How complete this is">
            <Text variant="bodyMedium" style={styles.completeness}>
              {completenessText(m)}
            </Text>
          </Section>
        </>
      )}

      <EditPriceDialog
        visible={editOpen}
        onDismiss={() => setEditOpen(false)}
      />
    </>
  );
};

function completenessText(m: AiSpendMetrics): string {
  const parts: string[] = [];
  parts.push(
    `${m.costedRuns} of ${m.totalRuns} run${
      m.totalRuns === 1 ? "" : "s"
    } in the window have usage data and a price.`
  );
  const uncosted = m.uncostedBySource.reduce((s, u) => s + u.count, 0);
  if (uncosted > 0) {
    const breakdown = m.uncostedBySource
      .map((u) => `${u.count} ${SOURCE_LABELS[u.source] ?? u.source}`)
      .join(", ");
    parts.push(
      `The ${uncosted} without token data (${breakdown}) are left out of every number above, never estimated.`
    );
  }
  if (m.unpricedRuns > 0) {
    parts.push(
      `${m.unpricedRuns} run${
        m.unpricedRuns === 1 ? " has" : "s have"
      } usage but no price for ${m.unpricedModels.join(", ")}; add one to count them.`
    );
  }
  parts.push(
    `Spend before ${longDate(
      m.trackingStart
    )} was not tracked per run; the provider's dashboard remains the source for the lifetime total. Playground runs live in a different table and are not counted here.`
  );
  return parts.join(" ");
}

const DailyBars: React.FC<{
  data: AiSpendMetrics;
  colorFor: (model: string) => string;
}> = ({ data, colorFor }) => {
  const { width, onLayout } = useChartWidth();
  const days = data.byDay;
  const totals = days.map((d) => d.byModel.reduce((s, x) => s + x.cost, 0));
  const max = Math.max(...totals, 0.01);
  const spend = totals.reduce((s, t) => s + t, 0);
  const barWidth =
    days.length > 0 ? (width - BAR_GAP * (days.length - 1)) / days.length : 0;
  // Direct labels on the peak and the latest day only; the peak label is
  // dropped when the two would overlap, which depends on bar pitch, not on
  // how many days apart they are.
  const last = days.length - 1;
  const peak = totals.indexOf(max);
  const labelsOverlap =
    (last - peak) * (barWidth + BAR_GAP) < LABEL_MIN_SEPARATION;
  const labeled = new Set<number>(labelsOverlap ? [last] : [peak, last]);
  const seriesInWindow = data.byModel.filter((r) => r.runs > 0);
  const hasUntracked = days.some((d) => !d.tracked);

  return (
    <View onLayout={onLayout}>
      {spend === 0 ? (
        <EmptyNote text="No priced runs in the last 30 days." />
      ) : (
        width > 0 && (
          <>
            <Svg width={width} height={CHART_HEIGHT + LABEL_HEIGHT}>
              {days.map((d, i) => {
                const x = i * (barWidth + BAR_GAP);
                const baseline = CHART_HEIGHT + LABEL_HEIGHT;
                if (!d.tracked || totals[i] === 0) {
                  return (
                    <Rect
                      key={d.day}
                      x={x}
                      y={baseline - 2}
                      width={barWidth}
                      height={2}
                      rx={1}
                      fill={AdminTheme.borderSoft}
                    />
                  );
                }
                // Stack in series order from the baseline up, with a surface
                // gap between segments; the plot leaves headroom so the
                // busiest day's top segment is not clipped by its label.
                const plotHeight = CHART_HEIGHT - SEGMENT_GAP * 2 - 3;
                let y = baseline;
                const topOfBar =
                  baseline - Math.max((totals[i] / max) * plotHeight, 3);
                // Anchor the label inside the SVG at the last bar so the
                // text does not run past the chart's right edge.
                const anchor =
                  i === last ? "end" : i === 0 ? "start" : "middle";
                const labelX =
                  i === last ? x + barWidth : i === 0 ? x : x + barWidth / 2;
                return (
                  <React.Fragment key={d.day}>
                    {labeled.has(i) && (
                      <SvgText
                        x={labelX}
                        y={topOfBar - SEGMENT_GAP * 2 - 3}
                        fontSize={11}
                        fill={AdminTheme.muted}
                        textAnchor={anchor}
                      >
                        {money(totals[i])}
                      </SvgText>
                    )}
                    {seriesInWindow.map((s) => {
                      const cost =
                        d.byModel.find((x) => x.model === s.model)?.cost ?? 0;
                      if (cost <= 0) return null;
                      const h = Math.max((cost / max) * plotHeight, 3);
                      y -= h;
                      const rect = (
                        <Rect
                          key={s.model}
                          x={x}
                          y={y}
                          width={barWidth}
                          height={h}
                          rx={2}
                          fill={colorFor(s.model)}
                        />
                      );
                      y -= SEGMENT_GAP;
                      return rect;
                    })}
                  </React.Fragment>
                );
              })}
            </Svg>
            <DateAxis data={days.map((d) => d.day)} />
            {seriesInWindow.length > 1 && (
              <View style={primitiveStyles.legendRow}>
                {seriesInWindow.map((s) => (
                  <LegendSwatch
                    key={s.model}
                    color={colorFor(s.model)}
                    label={s.model}
                  />
                ))}
              </View>
            )}
            {hasUntracked && (
              <Text variant="bodySmall" style={primitiveStyles.chartFootnote}>
                {`Token tracking began ${longDate(
                  data.trackingStart
                )} — days before that have no data, not zero spend.`}
              </Text>
            )}
          </>
        )
      )}
    </View>
  );
};

const SourceBars: React.FC<{ data: AiSpendMetrics["bySource"] }> = ({
  data,
}) => {
  const max = Math.max(...data.map((s) => s.cost), 0.01);
  return (
    <View style={styles.sourceList}>
      {data.map((s) => (
        <View key={s.source} style={styles.sourceRow}>
          <Text variant="bodySmall" style={styles.sourceLabel}>
            {SOURCE_LABELS[s.source] ?? s.source}
          </Text>
          <View style={styles.sourceTrack}>
            <View
              style={[styles.sourceFill, { width: `${(100 * s.cost) / max}%` }]}
            />
          </View>
          <Text variant="bodySmall" style={styles.sourceCost}>
            {money(s.cost)}
          </Text>
          <Text variant="bodySmall" style={styles.sourceRuns}>
            {`${s.runs} run${s.runs === 1 ? "" : "s"}`}
          </Text>
        </View>
      ))}
    </View>
  );
};

const PROVIDERS = Object.keys(PROVIDER_MODELS) as Provider[];
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

const parsePrice = (s: string): number | null => {
  const n = Number(s.trim());
  return s.trim() === "" || !Number.isFinite(n) || n < 0 ? null : n;
};

/** Saves a price row; same model and date overwrites, a new date adds history. */
const EditPriceDialog: React.FC<{
  visible: boolean;
  onDismiss: () => void;
}> = ({ visible, onDismiss }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [provider, setProvider] = useState<Provider>("openai");
  const [model, setModel] = useState<string>(PROVIDER_MODELS.openai[0]);
  const [modelMenu, setModelMenu] = useState(false);
  const [input, setInput] = useState("");
  const [cached, setCached] = useState("");
  const [output, setOutput] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const mutation = useMutation({
    mutationFn: (price: NewAiModelPrice) => saveAiModelPrice(price, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiSpend });
      setInput("");
      setCached("");
      setOutput("");
      onDismiss();
    },
  });

  const inputN = parsePrice(input);
  const cachedN = parsePrice(cached);
  const outputN = parsePrice(output);
  const valid =
    inputN != null &&
    cachedN != null &&
    outputN != null &&
    isoDate.test(effectiveFrom);

  const selectProvider = (p: Provider) => {
    setProvider(p);
    setModel(PROVIDER_MODELS[p][0]);
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>Set a price</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodySmall" style={styles.dialogHint}>
            USD per million tokens. Applies from the date below; earlier runs
            keep the price that was in force on their day. Saving the same model
            and date again replaces that entry.
          </Text>
          <SegmentedButtons
            value={provider}
            onValueChange={(v) => selectProvider(v as Provider)}
            buttons={PROVIDERS.map((p) => ({ value: p, label: p }))}
            style={styles.dialogField}
          />
          <Menu
            visible={modelMenu}
            onDismiss={() => setModelMenu(false)}
            anchor={
              <Button
                mode="outlined"
                icon="chevron-down"
                contentStyle={styles.menuButtonContent}
                style={styles.dialogField}
                onPress={() => setModelMenu(true)}
              >
                {model}
              </Button>
            }
          >
            {PROVIDER_MODELS[provider].map((mName) => (
              <Menu.Item
                key={mName}
                title={mName}
                onPress={() => {
                  setModel(mName);
                  setModelMenu(false);
                }}
              />
            ))}
          </Menu>
          <TextInput
            mode="outlined"
            label="Input"
            value={input}
            onChangeText={setInput}
            keyboardType="decimal-pad"
            style={styles.dialogField}
          />
          <TextInput
            mode="outlined"
            label="Cached input"
            value={cached}
            onChangeText={setCached}
            keyboardType="decimal-pad"
            style={styles.dialogField}
          />
          <TextInput
            mode="outlined"
            label="Output"
            value={output}
            onChangeText={setOutput}
            keyboardType="decimal-pad"
            style={styles.dialogField}
          />
          <TextInput
            mode="outlined"
            label="Effective from (YYYY-MM-DD)"
            value={effectiveFrom}
            onChangeText={setEffectiveFrom}
            style={styles.dialogField}
          />
          {mutation.error && (
            <Text variant="bodySmall" style={styles.errorText}>
              {(mutation.error as Error).message}
            </Text>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            disabled={!valid || mutation.isPending}
            loading={mutation.isPending}
            onPress={() =>
              mutation.mutate({
                provider,
                model,
                input_per_m: inputN!,
                cached_input_per_m: cachedN!,
                output_per_m: outputN!,
                effective_from: effectiveFrom,
              })
            }
          >
            Save
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  headingRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    marginBottom: 13,
  },
  heading: {
    ...Typography.sectionHeadAc,
    color: AdminTheme.muted,
    letterSpacing: 1,
  },
  headingNote: {
    color: AdminTheme.faint,
  },
  center: {
    paddingVertical: 24,
    alignItems: "center",
  },
  errorText: {
    color: AdminTheme.bad,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: AdminTheme.borderSoft,
  },
  tableHead: {
    paddingVertical: 0,
    paddingBottom: 8,
    borderBottomColor: AdminTheme.border,
  },
  colModelHead: {
    flex: 2.2,
    color: AdminTheme.faint,
  },
  colHead: {
    flex: 1,
    textAlign: "right",
    color: AdminTheme.faint,
  },
  colModel: {
    flex: 2.2,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    color: AdminTheme.text,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  modelName: {
    fontWeight: "700",
    color: AdminTheme.textStrong,
  },
  productionTag: {
    color: AdminTheme.faint,
  },
  cell: {
    flex: 1,
    textAlign: "right",
    color: AdminTheme.text,
  },
  cellStrong: {
    flex: 1,
    textAlign: "right",
    fontWeight: "700",
    color: AdminTheme.textStrong,
  },
  cellQuiet: {
    flex: 1,
    textAlign: "right",
    color: AdminTheme.muted,
  },
  twoUp: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 13,
  },
  twoUpCol: {
    flexGrow: 1,
    flexBasis: 320,
  },
  sourceList: {
    gap: 8,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sourceLabel: {
    width: 100,
    color: AdminTheme.text,
  },
  sourceTrack: {
    flex: 1,
    height: 14,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  sourceFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: AdminTheme.accentBright,
  },
  sourceCost: {
    width: 48,
    textAlign: "right",
    color: AdminTheme.text,
  },
  sourceRuns: {
    width: 52,
    textAlign: "right",
    color: AdminTheme.faint,
  },
  editButton: {
    alignSelf: "flex-start",
    marginTop: 12,
  },
  completeness: {
    color: AdminTheme.text,
  },
  dialog: {
    borderRadius: 16,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  dialogHint: {
    color: AdminTheme.muted,
    marginBottom: 12,
  },
  dialogField: {
    marginTop: 8,
  },
  menuButtonContent: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
});
