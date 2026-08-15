// Screens with in-progress work the user could silently lose (the batch
// add-recipient queue) register a guard here. Nav chrome (BottomNav, Header)
// consults it before following a Link: react-navigation's beforeRemove only
// intercepts stack pops, and expo-router's tab/link dispatch bypasses it
// entirely — a tab tap would otherwise abandon the flow with no confirmation.
type LeaveGuard = (href: string) => boolean;

let activeGuard: LeaveGuard | null = null;

/** Returns an unregister function; a stale unregister (after another guard
 * registered) is a no-op. */
export function registerLeaveGuard(guard: LeaveGuard): () => void {
  activeGuard = guard;
  return () => {
    if (activeGuard === guard) activeGuard = null;
  };
}

/** True when the guard claims the navigation (the caller must not follow the
 * link); the guard is expected to confirm and re-dispatch itself. */
export function interceptLeave(href: string): boolean {
  return activeGuard ? activeGuard(href) : false;
}
