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
  // force a dismiss and re-present.
  const openedRef = useRef(false);
  useEffect(() => {
    if (!state) return;
    openedRef.current = false;
    sheetRef.current?.present();
    const retry = setInterval(() => {
      if (openedRef.current) {
        clearInterval(retry);
        return;
      }
      sheetRef.current?.dismiss();
      sheetRef.current?.present();
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
          onDismiss={() => setState(null)}
          onChange={(index) => {
            if (index >= 0) openedRef.current = true;
          }}
        />
      </BottomSheetModalProvider>
    </GiftActionDrawerContext.Provider>
  );
};

export default GiftActionDrawerProvider;
