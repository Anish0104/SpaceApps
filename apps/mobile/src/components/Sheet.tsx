import { useEffect, useRef } from "react";

/** A bottom sheet. Closes on backdrop tap or Escape and returns focus to the trigger. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet-bg" onClick={onClose} />
      <div className="sheet" ref={ref} tabIndex={-1}>
        <div className="sheet-grip" />
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}
