import { useState } from "react";
import { Platform, View } from "react-native";
import { useRouter } from "expo-router";
import AddMorePeopleButton from "../AddMorePeopleButton";
import AddPeopleChooserModal from "../AddPeopleChooserModal";
import ContactPicker from "../ContactPicker";
import ContactsAccessIntro from "../ContactsAccessIntro";
import ContactsImportFailedModal from "../ContactsImportFailedModal";
import { useContactImportFlow } from "../../hooks/use-contact-import-flow";

export default function AddPeopleTile() {
  const router = useRouter();
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

  const goToAddManually = () => {
    setChooserVisible(false);
    closeImportFailed();
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
      <AddMorePeopleButton onPress={handlePress} />

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
}
