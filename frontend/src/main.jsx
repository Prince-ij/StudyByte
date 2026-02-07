import { StrictMode } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import notificationReducer from "./reducers/notificationReducer.js";
import userReducer from "./reducers/userReducer.js";
import App from "./App.jsx";
import services from "./services";

const queryClient = new QueryClient();

const store = configureStore({
  reducer: {
    user: userReducer,
    notification: notificationReducer,
  },
});

// Ensure services has the JWT from localStorage on startup so API calls include Authorization
const existingToken = localStorage.getItem("token");
if (existingToken) {
  // token may already be stored as the raw token string
  services.setToken(existingToken);
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Router>
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <App />
        </Provider>
      </QueryClientProvider>
    </Router>
  </StrictMode>
);
