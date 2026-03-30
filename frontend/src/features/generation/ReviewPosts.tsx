import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { updatePostContent } from "@/store/slices/generationSlice";
import { PLATFORM_OPTIONS } from "@/shared/constants/platforms";

function labelFor(id: string): string {
  return PLATFORM_OPTIONS.find((p) => p.id === id)?.label ?? id;
}

export function ReviewPosts() {
  const dispatch = useAppDispatch();
  const generation = useAppSelector((s) => s.generation);

  if (generation.status !== "succeeded" || !generation.posts) {
    return null;
  }

  const { posts, truncated, notice, transcriptCharsUsed } = generation;

  function copyAll() {
    const blocks = Object.entries(posts)
      .map(([id, body]) => `--- ${labelFor(id)} ---\n\n${body}`)
      .join("\n\n");
    void navigator.clipboard.writeText(blocks);
  }

  function exportFile() {
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
  }

  return (
    <section className="panel">
      <h2>4. Review & export</h2>
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
          Copy all
        </button>
        <button type="button" className="btn secondary" onClick={exportFile}>
          Export .txt
        </button>
      </div>
      {Object.entries(posts).map(([platformId, body]) => (
        <div key={platformId} className="post-block">
          <div className="row-between">
            <h3>{labelFor(platformId)}</h3>
            <button
              type="button"
              className="btn small"
              onClick={() =>
                void navigator.clipboard.writeText(body)
              }
            >
              Copy
            </button>
          </div>
          <textarea
            className="textarea"
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
        Review for accuracy. AI may misinterpret or omit details from the transcript.
      </p>
    </section>
  );
}
