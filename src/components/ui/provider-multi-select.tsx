"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./provider-multi-select.module.css";

export function providerSelectionLabel(selected: readonly string[]) {
  if (selected.length === 0) return "All providers";
  if (selected.length === 1) return selected[0];
  return `${selected.length} providers selected`;
}

export function ProviderMultiSelect({
  id,
  label,
  providers,
  selected,
  onChange,
  className,
}: {
  id: string;
  label: string;
  providers: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const generatedId = useId();
  const panelId = `${id}-${generatedId}-options`;
  const checked = new Set(selected);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const toggleProvider = (provider: string, include: boolean) => {
    const next = new Set(selected);
    if (include) next.add(provider);
    else next.delete(provider);
    onChange([...next]);
  };

  return (
    <div ref={rootRef} className={`${styles.container}${className ? ` ${className}` : ""}`} data-open={open || undefined}>
      <button
        ref={triggerRef}
        id={id}
        className={styles.trigger}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(value => !value)}
      >
        <span className={styles.value}>{providerSelectionLabel(selected)}</span>
        <span className={styles.chevron} aria-hidden="true">⌄</span>
      </button>
      <div className={styles.panel} id={panelId} hidden={!open}>
        <div className={styles.panelHeader}>
          <button
            className={styles.reset}
            type="button"
            aria-pressed={selected.length === 0}
            onClick={() => onChange([])}
          >All providers</button>
          {selected.length > 0 && <span className={styles.selectedCount}>{selected.length} selected</span>}
        </div>
        <fieldset className={styles.options}>
          <legend className="sr-only">Provider options</legend>
          {providers.map(provider => <label className={styles.option} key={provider}>
            <input
              type="checkbox"
              checked={checked.has(provider)}
              onChange={event => toggleProvider(provider, event.target.checked)}
            />
            <span>{provider}</span>
          </label>)}
        </fieldset>
      </div>
    </div>
  );
}
