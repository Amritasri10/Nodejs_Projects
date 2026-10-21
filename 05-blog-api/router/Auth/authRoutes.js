import { Router } from "express";
import { register, login, getProfile } from "../../controllers/Auth/authController.js";
import { verifyJWT } from "../../middlewares/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login",    login);
router.get("/profile",   verifyJWT, getProfile);

export default router;
