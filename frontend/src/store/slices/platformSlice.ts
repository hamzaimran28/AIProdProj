import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type PlatformState = {
  selectedIds: string[];
};

const initialState: PlatformState = {
  selectedIds: ["linkedin", "twitter"],
};

export const platformSlice = createSlice({
  name: "platforms",
  initialState,
  reducers: {
    togglePlatform(state, action: PayloadAction<string>) {
      const id = action.payload;
      const set = new Set(state.selectedIds);
      if (set.has(id)) {
        set.delete(id);
      } else if (set.size < 4) {
        set.add(id);
      }
      state.selectedIds = Array.from(set);
    },
  },
});

export const { togglePlatform } = platformSlice.actions;
