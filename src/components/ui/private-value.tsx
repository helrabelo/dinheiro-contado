"use client";

import { usePrivacyMode } from "@/contexts/privacy-mode-context";
import { ReactNode } from "react";

interface PrivateValueProps {
  children: ReactNode;
  /** Optional: use blur effect instead of hiding content */
  blur?: boolean;
  /** Custom placeholder when private (defaults to •••••) */
  placeholder?: string;
}

/**
 * Wrapper component that masks sensitive values when privacy mode is active.
 * Use for currency values and other sensitive financial data.
 *
 * @example
 * <PrivateValue>R$ 1.234,56</PrivateValue>
 *
 * @example
 * <PrivateValue blur>R$ 1.234,56</PrivateValue>
 */
export function PrivateValue({
  children,
  blur = false,
  placeholder = "•••••",
}: PrivateValueProps) {
  const { isPrivate } = usePrivacyMode();

  if (!isPrivate) {
    return <>{children}</>;
  }

  if (blur) {
    return (
      <span className="select-none blur-md transition-all duration-200 hover:blur-none">
        {children}
      </span>
    );
  }

  return <span className="select-none">{placeholder}</span>;
}

/**
 * A version that formats currency directly with privacy awareness.
 * Useful when you need just the formatted string without wrapping.
 */
interface PrivateCurrencyProps {
  value: number;
  /** Use compact format (e.g., R$ 1.5k) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function PrivateCurrency({
  value,
  compact = false,
  className,
}: PrivateCurrencyProps) {
  const { formatCurrency } = usePrivacyMode();

  return <span className={className}>{formatCurrency(value, compact)}</span>;
}
