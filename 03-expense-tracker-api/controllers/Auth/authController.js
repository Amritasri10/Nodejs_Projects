import jwt from "jsonwebtoken";
import User from "../../models/User/User.modal.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asynchandler.js";

// ─────────────────────────────────────────────
// Generate JWT Token
// ─────────────────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// ─────────────────────────────────────────────
// REGISTER  →  POST /api/auth/register
// ─────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !name.trim())
    return res.status(400).json(new apiResponse(400, null, "Name is required"));
  if (!email || !email.trim())
    return res.status(400).json(new apiResponse(400, null, "Email is required"));
  if (!password)
    return res.status(400).json(new apiResponse(400, null, "Password is required"));
  if (password.length < 6)
    return res.status(400).json(new apiResponse(400, null, "Password must be at least 6 characters"));

  const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
  if (existingUser)
    return res.status(409).json(new apiResponse(409, null, "User with this email already exists"));

  const user = await User.create({
    name:     name.trim(),
    email:    email.trim().toLowerCase(),
    password,
  });

  const token = generateToken(user._id);

  res.status(201).json(
    new apiResponse(201, {
      user: { _id: user._id, name: user.name, email: user.email, token, createdAt: user.createdAt },
    }, "User registered successfully")
  );
});

// ─────────────────────────────────────────────
// LOGIN  →  POST /api/auth/login
// ─────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !email.trim())
    return res.status(400).json(new apiResponse(400, null, "Email is required"));
  if (!password)
    return res.status(400).json(new apiResponse(400, null, "Password is required"));

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user)
    return res.status(401).json(new apiResponse(401, null, "Invalid email or password"));

  const isMatch = await user.matchPassword(password);
  if (!isMatch)
    return res.status(401).json(new apiResponse(401, null, "Invalid email or password"));

  const token = generateToken(user._id);

  res.status(200).json(
    new apiResponse(200, {
      user: { _id: user._id, name: user.name, email: user.email, token },
    }, "Login successful")
  );
});

// ─────────────────────────────────────────────
// GET PROFILE  →  GET /api/auth/profile
// ─────────────────────────────────────────────
const getProfile = asyncHandler(async (req, res) => {
  res.status(200).json(
    new apiResponse(200, { user: req.user }, "Profile fetched successfully")
  );
});

export { register, login, getProfile };
