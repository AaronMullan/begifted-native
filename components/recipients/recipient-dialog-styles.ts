import { StyleSheet } from "react-native";
import { Colors } from "../../lib/colors";
import { FontFamily } from "../../lib/typography";
import { Spacing } from "@/lib/spacing";

/**
 * Modal chrome shared by the keyboard-safe form dialogs (GiftPreferencesDialog,
 * InformationDialog, the calendar Add Occasion entry). Plain RN Modal (not
 * Paper Dialog) because these forms need precise centering and keyboard
 * avoidance — see the Dialog exception in CLAUDE.md.
 */
export const dialogStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dismissArea: {
    width: "100%",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: Colors.brand.beigeLight,
    borderRadius: 18,
    width: "100%",
    maxWidth: 480,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 16,
    paddingRight: 8,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e0d6c4",
  },
  // 44pt min tap target (HIG); transparent container, 24pt icon unchanged.
  modalClose: {
    margin: 0,
    width: 44,
    height: 44,
  },
  modalTitle: {
    flex: 1,
    fontFamily: FontFamily.serif.semibold,
    color: Colors.brand.darkTeal,
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  modalFooterButton: {
    flex: 1,
  },
  input: {
    marginBottom: Spacing.fieldGap,
    backgroundColor: Colors.brand.beigeLight,
  },
  budgetInput: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
});
