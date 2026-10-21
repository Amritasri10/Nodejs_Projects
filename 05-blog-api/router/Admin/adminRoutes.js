import { Router } from "express";
import {
  adminGetAllBlogs,
  adminGetBlogComments,
  adminGetAllUsers,
  adminGetUserDetail,
} from "../../controllers/Admin/adminController.js";
import { verifyJWT, adminOnly } from "../../middlewares/authMiddleware.js";

const router = Router();

// All admin routes are protected + admin only
router.use(verifyJWT, adminOnly);

router.get("/blogs",                 adminGetAllBlogs);        // All blogs with stats
router.get("/blogs/:id/comments",    adminGetBlogComments);    // Blog's all comments
router.get("/users",                 adminGetAllUsers);        // All users
router.get("/users/:id",             adminGetUserDetail);      // User detail + activity

export default router;
