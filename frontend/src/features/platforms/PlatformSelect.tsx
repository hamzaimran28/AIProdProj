import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { togglePlatform } from "@/store/slices/platformSlice";
import { PLATFORM_OPTIONS } from "@/shared/constants/platforms";

export function PlatformSelect() {
  const dispatch = useAppDispatch();
  const selected = useAppSelector((s) => s.platforms.selectedIds);

  return (
    <section className="panel">
      <h2>2. Platforms</h2>
      <p className="hint">Choose 1–4 platforms (text-only drafts).</p>
      <div className="chips">
        {PLATFORM_OPTIONS.map((p) => {
          const active = selected.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              className={active ? "chip active" : "chip"}
              onClick={() => dispatch(togglePlatform(p.id))}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {selected.length === 0 && (
        <p className="error-inline">Select at least one platform.</p>
      )}
    </section>
  );
}
