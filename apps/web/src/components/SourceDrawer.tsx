import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { dataset, invById, sourceById, sourceKind } from "../lib/data";
import { fieldLabel, sentenceCase } from "../lib/labels";
import { EvidenceBadge } from "./Badge";

interface SourceDrawerProps {
  recordId: string | null;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement>;
}

export function SourceDrawer({ recordId, onClose, returnFocusRef }: SourceDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!recordId) return;

    // Focus close button on open
    closeButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        returnFocusRef?.current?.focus();
        return;
      }
      // Trap focus
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [recordId, onClose, returnFocusRef]);

  if (!recordId) return null;

  // Resolve record details
  const isScenario = recordId.startsWith("SCENARIO:");
  const inv = invById(recordId);
  const run = !inv ? dataset.runs.find((r) => r.id === recordId) : null;
  const parentInv = run ? invById(run.psiId) : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="drawer-fade fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
        onClick={() => {
          onClose();
          returnFocusRef?.current?.focus();
        }}
        aria-hidden="true"
      />

      {/* Drawer: 480px on desktop, bottom sheet on mobile */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Record details for ${recordId}`}
        className="drawer-in fixed inset-x-0 bottom-0 z-50 max-h-[85vh] w-full overflow-y-auto rounded-t-[16px] border-t border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-lift)] sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-full sm:w-[480px] sm:rounded-none sm:border-t-0 sm:border-l sm:p-8"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div>
            <span className="eyebrow">
              {isScenario ? "Scenario input" : inv ? "NASA investigation" : "Experimental run"}
            </span>
            <h2 className="mt-1 font-mono text-xl text-[var(--text)]">{recordId}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => {
              onClose();
              returnFocusRef?.current?.focus();
            }}
            aria-label="Close record details"
            className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-[var(--focus)]"
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 1L13 13M13 1L1 13" />
            </svg>
          </button>
        </div>

        <div className="mt-6 space-y-6 text-sm">
          {isScenario && (
            <div className="space-y-3">
              <p className="text-[var(--text)]">
                Assumed environment constraint specified for the current scenario.
              </p>
              <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <EvidenceBadge type="ASSUMED" />
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Scenario inputs are boundary assumptions and do not represent measured historical flight data.
                </p>
              </div>
            </div>
          )}

          {inv && (
            <div className="space-y-4">
              <div>
                <dt className="text-xs text-[var(--text-muted)]">Title</dt>
                <dd className="mt-0.5 font-medium text-[var(--text)]">{inv.name}</dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs text-[var(--text-muted)]">Safety role</dt>
                  <dd className="mt-0.5 font-medium text-[var(--text)]">{sentenceCase(inv.safetyRole)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-muted)]">Project type</dt>
                  <dd className="mt-0.5 font-medium text-[var(--text)]">{inv.projectType}</dd>
                </div>
              </div>
              {inv.objectives && (
                <div>
                  <dt className="text-xs text-[var(--text-muted)]">Objectives</dt>
                  <dd className="mt-0.5 text-xs leading-relaxed text-[var(--text)]">{inv.objectives}</dd>
                </div>
              )}
              <div className="border-t border-[var(--border)] pt-4">
                <Link
                  to={`/investigation/${inv.psiId}`}
                  className="btn btn-secondary w-full"
                  onClick={onClose}
                >
                  View full investigation ({inv.psiId})
                </Link>
              </div>
            </div>
          )}

          {run && (
            <div className="space-y-4">
              {parentInv && (
                <div>
                  <dt className="text-xs text-[var(--text-muted)]">Parent investigation</dt>
                  <dd className="mt-0.5 font-medium text-[var(--text)]">
                    <Link
                      to={`/investigation/${parentInv.psiId}`}
                      className="link"
                      onClick={onClose}
                    >
                      {parentInv.name} ({parentInv.psiId})
                    </Link>
                  </dd>
                </div>
              )}

              <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
                <h3 className="font-medium text-[var(--text)] border-b border-[var(--border)] pb-2">
                  Documented run conditions
                </h3>
                {(["material", "geometry", "o2MolPct", "pressureKPa", "flowCmS", "gravityG"] as const).map((key) => {
                  const val = run[key];
                  const src = sourceById(val.sourceId);
                  const kind = src && sourceKind(src);
                  return (
                    <div key={key} className="flex items-start justify-between gap-2 text-xs">
                      <div>
                        <span className="text-[var(--text-muted)]">{fieldLabel(key)}:</span>{" "}
                        <span className="num font-medium text-[var(--text)]">
                          {val.value !== null ? `${val.value} ${val.unit ?? ""}` : "Not documented"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <EvidenceBadge type={val.type} />
                        {src && kind && (
                          <span className="text-[11px] text-[var(--text-muted)]">
                            {kind.label} {src.page ? `p.${src.page}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {parentInv && (
                <div className="pt-2">
                  <Link
                    to={`/investigation/${parentInv.psiId}`}
                    className="btn btn-secondary w-full"
                    onClick={onClose}
                  >
                    Open investigation runs table
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
