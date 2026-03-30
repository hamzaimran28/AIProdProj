import { useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import {
  setTranscript,
  setExtraInstructions,
} from "@/store/slices/transcriptSlice";
import { IconTranscript } from "@/ui/icons";
import { StepBadge } from "@/ui/StepBadge";

const MIN_LEN = 100;
const MAX_LEN = 120_000;

export function TranscriptInput() {
  const dispatch = useAppDispatch();
  const text = useAppSelector((s) => s.transcript.text);
  const extra = useAppSelector((s) => s.transcript.extraInstructions);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const len = text.length;
  const tooShort = len > 0 && len < MIN_LEN;
  const nearLimit = len > MAX_LEN * 0.9;

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name)) {
      alert("Please choose a .txt or .md file.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        dispatch(setTranscript(result));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <StepBadge>
          <IconTranscript className="panel-step-icon" />
        </StepBadge>
        <div className="panel-head-text">
          <h2>Transcript</h2>
          <p className="hint">
            Paste your transcript or load a .txt / .md file ({MIN_LEN}–
            {MAX_LEN.toLocaleString()} characters).
          </p>
        </div>
      </div>
      <textarea
        className="textarea textarea-field"
        rows={12}
        placeholder="Paste transcript text…"
        value={text}
        onChange={(e) => dispatch(setTranscript(e.target.value))}
        spellCheck
      />
      <div className="row-between">
        <button
          type="button"
          className="btn secondary"
          onClick={() => fileInputRef.current?.click()}
        >
          Load file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,text/plain"
          hidden
          onChange={onFile}
        />
        <span className={nearLimit ? "char warn" : tooShort ? "char err" : "char"}>
          {len.toLocaleString()} / {MAX_LEN.toLocaleString()}
          {tooShort && " — add more characters"}
        </span>
      </div>
      <label className="label-block">
        Extra instructions (optional)
        <input
          className="input"
          type="text"
          maxLength={500}
          placeholder="e.g. Mention the signup link in the CTA"
          value={extra}
          onChange={(e) => dispatch(setExtraInstructions(e.target.value))}
        />
      </label>
    </section>
  );
}
