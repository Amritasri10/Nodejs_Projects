import { Router } from "express";
import {
  createBlog, getAllBlogs, getBlogBySlug,
  updateBlog, deleteBlog, toggleLike, getBlogLikes,
} from "../../controllers/Blog/blogController.js";
import { addComment, getComments } from "../../controllers/Comment/commentController.js";
import { verifyJWT, adminOnly, optionalJWT } from "../../middlewares/authMiddleware.js";
import upload from "../../config/multerConfig.js";

const router = Router();

// ── Public ──────────────────────────────────
router.get("/",      getAllBlogs);
router.get("/:slug", optionalJWT, getBlogBySlug);       // view tracking with optional auth

// ── User (authenticated) ─────────────────────
router.post("/:id/like",           verifyJWT, toggleLike);
router.get("/:id/likes",           getBlogLikes);
router.post("/:id/comments",       verifyJWT, addComment);
router.get("/:id/comments",        getComments);

// ── Admin only ───────────────────────────────
router.post("/",    verifyJWT, adminOnly, upload.single("image"), createBlog);
router.put("/:id",  verifyJWT, adminOnly, upload.single("image"), updateBlog);
router.delete("/:id", verifyJWT, adminOnly, deleteBlog);

export default router;
