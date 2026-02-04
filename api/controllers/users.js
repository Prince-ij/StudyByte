import express, { request } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userRouter = express.Router();
import User from "../models/Users.js";

userRouter.get("/", async (request, response) => {
  const users = await User.find({});
  response.json({ users: users });
});

userRouter.post("/", async (request, response) => {
  const { username, email, password } = request.body;

  if (password.length < 3) {
    return response
      .status(400)
      .json({ error: "password length must be greater than 3" });
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const user = new User({
    username,
    email,
    passwordHash,
  });

  const savedUser = await user.save();

  response.status(201).json(savedUser);
});

userRouter.post("/login", async (request, response) => {
  const { email, password } = request.body;

  const user = await User.findOne({ email });
  const passwordCorrect =
    user === null ? false : await bcrypt.compare(password, user.passwordHash);
  if (!(user && passwordCorrect)) {
    return response.status(404).json({ error: "invalid credentials" });
  }

  const userForToken = {
    username: user.username,
    id: user._id,
  };

  const token = jwt.sign(userForToken, process.env.SECRET);
  response.status(200).json({
    token,
    username: user.username,
  });
});

export default userRouter;
