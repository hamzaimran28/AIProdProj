import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { generatePosts } from "@/store/slices/generationSlice";
import {
  setImagePrompt,
  setIncludeImage,
} from "@/store/slices/transcriptSlice";
import { IconGenerate } from "@/ui/icons";
import { StepBadge } from "@/ui/StepBadge";

const MIN_LEN = 100;

export function GenerateBar() {
  const dispatch = useAppDispatch();
  const text = useAppSelector((s) => s.transcript.text);
  const selected = useAppSelector((s) => s.platforms.selectedIds);
  const status = useAppSelector((s) => s.generation.status);
  const error = useAppSelector((s) => s.generation.error);
  const includeImage = useAppSelector((s) => s.transcript.includeImage);
  const imagePrompt = useAppSelector((s) => s.transcript.imagePrompt);

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
      <label className="generate-image-option">
        <input
          type="checkbox"
          checked={includeImage}
          onChange={(e) => dispatch(setIncludeImage(e.target.checked))}
        />
        <span>
          Also generate one image for all selected platforms (same file for every
          post)
        </span>
      </label>
      {includeImage && (
        <div className="generate-image-prompt">
          <label className="label-block" htmlFor="image-prompt">
            Image prompt (optional)
          </label>
          <textarea
            id="image-prompt"
            className="textarea textarea-field"
            rows={3}
            placeholder="Leave empty to auto-build a prompt from your transcript summary."
            value={imagePrompt}
            onChange={(e) => dispatch(setImagePrompt(e.target.value))}
            spellCheck
          />
          <p className="hint generate-image-hint">
            One request produces a single image you can reuse with Twitter,
            LinkedIn, Instagram, and the newsletter teaser.
          </p>
        </div>
      )}
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
          <span>
            {status === "loading"
              ? includeImage
                ? "Generating posts & image…"
                : "Generating…"
              : includeImage
                ? "Generate posts + image"
                : "Generate posts"}
          </span>
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
