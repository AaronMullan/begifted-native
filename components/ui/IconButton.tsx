import React from "react";
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  AccessibilityRole,
} from "react-native";

interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  testID?: string;
}

export function IconButton({
  icon,
  onPress,
  disabled = false,
  style,
  accessibilityLabel,
  accessibilityRole = "button",
  testID,
}: IconButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.base, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {icon}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.6,
  },
});

