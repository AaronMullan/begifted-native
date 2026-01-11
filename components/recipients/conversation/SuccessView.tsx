import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Text, Button } from "react-native-paper";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

type SuccessViewProps = {
  recipientName: string;
  onViewRecipients: () => void;
};

export const SuccessView: React.FC<SuccessViewProps> = ({
  recipientName,
  onViewRecipients,
}) => {
  const checkmarkScale = useSharedValue(0);
  const checkmarkOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);
  const ringScale = useSharedValue(0.8);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate ring first
    ringOpacity.value = withTiming(1, { duration: 200 });
    ringScale.value = withSpring(1, { damping: 12, stiffness: 100 });

    // Then checkmark with a bounce
    checkmarkOpacity.value = withDelay(200, withTiming(1, { duration: 200 }));
    checkmarkScale.value = withDelay(
      200,
      withSequence(
        withSpring(1.2, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 10, stiffness: 150 })
      )
    );

    // Then text
    textOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));

    // Then button
    buttonOpacity.value = withDelay(600, withTiming(1, { duration: 300 }));
    buttonTranslateY.value = withDelay(
      600,
      withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  // Auto-redirect after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onViewRecipients();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onViewRecipients]);

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
    opacity: checkmarkOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Animated checkmark circle */}
        <View style={styles.iconContainer}>
          <Animated.View style={[styles.ring, ringAnimatedStyle]} />
          <Animated.View
            style={[styles.checkmarkWrapper, checkmarkAnimatedStyle]}
          >
            <Ionicons name="checkmark" size={48} color="#fff" />
          </Animated.View>
        </View>

        {/* Success message */}
        <Animated.View style={textAnimatedStyle}>
          <Text variant="headlineMedium" style={styles.title}>
            All Done!
          </Text>
          <Text variant="bodyLarge" style={styles.message}>
            <Text variant="bodyLarge" style={styles.recipientName}>
              {recipientName}
            </Text>{" "}
            has been added to your recipients.
          </Text>
        </Animated.View>

        {/* View recipients button */}
        <Animated.View style={buttonAnimatedStyle}>
          <Button
            mode="contained"
            buttonColor="#000000"
            onPress={onViewRecipients}
            style={styles.button}
            icon="arrow-right"
          >
            View Recipients
          </Button>
          <Text variant="bodySmall" style={styles.hint}>
            Redirecting automatically...
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    alignItems: "center",
    maxWidth: 320,
  },
  iconContainer: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  ring: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#000000",
  },
  checkmarkWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
    color: "#666",
  },
  recipientName: {
    fontWeight: "600",
    color: "#000000",
  },
  button: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  hint: {
    marginTop: 16,
    color: "#999",
    textAlign: "center",
  },
});
