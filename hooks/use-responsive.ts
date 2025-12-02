import { useWindowDimensions } from "react-native";
import { breakpoints } from "../constants/theme";

/**
 * Hook for responsive design breakpoints
 * Returns device type flags and current width
 */
export function useResponsive() {
  const { width } = useWindowDimensions();

  return {
    isDesktop: width >= breakpoints.desktop,
    isTablet: width >= breakpoints.tablet,
    isMobile: width < breakpoints.tablet,
    width,
  };
}

