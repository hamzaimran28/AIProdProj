import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { GenerateResponse, SharedGeneratedImage } from "@/shared/types/api";

type ThunkState = {
  transcript: {
    text: string;
    extraInstructions: string;
    includeImage: boolean;
    imagePrompt: string;
  };
  platforms: { selectedIds: string[] };
};

export const generatePosts = createAsyncThunk<
  GenerateResponse,
  void,
  { state: ThunkState; rejectValue: string }
>("generation/generatePosts", async (_, { getState, rejectWithValue }) => {
  const { transcript, platforms } = getState() as ThunkState;
  const body = {
    transcript: transcript.text,
    platforms: platforms.selectedIds,
    extraInstructions: transcript.extraInstructions.trim() || undefined,
    ...(transcript.includeImage
      ? {
          includeImage: true as const,
          ...(transcript.imagePrompt.trim()
            ? { imagePrompt: transcript.imagePrompt.trim() }
            : {}),
        }
      : {}),
  };

  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as { error?: string } & Partial<GenerateResponse>;
  if (!res.ok) {
    return rejectWithValue(data.error ?? "Generation failed");
  }

  if (
    !data.posts ||
    typeof data.summary !== "string" ||
    typeof data.summaryModel !== "string" ||
    typeof data.summarized !== "boolean"
  ) {
    return rejectWithValue("Invalid response from server");
  }

  return data as GenerateResponse;
});

type GenerationState = {
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  posts: Record<string, string> | null;
  truncated: boolean;
  transcriptCharsUsed: number | null;
  notice: string | null;
  summary: string | null;
  summaryModel: string | null;
  summarized: boolean;
  sharedImage: SharedGeneratedImage | null;
  imageError: string | null;
};

const initialState: GenerationState = {
  status: "idle",
  error: null,
  posts: null,
  truncated: false,
  transcriptCharsUsed: null,
  notice: null,
  summary: null,
  summaryModel: null,
  summarized: false,
  sharedImage: null,
  imageError: null,
};

export const generationSlice = createSlice({
  name: "generation",
  initialState,
  reducers: {
    updatePostContent(
      state,
      action: PayloadAction<{ platformId: string; text: string }>
    ) {
      if (state.posts) {
        state.posts[action.payload.platformId] = action.payload.text;
      }
    },
    clearGeneration() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generatePosts.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.posts = null;
        state.summary = null;
        state.summaryModel = null;
        state.summarized = false;
        state.sharedImage = null;
        state.imageError = null;
      })
      .addCase(generatePosts.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.posts = action.payload.posts;
        state.truncated = action.payload.truncated;
        state.transcriptCharsUsed = action.payload.transcriptCharsUsed;
        state.notice = action.payload.notice ?? null;
        state.summary = action.payload.summary;
        state.summaryModel = action.payload.summaryModel;
        state.summarized = action.payload.summarized;
        state.sharedImage = action.payload.sharedImage ?? null;
        state.imageError = action.payload.imageError ?? null;
      })
      .addCase(generatePosts.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          action.payload ??
          (action.error.message ? String(action.error.message) : "Failed");
      });
  },
});

export const { updatePostContent, clearGeneration } = generationSlice.actions;
