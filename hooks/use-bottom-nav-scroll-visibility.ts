import { useRef } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { hideBottomNav, showBottomNav } from "./use-bottom-nav-visibility";

/**
 * Hook to drive bottom nav visibility based on vertical scroll direction.
 * - Hides nav on meaningful downward scroll.
 * - Shows nav on upward scroll or when user returns near the top.
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
    } else {
      // Scrolling up
      showBottomNav();
    }

    lastOffsetYRef.current = currentOffset;
  };

  return { handleScroll };
}

