import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { BetaCheckInScreen } from "../../lib/api";
import {
  hasSeenCheckIn,
  markCheckInSeen,
} from "../../lib/beta-checkin-storage";
import { useAuth } from "../../hooks/use-auth";
import BetaCheckInSheet, { type CheckInConfig } from "./BetaCheckInSheet";
import { BETA_CHECK_IN_CONFIGS } from "./beta-check-in-configs";

type BetaCheckInContextValue = {
  // Present the check-in for a moment if the current user hasn't seen it yet.
  // Idempotent and safe to call from render effects: a per-session guard plus a
  // persisted seen-flag ensure each check-in fires at most once.
  triggerCheckIn: (screen: BetaCheckInScreen) => void;
};

const BetaCheckInContext = createContext<BetaCheckInContextValue | null>(null);

export function useBetaCheckIn(): BetaCheckInContextValue {
  const ctx = useContext(BetaCheckInContext);
  if (!ctx) {
    throw new Error("useBetaCheckIn must be used inside BetaCheckInProvider");
  }
  return ctx;
}

type ProviderProps = {
  children: React.ReactNode;
};

const BetaCheckInProvider: React.FC<ProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const sheetRef = useRef<BottomSheetModal>(null);
  const [config, setConfig] = useState<CheckInConfig | null>(null);
  // Guards against a trigger firing repeatedly within a session (e.g. from a
  // render effect that re-runs) before the async seen-flag resolves.
  const handledRef = useRef<Set<BetaCheckInScreen>>(new Set());

  // Present only after config commits -- calling present() synchronously races
  // the setState and the sheet measures against stale (null) content.
  useEffect(() => {
    if (config) sheetRef.current?.present();
  }, [config]);

  const value: BetaCheckInContextValue = {
    triggerCheckIn: (screen) => {
      if (!user) return;
      if (handledRef.current.has(screen)) return;
      handledRef.current.add(screen);
      void (async () => {
        if (await hasSeenCheckIn(user.id, screen)) return;
        // Mark seen on present, not on submit, so a dismiss-without-answer
        // still never re-shows.
        await markCheckInSeen(user.id, screen);
        setConfig(BETA_CHECK_IN_CONFIGS[screen]);
      })();
    },
  };

  return (
    <BetaCheckInContext.Provider value={value}>
      {children}
      <BetaCheckInSheet
        sheetRef={sheetRef}
        config={config}
        onSubmitted={() => {}}
        onDismiss={() => setConfig(null)}
      />
    </BetaCheckInContext.Provider>
  );
};

export default BetaCheckInProvider;
