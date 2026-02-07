import axios from "axios";

// Default API base (can be overridden with VITE_API_URL or at runtime)
const defaultBase = "/";
const api = axios.create({ baseURL: defaultBase });

const courseBaseUrl = "api/courses";
const loginBaseUrl = "api/users/login";
const usersBaseUrl = "api/users";

let token = null;

const setToken = (newToken) => {
  token = `Bearer ${newToken}`;
  api.defaults.headers.common["Authorization"] = token;
};

// allow switching backend at runtime (useful for deploying)
const setBaseUrl = (url) => {
  api.defaults.baseURL = url;
};

const login = async (credentials) => {
  const response = await api.post(loginBaseUrl, credentials);
  return response.data;
};

const createUser = async (userData) => {
  const response = await api.post(usersBaseUrl, userData);
  return response.data;
};

const uploadPdf = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(`${courseBaseUrl}/upload-pdf`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

const getMyCourses = async () => {
  const response = await api.get(`${courseBaseUrl}/my-courses`);
  return response.data;
};

const getCourseChapters = async (courseId) => {
  const response = await api.get(`${courseBaseUrl}/${courseId}/chapters`);
  return response.data;
};

const submitChapterQuiz = async (chapterId, answers) => {
  const response = await api.post(
    `${courseBaseUrl}/chapters/${chapterId}/quiz/submit`,
    { answers }
  );
  return response.data;
};

const getFinalExam = async (courseId) => {
  const response = await api.get(`${courseBaseUrl}/${courseId}/exam`);
  return response.data;
};

const submitFinalExam = async (courseId, answers) => {
  const response = await api.post(`${courseBaseUrl}/${courseId}/exam/submit`, {
    answers,
  });
  return response.data;
};

export default {
  setToken,
  setBaseUrl,
  login,
  createUser,
  uploadPdf,
  getMyCourses,
  getCourseChapters,
  submitChapterQuiz,
  getFinalExam,
  submitFinalExam,
};
