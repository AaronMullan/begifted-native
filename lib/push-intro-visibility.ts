import { useSyncExternalStore } from "react";

// Whether the push-notifications explainer is on screen. A module store, not
// component state, because the What's New card sits outside the app shell's
// error boundary (so it can still offer an OTA fix after a render crash) and
// can't share a context with the shell that owns the explainer.
let visible = false;
const listeners = new Set<() => void>();

export function setPushIntroVisible(next: boolean): void {
  if (next === visible) return;
  visible = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePushIntroVisible(): boolean {
  return useSyncExternalStore(subscribe, () => visible);
}
