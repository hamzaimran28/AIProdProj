import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const MAX_CHARS = 120_000;

type TranscriptState = {
  text: string;
  extraInstructions: string;
};

const initialState: TranscriptState = {
  text: "",
  extraInstructions: "",
};

export const transcriptSlice = createSlice({
  name: "transcript",
  initialState,
  reducers: {
    setTranscript(state, action: PayloadAction<string>) {
      state.text = action.payload.slice(0, MAX_CHARS);
    },
    setExtraInstructions(state, action: PayloadAction<string>) {
      state.extraInstructions = action.payload.slice(0, 500);
    },
    resetTranscript() {
      return initialState;
    },
  },
});

export const { setTranscript, setExtraInstructions, resetTranscript } =
  transcriptSlice.actions;
