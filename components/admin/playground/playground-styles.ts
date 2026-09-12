import { AdminTheme } from "@/lib/admin-theme";
import { Platform, StyleSheet } from "react-native";

// Styles shared by two or more Playground components. A style used by a single
// component lives in that component's file.
export const playgroundStyles = StyleSheet.create({
  panel: {
    gap: 12,
  },

  // Cards
  card: {
    borderRadius: 12,
    backgroundColor: AdminTheme.panel,
    borderWidth: 1,
    borderColor: AdminTheme.border,
  },
  cardTitle: {
    fontWeight: "600",
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  // Selectors
  fieldLabel: {
    marginTop: 8,
    marginBottom: 4,
    color: AdminTheme.muted,
  },
  selector: {
    borderRadius: 8,
  },
  selectorContent: {
    justifyContent: "flex-start",
  },
  menuContent: {
    maxHeight: 300,
    overflow: "hidden",
  },
  menuScroll: {
    maxHeight: 300,
  },

  secondaryText: {
    color: AdminTheme.muted,
    fontStyle: "italic",
  },
  monoText: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
    // eslint-disable-next-line no-restricted-syntax -- monospace readout; the type scale has no mono token
    fontSize: 11,
    color: AdminTheme.text,
  },

  // Chat (refinement chat + conversation test)
  welcomeMessage: {
    padding: 12,
    backgroundColor: AdminTheme.panelStrong,
    borderRadius: 10,
    marginBottom: 8,
    gap: 8,
  },
  welcomeText: {
    color: AdminTheme.muted,
    fontStyle: "italic",
  },
  messageBubble: {
    maxWidth: "85%",
    padding: 10,
    borderRadius: 14,
    marginBottom: 6,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: AdminTheme.accent,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: AdminTheme.panelStrong,
    borderBottomLeftRadius: 4,
  },
  userText: {
    color: AdminTheme.textStrong,
  },
  assistantText: {
    color: AdminTheme.text,
  },
  loadingBubble: {
    alignSelf: "flex-start",
    padding: 12,
    backgroundColor: AdminTheme.panelStrong,
    borderRadius: 14,
    borderBottomLeftRadius: 4,
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: AdminTheme.border,
  },
  chatInputField: {
    flex: 1,
    backgroundColor: AdminTheme.inset,
  },

  // Test run history (mobile list + desktop selector column)
  historyItem: {
    borderRadius: 8,
    backgroundColor: AdminTheme.panel,
  },
  historyItemContent: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  historyDate: {
    color: AdminTheme.faint,
  },
});
