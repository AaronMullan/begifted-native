import { useRef } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";
import { Spacing } from "../../lib/spacing";

/**
 * Contextual legal notice for the add-recipient surfaces: the Terms require
 * users to have the right to provide recipient info, and beta ships a
 * lightweight adults-only notice instead of age fields or stored consent.
 * The one-liner stays visible; "Learn more" opens the full disclosure, which
 * must keep its wording and stay non-blocking (no acknowledgment step).
 */
const AddRecipientLegalNotice: React.FC = () => {
  const sheetRef = useRef<BottomSheetModal>(null);
  // dismiss() on a sheet that isn't open can poison the next present(), so a
  // double-tapped Close must only dismiss once.
  const openRef = useRef(false);

  // The sheet portals to the root and doesn't see a keyboard that was already
  // up when it mounted, so it would open hidden behind it.
  const openSheet = () => {
    Keyboard.dismiss();
    sheetRef.current?.present();
  };

  const closeSheet = () => {
    if (!openRef.current) return;
    openRef.current = false;
    sheetRef.current?.dismiss();
  };

  return (
    <>
      {/* The whole line is the press target: "Learn more" alone is a ~15pt
          sliver wedged between the chat input and the Next-step button. */}
      <Text
        style={styles.notice}
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityHint="Opens the full notice about adding recipients"
      >
        BeGifted is for adults. You can add child recipients if authorized.{" "}
        <Text style={styles.link}>Learn more</Text>
      </Text>

      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        handleIndicatorStyle={styles.sheetHandle}
        backgroundStyle={styles.sheetBackground}
        onChange={(index) => {
          openRef.current = index >= 0;
        }}
        onDismiss={() => {
          openRef.current = false;
        }}
      >
        <BottomSheetView>
          <View style={styles.sheetContent}>
            <Text style={styles.sheetBody}>
              BeGifted is for adults. Only add child-recipient information if
              you are the parent/guardian or otherwise have authority. Only add
              information you have the right to provide.
            </Text>
            <Button
              mode="contained"
              buttonColor={Colors.black}
              onPress={closeSheet}
              style={styles.closeButton}
            >
              Close
            </Button>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </>
  );
};

export default AddRecipientLegalNotice;

const styles = StyleSheet.create({
  notice: {
    ...Typography.caption,
    color: Colors.grays.text,
    textAlign: "center",
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  link: {
    ...Typography.caption,
    color: Colors.brand.darkTeal,
    textDecorationLine: "underline",
  },
  sheetHandle: {
    backgroundColor: Colors.brand.beige,
    width: 58,
    height: 5,
    borderRadius: 4,
  },
  sheetBackground: {
    backgroundColor: Colors.white,
  },
  sheetContent: {
    paddingHorizontal: Spacing.sectionHeadInset,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 22,
  },
  sheetBody: {
    ...Typography.body13,
    color: Colors.brand.darkTeal,
  },
  closeButton: {
    alignSelf: "center",
    width: 170,
    borderRadius: 24,
  },
});
