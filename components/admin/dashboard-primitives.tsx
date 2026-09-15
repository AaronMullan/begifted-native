import { AdminTheme } from "@/lib/admin-theme";
import { Typography } from "@/lib/typography";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";

// Chart colors on the dark console surface: a brightened teal for the primary
// series (buttonTeal reads too dark on the dark ground) and gold for the
// secondary. They keep clear CVD separation, and every chart also carries
// direct value labels, so color is never the only encoding.
export const SERIES = AdminTheme.accentBright;
export const SERIES_ALT = AdminTheme.gold;

export const CHART_HEIGHT = 120;
export const BAR_GAP = 6;

export const StatTile: React.FC<{
  label: string;
  value: string;
  caption: string;
  delta?: string | null;
  deltaTone?: "good" | "warn";
}> = ({ label, value, caption, delta = null, deltaTone = "good" }) => (
  <Card mode="contained" style={styles.tile}>
    <Card.Content style={styles.tileContent}>
      <Text variant="displaySmall" style={styles.tileValue}>
        {value}
      </Text>
      <Text variant="bodySmall" style={styles.tileLabel}>
        {label}
      </Text>
      <Text variant="bodySmall" style={styles.tileCaption}>
        {caption}
      </Text>
      {delta && (
        <Text
          variant="bodySmall"
          style={[
            styles.tileDelta,
            deltaTone === "warn" && styles.tileDeltaWarn,
          ]}
        >
          {delta}
        </Text>
      )}
    </Card.Content>
  </Card>
);

export const Section: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <Card mode="contained" style={primitiveStyles.sectionCard}>
    <Card.Content>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </Card.Content>
  </Card>
);

export const EmptyNote: React.FC<{ text: string }> = ({ text }) => (
  <Text variant="bodyMedium" style={styles.emptyNote}>
    {text}
  </Text>
);

export const LegendSwatch: React.FC<{ color: string; label: string }> = ({
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
export const useChartWidth = () => {
  const [width, setWidth] = useState(0);
  const onLayout = (e: { nativeEvent: { layout: { width: number } } }) =>
    setWidth(e.nativeEvent.layout.width);
  return { width, onLayout };
};

/** First and last label only; many date labels under narrow bars collide. */
export const DateAxis: React.FC<{ data: string[] }> = ({ data }) => {
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

export const primitiveStyles = StyleSheet.create({
  sectionCard: {
    borderRadius: 13,
    backgroundColor: AdminTheme.panel,
    borderWidth: 1,
    borderColor: AdminTheme.border,
    marginBottom: 13,
  },
  tileRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 13,
    marginBottom: 13,
  },
  chartLabelRow: {
    flexDirection: "row",
    gap: BAR_GAP,
    marginBottom: 2,
  },
  barValueLabel: {
    textAlign: "center",
    color: AdminTheme.muted,
  },
  chartFootnote: {
    marginTop: 8,
    color: AdminTheme.faint,
  },
  legendRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
    flexWrap: "wrap",
  },
});

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: 150,
    borderRadius: 13,
    backgroundColor: AdminTheme.panel,
    borderWidth: 1,
    borderColor: AdminTheme.border,
  },
  tileContent: {
    alignItems: "flex-start",
    gap: 2,
  },
  tileValue: {
    fontWeight: "700",
    color: AdminTheme.textStrong,
  },
  tileLabel: {
    ...Typography.eyebrow,
    color: AdminTheme.faint,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 6,
  },
  tileCaption: {
    color: AdminTheme.faint,
    marginTop: 4,
  },
  tileDelta: {
    color: AdminTheme.good,
    fontWeight: "600",
    marginTop: 2,
  },
  tileDeltaWarn: {
    color: AdminTheme.warn,
  },
  sectionTitle: {
    ...Typography.sectionHeadAc,
    color: AdminTheme.muted,
    letterSpacing: 1,
    marginBottom: 15,
  },
  emptyNote: {
    color: AdminTheme.muted,
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
    color: AdminTheme.text,
  },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  axisLabel: {
    color: AdminTheme.faint,
  },
});
