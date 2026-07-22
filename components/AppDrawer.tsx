import { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname } from "expo-router";
import { NAV_CONTENT_HEIGHT } from "@/components/BottomNav";
import { Colors } from "@/lib/colors";

type AppDrawerProps = {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onDismiss: () => void;
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  backgroundStyle?: StyleProp<ViewStyle>;
  handleIndicatorStyle?: StyleProp<ViewStyle>;
};

/**
 * Shared bottom drawer per the hand-off's drawer rules: no background dim
 * (the dark overlay is reserved for true high-consequence confirmations), the
 * sheet stops flush above the bottom nav so the nav stays visible and
 * tappable, and content — CTA included — lives in one scrollable body rather
 * than a pinned footer. Tapping a nav item navigates normally; the route
 * change dismisses the drawer.
 */
export const AppDrawer: React.FC<AppDrawerProps> = ({
  sheetRef,
  onDismiss,
  children,
  contentContainerStyle,
  backgroundStyle,
  handleIndicatorStyle,
}) => {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      sheetRef.current?.dismiss();
    }
  }, [pathname, sheetRef]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      onDismiss={onDismiss}
      // Total nav height = content height + home-indicator inset.
      bottomInset={NAV_CONTENT_HEIGHT + Math.max(insets.bottom, 0)}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      handleIndicatorStyle={[styles.handle, handleIndicatorStyle]}
      backgroundStyle={[styles.background, backgroundStyle]}
    >
      <BottomSheetScrollView
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  handle: {
    backgroundColor: Colors.brand.beige,
    width: 58,
    height: 5,
    borderRadius: 4,
  },
  background: {
    backgroundColor: Colors.white,
  },
});
