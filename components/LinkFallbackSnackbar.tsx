import { Portal, Snackbar } from "react-native-paper";

type LinkFallbackSnackbarProps = {
  visible: boolean;
  message: string;
  onCopyLink: () => void;
  onDismiss: () => void;
};

/**
 * Copy-link fallback snackbar for failed openLink calls; pairs with
 * useOpenLinkWithFallback. The Portal is load-bearing: Paper's Snackbar
 * anchors `bottom: 0` to its nearest parent, so rendered inline inside a
 * small component (a checkbox row, a card) it lands mid-form or below the
 * fold. Portal re-anchors it to the screen no matter where callers render it.
 */
const LinkFallbackSnackbar: React.FC<LinkFallbackSnackbarProps> = ({
  visible,
  message,
  onCopyLink,
  onDismiss,
}) => (
  <Portal>
    <Snackbar
      visible={visible}
      onDismiss={onDismiss}
      duration={6000}
      action={{ label: "Copy link", onPress: onCopyLink }}
    >
      {message}
    </Snackbar>
  </Portal>
);

export default LinkFallbackSnackbar;
