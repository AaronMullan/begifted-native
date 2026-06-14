import { useRouter } from "expo-router";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Colors } from "../../../lib/colors";
import { Typography } from "../../../lib/typography";
import GradientBackground from "../../../components/GradientBackground";
import ContactFileImport from "../../../components/ContactFileImport";
import ContactPicker from "../../../components/ContactPicker";
import ContactsAccessIntro from "../../../components/ContactsAccessIntro";
import PeopleCtaTiles from "../../../components/contacts/PeopleCtaTiles";
import PeopleRecipientCard from "../../../components/contacts/PeopleRecipientCard";
import { useContactImportFlow } from "../../../hooks/use-contact-import-flow";
import { useToast } from "../../../hooks/use-toast";
import { useAuth } from "../../../hooks/use-auth";
import { useRecipients } from "../../../hooks/use-recipients";
import { useAllOccasions } from "../../../hooks/use-occasions";
import { getNextUpcomingOccasion } from "../../../utils/upcoming-occasion";
import type { Occasion } from "../../../lib/api";
import { BOTTOM_NAV_HEIGHT } from "../../../lib/constants";

export default function Contacts() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: recipients = [], isLoading: loading } = useRecipients();
  const { data: occasions = [] } = useAllOccasions();

  // Group occasions by recipient so each card can show its soonest moment.
  const occasionsByRecipient = new Map<string, Occasion[]>();
  for (const occasion of occasions) {
    const list = occasionsByRecipient.get(occasion.recipient_id) ?? [];
    list.push(occasion);
    occasionsByRecipient.set(occasion.recipient_id, list);
  }
  const {
    contactsLoading,
    pickerVisible,
    accessIntroVisible,
    deviceContacts,
    openAccessIntro,
    closeAccessIntro,
    closePicker,
    continueWithAccess,
    importFromFile,
    selectContact,
  } = useContactImportFlow();
  const { toast } = useToast();

  const handleAddManually = () => router.push("/contacts/add");

  if (!user) {
    return (
      <View style={styles.container}>
        <GradientBackground />
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
      <GradientBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
            onImportPress={openAccessIntro}
            onAddManuallyPress={handleAddManually}
            importDisabled={contactsLoading}
          />

          {Platform.OS === "web" && (
            <ContactFileImport onImport={importFromFile} />
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
                <PeopleRecipientCard
                  key={recipient.id}
                  recipient={recipient}
                  upcoming={getNextUpcomingOccasion(
                    recipient.birthday,
                    occasionsByRecipient.get(recipient.id) ?? []
                  )}
                />
              ))}
            </View>
          )}
        </View>

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
    ...Typography.h1,
    color: Colors.brand.darkTeal,
  },
  subtitle: {
    ...Typography.subhead,
    color: Colors.brand.darkTeal,
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
    gap: 15,
  },
});
