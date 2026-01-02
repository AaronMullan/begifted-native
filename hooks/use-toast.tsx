import { useState } from "react";
import { Snackbar } from "react-native-paper";
import type { ReactElement } from "react";

type UseToastReturn = {
  showToast: (message: string) => void;
  toast: ReactElement | null;
};

export function useToast(): UseToastReturn {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  const showToast = (toastMessage: string) => {
    console.log("showToast called with:", toastMessage);
    setMessage(toastMessage);
    setVisible(true);
    console.log("Toast state updated - visible should be true");
  };

  const toast = visible ? (
    <Snackbar
      visible={visible}
      onDismiss={() => setVisible(false)}
      duration={6000}
    >
      {message}
    </Snackbar>
  ) : null;

  return { showToast, toast };
}
