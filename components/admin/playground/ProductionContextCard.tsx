import { playgroundStyles } from "@/components/admin/playground/playground-styles";
import { AdminTheme } from "@/lib/admin-theme";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";

type ProductionContextCardProps = {
  productionContext: Record<string, unknown>;
};

export const ProductionContextCard: React.FC<ProductionContextCardProps> = ({
  productionContext,
}) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card mode="contained" style={playgroundStyles.card}>
      <Card.Content>
        <Button
          mode="text"
          onPress={() => setExpanded(!expanded)}
          icon={expanded ? "chevron-up" : "chevron-down"}
          compact
          style={styles.toggle}
        >
          Production Context
        </Button>
        {expanded && (
          <View style={styles.box}>
            <Text variant="labelSmall" style={styles.label}>
              Wrapper System Message
            </Text>
            <ScrollView style={styles.scroll} nestedScrollEnabled>
              <Text variant="bodySmall" style={playgroundStyles.monoText}>
                {String(productionContext.wrapperMessage ?? "")}
              </Text>
            </ScrollView>
            <Text
              variant="labelSmall"
              style={[styles.label, { marginTop: 12 }]}
            >
              Full Input Array
            </Text>
            <ScrollView style={styles.scroll} nestedScrollEnabled>
              <Text variant="bodySmall" style={playgroundStyles.monoText}>
                {JSON.stringify(productionContext.fullInput, null, 2)}
              </Text>
            </ScrollView>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  toggle: {
    alignSelf: "flex-start",
    marginLeft: -8,
  },
  box: {
    gap: 6,
  },
  label: {
    color: AdminTheme.muted,
    fontWeight: "600",
  },
  scroll: {
    maxHeight: 200,
    backgroundColor: AdminTheme.inset,
    borderRadius: 8,
    padding: 10,
  },
});
