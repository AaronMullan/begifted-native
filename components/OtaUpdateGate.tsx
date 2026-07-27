import React, { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { Button, Dialog, Portal, Text } from "react-native-paper";
import * as Updates from "expo-updates";

/**
 * Downloads a published OTA update as soon as the app is opened or
 * foregrounded and offers a one-tap restart. Without this, expo-updates'
 * default flow needs two full force-quits before an update runs — beta
 * testers rarely do that, so published fixes sat unapplied indefinitely.
 */
const OtaUpdateGate: React.FC = () => {
  const [dialogVisible, setDialogVisible] = useState(false);
  // Refs, not state: the AppState listener would otherwise close over stale
  // values and re-check (or re-prompt) after the update is already fetched.
  const checking = useRef(false);
  const settled = useRef(false);

  useEffect(() => {
    // checkForUpdateAsync throws in dev clients and Expo Go.
    if (!Updates.isEnabled) return;

    const check = async () => {
      if (checking.current || settled.current) return;
      checking.current = true;
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (isAvailable) {
          await Updates.fetchUpdateAsync();
          settled.current = true;
          setDialogVisible(true);
        }
      } catch {
        // Network flake or update-server outage — retry on next foreground.
      } finally {
        checking.current = false;
      }
    };

    check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => subscription.remove();
  }, []);

  // "Later" is safe to honor quietly: the update is already downloaded and
  // will run on the next cold start even without the restart.
  const dismiss = () => setDialogVisible(false);

  const restart = () => {
    Updates.reloadAsync().catch(dismiss);
  };

  return (
    <Portal>
      <Dialog visible={dialogVisible} onDismiss={dismiss}>
        <Dialog.Title>Update ready</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">
            The latest BeGifted improvements are downloaded and ready. Restart
            now to start using them — it only takes a moment.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={dismiss}>Later</Button>
          <Button mode="contained" onPress={restart}>
            Restart Now
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

export default OtaUpdateGate;
