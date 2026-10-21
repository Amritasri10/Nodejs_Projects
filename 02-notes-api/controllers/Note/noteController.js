import Note from "../../models/Note/Note.modal.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asynchandler.js";
import mongoose from "mongoose";

// ─────────────────────────────────────────────
// CREATE Note  →  POST /api/notes
// ─────────────────────────────────────────────
const createNote = asyncHandler(async (req, res) => {
  const { title, content, tags, isPinned } = req.body;

  if (!title || !title.trim()) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Note title is required"));
  }

  const note = await Note.create({
    user:      req.user._id,
    title:     title.trim(),
    content:   content?.trim() || "",
    tags:      Array.isArray(tags) ? tags.map((t) => t.trim().toLowerCase()) : [],
    isPinned:  isPinned !== undefined ? isPinned : false,
  });

  res
    .status(201)
    .json(new apiResponse(201, note, "Note created successfully"));
});

// ─────────────────────────────────────────────
// GET ALL Notes  →  GET /api/notes
// Query params:
//   search   – search by title OR content (case-insensitive)
//   tags     – filter by tag (comma-separated: ?tags=work,personal)
//   isPinned – filter pinned notes (true | false)
//   page     – page number (default: 1)
//   limit    – items per page (default: 10)
//   sortBy   – recent | oldest (default: recent)
//   isPagination – true | false (default: true)
// ─────────────────────────────────────────────
const getAllNotes = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    tags,
    isPinned,
    sortBy = "recent",
    isPagination = "true",
  } = req.query;

  // ── Build match filter (only current user's notes) ──
  const match = { user: req.user._id };

  // Search by title OR content
  if (search) {
    match.$or = [
      { title:   { $regex: new RegExp(search.trim(), "i") } },
      { content: { $regex: new RegExp(search.trim(), "i") } },
    ];
  }

  // Tags filter – comma-separated: ?tags=work,personal
  if (tags) {
    const tagArray = tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    if (tagArray.length > 0) {
      match.tags = { $in: tagArray };
    }
  }

  // isPinned filter
  if (isPinned !== undefined) {
    match.isPinned = isPinned === "true";
  }

  // ── Build aggregation pipeline ──────────────
  let pipeline = [{ $match: match }];

  // Sort — pinned notes always on top, then by date
  if (sortBy === "oldest") {
    pipeline.push({ $sort: { isPinned: -1, createdAt: 1 } });
  } else {
    pipeline.push({ $sort: { isPinned: -1, createdAt: -1 } });
  }

  // Total count (before pagination)
  const totalArr  = await Note.aggregate([...pipeline, { $count: "count" }]);
  const totalNotes = totalArr[0]?.count || 0;
  const totalPages = Math.ceil(totalNotes / Number(limit));

  // Apply pagination
  if (isPagination === "true") {
    pipeline.push(
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) }
    );
  }

  const notes = await Note.aggregate(pipeline);

  res.status(200).json(
    new apiResponse(
      200,
      { notes, totalNotes, totalPages, currentPage: Number(page), limit: Number(limit) },
      "Notes fetched successfully"
    )
  );
});

// ─────────────────────────────────────────────
// GET SINGLE Note  →  GET /api/notes/:id
// ─────────────────────────────────────────────
const getNoteById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid Note ID"));
  }

  const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
  if (!note) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Note not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, note, "Note fetched successfully"));
});

// ─────────────────────────────────────────────
// UPDATE Note  →  PUT /api/notes/:id
// ─────────────────────────────────────────────
const updateNote = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid Note ID"));
  }

  // Normalize tags if provided
  if (req.body.tags && Array.isArray(req.body.tags)) {
    req.body.tags = req.body.tags.map((t) => t.trim().toLowerCase());
  }

  // Only update owner's note
  const updatedNote = await Note.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!updatedNote) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Note not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, updatedNote, "Note updated successfully"));
});

// ─────────────────────────────────────────────
// DELETE Note  →  DELETE /api/notes/:id
// ─────────────────────────────────────────────
const deleteNote = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid Note ID"));
  }

  const deletedNote = await Note.findOneAndDelete({
    _id:  req.params.id,
    user: req.user._id,
  });

  if (!deletedNote) {
    return res
      .status(404)
      .json(new apiResponse(404, null, "Note not found"));
  }

  res
    .status(200)
    .json(new apiResponse(200, deletedNote, "Note deleted successfully"));
});

export { createNote, getAllNotes, getNoteById, updateNote, deleteNote };
