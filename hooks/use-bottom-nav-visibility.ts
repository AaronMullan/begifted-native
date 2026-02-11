import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { BOTTOM_NAV_HEIGHT } from "../lib/constants";

type VisibilityState = {
  isVisible: boolean;
  animatedStyle: {
    transform: { translateY: Animated.AnimatedInterpolation<number> }[];
  };
};

/**
 * Simple animated visibility controller for the bottom nav.
 * Initially visible; other hooks (e.g. scroll) can drive the Animated.Value.
 */
const sharedTranslateY = new Animated.Value(0);
let isCurrentlyVisible = true;

export function useBottomNavVisibility(): VisibilityState {
  const translateYRef = useRef(sharedTranslateY);

  useEffect(() => {
    // Ensure nav starts visible on mount
    if (!isCurrentlyVisible) {
      showBottomNav();
    }
  }, []);

  const translateY = translateYRef.current.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BOTTOM_NAV_HEIGHT],
  });

  return {
    isVisible: isCurrentlyVisible,
    animatedStyle: {
      transform: [{ translateY }],
    },
  };
}

export function showBottomNav() {
  if (isCurrentlyVisible) return;
  isCurrentlyVisible = true;
  Animated.timing(sharedTranslateY, {
    toValue: 0,
    duration: 180,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  }).start();
}

export function hideBottomNav() {
  if (!isCurrentlyVisible) return;
  isCurrentlyVisible = false;
  Animated.timing(sharedTranslateY, {
    toValue: 1,
    duration: 180,
    easing: Easing.in(Easing.quad),
    useNativeDriver: true,
  }).start();
}
