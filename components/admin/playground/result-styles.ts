import { Colors } from "@/lib/colors";
import { Platform, StyleSheet } from "react-native";

export const resultStyles = StyleSheet.create({
  statusRow: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 4,
  },
  activeChip: {
    backgroundColor: "#d4edda",
  },
  inactiveChip: {
    backgroundColor: "#e2e3e5",
  },
  sectionLabel: {
    color: Colors.darks.brown,
    marginBottom: 4,
  },
  collapseBtn: {
    alignSelf: "flex-start",
    marginTop: 4,
  },
  contextBox: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  contextField: {
    color: Colors.darks.brown,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  contextChip: {
    backgroundColor: "#e8e8e8",
  },
  anchorActive: {
    backgroundColor: "#d4edda",
  },
  anchorMissing: {
    backgroundColor: "#f8d7da",
  },
  occasionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  milestoneChip: {
    backgroundColor: Colors.yellows.amber,
  },
  occasionDate: {
    color: Colors.darks.brown,
  },
  reasoning: {
    color: Colors.darks.brown,
    fontStyle: "italic",
    marginTop: 4,
  },
  additionalSection: {
    marginTop: 12,
  },
  summaryBox: {
    backgroundColor: "#f5f5f5",
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
    color: Colors.darks.brown,
  },
  processIntro: {
    color: Colors.darks.brown,
    marginBottom: 8,
  },
  stepHeader: {
    color: Colors.darks.brown,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 4,
  },
});

export const errorStyles = StyleSheet.create({
  resultError: {
    padding: 12,
    backgroundColor: "#fce4ec",
    borderRadius: 8,
  },
  errorText: {
    color: Colors.pinks.dark,
  },
});
