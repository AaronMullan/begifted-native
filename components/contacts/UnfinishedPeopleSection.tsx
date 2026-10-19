import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, Dialog, Portal, Text } from "react-native-paper";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Colors } from "../../lib/colors";
import { Radii, Typography } from "../../lib/typography";
import { queryKeys } from "../../lib/query-keys";
import {
  readUnfinishedPeople,
  setPendingContactQueue,
} from "../../lib/pending-contact-queue";
import type { PendingContact } from "../../lib/pending-contact-queue";
import { useAuth } from "../../hooks/use-auth";
import { useRemoveUnfinishedPerson } from "../../hooks/use-unfinished-people";
import Avatar from "../Avatar";

type UnfinishedPeopleSectionProps = {
  people: PendingContact[];
};

const displayName = (person: PendingContact) =>
  person.seed.name?.trim() || "Unnamed contact";

// People picked from Contacts whose setup hasn't finished. Rows share the
// People row geometry but drop the white fill for a dashed outline, so they
// read as not-yet-added rather than as people BeGifted is working on.
const UnfinishedPeopleSection: React.FC<UnfinishedPeopleSectionProps> = ({
  people,
}) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const removeUnfinished = useRemoveUnfinishedPerson();
  const [confirmRemove, setConfirmRemove] = useState<PendingContact | null>(
    null
  );

  // Re-read before opening: the cached list doesn't track progress, which
  // the add flow writes after every reply.
  const handleFinish = async (person: PendingContact) => {
    if (!user) return;
    const fresh = (await readUnfinishedPeople(user.id)).find(
      (p) => p.id === person.id
    );
    if (!fresh) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.unfinishedPeople(user.id),
      });
      return;
    }
    setPendingContactQueue([fresh]);
    router.push("/contacts/add");
  };

  const handleConfirmRemove = () => {
    if (!confirmRemove) return;
    removeUnfinished.mutate(confirmRemove.id, {
      onSettled: () => setConfirmRemove(null),
    });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Finish adding</Text>
      {people.map((person) => (
        <View key={person.id} style={styles.row}>
          <Pressable
            onPress={() => void handleFinish(person)}
            accessibilityRole="button"
            accessibilityLabel={`Finish adding ${displayName(person)}`}
            style={({ pressed }) => [styles.body, pressed && styles.pressed]}
          >
            <Avatar
              name={displayName(person)}
              size={30}
              context="list"
              photoUrl={person.seed.photoUri}
            />
            <Text style={styles.name} numberOfLines={1}>
              {displayName(person)}
            </Text>
          </Pressable>
          <Button
            mode="text"
            compact
            textColor={Colors.brand.mediumTeal}
            labelStyle={styles.finishLabel}
            onPress={() => void handleFinish(person)}
          >
            Finish
          </Button>
          <Pressable
            onPress={() => setConfirmRemove(person)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${displayName(person)}`}
            hitSlop={12}
            style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
          >
            <MaterialIcons
              name="close"
              size={18}
              color={Colors.brand.mediumTeal}
            />
          </Pressable>
        </View>
      ))}
      <Portal>
        <Dialog
          visible={!!confirmRemove}
          onDismiss={() => setConfirmRemove(null)}
          style={{ borderRadius: 16 }}
        >
          <Dialog.Title>
            Remove {confirmRemove ? displayName(confirmRemove) : ""}?
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              They won&apos;t be added. You can pick them from your contacts
              again later.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmRemove(null)}>Cancel</Button>
            <Button
              onPress={handleConfirmRemove}
              loading={removeUnfinished.isPending}
              disabled={removeUnfinished.isPending}
            >
              Remove
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

export default UnfinishedPeopleSection;

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    gap: 12,
  },
  heading: {
    ...Typography.h3,
    color: Colors.brand.darkTeal,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radii.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: Colors.brand.lightTeal,
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
  pressed: {
    opacity: 0.6,
  },
  name: {
    ...Typography.h2,
    color: Colors.brand.darkTeal,
    flexShrink: 1,
  },
  finishLabel: {
    ...Typography.largeCta,
  },
  remove: {
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
});
