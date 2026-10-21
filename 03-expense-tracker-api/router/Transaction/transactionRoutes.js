import { Router } from "express";
import {
  createTransaction,
  getAllTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} from "../../controllers/Transaction/transactionController.js";
import { verifyJWT } from "../../middlewares/authMiddleware.js";

const router = Router();

// All transaction routes are protected
router.use(verifyJWT);

// POST   /api/transactions      – Create a transaction
router.post("/", createTransaction);

// GET    /api/transactions      – Get all transactions (filter, search, pagination)
router.get("/", getAllTransactions);

// GET    /api/transactions/:id  – Get single transaction
router.get("/:id", getTransactionById);

// PUT    /api/transactions/:id  – Update transaction
router.put("/:id", updateTransaction);

// DELETE /api/transactions/:id  – Delete transaction
router.delete("/:id", deleteTransaction);

export default router;
