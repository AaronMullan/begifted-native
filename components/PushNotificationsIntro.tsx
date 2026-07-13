import { Modal, View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import { Colors } from "../lib/colors";

interface PushNotificationsIntroProps {
  visible: boolean;
  onContinue: () => void;
  onClose: () => void;
}

/**
 * Shown before requesting push-notification permission so the OS prompt never
 * fires unexplained. Mirrors the ContactsAccessIntro pattern.
 */
export default function PushNotificationsIntro({
  visible,
  onContinue,
  onClose,
}: PushNotificationsIntroProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <Text variant="headlineSmall" style={styles.title}>
            Turn on notifications
          </Text>
          <Text variant="bodyLarge" style={styles.body}>
            We&apos;ll ask for permission to send notifications so you hear
            about new gift ideas and get reminders before the occasions
            you&apos;re tracking. You can change this anytime in Settings.
          </Text>

          <Button
            mode="contained"
            onPress={onContinue}
            style={styles.continueButton}
          >
            Continue
          </Button>
          <Button mode="text" onPress={onClose} style={styles.cancelButton}>
            Not now
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    padding: 24,
  },
  content: {
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  title: {
    marginBottom: 16,
    color: Colors.darks.black,
  },
  body: {
    color: Colors.darks.black,
    opacity: 0.9,
    lineHeight: 24,
    marginBottom: 16,
  },
  continueButton: {
    marginBottom: 8,
  },
  cancelButton: {
    marginBottom: 24,
  },
});
