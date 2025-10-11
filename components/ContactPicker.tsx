import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
} from "react-native";
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
          <Text style={styles.title}>Select Contact</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />

        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.contactItem}
              onPress={() => {
                onSelect(item);
                setSearchQuery("");
              }}
            >
              <Text style={styles.contactName}>{item.name}</Text>
              {item.emails && item.emails.length > 0 && (
                <Text style={styles.contactDetail}>📧 {item.emails[0]}</Text>
              )}
              {item.phoneNumbers && item.phoneNumbers.length > 0 && (
                <Text style={styles.contactDetail}>
                  📱 {item.phoneNumbers[0]}
                </Text>
              )}
              {item.birthday && (
                <Text style={styles.contactDetail}>
                  🎂 {item.birthday.month}/{item.birthday.day}
                  {item.birthday.year && `/${item.birthday.year}`}
                </Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
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
    fontSize: 20,
    fontWeight: "bold",
  },
  closeButton: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  searchInput: {
    margin: 16,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    fontSize: 16,
  },
  contactItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
});
