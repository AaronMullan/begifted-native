import { Modal, View, StyleSheet, Pressable } from "react-native";
import { Text, Button } from "react-native-paper";
import * as Linking from "expo-linking";
import { Colors } from "../lib/colors";

interface ContactsAccessIntroProps {
  visible: boolean;
  onContinue: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

/**
 * Shown before requesting contacts permission. Explains that "all" does not
 * import the whole address book and provides a way to open Settings.
 */
export default function ContactsAccessIntro({
  visible,
  onContinue,
  onClose,
  isLoading = false,
}: ContactsAccessIntroProps) {
  function handleOpenSettings() {
    Linking.openSettings();
  }

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
            Access your contacts
          </Text>
          <Text variant="bodyLarge" style={styles.body}>
            We'll ask for permission to read your contacts so you can add
            recipients from your address book.
          </Text>
       

          <Button
            mode="contained"
            onPress={onContinue}
            loading={isLoading}
            disabled={isLoading}
            style={styles.continueButton}
          >
            Continue
          </Button>
          <Button mode="text" onPress={onClose} style={styles.cancelButton}>
            Cancel
          </Button>

          <Pressable
            onPress={handleOpenSettings}
            style={({ pressed }) => [styles.settingsLink, pressed && styles.settingsLinkPressed]}
          >
            <Text variant="bodySmall" style={styles.settingsLinkText}>
              Open Settings to change contacts permission
            </Text>
          </Pressable>
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
  disclaimer: {
    backgroundColor: Colors.neutrals.light + "80",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  disclaimerText: {
    color: Colors.darks.black,
    lineHeight: 22,
    opacity: 0.9,
  },
  continueButton: {
    marginBottom: 8,
  },
  cancelButton: {
    marginBottom: 24,
  },
  settingsLink: {
    alignSelf: "center",
    paddingVertical: 8,
  },
  settingsLinkPressed: {
    opacity: 0.7,
  },
  settingsLinkText: {
    color: Colors.blues.teal,
    textDecorationLine: "underline",
  },
});
