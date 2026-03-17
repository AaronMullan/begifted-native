import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

type VisibilityState = {
  animatedStyle: {
    transform: { translateY: Animated.AnimatedInterpolation<number> }[];
  };
};

/**
 * Simple animated visibility controller for the header.
 * Initially visible; scroll hooks drive the Animated.Value.
 */
const sharedTranslateY = new Animated.Value(0);
let isCurrentlyVisible = true;

export function useHeaderVisibility(headerHeight: number): VisibilityState {
  const translateYRef = useRef(sharedTranslateY);

  useEffect(() => {
    if (!isCurrentlyVisible) {
      showHeader();
    }
  }, []);

  const translateY = translateYRef.current.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -headerHeight],
  });

  return {
    animatedStyle: {
      transform: [{ translateY }],
    },
  };
}

export function showHeader() {
  if (isCurrentlyVisible) return;
  isCurrentlyVisible = true;
  Animated.timing(sharedTranslateY, {
    toValue: 0,
    duration: 180,
    easing: Easing.out(Easing.quad),
    useNativeDriver: true,
  }).start();
}

export function hideHeader() {
  if (!isCurrentlyVisible) return;
  isCurrentlyVisible = false;
  Animated.timing(sharedTranslateY, {
    toValue: 1,
    duration: 180,
    easing: Easing.in(Easing.quad),
    useNativeDriver: true,
  }).start();
}
