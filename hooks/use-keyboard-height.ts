import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * Current software-keyboard height in points (0 when hidden). For surfaces a
 * KeyboardAvoidingView can't reach — e.g. Paper Dialogs rendered through a
 * Portal, which live outside the screen's KAV subtree.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // "will" events only fire on iOS; Android must use "did".
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
