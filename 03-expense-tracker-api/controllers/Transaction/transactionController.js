import Transaction from "../../models/Transaction/Transaction.modal.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asynchandler.js";
import mongoose from "mongoose";

// ─────────────────────────────────────────────
// CREATE Transaction  →  POST /api/transactions
// ─────────────────────────────────────────────
const createTransaction = asyncHandler(async (req, res) => {
  const { type, amount, category, description, date } = req.body;

  if (!type || !["income", "expense"].includes(type))
    return res.status(400).json(new apiResponse(400, null, "Invalid type. Allowed: income, expense"));
  if (!amount || isNaN(amount) || Number(amount) <= 0)
    return res.status(400).json(new apiResponse(400, null, "Amount must be a positive number"));
  if (!category || !category.trim())
    return res.status(400).json(new apiResponse(400, null, "Category is required"));

  const transaction = await Transaction.create({
    user:        req.user._id,
    type,
    amount:      Number(amount),
    category:    category.trim(),
    description: description?.trim() || "",
    date:        date ? new Date(date) : new Date(),
  });

  res.status(201).json(new apiResponse(201, transaction, "Transaction created successfully"));
});

// ─────────────────────────────────────────────
// GET ALL Transactions  →  GET /api/transactions
// Query params:
//   type         – income | expense
//   category     – filter by category
//   search       – search by description or category
//   fromDate     – date >= fromDate (YYYY-MM-DD)
//   toDate       – date <= toDate   (YYYY-MM-DD)
//   page         – default: 1
//   limit        – default: 10
//   sortBy       – recent | oldest (default: recent)
//   isPagination – true | false (default: true)
// ─────────────────────────────────────────────
const getAllTransactions = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    type,
    category,
    search,
    fromDate,
    toDate,
    sortBy = "recent",
    isPagination = "true",
  } = req.query;

  const match = { user: req.user._id };

  // Type filter
  if (type) {
    if (!["income", "expense"].includes(type))
      return res.status(400).json(new apiResponse(400, null, "Invalid type. Allowed: income, expense"));
    match.type = type;
  }

  // Category filter
  if (category) {
    match.category = { $regex: new RegExp(category.trim(), "i") };
  }

  // Search by description or category
  if (search) {
    match.$or = [
      { description: { $regex: new RegExp(search.trim(), "i") } },
      { category:    { $regex: new RegExp(search.trim(), "i") } },
    ];
  }

  // Date range filter
  if (fromDate || toDate) {
    match.date = {};
    if (fromDate) {
      const from = new Date(fromDate);
      if (isNaN(from.getTime()))
        return res.status(400).json(new apiResponse(400, null, "Invalid fromDate. Use YYYY-MM-DD"));
      from.setHours(0, 0, 0, 0);
      match.date.$gte = from;
    }
    if (toDate) {
      const to = new Date(toDate);
      if (isNaN(to.getTime()))
        return res.status(400).json(new apiResponse(400, null, "Invalid toDate. Use YYYY-MM-DD"));
      to.setHours(23, 59, 59, 999);
      match.date.$lte = to;
    }
  }

  let pipeline = [{ $match: match }];

  // Sort
  pipeline.push({ $sort: { date: sortBy === "oldest" ? 1 : -1 } });

  // Total count
  const totalArr = await Transaction.aggregate([...pipeline, { $count: "count" }]);
  const totalTransactions = totalArr[0]?.count || 0;
  const totalPages = Math.ceil(totalTransactions / Number(limit));

  // Pagination
  if (isPagination === "true") {
    pipeline.push(
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) }
    );
  }

  const transactions = await Transaction.aggregate(pipeline);

  res.status(200).json(
    new apiResponse(200, {
      transactions,
      totalTransactions,
      totalPages,
      currentPage: Number(page),
      limit: Number(limit),
    }, "Transactions fetched successfully")
  );
});

// ─────────────────────────────────────────────
// GET SINGLE Transaction  →  GET /api/transactions/:id
// ─────────────────────────────────────────────
const getTransactionById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json(new apiResponse(400, null, "Invalid Transaction ID"));

  const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
  if (!transaction)
    return res.status(404).json(new apiResponse(404, null, "Transaction not found"));

  res.status(200).json(new apiResponse(200, transaction, "Transaction fetched successfully"));
});

// ─────────────────────────────────────────────
// UPDATE Transaction  →  PUT /api/transactions/:id
// ─────────────────────────────────────────────
const updateTransaction = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json(new apiResponse(400, null, "Invalid Transaction ID"));

  if (req.body.type && !["income", "expense"].includes(req.body.type))
    return res.status(400).json(new apiResponse(400, null, "Invalid type. Allowed: income, expense"));

  if (req.body.amount && (isNaN(req.body.amount) || Number(req.body.amount) <= 0))
    return res.status(400).json(new apiResponse(400, null, "Amount must be a positive number"));

  const updated = await Transaction.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!updated)
    return res.status(404).json(new apiResponse(404, null, "Transaction not found"));

  res.status(200).json(new apiResponse(200, updated, "Transaction updated successfully"));
});

// ─────────────────────────────────────────────
// DELETE Transaction  →  DELETE /api/transactions/:id
// ─────────────────────────────────────────────
const deleteTransaction = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json(new apiResponse(400, null, "Invalid Transaction ID"));

  const deleted = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!deleted)
    return res.status(404).json(new apiResponse(404, null, "Transaction not found"));

  res.status(200).json(new apiResponse(200, deleted, "Transaction deleted successfully"));
});

export { createTransaction, getAllTransactions, getTransactionById, updateTransaction, deleteTransaction };
