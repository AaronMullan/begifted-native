import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Colors } from "../../../lib/colors";
import ContactFileImport from "../../../components/ContactFileImport";
import ContactPicker from "../../../components/ContactPicker";
import ContactsAccessIntro from "../../../components/ContactsAccessIntro";
import PeopleCtaTiles from "../../../components/contacts/PeopleCtaTiles";
import PeopleRecipientCard from "../../../components/contacts/PeopleRecipientCard";
import RecentMomentsLink from "../../../components/home/RecentMomentsLink";
import {
  DeviceContact,
  useDeviceContacts,
} from "../../../hooks/use-device-contacts";
import { useToast } from "../../../hooks/use-toast";
import { useAuth } from "../../../hooks/use-auth";
import { useRecipients } from "../../../hooks/use-recipients";
import { BOTTOM_NAV_HEIGHT } from "../../../lib/constants";
import { useBottomNavScrollVisibility } from "../../../hooks/use-bottom-nav-scroll-visibility";

export default function Contacts() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: recipients = [], isLoading: loading } = useRecipients();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [contactsAccessIntroVisible, setContactsAccessIntroVisible] =
    useState(false);
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const { loading: contactsLoading, getDeviceContacts } = useDeviceContacts();
  const { toast } = useToast();
  const { handleScroll } = useBottomNavScrollVisibility();

  const openContactsAccessIntro = () => setContactsAccessIntroVisible(true);

  const handleContinueContactsAccess = async () => {
    setContactsAccessIntroVisible(false);
    const contacts = await getDeviceContacts();
    setDeviceContacts(contacts);
    if (contacts.length > 0) {
      setPickerVisible(true);
    }
  };

  const handleImportFromFile = (contacts: DeviceContact[]) => {
    setDeviceContacts(contacts);
    if (contacts.length > 0) {
      setPickerVisible(true);
    }
  };

  const handleAddManually = () => router.push("/contacts/add");

  const handleSelectContact = async (contact: DeviceContact) => {
    setPickerVisible(false);
    const addr = contact.addresses?.[0];

    let birthdayStr: string | undefined;
    if (contact.birthday) {
      const { year, month, day } = contact.birthday;
      const y = year ?? new Date().getFullYear();
      const m = String(month).padStart(2, "0");
      const d = String(day).padStart(2, "0");
      birthdayStr = `${y}-${m}-${d}`;
    }

    let stablePhotoUri: string | undefined;
    if (contact.imageUri) {
      try {
        const dest = `${
          FileSystem.cacheDirectory
        }contact-photo-${Date.now()}.jpg`;
        await FileSystem.copyAsync({ from: contact.imageUri, to: dest });
        stablePhotoUri = dest;
      } catch (err) {
        console.error("[photo] copy failed, using original:", err);
        stablePhotoUri = contact.imageUri;
      }
    }

    router.push({
      pathname: "/contacts/add",
      params: {
        name: contact.name,
        ...(birthdayStr && { birthday: birthdayStr }),
        ...(addr?.street && { address: addr.street }),
        ...(addr?.city && { city: addr.city }),
        ...(addr?.region && { state: addr.region }),
        ...(addr?.postalCode && { zip_code: addr.postalCode }),
        ...(addr?.country && { country: addr.country }),
        ...(stablePhotoUri && { photo_url: stablePhotoUri }),
      },
    });
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>These are your people.</Text>
          <Text style={styles.subtitle}>
            Please sign in to manage your gift recipients.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>These are your people.</Text>
            <Text style={styles.subtitle}>
              Add the people who matter.{"\n"}We&apos;ll keep track of the
              moments that matter.
            </Text>
          </View>

          <PeopleCtaTiles
            onImportPress={openContactsAccessIntro}
            onAddManuallyPress={handleAddManually}
            importDisabled={contactsLoading}
          />

          {Platform.OS === "web" && (
            <ContactFileImport onImport={handleImportFromFile} />
          )}

          {loading && recipients.length === 0 ? (
            <Text style={styles.loadingText}>Loading…</Text>
          ) : recipients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No people yet.</Text>
              <Text style={styles.emptySubtext}>
                Add the first one to get started.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {recipients.map((recipient) => (
                <PeopleRecipientCard key={recipient.id} recipient={recipient} />
              ))}
            </View>
          )}

          <View style={styles.footer}>
            <RecentMomentsLink />
          </View>
        </View>

        <ContactsAccessIntro
          visible={contactsAccessIntroVisible}
          onContinue={handleContinueContactsAccess}
          onClose={() => setContactsAccessIntroVisible(false)}
          isLoading={contactsLoading}
        />
        <ContactPicker
          visible={pickerVisible}
          contacts={deviceContacts}
          onSelect={handleSelectContact}
          onClose={() => setPickerVisible(false)}
        />
      </ScrollView>
      {toast}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    padding: 20,
    gap: 20,
  },
  scrollContent: {
    paddingBottom: BOTTOM_NAV_HEIGHT + 24,
  },
  header: {
    gap: 8,
  },
  title: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 32,
    lineHeight: 38,
    color: Colors.blues.dark,
  },
  subtitle: {
    fontFamily: "RobotoFlex_400Regular",
    fontSize: 15,
    lineHeight: 21,
    color: Colors.darks.black,
    opacity: 0.8,
  },
  loadingText: {
    fontFamily: "RobotoFlex_400Regular",
    textAlign: "center",
    color: Colors.darks.black,
    opacity: 0.7,
  },
  emptyState: {
    padding: 24,
    alignItems: "center",
    gap: 4,
  },
  emptyText: {
    fontFamily: "Fraunces_600SemiBold",
    fontSize: 18,
    color: Colors.blues.dark,
  },
  emptySubtext: {
    fontFamily: "RobotoFlex_400Regular",
    fontSize: 14,
    color: Colors.darks.black,
    opacity: 0.7,
  },
  list: {
    gap: 12,
  },
  footer: {
    paddingTop: 16,
  },
});
