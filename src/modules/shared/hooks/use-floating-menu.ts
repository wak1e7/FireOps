"use client";

import { RefObject, useEffect } from "react";

export const FLOATING_MENU_EVENT = "fireops-floating-menu-open";

export function announceFloatingMenuOpen(menuId: string) {
  window.dispatchEvent(new CustomEvent(FLOATING_MENU_EVENT, { detail: menuId }));
}

export function useFloatingMenu(menuId: string, ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    function onOtherMenuOpen(event: Event) {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail !== menuId) onClose();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(FLOATING_MENU_EVENT, onOtherMenuOpen);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(FLOATING_MENU_EVENT, onOtherMenuOpen);
    };
  }, [menuId, onClose, open, ref]);
}
