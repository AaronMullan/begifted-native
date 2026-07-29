import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Colors } from "../lib/colors";
import { Typography } from "../lib/typography";
import { PrimaryCta } from "./PrimaryCta";

type ContactsAccessIntroProps = {
  visible: boolean;
  onContinue: () => void;
  onClose: () => void;
  isLoading?: boolean;
};

// Shown before requesting contacts permission. Explains that import never
// reads the whole address book. A denied permission lands in
// ContactsImportFailedModal, which owns the Open Settings path. Figma
// Modal/Confirmation (4685:4745); plain RN Modal for exact centering (the
// documented Paper Dialog exception).
export default function ContactsAccessIntro({
  visible,
  onContinue,
  onClose,
  isLoading = false,
}: ContactsAccessIntroProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Access Your Contacts</Text>
          <Text style={styles.body}>
            We&apos;ll ask for permission to read your contacts so you can add
            people from your address book. Only the people you pick are imported
            — never your whole contact list.
          </Text>
          <View style={styles.buttonRow}>
            <PrimaryCta
              label="Continue"
              onPress={onContinue}
              state={isLoading ? "loading" : "idle"}
            />
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryPressed,
              ]}
            >
              <Text style={styles.secondaryLabel}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: 320,
    borderRadius: 16,
    backgroundColor: Colors.brand.beigeLight,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    gap: 16,
  },
  title: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
  },
  body: {
    ...Typography.copyblock,
    color: Colors.brand.mediumTeal,
  },
  buttonRow: {
    alignItems: "center",
    gap: 10,
  },
  // Figma Button/Secondary (4674:4696): fixed 170x46 pill, 2px lightTeal
  // border, darkTeal largeCta label.
  secondaryButton: {
    width: 170,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: Colors.brand.lightTeal,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryPressed: {
    opacity: 0.7,
  },
  secondaryLabel: {
    ...Typography.largeCta,
    color: Colors.brand.darkTeal,
  },
});
