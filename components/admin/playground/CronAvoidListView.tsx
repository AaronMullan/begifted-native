import { Colors } from "@/lib/colors";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

export const CronAvoidListView: React.FC<{
  cronContext: Record<string, unknown>;
}> = ({ cronContext }) => {
  const avoidList = cronContext?.avoidList as string[] | undefined;
  if (!avoidList || avoidList.length === 0) return null;
  return (
    <View style={styles.cronAvoidList}>
      <Text variant="labelSmall" style={styles.productionContextLabel}>
        Avoid List
      </Text>
      {avoidList.map((item, i) => (
        <Text key={i} variant="bodySmall" style={styles.cronAvoidItem}>
          {item}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  productionContextLabel: {
    color: Colors.darks.brown,
    fontWeight: "600",
  },
  cronAvoidList: {
    marginTop: 8,
    gap: 4,
  },
  cronAvoidItem: {
    color: Colors.darks.brown,
    paddingLeft: 8,
  },
});
