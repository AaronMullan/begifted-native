import { AdminTheme } from "@/lib/admin-theme";
import { Platform, StyleSheet } from "react-native";

export const resultStyles = StyleSheet.create({
  statusRow: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 4,
  },
  activeChip: {
    backgroundColor: "rgba(127,212,196,0.18)",
  },
  inactiveChip: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  sectionLabel: {
    color: AdminTheme.faint,
    marginBottom: 4,
  },
  collapseBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  contextBox: {
    backgroundColor: AdminTheme.inset,
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  contextField: {
    color: AdminTheme.text,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  contextChip: {
    backgroundColor: AdminTheme.panelStrong,
  },
  anchorActive: {
    backgroundColor: "rgba(127,212,196,0.18)",
  },
  anchorMissing: {
    backgroundColor: "rgba(173,75,95,0.22)",
  },
  occasionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  milestoneChip: {
    backgroundColor: "rgba(171,138,62,0.28)",
  },
  occasionDate: {
    color: AdminTheme.muted,
  },
  reasoning: {
    color: AdminTheme.muted,
    fontStyle: "italic",
    marginTop: 4,
  },
  additionalSection: {
    marginTop: 12,
  },
  summaryBox: {
    backgroundColor: AdminTheme.inset,
    borderRadius: 8,
    padding: 12,
  },
  resolvedPromptScroll: {
    maxHeight: 300,
  },
  resolvedPromptText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    // eslint-disable-next-line no-restricted-syntax -- monospace readout; the type scale has no mono token
    fontSize: 11,
    lineHeight: 16,
    color: AdminTheme.text,
  },
  processIntro: {
    color: AdminTheme.text,
    marginBottom: 8,
  },
  stepHeader: {
    color: AdminTheme.textStrong,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 4,
  },
});

export const errorStyles = StyleSheet.create({
  resultError: {
    padding: 12,
    backgroundColor: "rgba(173,75,95,0.18)",
    borderRadius: 8,
  },
  errorText: {
    color: AdminTheme.bad,
  },
});
