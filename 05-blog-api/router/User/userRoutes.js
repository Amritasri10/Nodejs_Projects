import { Router } from "express";
import {
  getUserLikedBlogs,
  getUserComments,
  getUserViewedBlogs,
} from "../../controllers/User/userController.js";
import { verifyJWT } from "../../middlewares/authMiddleware.js";

const router = Router();

// GET /api/users/:id/liked-blogs   – Blogs liked by user
router.get("/:id/liked-blogs",  verifyJWT, getUserLikedBlogs);

// GET /api/users/:id/comments      – Comments made by user
router.get("/:id/comments",     verifyJWT, getUserComments);

// GET /api/users/:id/viewed-blogs  – Blogs viewed by user
router.get("/:id/viewed-blogs", verifyJWT, getUserViewedBlogs);

export default router;
