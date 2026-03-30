import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { generatePosts } from "@/store/slices/generationSlice";
import { IconGenerate } from "@/ui/icons";
import { StepBadge } from "@/ui/StepBadge";

const MIN_LEN = 100;

export function GenerateBar() {
  const dispatch = useAppDispatch();
  const text = useAppSelector((s) => s.transcript.text);
  const selected = useAppSelector((s) => s.platforms.selectedIds);
  const status = useAppSelector((s) => s.generation.status);
  const error = useAppSelector((s) => s.generation.error);

  const disabled =
    text.length < MIN_LEN || selected.length === 0 || status === "loading";

  return (
    <section className="panel panel-generate">
      <div className="panel-head">
        <StepBadge>
          <IconGenerate className="panel-step-icon" />
        </StepBadge>
        <div className="panel-head-text">
          <h2>Generate</h2>
          <p className="hint">Runs when transcript length and platforms are valid.</p>
        </div>
      </div>
      <div className="row-between generate-actions">
        <button
          type="button"
          className={
            status === "loading" ? "btn primary is-loading" : "btn primary"
          }
          disabled={disabled}
          aria-busy={status === "loading"}
          onClick={() => void dispatch(generatePosts())}
        >
          {status === "loading" && (
            <span className="btn-spinner" aria-hidden="true" />
          )}
          <span>{status === "loading" ? "Generating…" : "Generate posts"}</span>
        </button>
      </div>
      {error && status === "failed" && (
        <p className="error-inline" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
