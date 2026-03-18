import { useState } from "react";
import { Snackbar, Portal } from "react-native-paper";
import { StyleSheet, Dimensions } from "react-native";
import type { ReactElement } from "react";

type UseToastReturn = {
  showToast: (message: string) => void;
  toast: ReactElement;
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function useToast(): UseToastReturn {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  const showToast = (toastMessage: string) => {
    setMessage(toastMessage);
    setVisible(true);
  };

  const toast = (
    <Portal>
      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={6000}
        style={styles.snackbar}
        wrapperStyle={styles.wrapper}
      >
        {message}
      </Snackbar>
    </Portal>
  );

  return { showToast, toast };
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: SCREEN_HEIGHT / 2 - 30,
    left: 0,
    right: 0,
  },
  snackbar: {
    alignSelf: "center",
    maxWidth: "90%",
  },
});
