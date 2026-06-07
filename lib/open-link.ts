import * as WebBrowser from "expo-web-browser";
import { Colors } from "./colors";

/**
 * Open a URL in an in-app browser sheet (SFSafariViewController on iOS /
 * Chrome Custom Tabs on Android) so the user stays inside BeGifted and can
 * return to exactly where they left off via "Done"/back.
 *
 * Toolbar chrome is tinted to brand colors. Errors are swallowed so a bad
 * URL never crashes the calling screen.
 */
export async function openLink(url: string): Promise<void> {
  if (!url) return;
  try {
    await WebBrowser.openBrowserAsync(url, {
      toolbarColor: Colors.brand.darkTeal,
      controlsColor: Colors.brand.cream,
      dismissButtonStyle: "done",
    });
  } catch {
    // Ignore — opening an external product link should never crash the app.
  }
}
