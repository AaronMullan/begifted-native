import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, Menu, Dialog, Portal, Button } from "react-native-paper";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "../../lib/colors";
import { useAuth } from "../../hooks/use-auth";
import { useDeleteRecipient } from "../../hooks/use-recipient-mutations";
import type { Recipient } from "../../types/recipient";

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
                size={14}
                color={Colors.blues.medium}
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
              size={22}
              color={Colors.blues.medium}
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
  const [year, month, day] = birthday.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  body: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bodyPressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.blues.medium,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontFamily: "RobotoFlex_400Regular",
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  textColumn: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  name: {
    fontFamily: "RobotoFlex_400Regular",
    fontSize: 16,
    fontWeight: "700",
    color: Colors.blues.dark,
  },
  birthdayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  birthday: {
    fontFamily: "RobotoFlex_400Regular",
    fontSize: 13,
    color: Colors.blues.medium,
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
