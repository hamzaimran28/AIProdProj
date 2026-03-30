import { useCallback, useRef, useState } from "react";

/**
 * Brief "Copied" feedback for clipboard actions (avoids stacking timers).
 */
export function useCopyFlash(durationMs = 1800) {
  const [key, setKey] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback(
    (id: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setKey(id);
      timerRef.current = setTimeout(() => {
        setKey(null);
        timerRef.current = null;
      }, durationMs);
    },
    [durationMs]
  );

  return { activeKey: key, flash };
}
