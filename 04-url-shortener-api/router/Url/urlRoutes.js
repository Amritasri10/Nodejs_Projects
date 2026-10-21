import { Router } from "express";
import {
  createShortUrl,
  getAllUrls,
  getUrlById,
  updateUrl,
  deleteUrl,
  getAnalytics,
} from "../../controllers/Url/urlController.js";

const router = Router();

// POST   /api/urls            – Create short URL
router.post("/", createShortUrl);

// GET    /api/urls            – Get all URLs (search, filter, pagination)
router.get("/", getAllUrls);

// GET    /api/urls/:id        – Get single URL by ID
router.get("/:id", getUrlById);

// GET    /api/urls/:id/analytics – Click analytics
router.get("/:id/analytics", getAnalytics);

// PUT    /api/urls/:id        – Update URL
router.put("/:id", updateUrl);

// DELETE /api/urls/:id        – Delete URL
router.delete("/:id", deleteUrl);

export default router;
