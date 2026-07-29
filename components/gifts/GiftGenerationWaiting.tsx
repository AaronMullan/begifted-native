import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
import { Typography } from "../../lib/typography";
import AddPeopleChooserModal from "../AddPeopleChooserModal";
import ContactPicker from "../ContactPicker";
import ContactsAccessIntro from "../ContactsAccessIntro";
import ContactsImportFailedModal from "../ContactsImportFailedModal";
import { useContactImportFlow } from "../../hooks/use-contact-import-flow";

// Figma "Gift Recommendations — Waiting" / "— Waiting 2" (5737:4377,
// 5738:4405): the two comps share one fixed layout and differ only in the
// serif message, so the messages rotate inside a fixed-height block whose
// center matches both frames.
const MESSAGES = [
  "We're picking three great gift recommendations for you. Finding the perfect gift can take a few minutes.",
  "Feel free to add more of your people to BeGifted while you wait.",
];

const ROTATE_MS = 7000;

/**
 * Full waiting state for a recipient whose first gift set is still
 * generating: context copy, the notification promise, and an Add More People
 * CTA running the same chooser/import flow as the People tab.
 */
const GiftGenerationWaiting: React.FC = () => {
  const router = useRouter();
  const [messageIndex, setMessageIndex] = useState(0);
  const [chooserVisible, setChooserVisible] = useState(false);
  const {
    contactsLoading,
    pickerVisible,
    accessIntroVisible,
    importFailedVisible,
    deviceContacts,
    openAccessIntro,
    closeAccessIntro,
    closePicker,
    closeImportFailed,
    continueWithAccess,
    retryImport,
    selectContact,
  } = useContactImportFlow();

  useEffect(() => {
    const timer = setInterval(
      () => setMessageIndex((i) => (i + 1) % MESSAGES.length),
      ROTATE_MS
    );
    return () => clearInterval(timer);
  }, []);

  const goToAddManually = () => {
    setChooserVisible(false);
    closeImportFailed();
    router.push("/contacts/add");
  };

  const handleAddPress = () => {
    // expo-contacts isn't available on web; keep the direct push so web users
    // still reach the manual flow.
    if (Platform.OS === "web") {
      router.push("/contacts/add");
      return;
    }
    setChooserVisible(true);
  };

  const handleImportPress = () => {
    setChooserVisible(false);
    openAccessIntro();
  };

  return (
    <View style={styles.container}>
      <View style={styles.messageBlock}>
        <Text style={styles.message}>{MESSAGES[messageIndex]}</Text>
      </View>
      <Text style={styles.notification}>
        {
          "We'll send you a notification when you have new recommendations to review."
        }
      </Text>
      <Pressable
        style={styles.addPill}
        onPress={handleAddPress}
        accessibilityRole="button"
        accessibilityLabel="Add more people"
      >
        <MaterialIcons name="add" size={16} color={Colors.brand.gold} />
        <Text style={styles.addLabel}>Add More People</Text>
      </Pressable>

      <AddPeopleChooserModal
        visible={chooserVisible}
        onClose={() => setChooserVisible(false)}
        onImportPress={handleImportPress}
        onAddManuallyPress={goToAddManually}
        importDisabled={contactsLoading}
      />
      <ContactsAccessIntro
        visible={accessIntroVisible}
        onContinue={continueWithAccess}
        onClose={closeAccessIntro}
        isLoading={contactsLoading}
      />
      <ContactPicker
        visible={pickerVisible}
        contacts={deviceContacts}
        onSelect={selectContact}
        onClose={closePicker}
      />
      <ContactsImportFailedModal
        visible={importFailedVisible}
        onRetry={retryImport}
        onAddManuallyPress={goToAddManually}
        onClose={closeImportFailed}
      />
    </View>
  );
};

export default GiftGenerationWaiting;

// Vertical rhythm derived from the comps (about-link bottom y=217, message
// block y=329–441, notification y=456, CTA y=550), minus the host
// giftsContainer's 8pt paddingTop.
const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 104,
  },
  messageBlock: {
    // Tall enough for the 4-line message; both messages center on the same
    // point, so rotation doesn't shift the copy below.
    height: 112,
    justifyContent: "center",
  },
  message: {
    ...Typography.h2,
    color: Colors.brand.gold,
    textAlign: "center",
    maxWidth: 352,
  },
  notification: {
    ...Typography.largeCta,
    color: Colors.brand.mediumTeal,
    textAlign: "center",
    maxWidth: 278,
    marginTop: 15,
  },
  addPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    width: 216,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.brand.gold,
    marginTop: 58,
  },
  addLabel: {
    ...Typography.largeCta,
    color: Colors.brand.darkTeal,
  },
});
