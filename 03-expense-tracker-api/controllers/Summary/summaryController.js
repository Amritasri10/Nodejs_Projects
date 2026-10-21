import Transaction from "../../models/Transaction/Transaction.modal.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asynchandler.js";

// ─────────────────────────────────────────────
// OVERALL SUMMARY  →  GET /api/summary
// Total income, total expense, balance
// ─────────────────────────────────────────────
const getSummary = asyncHandler(async (req, res) => {
  const result = await Transaction.aggregate([
    { $match: { user: req.user._id } },
    {
      $group: {
        _id:     "$type",
        total:   { $sum: "$amount" },
        count:   { $sum: 1 },
      },
    },
  ]);

  let totalIncome  = 0;
  let totalExpense = 0;
  let incomeCount  = 0;
  let expenseCount = 0;

  result.forEach((item) => {
    if (item._id === "income") {
      totalIncome  = item.total;
      incomeCount  = item.count;
    } else if (item._id === "expense") {
      totalExpense = item.total;
      expenseCount = item.count;
    }
  });

  const balance = totalIncome - totalExpense;

  res.status(200).json(
    new apiResponse(200, {
      totalIncome,
      totalExpense,
      balance,
      incomeCount,
      expenseCount,
      totalTransactions: incomeCount + expenseCount,
    }, "Summary fetched successfully")
  );
});

// ─────────────────────────────────────────────
// CATEGORY WISE BREAKDOWN  →  GET /api/summary/category
// Optional: ?type=expense (default: both)
// ─────────────────────────────────────────────
const getCategorySummary = asyncHandler(async (req, res) => {
  const { type } = req.query;

  const match = { user: req.user._id };
  if (type && ["income", "expense"].includes(type)) {
    match.type = type;
  }

  const result = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id:   { category: "$category", type: "$type" },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id:      0,
        category: "$_id.category",
        type:     "$_id.type",
        total:    1,
        count:    1,
      },
    },
    { $sort: { total: -1 } },
  ]);

  res.status(200).json(
    new apiResponse(200, { categories: result }, "Category summary fetched successfully")
  );
});

// ─────────────────────────────────────────────
// MONTHLY SUMMARY  →  GET /api/summary/monthly
// Optional: ?year=2026 (default: current year)
// ─────────────────────────────────────────────
const getMonthlySummary = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();

  const result = await Transaction.aggregate([
    {
      $match: {
        user: req.user._id,
        date: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31T23:59:59`),
        },
      },
    },
    {
      $group: {
        _id:   { month: { $month: "$date" }, type: "$type" },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id:   0,
        month: "$_id.month",
        type:  "$_id.type",
        total: 1,
        count: 1,
      },
    },
    { $sort: { month: 1 } },
  ]);

  // Format into 12 months
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const monthly = months.map((name, i) => {
    const monthNum = i + 1;
    const income  = result.find((r) => r.month === monthNum && r.type === "income");
    const expense = result.find((r) => r.month === monthNum && r.type === "expense");

    return {
      month:        monthNum,
      monthName:    name,
      income:       income?.total  || 0,
      expense:      expense?.total || 0,
      balance:      (income?.total || 0) - (expense?.total || 0),
      incomeCount:  income?.count  || 0,
      expenseCount: expense?.count || 0,
    };
  });

  res.status(200).json(
    new apiResponse(200, { year, monthly }, "Monthly summary fetched successfully")
  );
});

export { getSummary, getCategorySummary, getMonthlySummary };
