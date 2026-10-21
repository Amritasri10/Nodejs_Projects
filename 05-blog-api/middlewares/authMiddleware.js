import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asynchandler.js";
import { apiResponse } from "../utils/apiResponse.js";
import User from "../models/User/User.modal.js";

// ── Verify JWT ─────────────────────────────────
export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token)
      return res.status(401).json(new apiResponse(401, null, "Unauthorized: No token provided"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    if (!user)
      return res.status(401).json(new apiResponse(401, null, "Unauthorized: User not found"));

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json(new apiResponse(401, null, error?.message || "Invalid token"));
  }
});

// ── Admin Only ─────────────────────────────────
export const adminOnly = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.role !== "admin")
    return res.status(403).json(new apiResponse(403, null, "Forbidden: Admins only"));
  next();
});

// ── Optional Auth (attach user if token present, else continue) ──
export const optionalJWT = asyncHandler(async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-password");
      if (user) req.user = user;
    }
  } catch {
    // ignore — optional auth
  }
  next();
});
