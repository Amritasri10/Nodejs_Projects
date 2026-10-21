import Blog from "../../models/Blog/Blog.modal.js";
import Comment from "../../models/Comment/Comment.modal.js";
import BlogView from "../../models/BlogView/BlogView.modal.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asynchandler.js";
import mongoose from "mongoose";

// ─────────────────────────────────────────────
// User's Liked Blogs  →  GET /api/users/:id/liked-blogs
// ─────────────────────────────────────────────
const getUserLikedBlogs = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json(new apiResponse(400, null, "Invalid User ID"));

  const blogs = await Blog.find({
    likes: new mongoose.Types.ObjectId(req.params.id),
    isPublished: true,
  })
    .select("title slug category image views likes createdAt")
    .sort({ createdAt: -1 });

  res.status(200).json(new apiResponse(200, {
    likedBlogs: blogs,
    count:      blogs.length,
  }, "Liked blogs fetched successfully"));
});

// ─────────────────────────────────────────────
// User's Comments  →  GET /api/users/:id/comments
// ─────────────────────────────────────────────
const getUserComments = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json(new apiResponse(400, null, "Invalid User ID"));

  const { page = 1, limit = 10, isPagination = "true" } = req.query;

  const match = { user: new mongoose.Types.ObjectId(req.params.id) };

  let pipeline = [
    { $match: match },
    { $lookup: { from: "blogs", localField: "blog", foreignField: "_id", as: "blog" } },
    { $unwind: "$blog" },
    { $project: { "blog.content": 0 } },
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
  }, "User comments fetched successfully"));
});

// ─────────────────────────────────────────────
// User's Viewed Blogs  →  GET /api/users/:id/viewed-blogs
// ─────────────────────────────────────────────
const getUserViewedBlogs = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json(new apiResponse(400, null, "Invalid User ID"));

  const { page = 1, limit = 10, isPagination = "true" } = req.query;

  const match = { user: new mongoose.Types.ObjectId(req.params.id) };

  let pipeline = [
    { $match: match },
    { $sort: { viewedAt: -1 } },
    { $lookup: { from: "blogs", localField: "blog", foreignField: "_id", as: "blog" } },
    { $unwind: "$blog" },
    { $project: { "blog.content": 0 } },
  ];

  const totalArr  = await BlogView.aggregate([{ $match: match }, { $count: "count" }]);
  const totalViews = totalArr[0]?.count || 0;
  const totalPages = Math.ceil(totalViews / Number(limit));

  if (isPagination === "true") {
    pipeline.push({ $skip: (Number(page) - 1) * Number(limit) }, { $limit: Number(limit) });
  }

  const views = await BlogView.aggregate(pipeline);

  res.status(200).json(new apiResponse(200, {
    viewedBlogs: views, totalViews, totalPages, currentPage: Number(page),
  }, "Viewed blogs fetched successfully"));
});

export { getUserLikedBlogs, getUserComments, getUserViewedBlogs };
