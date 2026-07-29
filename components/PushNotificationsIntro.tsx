import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Colors } from "../lib/colors";
import { Typography } from "../lib/typography";
import { PrimaryCta } from "./PrimaryCta";

type PushNotificationsIntroProps = {
  visible: boolean;
  onContinue: () => void;
  onClose: () => void;
};

// Shown before requesting push-notification permission so the OS prompt never
// fires unexplained. Figma Modal/Confirmation (4685:4745); plain RN Modal for
// exact centering (the documented Paper Dialog exception).
export default function PushNotificationsIntro({
  visible,
  onContinue,
  onClose,
}: PushNotificationsIntroProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Turn On Notifications</Text>
          <Text style={styles.body}>
            We&apos;ll ask for permission to send notifications so you hear
            about new gift ideas and get reminders before the occasions
            you&apos;re tracking. You can change this anytime in Settings.
          </Text>
          <View style={styles.buttonRow}>
            <PrimaryCta label="Continue" onPress={onContinue} />
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Not now"
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryPressed,
              ]}
            >
              <Text style={styles.secondaryLabel}>Not Now</Text>
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
