import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, Menu, Dialog, Portal, Button } from "react-native-paper";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
import { Typography, Radii } from "../../lib/typography";
import { useAuth } from "../../hooks/use-auth";
import { useDeleteRecipient } from "../../hooks/use-recipient-mutations";
import type { Recipient } from "../../types/recipient";
import { parseBirthdayParts } from "../../utils/birthday";

type PeopleRecipientCardProps = {
  recipient: Recipient;
};

const PeopleRecipientCard: React.FC<PeopleRecipientCardProps> = ({
  recipient,
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

  const handleViewGifts = () => {
    closeMenu();
    router.push(`/contacts/${recipient.id}?tab=gifts`);
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
        <Avatar recipient={recipient} />
        <View style={styles.textColumn}>
          <Text style={styles.name} numberOfLines={1}>
            {recipient.name}
          </Text>
          {recipient.birthday && (
            <View style={styles.birthdayRow}>
              <Text style={styles.birthday}>
                Birthday: {formatBirthday(recipient.birthday)}
              </Text>
              <MaterialIcons
                name="chevron-right"
                size={10}
                color={Colors.brand.gold}
              />
            </View>
          )}
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
              color={Colors.brand.lightTeal}
            />
          </Pressable>
        }
      >
        <Menu.Item onPress={handleEdit} title="Edit" leadingIcon="pencil" />
        <Menu.Item
          onPress={handleViewGifts}
          title="View gift ideas"
          leadingIcon="gift-outline"
        />
        <Menu.Item
          onPress={handleDeletePress}
          title="Delete"
          leadingIcon="trash-can-outline"
        />
      </Menu>
      <Portal>
        <Dialog
          visible={confirmVisible}
          onDismiss={() => setConfirmVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title>Delete {recipient.name}?</Dialog.Title>
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
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

export default PeopleRecipientCard;

type AvatarProps = { recipient: Recipient };

const Avatar: React.FC<AvatarProps> = ({ recipient }) => {
  if (recipient.photo_url) {
    return (
      <Image
        source={{ uri: recipient.photo_url }}
        style={styles.avatar}
        contentFit="cover"
      />
    );
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarInitials}>{getInitials(recipient.name)}</Text>
    </View>
  );
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return Array.from(parts[0])[0]?.toUpperCase() ?? "?";
  }
  const first = Array.from(parts[0])[0] ?? "";
  const last = Array.from(parts[parts.length - 1])[0] ?? "";
  return `${first}${last}`.toUpperCase();
}

function formatBirthday(birthday: string): string {
  const parts = parseBirthdayParts(birthday);
  if (!parts) return "";
  const date = new Date(parts.year ?? 2000, parts.month - 1, parts.day);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

// Spec: Figma "People module" (359x45, radius 12, white bg).
// 28px avatar at left, name + "Birthday: ... >" stacked, overflow dot at right.
const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 45,
  },
  body: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  bodyPressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D9D9D9",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontFamily: "DMSans_600SemiBold",
    color: Colors.brand.darkTeal,
    fontSize: 11,
  },
  textColumn: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  name: {
    ...Typography.h3,
    color: Colors.brand.darkTeal,
  },
  birthdayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  birthday: {
    ...Typography.smallCta,
    color: Colors.brand.gold,
  },
  overflow: {
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  overflowPressed: {
    opacity: 0.5,
  },
  dialog: {
    borderRadius: 18,
  },
});
