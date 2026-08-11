import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import { openLink } from "../lib/open-link";

/**
 * openLink with the copy-link fallback contract handled: on open failure the
 * failed URL is retained so a LinkFallbackSnackbar can offer to copy it.
 * Pair with <LinkFallbackSnackbar> — one hook + one snackbar per screen.
 */
export function useOpenLinkWithFallback() {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const open = async (url: string): Promise<boolean> => {
    const opened = await openLink(url);
    if (!opened) setFailedUrl(url);
    return opened;
  };

  const copyFailedLink = async () => {
    if (!failedUrl) return;
    await Clipboard.setStringAsync(failedUrl);
    setFailedUrl(null);
  };

  const dismiss = () => setFailedUrl(null);

  return { open, failedUrl, copyFailedLink, dismiss };
}
