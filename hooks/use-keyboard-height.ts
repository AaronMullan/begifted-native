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
    // Android's adjustResize resizes the whole window (Portals included), so
    // JS-side compensation would double-count the keyboard; report 0 there.
    if (Platform.OS !== "ios") {
      return;
    }

    const showSub = Keyboard.addListener("keyboardWillShow", (e) => {
      setHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener("keyboardWillHide", () => {
      setHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}
