import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import { buttonStyles, colors, borderRadius } from "../../constants/theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "text";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const buttonStyle = [
    styles.base,
    variant === "primary" && styles.primary,
    variant === "secondary" && styles.secondary,
    variant === "text" && styles.text,
    isDisabled && styles.disabled,
    style,
  ];

  const buttonTextStyle = [
    variant === "primary" && styles.primaryText,
    variant === "secondary" && styles.secondaryText,
    variant === "text" && styles.textText,
    isDisabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? colors.white : colors.darkText}
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={buttonTextStyle}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primary: {
    backgroundColor: buttonStyles.primary.backgroundColor,
    paddingHorizontal: buttonStyles.primary.paddingHorizontal,
    paddingVertical: buttonStyles.primary.paddingVertical,
    borderRadius: borderRadius.small,
  },
  primaryText: {
    color: buttonStyles.primary.color,
    fontSize: buttonStyles.primary.fontSize,
    fontWeight: buttonStyles.primary.fontWeight,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: borderRadius.small,
    minHeight: 48,
  },
  secondaryText: {
    color: colors.darkText,
    fontSize: 16,
    fontWeight: "600",
  },
  text: {
    backgroundColor: "transparent",
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 32,
  },
  textText: {
    color: colors.darkText,
    fontSize: 16,
    fontWeight: "500",
  },
  disabled: {
    opacity: 0.6,
  },
  disabledText: {
    opacity: 0.6,
  },
});

