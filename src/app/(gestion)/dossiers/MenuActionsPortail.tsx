"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  ancre: HTMLButtonElement | null;
  largeur: "w-48" | "w-56";
  onFermer: () => void;
  children: React.ReactNode;
};

type Position = {
  top: number;
  left: number;
};

export default function MenuActionsPortail({
  ancre,
  largeur,
  onFermer,
  children,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);

  useLayoutEffect(() => {
    if (!ancre) return;
    const boutonAncre = ancre;

    function positionnerMenu() {
      const menu = menuRef.current;

      if (!menu || !boutonAncre.isConnected) {
        onFermer();
        return;
      }

      const rect = boutonAncre.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const marge = 8;
      let top = rect.bottom + 4;

      if (
        top + menuRect.height > window.innerHeight - marge &&
        rect.top > menuRect.height + 4
      ) {
        top = rect.top - menuRect.height - 4;
      }

      top = Math.max(
        marge,
        Math.min(top, window.innerHeight - menuRect.height - marge),
      );

      const left = Math.max(
        marge,
        Math.min(
          rect.right - menuRect.width,
          window.innerWidth - menuRect.width - marge,
        ),
      );

      setPosition({ top, left });
    }

    positionnerMenu();
    window.addEventListener("resize", positionnerMenu);
    window.addEventListener("scroll", positionnerMenu, true);

    return () => {
      window.removeEventListener("resize", positionnerMenu);
      window.removeEventListener("scroll", positionnerMenu, true);
    };
  }, [ancre, onFermer]);

  useEffect(() => {
    function gererClicExterieur(evenement: PointerEvent) {
      const cible = evenement.target;

      if (
        cible instanceof Node &&
        !menuRef.current?.contains(cible) &&
        !ancre?.contains(cible)
      ) {
        onFermer();
      }
    }

    function gererClavier(evenement: KeyboardEvent) {
      if (evenement.key === "Escape") onFermer();
    }

    document.addEventListener("pointerdown", gererClicExterieur);
    document.addEventListener("keydown", gererClavier);

    return () => {
      document.removeEventListener("pointerdown", gererClicExterieur);
      document.removeEventListener("keydown", gererClavier);
    };
  }, [ancre, onFermer]);

  if (!ancre || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      className={`fixed z-[200] ${largeur} max-h-[calc(100vh-1rem)] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg`}
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? "visible" : "hidden",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
