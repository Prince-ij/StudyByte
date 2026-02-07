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
import fs from "fs";

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

// Try several candidate locations for the built frontend and pick the first that exists.
const candidateDirs = [
  path.join(__dirname, "..", "frontend", "dist"),
  path.join(__dirname, "dist"),
  path.join(__dirname, "..", "dist"),
];
let buildDir = candidateDirs.find((d) => fs.existsSync(d));
if (!buildDir) {
  console.warn(
    "Frontend build not found in expected locations:",
    candidateDirs
  );
  // fallback to the most likely location (keeps previous behavior)
  buildDir = path.join(__dirname, "..", "frontend", "dist");
}

app.use(express.static(buildDir));

const indexHtmlPath = path.join(buildDir, "index.html");
if (fs.existsSync(indexHtmlPath)) {
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.path.startsWith("/api")) return next();
    res.sendFile(indexHtmlPath);
  });
} else {
  // If index.html is missing, return a friendly 404 instead of throwing ENOENT
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    if (req.path.startsWith("/api")) return next();
    res
      .status(404)
      .send(
        "Frontend build not found on server. Make sure you ran the frontend build and the files are deployed."
      );
  });
}

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
