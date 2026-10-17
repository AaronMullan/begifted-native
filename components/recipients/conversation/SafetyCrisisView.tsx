import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { Colors } from "../../../lib/colors";
import { Spacing } from "../../../lib/spacing";
import { Typography } from "../../../lib/typography";

type SafetyCrisisViewProps = {
  message: string;
  onClose: () => void;
};

/**
 * Replaces the chat when a self-harm refusal ends Add Person. It stays until
 * the user closes it — no toast, no automatic navigation — so the crisis
 * resources can be read and acted on.
 */
export const SafetyCrisisView: React.FC<SafetyCrisisViewProps> = ({
  message,
  onClose,
}) => {
  // Linking rejects where the device can't place calls or texts (iPad, some
  // simulators); the number stays readable in the message either way.
  const open = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {message.split("\n").map((paragraph) => (
        <Text key={paragraph} style={styles.paragraph}>
          {paragraph}
        </Text>
      ))}
      <View style={styles.actions}>
        <Button mode="contained" onPress={() => open("tel:988")}>
          Call 988
        </Button>
        <Button mode="outlined" onPress={() => open("sms:988")}>
          Text 988
        </Button>
        <Button mode="text" onPress={onClose}>
          Close
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.screenGutter,
    paddingVertical: Spacing.marginStandard,
    gap: 16,
  },
  paragraph: {
    ...Typography.subhead,
    lineHeight: 22,
    color: Colors.brand.darkTeal,
  },
  actions: {
    marginTop: 16,
    gap: 12,
  },
});
