import { Modal, View, FlatList, StyleSheet } from "react-native";
import { Text, Button, TextInput, List } from "react-native-paper";
import { useState } from "react";
import { DeviceContact } from "../hooks/use-device-contacts";

interface ContactPickerProps {
  visible: boolean;
  contacts: DeviceContact[];
  onSelect: (contact: DeviceContact) => void;
  onClose: () => void;
}

export default function ContactPicker({
  visible,
  contacts,
  onSelect,
  onClose,
}: ContactPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            Select Contact
          </Text>
          <Button mode="text" onPress={onClose}>
            Cancel
          </Button>
        </View>

        <View style={styles.disclaimer}>
          <Text variant="bodySmall" style={styles.disclaimerText}>
            Choose one contact to add as a recipient. If you select "all," you're
            only adding the contacts shown in this list — we don't import your
            entire address book.
          </Text>
        </View>

        <TextInput
          mode="outlined"
          placeholder="Search contacts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
          style={styles.searchInput}
        />

        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              description={
                <>
                  {item.emails && item.emails.length > 0 && (
                    <Text variant="bodySmall">📧 {item.emails[0]}</Text>
                  )}
                  {item.phoneNumbers && item.phoneNumbers.length > 0 && (
                    <Text variant="bodySmall">
                      {"\n"}📱 {item.phoneNumbers[0]}
                    </Text>
                  )}
                  {item.birthday && (
                    <Text variant="bodySmall">
                      {"\n"}🎂 {item.birthday.month}/{item.birthday.day}
                      {item.birthday.year && `/${item.birthday.year}`}
                    </Text>
                  )}
                </>
              }
              onPress={() => {
                setSearchQuery("");
                onSelect(item);
                onClose();
              }}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                {searchQuery ? "No matching contacts" : "No contacts found"}
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  title: {
    flex: 1,
  },
  disclaimer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  disclaimerText: {
    color: "#666",
    lineHeight: 20,
  },
  searchInput: {
    margin: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#999",
  },
});
