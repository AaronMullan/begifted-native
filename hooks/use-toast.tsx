import { useState, useRef, useEffect } from "react";
import { StyleSheet, Dimensions, Animated, View } from "react-native";
import { Text, Portal } from "react-native-paper";
import type { ReactElement } from "react";

type UseToastReturn = {
  showToast: (message: string) => void;
  toast: ReactElement;
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function useToast(): UseToastReturn {
  const [visible, setVisible] = useState(false);
  const messageRef = useRef("");
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      timerRef.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setVisible(false));
      }, 6000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, opacity]);

  const showToast = (toastMessage: string) => {
    messageRef.current = toastMessage;
    if (timerRef.current) clearTimeout(timerRef.current);
    opacity.setValue(0);
    setVisible(true);
  };

  const toast = (
    <Portal>
      {visible && (
        <Animated.View style={[styles.container, { opacity }]}>
          <View style={styles.toast}>
            <Text variant="bodyLarge" style={styles.message}>
              {messageRef.current}
            </Text>
          </View>
        </Animated.View>
      )}
    </Portal>
  );

  return { showToast, toast };
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: SCREEN_HEIGHT / 2 - 30,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    maxWidth: "90%",
  },
  message: {
    color: "#FFFFFF",
    textAlign: "center",
  },
});
