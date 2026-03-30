import { configureStore } from "@reduxjs/toolkit";
import { transcriptSlice } from "@/store/slices/transcriptSlice";
import { platformSlice } from "@/store/slices/platformSlice";
import { generationSlice } from "@/store/slices/generationSlice";

export const store = configureStore({
  reducer: {
    transcript: transcriptSlice.reducer,
    platforms: platformSlice.reducer,
    generation: generationSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
