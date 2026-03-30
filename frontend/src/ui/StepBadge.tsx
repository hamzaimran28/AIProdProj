import type { ReactNode } from "react";

/**
 * Icon-only rail marker beside each panel title (no step numbers).
 */
export function StepBadge({ children }: { children: ReactNode }) {
  return (
    <span className="panel-step" aria-hidden="true">
      <span className="panel-step-icon-wrap">{children}</span>
    </span>
  );
}
