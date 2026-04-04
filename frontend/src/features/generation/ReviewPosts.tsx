import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { updatePostContent } from "@/store/slices/generationSlice";
import { PLATFORM_OPTIONS } from "@/shared/constants/platforms";
import { IconReview, IconTranscript } from "@/ui/icons";
import { StepBadge } from "@/ui/StepBadge";
import { useCopyFlash } from "@/ui/useCopyFlash";

function labelFor(id: string): string {
  return PLATFORM_OPTIONS.find((p) => p.id === id)?.label ?? id;
}

export function ReviewPosts() {
  const dispatch = useAppDispatch();
  const generation = useAppSelector((s) => s.generation);
  const wantedImage = useAppSelector((s) => s.transcript.includeImage);
  const { activeKey, flash } = useCopyFlash();
  const [bulkFlash, setBulkFlash] = useState<"copy" | "export" | "img" | null>(
    null,
  );

  const ready = generation.status === "succeeded" && generation.posts;
  const {
    posts,
    truncated,
    notice,
    transcriptCharsUsed,
    sharedImage,
    imageError,
    summary,
    summarized,
  } = generation;

  function copyAll() {
    if (!posts) return;
    const blocks = Object.entries(posts)
      .map(([id, body]) => `--- ${labelFor(id)} ---\n\n${body}`)
      .join("\n\n");
    void navigator.clipboard.writeText(blocks).then(() => {
      setBulkFlash("copy");
      window.setTimeout(() => setBulkFlash(null), 1800);
    });
  }

  function downloadSharedImage() {
    if (!sharedImage) return;
    const bin = atob(sharedImage.base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      bytes[i] = bin.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: sharedImage.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ext = sharedImage.mimeType.includes("png")
      ? "png"
      : sharedImage.mimeType.includes("jpeg")
        ? "jpg"
        : "img";
    a.download = `shared-post-image.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    setBulkFlash("img");
    window.setTimeout(() => setBulkFlash(null), 1800);
  }

  function exportFile() {
    if (!posts) return;
    const blocks = Object.entries(posts)
      .map(([id, body]) => `--- ${labelFor(id)} ---\n\n${body}`)
      .join("\n\n");
    const blob = new Blob([blocks], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "posts-export.txt";
    a.click();
    URL.revokeObjectURL(url);
    setBulkFlash("export");
    window.setTimeout(() => setBulkFlash(null), 1800);
  }

  function copyOne(platformId: string, body: string) {
    void navigator.clipboard.writeText(body).then(() => flash(platformId));
  }

  function copySummary() {
    if (!summary) return;
    void navigator.clipboard.writeText(summary).then(() => flash("__summary"));
  }

  return (
    <section
      className="panel panel-review"
      aria-busy={generation.status === "loading"}
    >
      <div className="panel-head">
        <StepBadge>
          <IconReview className="panel-step-icon" />
        </StepBadge>
        <div className="panel-head-text">
          <h2>Review &amp; export</h2>
          <p className="hint">
            Edit drafts, then copy or download as a single file.
          </p>
        </div>
      </div>

      {!ready && (
        <div className="review-placeholder" role="status">
          {generation.status === "loading" && (
            <>
              <div className="review-skeleton" aria-hidden="true">
                <div className="review-skeleton-line" />
                <div className="review-skeleton-line review-skeleton-line--short" />
                <div className="review-skeleton-line review-skeleton-line--mid" />
              </div>
              <p className="review-placeholder-text">
                {wantedImage ? "Generating drafts and image…" : "Generating drafts…"}
              </p>
            </>
          )}
          {generation.status === "idle" && (
            <p className="review-placeholder-text">
              Your platform drafts will appear here after you generate.
            </p>
          )}
          {generation.status === "failed" && (
            <p className="review-placeholder-text review-placeholder-text--warn">
              {generation.error ??
                "Generation did not finish. Fix any issues above and try again."}
            </p>
          )}
        </div>
      )}

      {ready && posts && (
        <>
          {(truncated || notice) && (
            <div className="banner">
              {notice}
              {truncated && !notice && "Transcript was truncated on the server."}
            </div>
          )}
          {summary && (
            <section
              className="summary-card"
              aria-labelledby="transcript-summary-heading"
            >
              <div className="summary-card-head">
                <div className="summary-card-icon" aria-hidden>
                  <IconTranscript className="summary-card-icon-svg" />
                </div>
                <div className="summary-card-head-text">
                  <h3
                    id="transcript-summary-heading"
                    className="summary-card-title"
                  >
                    {summarized ? "Transcript summary" : "Source transcript"}
                  </h3>
                  <p className="summary-card-sub">
                    {summarized
                      ? "Condensed, then sent to Groq"
                      : "Full transcript sent to Groq (below summarization length threshold)"}
                  </p>
                </div>
                <div className="summary-card-actions">
                  <span className="summary-pill">
                    {summarized ? "Summarized" : "Original transcript"}
                  </span>
                  <button
                    type="button"
                    className="btn small"
                    onClick={copySummary}
                  >
                    {activeKey === "__summary" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <div className="summary-card-body">
                <p className="summary-card-text">{summary}</p>
              </div>
            </section>
          )}
          {transcriptCharsUsed != null && (
            <p className="hint">
              Transcript characters used: {transcriptCharsUsed.toLocaleString()}
            </p>
          )}
          <div className="row-between actions-top">
            <button type="button" className="btn secondary" onClick={copyAll}>
              {bulkFlash === "copy" ? "Copied" : "Copy all"}
            </button>
            <button type="button" className="btn secondary" onClick={exportFile}>
              {bulkFlash === "export" ? "Downloaded" : "Export .txt"}
            </button>
          </div>
          {(sharedImage || imageError) && (
            <div className="shared-image-card">
              <div className="shared-image-card-head">
                <h3 className="shared-image-card-title">Shared image</h3>
                {sharedImage && (
                  <button
                    type="button"
                    className="btn small"
                    onClick={downloadSharedImage}
                  >
                    {bulkFlash === "img" ? "Saved" : "Download image"}
                  </button>
                )}
              </div>
              <p className="hint shared-image-card-lead">
                Same asset for every platform below—attach it when you publish
                each post.
              </p>
              {imageError && (
                <p className="review-placeholder-text review-placeholder-text--warn shared-image-error">
                  {imageError}
                </p>
              )}
              {sharedImage && (
                <>
                  <figure className="shared-image-preview">
                    <img
                      src={`data:${sharedImage.mimeType};base64,${sharedImage.base64}`}
                      alt="Generated illustration for your posts"
                      loading="lazy"
                    />
                  </figure>
                  <p className="hint shared-image-prompt-used">
                    <span className="shared-image-prompt-label">Prompt used:</span>{" "}
                    {sharedImage.promptUsed}
                  </p>
                </>
              )}
            </div>
          )}
          {Object.entries(posts).map(([platformId, body]) => (
            <div
              key={platformId}
              className="post-card"
              data-platform={platformId}
            >
              <div className="post-card-head">
                <h3 className="post-card-title">{labelFor(platformId)}</h3>
                <button
                  type="button"
                  className="btn small"
                  onClick={() => copyOne(platformId, body)}
                >
                  {activeKey === platformId ? "Copied" : "Copy"}
                </button>
              </div>
              <textarea
                className="textarea textarea-field"
                rows={Math.min(20, Math.max(8, body.split("\n").length + 2))}
                value={body}
                onChange={(e) =>
                  dispatch(
                    updatePostContent({
                      platformId,
                      text: e.target.value,
                    })
                  )
                }
                spellCheck
              />
            </div>
          ))}
          <p className="disclaimer">
            Double-check facts and tone. Models can misread or omit details from the
            transcript.
          </p>
        </>
      )}
    </section>
  );
}
