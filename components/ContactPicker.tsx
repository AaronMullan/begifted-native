import { useEffect, useRef, useState } from "react";
import { Keyboard, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import {
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NAV_CONTENT_HEIGHT } from "@/components/BottomNav";
import { Colors } from "../lib/colors";
import { Typography } from "../lib/typography";
import type { DeviceContact } from "../hooks/use-device-contacts";
import Avatar from "./Avatar";
import { PrimaryCta } from "./PrimaryCta";

type ContactPickerProps = {
  visible: boolean;
  contacts: DeviceContact[];
  onAdd: (contacts: DeviceContact[]) => void;
  onClose: () => void;
  isAdding?: boolean;
};

/**
 * Select Contacts bottom drawer (Figma 5732:4449). The full contact list
 * shows before any typing and the search field narrows it live. Rows toggle
 * checkboxes; Add creates the checked contacts, Add All everything currently
 * shown. No Cancel — swiping the drawer down closes it, and per the hand-off
 * drawer rules the sheet stops flush above the bottom nav.
 */
export default function ContactPicker({
  visible,
  contacts,
  onAdd,
  onClose,
  isAdding = false,
}: ContactPickerProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // The parent owns visibility as state (the import flow opens the picker
  // after permission is granted); sync it onto the sheet's imperative API.
  // On the very first grant, `visible` flips while iOS is still tearing down
  // its contacts-access UI over the app window. A present() fired in that
  // window wedges: the modal registers as presented but never reaches the
  // screen, and further present() calls no-op (AppState still reads
  // "active", so it can't be gated on). onChange tells us whether the sheet
  // actually opened; if it hasn't after a beat, force a dismiss and
  // re-present.
  const openedRef = useRef(false);
  useEffect(() => {
    if (!visible) {
      sheetRef.current?.dismiss();
      return;
    }
    openedRef.current = false;
    sheetRef.current?.present();
    const retry = setInterval(() => {
      if (openedRef.current) {
        clearInterval(retry);
        return;
      }
      sheetRef.current?.dismiss();
      sheetRef.current?.present();
    }, 800);
    return () => clearInterval(retry);
  }, [visible]);

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedContacts = contacts.filter((contact) =>
    selectedIds.includes(contact.id)
  );

  const toggleContact = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selected) => selected !== id)
        : [...current, id]
    );
  };

  const handleDismiss = () => {
    // A recovery dismiss of a wedged (never-opened) sheet also lands here;
    // only a dismissal of a sheet the user actually saw should close the flow.
    if (!openedRef.current) return;
    setSearchQuery("");
    setSelectedIds([]);
    onClose();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={["75%"]}
      enableDynamicSizing={false}
      onChange={(index) => {
        if (index >= 0) openedRef.current = true;
      }}
      onDismiss={handleDismiss}
      // Total nav height = content height + home-indicator inset.
      bottomInset={NAV_CONTENT_HEIGHT + Math.max(insets.bottom, 0)}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      handleIndicatorStyle={styles.sheetHandle}
      backgroundStyle={styles.sheetBackground}
    >
      {/* Deliberately a plain View: BottomSheetView re-registers the sheet's
          scrollable as a non-scrolling VIEW after the nested BottomSheetFlatList
          registers, which kills list scrolling. */}
      <View style={styles.container}>
        <Text style={styles.title}>Select Contacts</Text>
        <BottomSheetTextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search contacts..."
          placeholderTextColor={Colors.brand.lightTeal}
          autoCorrect={false}
          style={styles.searchInput}
        />
        <View style={styles.searchCtaRow}>
          <Pressable
            onPress={() => Keyboard.dismiss()}
            accessibilityRole="button"
            accessibilityLabel="Search"
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryPressed,
            ]}
          >
            <Text style={styles.secondaryLabel}>Search</Text>
          </Pressable>
        </View>
        <BottomSheetFlatList
          data={filteredContacts}
          keyExtractor={(item: DeviceContact) => item.id}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }: { item: DeviceContact }) => {
            const checked = selectedIds.includes(item.id);
            return (
              <Pressable
                onPress={() => toggleContact(item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={item.name}
                style={styles.contactRow}
              >
                <Avatar
                  name={item.name}
                  size={36}
                  context="list"
                  photoUrl={item.imageUri}
                />
                <Text style={styles.contactName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View
                  style={[styles.checkbox, checked && styles.checkboxChecked]}
                >
                  {checked && (
                    <MaterialIcons
                      name="check"
                      size={14}
                      color={Colors.white}
                    />
                  )}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {searchQuery ? "No matching contacts" : "No contacts found"}
            </Text>
          }
        />
        <View style={styles.footer}>
          <PrimaryCta
            label="Add"
            onPress={() => onAdd(selectedContacts)}
            state={isAdding ? "loading" : "idle"}
            disabled={selectedContacts.length === 0}
          />
          <Pressable
            onPress={() => onAdd(filteredContacts)}
            accessibilityRole="button"
            accessibilityLabel="Add all contacts shown"
            disabled={isAdding || filteredContacts.length === 0}
            style={({ pressed }) => [
              styles.addAllRow,
              pressed && styles.secondaryPressed,
            ]}
          >
            <Text style={styles.addAllLabel}>Add All</Text>
            <MaterialIcons
              name="chevron-right"
              size={16}
              color={Colors.brand.darkTeal}
            />
          </Pressable>
          <Text style={styles.disclaimerText}>
            Choose one contact to add as a recipient. If you select
            &quot;all,&quot; you&apos;re only adding the contacts shown in this
            list — we don&apos;t import your entire address book.
          </Text>
        </View>
      </View>
    </BottomSheetModal>
  );
}

// Frame geometry (5732:4451): 24pt drawer inset, 16pt stack gap.
const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetHandle: {
    backgroundColor: Colors.brand.beige,
    width: 58,
    height: 5,
    borderRadius: 4,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 16,
  },
  title: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
  },
  searchInput: {
    ...Typography.subhead,
    height: 45,
    paddingHorizontal: 16,
    backgroundColor: Colors.brand.beigeLight,
    color: Colors.brand.darkTeal,
  },
  searchCtaRow: {
    alignItems: "center",
  },
  // Figma Button/Secondary (4674:4696): fixed 170x46 pill, 2px lightTeal
  // border, darkTeal largeCta label.
  secondaryButton: {
    width: 170,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: Colors.brand.lightTeal,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryPressed: {
    opacity: 0.7,
  },
  secondaryLabel: {
    ...Typography.largeCta,
    color: Colors.brand.darkTeal,
  },
  list: {
    flex: 1,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.brand.beige,
  },
  contactName: {
    ...Typography.subhead,
    color: Colors.brand.darkTeal,
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.brand.mediumTeal,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.brand.darkTeal,
    borderColor: Colors.brand.darkTeal,
  },
  emptyText: {
    ...Typography.body13,
    color: Colors.brand.mediumTeal,
    textAlign: "center",
    paddingVertical: 24,
  },
  footer: {
    alignItems: "center",
    gap: 16,
    paddingBottom: 24,
  },
  addAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addAllLabel: {
    ...Typography.largeCta,
    color: Colors.brand.darkTeal,
  },
  disclaimerText: {
    ...Typography.body13,
    color: Colors.brand.mediumTeal,
    alignSelf: "stretch",
  },
});
