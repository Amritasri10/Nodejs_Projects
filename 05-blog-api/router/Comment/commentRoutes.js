import { Router } from "express";
import { deleteComment } from "../../controllers/Comment/commentController.js";
import { verifyJWT } from "../../middlewares/authMiddleware.js";

const router = Router();

// DELETE /api/comments/:id  – Owner or admin can delete
router.delete("/:id", verifyJWT, deleteComment);

export default router;
