import Task from "../../models/Task/Task.modal.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asynchandler.js";
import mongoose from "mongoose";

// ─────────────────────────────────────────────
// HELPER – generate next taskCode (T-1, T-2 …)
// Finds the highest existing number and increments it
// ─────────────────────────────────────────────
const generateTaskCode = async () => {
  const last = await Task.findOne({ taskCode: { $regex: /^T-\d+$/ } })
    .sort({ createdAt: -1 })
    .select("taskCode");

  if (!last || !last.taskCode) return "T-1";

  const num = parseInt(last.taskCode.split("-")[1], 10);
  return `T-${num + 1}`;
};

// ─────────────────────────────────────────────
// CREATE Task  →  POST /api/tasks
// ─────────────────────────────────────────────
const createTask = asyncHandler(async (req, res) => {
  const { title, description, category, status, priority, dueDate } = req.body;

  // Validation – title is required
  if (!title || !title.trim()) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Task title is required"));
  }

  // Duplicate check – same title already exists
  const existingTask = await Task.findOne({
    title: { $regex: new RegExp(`^${title.trim()}$`, "i") },
  });
  if (existingTask) {
    return res
      .status(409)
      .json(new apiResponse(409, null, `Task with title "${title.trim()}" already exists`));
  }

  // Auto-generate taskCode
  const taskCode = await generateTaskCode();

  const task = await Task.create({
    taskCode,
    title:       title.trim(),
    description: description?.trim() || "",
    category:    category?.trim()    || "general",
    status:      status              || "pending",
    priority:    priority            || "medium",
    dueDate:     dueDate             || null,
  });

  res
    .status(201)
    .json(new apiResponse(201, task, "Task created successfully"));
});

// ─────────────────────────────────────────────
// GET ALL Tasks  →  GET /api/tasks
// Query params:
//   search       – search by title (case-insensitive)
//   category     – filter by category
//   status       – filter by status (pending | in-progress | completed)
//   priority     – filter by priority (low | medium | high)
//   fromDate     – filter dueDate >= fromDate (YYYY-MM-DD)
//   toDate       – filter dueDate <= toDate   (YYYY-MM-DD)
//   page         – page number (default: 1)
//   limit        – items per page (default: 10)
//   sortBy       – recent | oldest (default: recent)
//   isPagination – true | false (default: true)
// ─────────────────────────────────────────────
const getAllTasks = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    category,
    status,
    priority,
    sortBy = "recent",
    isPagination = "true",
    fromDate,
    toDate,
  } = req.query;

  // ── Build match filter ──────────────────────
  const match = {};

  // Search by title OR taskCode
  if (search) {
    match.$or = [
      { title:    { $regex: new RegExp(search.trim(), "i") } },
      { taskCode: { $regex: new RegExp(search.trim(), "i") } },
    ];
  }

  // Category filter
  if (category) {
    match.category = { $regex: new RegExp(category.trim(), "i") };
  }

  // Status filter – validate allowed values
  const allowedStatuses = ["pending", "in-progress", "completed"];
  if (status) {
    if (!allowedStatuses.includes(status)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid status. Allowed: pending, in-progress, completed"));
    }
    match.status = status;
  }

  // Priority filter – validate allowed values
  const allowedPriorities = ["low", "medium", "high"];
  if (priority) {
    if (!allowedPriorities.includes(priority)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid priority. Allowed: low, medium, high"));
    }
    match.priority = priority;
  }

  // fromDate / toDate filter – filter on dueDate
  if (fromDate || toDate) {
    match.dueDate = {};
    if (fromDate) {
      const from = new Date(fromDate);
      if (isNaN(from.getTime())) {
        return res
          .status(400)
          .json(new apiResponse(400, null, "Invalid fromDate format. Use YYYY-MM-DD"));
      }
      from.setHours(0, 0, 0, 0);
      match.dueDate.$gte = from;
    }
    if (toDate) {
      const to = new Date(toDate);
      if (isNaN(to.getTime())) {
        return res
          .status(400)
          .json(new apiResponse(400, null, "Invalid toDate format. Use YYYY-MM-DD"));
      }
      to.setHours(23, 59, 59, 999);
      match.dueDate.$lte = to;
    }
  }

  // ── Build aggregation pipeline ──────────────
  let pipeline = [{ $match: match }];

  // Sort
  if (sortBy === "oldest") {
    pipeline.push({ $sort: { createdAt: 1 } });
  } else {
    pipeline.push({ $sort: { createdAt: -1 } }); // default: recent
  }

  // Total count (before pagination)
  const totalArr  = await Task.aggregate([...pipeline, { $count: "count" }]);
  const totalTasks = totalArr[0]?.count || 0;
  const totalPages = Math.ceil(totalTasks / Number(limit));

  // Apply pagination
  if (isPagination === "true") {
    pipeline.push(
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) }
    );
  }

  const tasks = await Task.aggregate(pipeline);

  res.status(200).json(
    new apiResponse(
      200,
      { tasks, totalTasks, totalPages, currentPage: Number(page), limit: Number(limit) },
      "Tasks fetched successfully"
    )
  );
});

// ─────────────────────────────────────────────
// GET SINGLE Task  →  GET /api/tasks/:id
// ─────────────────────────────────────────────
const getTaskById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid Task ID"));
  }

  const task = await Task.findById(req.params.id);
  if (!task) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Task not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, task, "Task fetched successfully"));
});

// ─────────────────────────────────────────────
// UPDATE Task  →  PUT /api/tasks/:id
// ─────────────────────────────────────────────
const updateTask = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid Task ID"));
  }

  // Validate status if provided
  const allowedStatuses = ["pending", "in-progress", "completed"];
  if (req.body.status && !allowedStatuses.includes(req.body.status)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid status. Allowed: pending, in-progress, completed"));
  }

  // Validate priority if provided
  const allowedPriorities = ["low", "medium", "high"];
  if (req.body.priority && !allowedPriorities.includes(req.body.priority)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid priority. Allowed: low, medium, high"));
  }

  const updatedTask = await Task.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!updatedTask) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Task not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, updatedTask, "Task updated successfully"));
});

// ─────────────────────────────────────────────
// DELETE Task  →  DELETE /api/tasks/:id
// ─────────────────────────────────────────────
const deleteTask = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid Task ID"));
  }

  const deletedTask = await Task.findByIdAndDelete(req.params.id);
  if (!deletedTask) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Task not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, deletedTask, "Task deleted successfully"));
});

// ─────────────────────────────────────────────
// BULK CREATE Tasks  →  POST /api/tasks/bulk
// Body: { tasks: [ {...}, {...}, ... ] }
// ─────────────────────────────────────────────
const bulkCreateTasks = asyncHandler(async (req, res) => {
  const { tasks } = req.body;

  // Validation – tasks array required
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "tasks must be a non-empty array"));
  }

  // Max limit – prevent abuse
  if (tasks.length > 100) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Cannot insert more than 100 tasks at once"));
  }

  const allowedStatuses   = ["pending", "in-progress", "completed"];
  const allowedPriorities = ["low", "medium", "high"];

  const errors     = [];
  const toInsert   = [];
  const seenTitles = new Set();

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];

    // title required
    if (!t.title || !t.title.trim()) {
      errors.push({ index: i, message: "title is required" });
      continue;
    }

    const titleNormalized = t.title.trim().toLowerCase();

    // duplicate within the same request
    if (seenTitles.has(titleNormalized)) {
      errors.push({ index: i, title: t.title.trim(), message: "Duplicate title in request" });
      continue;
    }
    seenTitles.add(titleNormalized);

    // status validation
    if (t.status && !allowedStatuses.includes(t.status)) {
      errors.push({ index: i, title: t.title.trim(), message: `Invalid status. Allowed: ${allowedStatuses.join(", ")}` });
      continue;
    }

    // priority validation
    if (t.priority && !allowedPriorities.includes(t.priority)) {
      errors.push({ index: i, title: t.title.trim(), message: `Invalid priority. Allowed: ${allowedPriorities.join(", ")}` });
      continue;
    }

    toInsert.push({
      title:       t.title.trim(),
      description: t.description?.trim() || "",
      category:    t.category?.trim()    || "general",
      status:      t.status              || "pending",
      priority:    t.priority            || "medium",
      dueDate:     t.dueDate             || null,
    });
  }

  // Check DB for already existing titles (case-insensitive)
  const incomingTitles = toInsert.map((t) => t.title);
  const existingTasks  = await Task.find({
    title: { $in: incomingTitles.map((t) => new RegExp(`^${t}$`, "i")) },
  }).select("title");

  const existingTitlesSet = new Set(existingTasks.map((t) => t.title.toLowerCase()));

  const finalInsert = [];
  for (const t of toInsert) {
    if (existingTitlesSet.has(t.title.toLowerCase())) {
      errors.push({ title: t.title, message: "Task with this title already exists" });
    } else {
      finalInsert.push(t);
    }
  }

  // Nothing valid to insert
  if (finalInsert.length === 0) {
    return res.status(409).json(
      new apiResponse(409, { inserted: [], errors }, "No tasks were inserted")
    );
  }

  // Generate sequential taskCodes for all bulk tasks
  const last = await Task.findOne({ taskCode: { $regex: /^T-\d+$/ } })
    .sort({ createdAt: -1 })
    .select("taskCode");

  let counter = last?.taskCode ? parseInt(last.taskCode.split("-")[1], 10) + 1 : 1;

  const finalWithCodes = finalInsert.map((t) => ({
    ...t,
    taskCode: `T-${counter++}`,
  }));

  const inserted = await Task.insertMany(finalWithCodes, { ordered: false });

  res.status(201).json(
    new apiResponse(
      201,
      {
        insertedCount: inserted.length,
        inserted,
        skippedCount:  errors.length,
        errors,
      },
      `${inserted.length} task(s) created successfully${errors.length ? `, ${errors.length} skipped` : ""}`
    )
  );
});

export { createTask, getAllTasks, getTaskById, updateTask, deleteTask, bulkCreateTasks };
