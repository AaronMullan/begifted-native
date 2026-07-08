import React, { useEffect, useState } from "react";
import { Portal, Snackbar } from "react-native-paper";

let listener: ((message: string) => void) | null = null;

/**
 * Show a brief app-wide snackbar from anywhere — mutation hooks, plain async
 * handlers — without threading React context through non-component code.
 * No-ops if the snackbar isn't mounted yet (app boot).
 */
export function showSnackbar(message: string): void {
  listener?.(message);
}

/**
 * Rendered once in app/_layout.tsx inside PaperProvider (Portal needs it).
 */
const GlobalSnackbar: React.FC = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    listener = setMessage;
    return () => {
      listener = null;
    };
  }, []);

  return (
    <Portal>
      <Snackbar
        visible={message !== null}
        onDismiss={() => setMessage(null)}
        duration={5000}
      >
        {message ?? ""}
      </Snackbar>
    </Portal>
  );
};

export default GlobalSnackbar;
