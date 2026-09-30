import { Linking, Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Colors } from "../lib/colors";
import { StateCopy } from "../lib/state-copy";
import { Typography } from "../lib/typography";
import { PrimaryCta } from "./PrimaryCta";

type ContactsImportFailedModalProps = {
  visible: boolean;
  reason: "denied" | "failed";
  onRetry: () => void;
  onAddManuallyPress: () => void;
  onClose: () => void;
};

// Figma "People List — Contacts Import Failed" (5477:4145), Modal/Confirmation
// instance 5477:4270. Plain RN Modal for exact centering (the documented Paper
// Dialog exception). A refused permission gets the Permission Required state
// (fixed only in Settings, so no Try Again); a failed read gets the
// Recoverable Failure state (retrying can work, Settings can't help).
const ContactsImportFailedModal: React.FC<ContactsImportFailedModalProps> = ({
  visible,
  reason,
  onRetry,
  onAddManuallyPress,
  onClose,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.card} onPress={() => {}}>
        <Text style={styles.title}>
          {reason === "denied" ? "Contacts Access" : "Contacts Import Failed"}
        </Text>
        <Text style={styles.body}>
          {reason === "denied"
            ? StateCopy.permission(
                "contacts access in Settings",
                "add people from your contacts"
              )
            : StateCopy.loadFailed("your contacts")}
        </Text>
        <View style={styles.buttonRow}>
          {reason === "denied" ? (
            <PrimaryCta
              label="Open Settings"
              // Lands on the app's own iOS settings page, which holds the
              // Contacts toggle (and the iOS 18+ limited-access level), so the
              // user isn't left hunting through Settings by hand.
              onPress={() => {
                Linking.openSettings().catch(() => {});
              }}
            />
          ) : (
            <PrimaryCta label="Try Again" onPress={onRetry} />
          )}
          <Pressable
            onPress={onAddManuallyPress}
            accessibilityRole="button"
            accessibilityLabel="Add people manually"
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryPressed,
            ]}
          >
            <Text style={styles.secondaryLabel}>Add People Manually</Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

export default ContactsImportFailedModal;

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
