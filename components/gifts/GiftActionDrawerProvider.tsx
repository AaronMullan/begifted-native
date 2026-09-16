import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  BottomSheetModal,
  BottomSheetModalProvider,
} from "@gorhom/bottom-sheet";
import type { GiftSuggestion } from "../../types/recipient";
import GiftActionDrawer, {
  type GiftActionDrawerState,
} from "./GiftActionDrawer";

const MAX_PRESENT_RETRIES = 3;

type GiftActionDrawerContextValue = {
  openDrawer: (suggestion: GiftSuggestion, occasionId?: string | null) => void;
  closeDrawer: () => void;
};

const GiftActionDrawerContext =
  createContext<GiftActionDrawerContextValue | null>(null);

export function useGiftActionDrawer(): GiftActionDrawerContextValue {
  const ctx = useContext(GiftActionDrawerContext);
  if (!ctx) {
    throw new Error(
      "useGiftActionDrawer must be used inside GiftActionDrawerProvider"
    );
  }
  return ctx;
}

type ProviderProps = {
  children: React.ReactNode;
};

const GiftActionDrawerProvider: React.FC<ProviderProps> = ({ children }) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [state, setState] = useState<GiftActionDrawerState | null>(null);

  // Present the sheet only after the new state has committed. Calling
  // present() synchronously inside openDrawer races the setState, so the sheet
  // would render and (with enableDynamicSizing) measure against the previous
  // gift — showing the wrong gift's title and breaking subsequent opens.
  //
  // present() can also wedge: the modal registers as presented but never
  // reaches the screen, and every later present() no-ops — the drawer then
  // looks permanently dead. Same failure ContactPicker recovers from: confirm
  // the sheet actually opened via onChange, and if it hasn't after a beat,
  // force a dismiss and re-present. onChange can legitimately arrive later than
  // the retry interval, so a healthy open may be dismissed here too — which is
  // why dismissing must never clear `state` (see onDismiss below). Capped so a
  // sheet that never opens doesn't flicker forever.
  //
  // Retrying stops once the sheet reports open, or on any dismissal the retry
  // didn't cause (swipe, Skip/Done, route change) — otherwise the next tick
  // would re-present a drawer the user just closed. A recovery dismiss only
  // produces an onDismiss when a sheet is mounted, so `mountedRef` decides
  // whether to expect one.
  const settledRef = useRef(false);
  const mountedRef = useRef(false);
  const recoveryDismissPendingRef = useRef(false);
  useEffect(() => {
    if (!state) return;
    settledRef.current = false;
    recoveryDismissPendingRef.current = false;
    sheetRef.current?.present();
    mountedRef.current = true;
    let attempts = 0;
    const retry = setInterval(() => {
      if (settledRef.current || attempts >= MAX_PRESENT_RETRIES) {
        clearInterval(retry);
        return;
      }
      attempts += 1;
      recoveryDismissPendingRef.current = mountedRef.current;
      sheetRef.current?.dismiss();
      sheetRef.current?.present();
      mountedRef.current = true;
    }, 800);
    return () => clearInterval(retry);
  }, [state]);

  const value: GiftActionDrawerContextValue = {
    openDrawer: (suggestion, occasionId = null) => {
      setState({ suggestion, occasionId });
    },
    closeDrawer: () => {
      sheetRef.current?.dismiss();
    },
  };

  return (
    <GiftActionDrawerContext.Provider value={value}>
      <BottomSheetModalProvider>
        {children}
        <GiftActionDrawer
          sheetRef={sheetRef}
          state={state}
          // Keep the last gift after a dismiss. The recovery above dismisses
          // and re-presents, so clearing state here would let the sheet come
          // back with no gift and every row tap would silently no-op. Each
          // openDrawer sets a fresh object, so reopening still re-presents.
          onDismiss={() => {
            mountedRef.current = false;
            if (recoveryDismissPendingRef.current) {
              recoveryDismissPendingRef.current = false;
              return;
            }
            settledRef.current = true;
          }}
          onChange={(index) => {
            if (index >= 0) settledRef.current = true;
          }}
        />
      </BottomSheetModalProvider>
    </GiftActionDrawerContext.Provider>
  );
};

export default GiftActionDrawerProvider;
