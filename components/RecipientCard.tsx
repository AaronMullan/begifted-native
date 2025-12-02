import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Recipient } from "../types/recipient";
import { colors, spacing, shadows, borderRadius } from "../constants/theme";
import {
  formatBirthday,
  getNextOccasion,
  formatOccasionDisplay,
  Occasion,
} from "../utils/dateUtils";

interface RecipientCardProps {
  recipient: Recipient & { occasions?: Occasion[] };
  onClick: (recipient: Recipient) => void;
}

export default function RecipientCard({
  recipient,
  onClick,
}: RecipientCardProps) {
  const [isPressed, setIsPressed] = useState(false);

  const nextOccasion = getNextOccasion(recipient.occasions);
  const hasBirthday = !!recipient.birthday;
  const hasNextOccasion = !!nextOccasion;

  return (
    <TouchableOpacity
      style={[styles.card, isPressed && styles.cardPressed]}
      onPress={() => onClick(recipient)}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      activeOpacity={0.9}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="people" size={24} color={colors.darkText} />
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>{recipient.name}</Text>
        <Text style={styles.relationship}>{recipient.relationship_type}</Text>

        {hasBirthday && (
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={12} color={colors.gray} />
            <Text style={styles.infoText}>
              Birthday: {formatBirthday(recipient.birthday!)}
            </Text>
          </View>
        )}

        {hasNextOccasion && (
          <View style={styles.infoRow}>
            <Ionicons name="gift-outline" size={12} color={colors.gray} />
            <Text style={styles.infoText}>
              Next: {formatOccasionDisplay(nextOccasion)}
            </Text>
          </View>
        )}

        {!hasBirthday && !hasNextOccasion && (
          <Text style={styles.placeholderText}>
            Plan your next gifting moment for {recipient.name}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    padding: spacing.padding.md,
    borderRadius: borderRadius.small,
    flexDirection: "row",
    alignItems: "center",
    ...shadows.light,
    marginBottom: spacing.margin.md,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  cardPressed: {
    backgroundColor: colors.lightGrayAlt,
    opacity: 0.8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.lightGrayAlt,
    borderWidth: 1,
    borderColor: colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.margin.md,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.darkText,
    marginBottom: 2,
  },
  relationship: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: spacing.margin.xs,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.margin.xs,
    marginTop: spacing.margin.xs,
  },
  infoText: {
    fontSize: 12,
    color: colors.gray,
  },
  placeholderText: {
    fontSize: 12,
    color: colors.gray,
    fontStyle: "italic",
    marginTop: spacing.margin.xs,
    opacity: 0.7,
  },
});
