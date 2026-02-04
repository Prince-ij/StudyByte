import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userRouter from "./controllers/users.js";
import middleware from "./utils/middleware.js";
import morgan from "morgan";

const app = express();
app.use(cors());
dotenv.config();


const port = process.env.PORT;
const mongoUrl = process.env.MONGODB_URL;

app.use(express.json());
app.use("/api/users", userRouter);
app.use(morgan("tiny"));

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
