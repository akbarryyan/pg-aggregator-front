"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const DESKTOP_QUERY = "(min-width: 1024px)"; // Tailwind `lg`

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

// Server snapshot is `true`: the drawer is hidden by CSS below `lg` regardless,
// so SSR markup stays identical to the first client render.
function useIsDesktop() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  );
}

/**
 * Sidebar state shared by the merchant and admin shells. Desktop (>= lg): the
 * button collapses the sidebar to icons. Below lg: it opens an overlay drawer.
 */
export function useSidebar() {
  const isDesktop = useIsDesktop();
  const [collapsedPref, setCollapsedPref] = useState(false);
  const [mobileOpenPref, setMobileOpenPref] = useState(false);

  // Derived, so resizing across the breakpoint never leaves stale state behind.
  const collapsed = collapsedPref && isDesktop;
  const mobileOpen = mobileOpenPref && !isDesktop;

  const toggle = useCallback(() => {
    if (isDesktop) setCollapsedPref((v) => !v);
    else setMobileOpenPref((v) => !v);
  }, [isDesktop]);
  const closeMobile = useCallback(() => setMobileOpenPref(false), []);

  // Forget the open drawer when the viewport crosses to desktop, so narrowing
  // again does not reopen it. Runs in a listener callback, not the effect body.
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => {
      if (mq.matches) setMobileOpenPref(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // While the drawer is open: Escape closes it and the page behind cannot scroll.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpenPref(false);
    };
    document.addEventListener("keydown", onKey);
    // Move focus into the drawer; give it back to the opener on close.
    const opener = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>("#app-sidebar nav a")?.focus();
    });
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
      opener?.focus();
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const expanded = isDesktop ? !collapsed : mobileOpen;

  return { collapsed, mobileOpen, expanded, toggle, closeMobile };
}
