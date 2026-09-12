import { playgroundStyles } from "@/components/admin/playground/playground-styles";
import type { PromptPlayground } from "@/hooks/use-prompt-playground";
import type { AdminProfileListItem } from "@/lib/api";
import type { Recipient } from "@/types/recipient";
import React, { useState } from "react";
import { ScrollView } from "react-native";
import { Button, Menu, Text } from "react-native-paper";

// Many profiles have no full_name; email is the only reliably identifying
// label for the giver selector.
function giverLabel(profile: AdminProfileListItem): string {
  return profile.full_name
    ? `${profile.full_name} (${profile.email})`
    : profile.email;
}

type GiverRecipientSelectorsProps = {
  playground: PromptPlayground;
};

export const GiverRecipientSelectors: React.FC<
  GiverRecipientSelectorsProps
> = ({ playground }) => {
  const [giverMenuVisible, setGiverMenuVisible] = useState(false);
  const [recipientMenuVisible, setRecipientMenuVisible] = useState(false);

  const selectedGiver = playground.profiles.find(
    (p: AdminProfileListItem) => p.id === playground.selectedGiverId
  );
  const selectedRecipient = playground.recipients.find(
    (r: Recipient) => r.id === playground.selectedRecipientId
  );

  return (
    <>
      <Text variant="labelMedium" style={playgroundStyles.fieldLabel}>
        Giver
      </Text>
      <Menu
        visible={giverMenuVisible}
        onDismiss={() => setGiverMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setGiverMenuVisible(true)}
            style={playgroundStyles.selector}
            contentStyle={playgroundStyles.selectorContent}
            icon="account"
          >
            {selectedGiver ? giverLabel(selectedGiver) : "Select a giver..."}
          </Button>
        }
        contentStyle={playgroundStyles.menuContent}
      >
        <ScrollView style={playgroundStyles.menuScroll} nestedScrollEnabled>
          {playground.profiles.map((profile: AdminProfileListItem) => (
            <Menu.Item
              key={profile.id}
              onPress={() => {
                playground.handleGiverChange(profile.id);
                setGiverMenuVisible(false);
              }}
              title={giverLabel(profile)}
            />
          ))}
        </ScrollView>
      </Menu>

      <Text variant="labelMedium" style={playgroundStyles.fieldLabel}>
        Recipient
      </Text>
      <Menu
        visible={recipientMenuVisible}
        onDismiss={() => setRecipientMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setRecipientMenuVisible(true)}
            disabled={!playground.selectedGiverId}
            style={playgroundStyles.selector}
            contentStyle={playgroundStyles.selectorContent}
            icon="account-heart"
          >
            {selectedRecipient
              ? `${selectedRecipient.name} (${selectedRecipient.relationship_type})`
              : "Select a recipient..."}
          </Button>
        }
        contentStyle={playgroundStyles.menuContent}
      >
        <ScrollView style={playgroundStyles.menuScroll} nestedScrollEnabled>
          {playground.recipients.map((recipient: Recipient) => (
            <Menu.Item
              key={recipient.id}
              onPress={() => {
                playground.setSelectedRecipientId(recipient.id);
                setRecipientMenuVisible(false);
              }}
              title={`${recipient.name} — ${recipient.relationship_type}`}
            />
          ))}
        </ScrollView>
      </Menu>
    </>
  );
};
