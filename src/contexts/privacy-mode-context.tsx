"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

interface PrivacyModeContextType {
  isPrivate: boolean;
  toggle: () => void;
  formatCurrency: (value: number, compact?: boolean) => string;
}

const PrivacyModeContext = createContext<PrivacyModeContextType | undefined>(
  undefined
);

const STORAGE_KEY = "dinheiro-contado-privacy-mode";
const MASKED_VALUE = "R$ •••••";
const MASKED_COMPACT = "R$ •••";

export function PrivacyModeProvider({ children }: { children: ReactNode }) {
  const [isPrivate, setIsPrivate] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setIsPrivate(true);
    }
    setMounted(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, String(isPrivate));
    }
  }, [isPrivate, mounted]);

  // Keyboard shortcut: Cmd/Ctrl + Shift + P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "p") {
        e.preventDefault();
        setIsPrivate((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggle = useCallback(() => {
    setIsPrivate((prev) => !prev);
  }, []);

  const formatCurrency = useCallback(
    (value: number, compact: boolean = false): string => {
      if (isPrivate) {
        return compact ? MASKED_COMPACT : MASKED_VALUE;
      }

      if (compact && Math.abs(value) >= 1000) {
        const formatted = (value / 1000).toFixed(1);
        return `R$ ${formatted}k`;
      }

      return `R$ ${value.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    },
    [isPrivate]
  );

  // Prevent hydration mismatch by using default value until mounted
  const contextValue: PrivacyModeContextType = {
    isPrivate: mounted ? isPrivate : false,
    toggle,
    formatCurrency: mounted
      ? formatCurrency
      : (value: number, compact?: boolean) => {
          if (compact && Math.abs(value) >= 1000) {
            return `R$ ${(value / 1000).toFixed(1)}k`;
          }
          return `R$ ${value.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
        },
  };

  return (
    <PrivacyModeContext.Provider value={contextValue}>
      {children}
    </PrivacyModeContext.Provider>
  );
}

export function usePrivacyMode(): PrivacyModeContextType {
  const context = useContext(PrivacyModeContext);
  if (context === undefined) {
    throw new Error("usePrivacyMode must be used within a PrivacyModeProvider");
  }
  return context;
}
