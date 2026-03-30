import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { generatePosts } from "@/store/slices/generationSlice";

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
    <section className="panel">
      <h2>3. Generate</h2>
      <div className="row-between">
        <button
          type="button"
          className="btn primary"
          disabled={disabled}
          onClick={() => void dispatch(generatePosts())}
        >
          {status === "loading" ? "Generating…" : "Generate posts"}
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
