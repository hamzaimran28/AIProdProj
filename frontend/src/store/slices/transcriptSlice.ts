import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const MAX_CHARS = 120_000;

const MAX_IMAGE_PROMPT = 2000;

type TranscriptState = {
  text: string;
  extraInstructions: string;
  /** One generated image is returned for the whole batch and can accompany every post. */
  includeImage: boolean;
  imagePrompt: string;
};

const initialState: TranscriptState = {
  text: "",
  extraInstructions: "",
  includeImage: false,
  imagePrompt: "",
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
    setIncludeImage(state, action: PayloadAction<boolean>) {
      state.includeImage = action.payload;
    },
    setImagePrompt(state, action: PayloadAction<string>) {
      state.imagePrompt = action.payload.slice(0, MAX_IMAGE_PROMPT);
    },
    resetTranscript() {
      return initialState;
    },
  },
});

export const {
  setTranscript,
  setExtraInstructions,
  setIncludeImage,
  setImagePrompt,
  resetTranscript,
} = transcriptSlice.actions;
