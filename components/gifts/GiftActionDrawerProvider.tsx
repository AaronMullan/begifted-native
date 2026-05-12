import React, { createContext, useContext, useRef, useState } from "react";
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

  const value: GiftActionDrawerContextValue = {
    openDrawer: (suggestion, occasionId = null) => {
      setState({ suggestion, occasionId });
      sheetRef.current?.present();
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
        />
      </BottomSheetModalProvider>
    </GiftActionDrawerContext.Provider>
  );
};

export default GiftActionDrawerProvider;
