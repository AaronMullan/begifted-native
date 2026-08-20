import { errorStyles } from "@/components/admin/playground/result-styles";
import { AdminTheme } from "@/lib/admin-theme";
import React from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

export type JsonResultViewProps = {
  result: Record<string, unknown>;
};

export const JsonResultView: React.FC<JsonResultViewProps> = ({ result }) => {
  if ("error" in result) {
    return (
      <View style={errorStyles.resultError}>
        <Text variant="bodyMedium" style={errorStyles.errorText}>
          {String(result.error)}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.jsonResultBox} nestedScrollEnabled>
      <Text variant="bodySmall" style={styles.monoText}>
        {JSON.stringify(result, null, 2)}
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  monoText: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
    // eslint-disable-next-line no-restricted-syntax -- monospace readout; the type scale has no mono token
    fontSize: 11,
    color: AdminTheme.text,
  },
  jsonResultBox: {
    backgroundColor: AdminTheme.inset,
    borderRadius: 8,
    padding: 12,
    maxHeight: 400,
  },
});
