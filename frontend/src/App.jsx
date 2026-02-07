import { Routes, Route, Navigate } from "react-router-dom";
import SignUp from "./components/Authentication/SignUp";
import SignIn from "./components/Authentication/SignIn";
import Dashboard from "./components/Dashboard/index";
import CoursePage from "./components/Dashboard/CoursePage";
import QuizPage from "./components/Dashboard/QuizPage";
import Notification from "./components/Notification";
import { useState } from "react";

const App = () => {
  const [isLoggedIn] = useState(() => !!localStorage.getItem("token"));

  return (
    <>
      <Notification />
      <Routes>
        {!isLoggedIn ? (
          <>
            <Route path="/signup" element={<SignUp />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/" element={<Navigate to="/signup" replace />} />
          </>
        ) : (
          <>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/course/:id" element={<CoursePage />} />
            <Route
              path="/course/:courseId/chapter/:chapterId/quiz"
              element={<QuizPage />}
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </>
        )}
      </Routes>
    </>
  );
};

export default App;
