import { Router } from "express";
import {
  getSummary,
  getCategorySummary,
  getMonthlySummary,
} from "../../controllers/Summary/summaryController.js";
import { verifyJWT } from "../../middlewares/authMiddleware.js";

const router = Router();

// All summary routes are protected
router.use(verifyJWT);

// GET /api/summary            – Overall income, expense, balance
router.get("/", getSummary);

// GET /api/summary/category   – Category wise breakdown
router.get("/category", getCategorySummary);

// GET /api/summary/monthly    – Month wise summary (year filter)
router.get("/monthly", getMonthlySummary);

export default router;
