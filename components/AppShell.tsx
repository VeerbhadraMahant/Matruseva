"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { SIDEBAR_COOKIE } from "@/lib/sidebar";

interface SidebarCtx {
  collapsed: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarCtx>({ collapsed: false, toggle: () => {} });

export function useSidebar() {
  return useContext(SidebarContext);
}

function writeCookie(collapsed: boolean) {
  try {
    document.cookie = `${SIDEBAR_COOKIE}=${collapsed ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // cookies blocked: preference simply won't persist
  }
}

function isTypingTarget(t: EventTarget | null) {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
}

/**
 * Owns the desktop sidebar state. The server reads the `ms_sidebar` cookie and
 * passes the initial value, so the first paint already has the right width.
 * The content offset is a CSS variable on this wrapper (see globals.css), and
 * `children` is a stable prop, so toggling never re-renders the pages.
 */
export function AppShell({ initialCollapsed, children }: { initialCollapsed: boolean; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      writeCookie(!c);
      return !c;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.repeat) return;
      if (e.key.toLowerCase() !== "b") return;
      if (isTypingTarget(e.target)) return;
      if (!window.matchMedia("(min-width: 768px)").matches) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      <div
        className="app-shell flex min-h-dvh flex-col"
        data-sidebar={collapsed ? "collapsed" : "expanded"}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}
