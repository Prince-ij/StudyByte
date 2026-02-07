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

// Serve frontend static files (if you build the frontend into api/dist)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "dist")));

// Fallback to index.html for client-side routing (but let API routes pass through)
app.use((req, res, next) => {
  // Only handle GET requests for client-side routes
  if (req.method !== "GET") return next();
  // Let API routes pass through to their handlers
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(__dirname, "dist", "index.html"));
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
