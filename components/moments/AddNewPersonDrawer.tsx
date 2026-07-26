import React, { useImperativeHandle, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";
import { Spacing } from "../../lib/spacing";

export type AddNewPersonDrawerHandle = {
  present: () => void;
  dismiss: () => void;
};

type AddNewPersonDrawerProps = {
  /** Hand the free-form note off (to the add-recipient extraction flow). */
  onSend: (note: string) => void;
  handleRef: React.MutableRefObject<AddNewPersonDrawerHandle | null>;
};

/**
 * "Tell BeGifted about them" drawer (Figma 4975:2978): a single free-form
 * note about the new person — not a chat. The note feeds the same
 * extraction pipeline as the add-recipient conversation. The mic hints at
 * the keyboard's dictation; tapping it focuses the field.
 */
export const AddNewPersonDrawer: React.FC<AddNewPersonDrawerProps> = ({
  onSend,
  handleRef,
}) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const inputRef =
    useRef<React.ComponentRef<typeof BottomSheetTextInput>>(null);
  const [note, setNote] = useState("");

  useImperativeHandle(handleRef, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const handleSend = () => {
    const text = note.trim();
    if (!text) return;
    sheetRef.current?.dismiss();
    onSend(text);
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      handleIndicatorStyle={styles.sheetHandle}
      backgroundStyle={styles.sheetBackground}
      onDismiss={() => setNote("")}
    >
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>Tell BeGifted about them</Text>
        <Text style={styles.prompt}>What should BeGifted know about them?</Text>
        <View style={styles.fieldBox}>
          <BottomSheetTextInput
            ref={inputRef}
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Michelle is my wife, born June 26. Loves architecture, modern design, and thoughtful handmade things — not generic gifts."
            placeholderTextColor={Colors.brand.mediumTeal}
            multiline
            style={styles.input}
          />
          <View style={styles.iconRow}>
            <Pressable
              onPress={() => inputRef.current?.focus()}
              accessibilityRole="button"
              accessibilityLabel="Dictate with the keyboard microphone"
              hitSlop={8}
            >
              <MaterialIcons
                name="mic-none"
                size={20}
                color={Colors.brand.rose}
              />
            </Pressable>
            <Pressable
              onPress={handleSend}
              accessibilityRole="button"
              accessibilityLabel="Send"
              style={[styles.sendCircle, !note.trim() && styles.sendDisabled]}
            >
              <MaterialIcons
                name="arrow-upward"
                size={18}
                color={Colors.white}
              />
            </Pressable>
          </View>
        </View>
        <Button
          mode="contained"
          buttonColor={Colors.brand.darkTeal}
          textColor={Colors.white}
          onPress={handleSend}
          disabled={!note.trim()}
          style={styles.cta}
          contentStyle={styles.ctaContent}
          labelStyle={styles.ctaLabel}
        >
          Send
        </Button>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetHandle: {
    backgroundColor: Colors.brand.beige,
    width: 58,
    height: 5,
    borderRadius: 4,
  },
  content: {
    paddingHorizontal: Spacing.sectionHeadInset,
    paddingTop: 12,
    paddingBottom: 24,
  },
  title: {
    ...Typography.drawerTitle,
    color: Colors.brand.darkTeal,
  },
  prompt: {
    ...Typography.copyblock,
    color: Colors.brand.mediumTeal,
    marginTop: 6,
  },
  // Square corners on purpose — the Figma field-box has no radius.
  fieldBox: {
    backgroundColor: Colors.brand.beigeLight,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 158,
    marginTop: 20,
  },
  input: {
    flex: 1,
    minHeight: 96,
    textAlignVertical: "top",
    ...Typography.copyblock,
    color: Colors.brand.darkTeal,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
  },
  sendCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.brand.mediumTeal,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: {
    opacity: 0.5,
  },
  cta: {
    alignSelf: "center",
    width: 170,
    borderRadius: 24,
    marginTop: 32,
  },
  ctaContent: {
    height: 46,
  },
  ctaLabel: {
    ...Typography.largeCta,
  },
});
