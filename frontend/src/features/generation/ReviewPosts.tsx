import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { updatePostContent } from "@/store/slices/generationSlice";
import { PLATFORM_OPTIONS } from "@/shared/constants/platforms";
import { IconReview } from "@/ui/icons";
import { StepBadge } from "@/ui/StepBadge";
import { useCopyFlash } from "@/ui/useCopyFlash";

function labelFor(id: string): string {
  return PLATFORM_OPTIONS.find((p) => p.id === id)?.label ?? id;
}

export function ReviewPosts() {
  const dispatch = useAppDispatch();
  const generation = useAppSelector((s) => s.generation);
  const { activeKey, flash } = useCopyFlash();
  const [bulkFlash, setBulkFlash] = useState<"copy" | "export" | null>(null);

  const ready = generation.status === "succeeded" && generation.posts;
  const { posts, truncated, notice, transcriptCharsUsed } = generation;

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
              <p className="review-placeholder-text">Generating drafts…</p>
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
