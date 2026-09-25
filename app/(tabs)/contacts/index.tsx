import { useState } from "react";
import { useRouter } from "expo-router";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Colors } from "../../../lib/colors";
import { Typography } from "../../../lib/typography";
import GradientBackground from "../../../components/GradientBackground";
import StateMessage from "../../../components/StateMessage";
import { StateCopy } from "../../../lib/state-copy";
import ContactFileImport from "../../../components/ContactFileImport";
import ContactPicker from "../../../components/ContactPicker";
import ContactsAccessIntro from "../../../components/ContactsAccessIntro";
import AddMorePeopleButton from "../../../components/AddMorePeopleButton";
import AddPeopleChooserModal from "../../../components/AddPeopleChooserModal";
import ContactsImportFailedModal from "../../../components/ContactsImportFailedModal";
import PeopleRecipientCard from "../../../components/contacts/PeopleRecipientCard";
import { useContactImportFlow } from "../../../hooks/use-contact-import-flow";
import { useAuth } from "../../../hooks/use-auth";
import { useRecipients } from "../../../hooks/use-recipients";
import { useAllOccasions } from "../../../hooks/use-occasions";
import { getNextUpcomingOccasion } from "../../../utils/upcoming-occasion";
import type { Occasion } from "../../../lib/api";
import { BOTTOM_NAV_HEIGHT } from "../../../lib/constants";

export default function Contacts() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    data: recipientsData,
    isLoading: loading,
    isError: recipientsFailed,
    isFetching: refetchingRecipients,
    refetch: refetchRecipients,
  } = useRecipients();
  const recipients = recipientsData ?? [];
  const {
    data: occasionsData,
    isError: occasionsFailed,
    isFetching: refetchingOccasions,
    refetch: refetchOccasions,
  } = useAllOccasions();
  const occasions = occasionsData ?? [];
  // Until the moments arrive, a card without a birthday can't honestly say it
  // has no upcoming moments.
  const momentsKnown = occasionsData !== undefined;

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
    importFailedVisible,
    isAddingContacts,
    deviceContacts,
    limitedAccess,
    chooseMoreContacts,
    openAccessIntro,
    closeAccessIntro,
    closePicker,
    closeImportFailed,
    continueWithAccess,
    retryImport,
    importFromFile,
    addSelectedContacts,
  } = useContactImportFlow();

  const [chooserVisible, setChooserVisible] = useState(false);

  const handleAddManually = () => {
    setChooserVisible(false);
    closeImportFailed();
    router.push("/contacts/add");
  };

  const handleImportPress = () => {
    setChooserVisible(false);
    openAccessIntro();
  };

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

          <AddMorePeopleButton onPress={() => setChooserVisible(true)} />

          {Platform.OS === "web" && (
            <ContactFileImport onImport={importFromFile} />
          )}

          {loading && recipients.length === 0 ? (
            <StateMessage
              loading
              message={StateCopy.inProgress("your people")}
            />
          ) : recipientsFailed && recipientsData === undefined ? (
            // An empty list we never received is not the same as an account
            // with nobody in it; the empty state would deny the user's people.
            <StateMessage
              message={StateCopy.loadFailed("your people")}
              onRetry={refetchRecipients}
              retrying={refetchingRecipients}
            />
          ) : recipients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{StateCopy.empty("people")}</Text>
              <Text style={styles.emptySubtext}>
                Add the first one to get started.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {occasionsFailed && !momentsKnown && (
                <StateMessage
                  message={StateCopy.loadFailed("their upcoming moments")}
                  onRetry={refetchOccasions}
                  retrying={refetchingOccasions}
                />
              )}
              {recipients.map((recipient) => (
                <PeopleRecipientCard
                  key={recipient.id}
                  recipient={recipient}
                  momentsKnown={momentsKnown}
                  upcoming={getNextUpcomingOccasion(
                    recipient.birthday,
                    occasionsByRecipient.get(recipient.id) ?? []
                  )}
                />
              ))}
            </View>
          )}
        </View>

        <AddPeopleChooserModal
          visible={chooserVisible}
          onClose={() => setChooserVisible(false)}
          onImportPress={handleImportPress}
          onAddManuallyPress={handleAddManually}
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
          onAdd={addSelectedContacts}
          onClose={closePicker}
          isAdding={isAddingContacts}
          onChooseMore={limitedAccess ? chooseMoreContacts : undefined}
        />
        <ContactsImportFailedModal
          visible={importFailedVisible}
          onRetry={retryImport}
          onAddManuallyPress={handleAddManually}
          onClose={closeImportFailed}
        />
      </ScrollView>
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
  emptyState: {
    padding: 24,
    alignItems: "center",
    gap: 4,
  },
  emptyText: {
    ...Typography.h3,
    color: Colors.brand.darkTeal,
  },
  emptySubtext: {
    ...Typography.subhead,
    color: Colors.black,
    opacity: 0.7,
  },
  // Figma 4641:4554: 44pt from the CTA to the first row (content gap 20 +
  // 24), 22pt between rows.
  list: {
    marginTop: 24,
    gap: 22,
  },
});
