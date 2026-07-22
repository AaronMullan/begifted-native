import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Colors } from "../lib/colors";
import { Typography } from "../lib/typography";
import { PrimaryCta } from "./PrimaryCta";

type ContactsImportFailedModalProps = {
  visible: boolean;
  onRetry: () => void;
  onAddManuallyPress: () => void;
  onClose: () => void;
};

// Figma "People List — Contacts Import Failed" (5477:4145), Modal/Confirmation
// instance 5477:4270. Plain RN Modal for exact centering (the documented Paper
// Dialog exception).
const ContactsImportFailedModal: React.FC<ContactsImportFailedModalProps> = ({
  visible,
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
        <Text style={styles.title}>Contacts Import Failed</Text>
        <Text style={styles.body}>
          We couldn&apos;t load your contacts. Check your permissions and try
          again, or add people manually instead.
        </Text>
        <View style={styles.buttonRow}>
          <PrimaryCta label="Try Again" onPress={onRetry} />
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
    backgroundColor: Colors.white,
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
