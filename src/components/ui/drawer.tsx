"use client";

import {createPortal} from "react-dom";
import {useEffect, useId, useRef, useState, type ReactNode} from "react";
import {IconButton} from "@/components/ui/primitives";

export type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  id?: string;
  side?: "start" | "end";
  className?: string;
  children: ReactNode;
};

export function Drawer({open, onOpenChange, title, id, side = "start", className, children}: DrawerProps) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const generatedId = useId();
  const titleId = `${id ?? generatedId}-title`;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!mounted || !dialog) return;
    const previousOverflow = document.body.style.overflow;

    if (open && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }

    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted, open]);

  if (!mounted) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="ui-drawer-dialog"
      data-side={side}
      id={id}
      aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); onOpenChange(false); }}
      onClose={() => onOpenChange(false)}
      onClick={event => { if (event.target === event.currentTarget) onOpenChange(false); }}
    >
      <div className={`ui-drawer ${className ?? ""}`}>
        <header className="ui-drawer__header">
          <h2 id={titleId}>{title}</h2>
          <IconButton variant="quiet" aria-label={`Close ${title}`} onClick={() => onOpenChange(false)}>×</IconButton>
        </header>
        <div className="ui-drawer__body">{children}</div>
      </div>
    </dialog>,
    document.body,
  );
}
