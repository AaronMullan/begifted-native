import { useRef } from "react";
import { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { hideBottomNav, showBottomNav } from "./use-bottom-nav-visibility";
import { hideHeader, showHeader } from "./use-header-visibility";

/**
 * Hook to drive bottom nav and header visibility based on vertical scroll direction.
 * - Hides both on meaningful downward scroll.
 * - Shows both on upward scroll or when user returns near the top.
 */
export function useBottomNavScrollVisibility() {
  const lastOffsetYRef = useRef(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const lastOffset = lastOffsetYRef.current;
    const delta = currentOffset - lastOffset;

    // Always show when near the very top
    if (currentOffset <= 0) {
      showBottomNav();
      showHeader();
      lastOffsetYRef.current = currentOffset;
      return;
    }

    const threshold = 16;
    if (Math.abs(delta) < threshold) {
      return;
    }

    if (delta > 0) {
      // Scrolling down
      hideBottomNav();
      hideHeader();
    } else {
      // Scrolling up
      showBottomNav();
      showHeader();
    }

    lastOffsetYRef.current = currentOffset;
  };

  return { handleScroll };
}
