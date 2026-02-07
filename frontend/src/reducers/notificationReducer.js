import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  type: "",
  message: "",
};

const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {
    notify: (state, action) => {
      state.type = action.payload.type;
      state.message = action.payload.message;
      return state;
    },
  },
});

export const { notify } = notificationSlice.actions;
export default notificationSlice.reducer;
