import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
import { Radii } from "../../lib/typography";
import ContactPicker from "../ContactPicker";
import ContactsAccessIntro from "../ContactsAccessIntro";
import PeopleCtaTiles from "../contacts/PeopleCtaTiles";
import { useContactImportFlow } from "../../hooks/use-contact-import-flow";

export default function AddPeopleTile() {
  const router = useRouter();
  const [chooserVisible, setChooserVisible] = useState(false);
  const {
    contactsLoading,
    pickerVisible,
    accessIntroVisible,
    deviceContacts,
    openAccessIntro,
    closeAccessIntro,
    closePicker,
    continueWithAccess,
    selectContact,
  } = useContactImportFlow();

  const goToAddManually = () => {
    setChooserVisible(false);
    router.push("/contacts/add");
  };

  const handlePress = () => {
    // expo-contacts isn't available on web; keep the existing direct push so
    // web users still get to the manual flow (the People tab is where the
    // ContactFileImport path lives).
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
    <View>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="Add people"
        style={styles.tile}
      >
        <MaterialIcons name="add" size={28} color={Colors.blues.dark} />
        <Text style={styles.label}>Add People</Text>
      </Pressable>

      <Modal
        visible={chooserVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setChooserVisible(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setChooserVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <PeopleCtaTiles
              onImportPress={handleImportPress}
              onAddManuallyPress={goToAddManually}
              importDisabled={contactsLoading}
              borderColor={Colors.blues.dark}
            />
          </Pressable>
        </Pressable>
      </Modal>

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
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 110,
    height: 110,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.blues.dark,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  label: {
    fontFamily: "RobotoFlex_400Regular",
    color: Colors.blues.dark,
    fontSize: 13,
    fontWeight: "500",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: Radii.md,
    backgroundColor: Colors.white,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
});
