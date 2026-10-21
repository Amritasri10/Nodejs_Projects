import Comment from "../../models/Comment/Comment.modal.js";
import Blog from "../../models/Blog/Blog.modal.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asynchandler.js";
import mongoose from "mongoose";

// ─────────────────────────────────────────────
// ADD Comment  →  POST /api/blogs/:id/comments
// ─────────────────────────────────────────────
const addComment = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json(new apiResponse(400, null, "Invalid Blog ID"));
  if (!text?.trim())
    return res.status(400).json(new apiResponse(400, null, "Comment text is required"));

  const blog = await Blog.findById(req.params.id);
  if (!blog) return res.status(404).json(new apiResponse(404, null, "Blog not found"));

  const comment = await Comment.create({
    blog: req.params.id,
    user: req.user._id,
    text: text.trim(),
  });

  await comment.populate("user", "name email");

  res.status(201).json(new apiResponse(201, comment, "Comment added successfully"));
});

// ─────────────────────────────────────────────
// GET Comments  →  GET /api/blogs/:id/comments
// ─────────────────────────────────────────────
const getComments = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, isPagination = "true" } = req.query;

  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json(new apiResponse(400, null, "Invalid Blog ID"));

  const match = { blog: new mongoose.Types.ObjectId(req.params.id) };

  let pipeline = [
    { $match: match },
    { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $project: { "user.password": 0 } },
    { $sort: { createdAt: -1 } },
  ];

  const totalArr     = await Comment.aggregate([{ $match: match }, { $count: "count" }]);
  const totalComments = totalArr[0]?.count || 0;
  const totalPages    = Math.ceil(totalComments / Number(limit));

  if (isPagination === "true") {
    pipeline.push({ $skip: (Number(page) - 1) * Number(limit) }, { $limit: Number(limit) });
  }

  const comments = await Comment.aggregate(pipeline);

  res.status(200).json(new apiResponse(200, {
    comments, totalComments, totalPages, currentPage: Number(page),
  }, "Comments fetched successfully"));
});

// ─────────────────────────────────────────────
// DELETE Comment  →  DELETE /api/comments/:id
// Owner or Admin can delete
// ─────────────────────────────────────────────
const deleteComment = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json(new apiResponse(400, null, "Invalid Comment ID"));

  const comment = await Comment.findById(req.params.id);
  if (!comment) return res.status(404).json(new apiResponse(404, null, "Comment not found"));

  // Only owner or admin can delete
  if (comment.user.toString() !== req.user._id.toString() && req.user.role !== "admin")
    return res.status(403).json(new apiResponse(403, null, "Not authorized to delete this comment"));

  await Comment.findByIdAndDelete(req.params.id);

  res.status(200).json(new apiResponse(200, comment, "Comment deleted successfully"));
});

export { addComment, getComments, deleteComment };
