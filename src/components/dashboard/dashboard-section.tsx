"use client";

import { useState, useEffect, ReactNode } from "react";

interface DashboardSectionProps {
  id: string;
  title: string;
  icon?: string;
  children: ReactNode;
  defaultCollapsed?: boolean;
  collapsible?: boolean;
  badge?: string | number;
}

const STORAGE_KEY = "dashboard-section-collapsed";

export function DashboardSection({
  id,
  title,
  icon,
  children,
  defaultCollapsed = false,
  collapsible = true,
  badge,
}: DashboardSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [mounted, setMounted] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const collapsed = JSON.parse(stored);
        if (typeof collapsed[id] === "boolean") {
          setIsCollapsed(collapsed[id]);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [id]);

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const collapsed = stored ? JSON.parse(stored) : {};
      collapsed[id] = newState;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed));
    } catch {
      // Ignore localStorage errors
    }
  };

  // Avoid hydration mismatch by not rendering collapsed state until mounted
  const shouldShowContent = mounted ? !isCollapsed : !defaultCollapsed;

  if (!collapsible) {
    return (
      <section className="space-y-4">
        {title && (
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            {icon && <span className="text-xl">{icon}</span>}
            {title}
            {badge !== undefined && (
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-sm rounded-full">
                {badge}
              </span>
            )}
          </h2>
        )}
        {children}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <button
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between group"
      >
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          {icon && <span className="text-xl">{icon}</span>}
          {title}
          {badge !== undefined && (
            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-sm rounded-full">
              {badge}
            </span>
          )}
        </h2>
        <span
          className={`text-gray-400 group-hover:text-gray-600 transition transform ${
            shouldShowContent ? "rotate-0" : "-rotate-90"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      <div
        className={`transition-all duration-200 overflow-hidden ${
          shouldShowContent ? "opacity-100" : "opacity-0 h-0"
        }`}
      >
        {shouldShowContent && children}
      </div>
    </section>
  );
}
