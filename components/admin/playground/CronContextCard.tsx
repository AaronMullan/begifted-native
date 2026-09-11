import { CronAvoidListView } from "@/components/admin/playground/CronAvoidListView";
import { playgroundStyles } from "@/components/admin/playground/playground-styles";
import { resultStyles } from "@/components/admin/playground/result-styles";
import React from "react";
import { View } from "react-native";
import { Card, Chip, Text } from "react-native-paper";

type CronContextCardProps = {
  cronContext: Record<string, unknown>;
};

export const CronContextCard: React.FC<CronContextCardProps> = ({
  cronContext,
}) => (
  <Card mode="contained" style={playgroundStyles.card}>
    <Card.Content>
      <Text variant="titleSmall" style={playgroundStyles.cardTitle}>
        Cron Context
      </Text>
      <View style={resultStyles.statusRow}>
        <Chip compact style={resultStyles.contextChip}>
          {String(cronContext.existingSuggestionCount ?? 0)} existing
          suggestions
        </Chip>
      </View>
      <CronAvoidListView cronContext={cronContext} />
    </Card.Content>
  </Card>
);
