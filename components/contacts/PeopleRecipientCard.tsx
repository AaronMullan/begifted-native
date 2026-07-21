import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, Menu, Dialog, Portal, Button } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
import { Typography, Radii } from "../../lib/typography";
import { useAuth } from "../../hooks/use-auth";
import { useDeleteRecipient } from "../../hooks/use-recipient-mutations";
import type { Recipient } from "../../types/recipient";
import type { UpcomingOccasion } from "../../utils/upcoming-occasion";
import { formatOccasionType } from "../../utils/home-occasions";
import { formatOccasionDate } from "../../utils/occasion-dates";
import Avatar from "../Avatar";

type PeopleRecipientCardProps = {
  recipient: Recipient;
  upcoming: UpcomingOccasion | null;
};

const PeopleRecipientCard: React.FC<PeopleRecipientCardProps> = ({
  recipient,
  upcoming,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const deleteRecipient = useDeleteRecipient();
  const [menuVisible, setMenuVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleRowPress = () => {
    router.push(`/contacts/${recipient.id}?tab=gifts`);
  };

  const handleEdit = () => {
    closeMenu();
    router.push(`/contacts/${recipient.id}?tab=details`);
  };

  const handleDeletePress = () => {
    closeMenu();
    setConfirmVisible(true);
  };

  const handleConfirmDelete = () => {
    if (!user) return;
    deleteRecipient.mutate(
      { userId: user.id, recipientId: recipient.id },
      {
        onSuccess: () => setConfirmVisible(false),
        onError: () => setConfirmVisible(false),
      }
    );
  };

  return (
    <View style={styles.card}>
      <Pressable
        onPress={handleRowPress}
        accessibilityRole="button"
        accessibilityLabel={`Open ${recipient.name}`}
        style={({ pressed }) => [styles.body, pressed && styles.bodyPressed]}
      >
        <Avatar
          name={recipient.name}
          size={30}
          context="list"
          photoUrl={recipient.photo_url}
        />
        <View style={styles.textColumn}>
          <Text style={styles.name} numberOfLines={1}>
            {recipient.name}
          </Text>
          <View style={styles.statusRow}>
            <Text style={styles.status} numberOfLines={1}>
              {upcoming
                ? `${formatOccasionType(
                    upcoming.occasionType
                  )}: ${formatOccasionDate(upcoming.date)}`
                : "No upcoming moments yet"}
            </Text>
            {upcoming && (
              <MaterialIcons
                name="chevron-right"
                size={16}
                color={Colors.brand.gold}
              />
            )}
          </View>
        </View>
      </Pressable>
      <Menu
        visible={menuVisible}
        onDismiss={closeMenu}
        anchor={
          <Pressable
            onPress={openMenu}
            accessibilityRole="button"
            accessibilityLabel={`More options for ${recipient.name}`}
            hitSlop={12}
            style={({ pressed }) => [
              styles.overflow,
              pressed && styles.overflowPressed,
            ]}
          >
            <MaterialIcons
              name="more-horiz"
              size={18}
              color={Colors.brand.mediumTeal}
            />
          </Pressable>
        }
        contentStyle={styles.menuContent}
      >
        <Menu.Item
          onPress={handleEdit}
          title="Modify Details"
          titleStyle={styles.menuItemTitle}
        />
        <Menu.Item
          onPress={handleDeletePress}
          title="Remove Person"
          titleStyle={styles.menuItemDanger}
        />
      </Menu>
      <Portal>
        <Dialog
          visible={confirmVisible}
          onDismiss={() => setConfirmVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title>Remove {recipient.name}?</Dialog.Title>
          <Dialog.Content>
            <Text>
              This will permanently remove {recipient.name} and their gift
              ideas. This cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmVisible(false)}>Cancel</Button>
            <Button
              onPress={handleConfirmDelete}
              loading={deleteRecipient.isPending}
              disabled={deleteRecipient.isPending}
            >
              Remove
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

export default PeopleRecipientCard;

// Spec: Figma "Person List Row" (4641:4550 — 359x62, radius 12, white bg).
// 30px mediumTeal avatar at left, name (h2) + occasion line (largeCta, gold)
// stacked, mediumTeal overflow dots at right.
const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    paddingVertical: 8,
    paddingLeft: 7,
    paddingRight: 12,
    minHeight: 62,
  },
  body: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  bodyPressed: {
    opacity: 0.7,
  },
  textColumn: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  status: {
    ...Typography.largeCta,
    color: Colors.brand.gold,
    flexShrink: 1,
  },
  overflow: {
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  overflowPressed: {
    opacity: 0.5,
  },
  menuContent: {
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
  },
  menuItemTitle: {
    ...Typography.largeCta,
    color: Colors.brand.darkTeal,
  },
  menuItemDanger: {
    ...Typography.largeCta,
    color: Colors.brand.destructiveRed,
  },
  dialog: {
    borderRadius: 18,
  },
});
