import React, { useEffect, useState } from "react";
import { Portal, Snackbar } from "react-native-paper";

type SnackbarAction = {
  label: string;
  onPress: () => void;
};

type SnackbarPayload = {
  message: string;
  action?: SnackbarAction;
};

let listener: ((payload: SnackbarPayload) => void) | null = null;

/**
 * Show a brief app-wide snackbar from anywhere — mutation hooks, plain async
 * handlers — without threading React context through non-component code.
 * No-ops if the snackbar isn't mounted yet (app boot).
 */
export function showSnackbar(message: string, action?: SnackbarAction): void {
  listener?.({ message, action });
}

/**
 * Rendered once in app/_layout.tsx inside PaperProvider (Portal needs it).
 */
const GlobalSnackbar: React.FC = () => {
  const [payload, setPayload] = useState<SnackbarPayload | null>(null);

  useEffect(() => {
    listener = setPayload;
    return () => {
      listener = null;
    };
  }, []);

  return (
    <Portal>
      <Snackbar
        visible={payload !== null}
        onDismiss={() => setPayload(null)}
        duration={5000}
        action={payload?.action}
      >
        {payload?.message ?? ""}
      </Snackbar>
    </Portal>
  );
};

export default GlobalSnackbar;
