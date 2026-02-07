import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userRouter from "./controllers/users.js";
import courseRouter from "./controllers/courses.js";
import middleware from "./utils/middleware.js";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
dotenv.config();

const port = process.env.PORT;
const mongoUrl = process.env.MONGODB_URL;

app.use(express.json());
app.use("/api/users", userRouter);
app.use(
  "/api/courses",
  middleware.tokenExtractor,
  middleware.userExtractor,
  courseRouter
);
app.use(morgan("tiny"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Serve built frontend from ../frontend/dist so asset requests resolve correctly
app.use(express.static(path.join(__dirname, "..", "frontend", "dist")));

app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(__dirname, "..", "frontend", "dist", "index.html"));
});

try {
  mongoose.connect(mongoUrl);
  console.log("Connected to DB");
} catch {
  console.log("Error connecting to DB");
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);
