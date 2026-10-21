import { Router } from "express";
import { register, login, getProfile } from "../../controllers/Auth/authController.js";
import { verifyJWT } from "../../middlewares/authMiddleware.js";

const router = Router();

// POST /api/auth/register  – Register new user
router.post("/register", register);

// POST /api/auth/login     – Login user
router.post("/login", login);

// GET  /api/auth/profile   – Get logged-in user profile (protected)
router.get("/profile", verifyJWT, getProfile);

export default router;
