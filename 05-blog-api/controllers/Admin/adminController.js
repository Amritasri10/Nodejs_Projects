import Blog from "../../models/Blog/Blog.modal.js";
import Comment from "../../models/Comment/Comment.modal.js";
import BlogView from "../../models/BlogView/BlogView.modal.js";
import User from "../../models/User/User.modal.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asynchandler.js";
import mongoose from "mongoose";

// ─────────────────────────────────────────────
// ADMIN – All Blogs with Stats
// GET /api/admin/blogs
// ─────────────────────────────────────────────
const adminGetAllBlogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, category, isPublished, isPagination = "true" } = req.query;

  const match = {};
  if (search) {
    match.$or = [
      { title:    { $regex: new RegExp(search.trim(), "i") } },
      { category: { $regex: new RegExp(search.trim(), "i") } },
    ];
  }
  if (category) match.category = { $regex: new RegExp(category.trim(), "i") };
  if (isPublished !== undefined) match.isPublished = isPublished === "true";

  let pipeline = [
    { $match: match },
    { $lookup: { from: "users",    localField: "author", foreignField: "_id", as: "author" } },
    { $unwind: "$author" },
    { $lookup: { from: "comments", localField: "_id",    foreignField: "blog", as: "comments" } },
    {
      $addFields: {
        likesCount:    { $size: "$likes" },
        commentsCount: { $size: "$comments" },
      },
    },
    { $project: { "author.password": 0, comments: 0, content: 0 } },
    { $sort: { createdAt: -1 } },
  ];

  const totalArr  = await Blog.aggregate([{ $match: match }, { $count: "count" }]);
  const totalBlogs = totalArr[0]?.count || 0;
  const totalPages = Math.ceil(totalBlogs / Number(limit));

  if (isPagination === "true") {
    pipeline.push({ $skip: (Number(page) - 1) * Number(limit) }, { $limit: Number(limit) });
  }

  const blogs = await Blog.aggregate(pipeline);

  res.status(200).json(new apiResponse(200, {
    blogs, totalBlogs, totalPages, currentPage: Number(page),
  }, "Admin blogs fetched successfully"));
});

// ─────────────────────────────────────────────
// ADMIN – Blog Comments
// GET /api/admin/blogs/:id/comments
// ─────────────────────────────────────────────
const adminGetBlogComments = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json(new apiResponse(400, null, "Invalid Blog ID"));

  const { page = 1, limit = 10, isPagination = "true" } = req.query;

  const match = { blog: new mongoose.Types.ObjectId(req.params.id) };

  let pipeline = [
    { $match: match },
    { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $lookup: { from: "blogs", localField: "blog", foreignField: "_id", as: "blog" } },
    { $unwind: "$blog" },
    { $project: { "user.password": 0, "blog.content": 0 } },
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
  }, "Blog comments fetched successfully"));
});

// ─────────────────────────────────────────────
// ADMIN – All Users
// GET /api/admin/users
// ─────────────────────────────────────────────
const adminGetAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, role, isPagination = "true" } = req.query;

  const match = {};
  if (search) {
    match.$or = [
      { name:  { $regex: new RegExp(search.trim(), "i") } },
      { email: { $regex: new RegExp(search.trim(), "i") } },
    ];
  }
  if (role && ["user", "admin"].includes(role)) match.role = role;

  let pipeline = [
    { $match: match },
    { $project: { password: 0 } },
    { $sort: { createdAt: -1 } },
  ];

  const totalArr  = await User.aggregate([{ $match: match }, { $count: "count" }]);
  const totalUsers = totalArr[0]?.count || 0;
  const totalPages = Math.ceil(totalUsers / Number(limit));

  if (isPagination === "true") {
    pipeline.push({ $skip: (Number(page) - 1) * Number(limit) }, { $limit: Number(limit) });
  }

  const users = await User.aggregate(pipeline);

  res.status(200).json(new apiResponse(200, {
    users, totalUsers, totalPages, currentPage: Number(page),
  }, "Users fetched successfully"));
});

// ─────────────────────────────────────────────
// ADMIN – User Profile Detail with Activity
// GET /api/admin/users/:id
// ─────────────────────────────────────────────
const adminGetUserDetail = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json(new apiResponse(400, null, "Invalid User ID"));

  const user = await User.findById(req.params.id).select("-password");
  if (!user) return res.status(404).json(new apiResponse(404, null, "User not found"));

  const userId = new mongoose.Types.ObjectId(req.params.id);

  // Liked blogs
  const likedBlogs = await Blog.find({ likes: userId }).select("title slug category createdAt");

  // Comments by user
  const userComments = await Comment.find({ user: userId })
    .populate("blog", "title slug")
    .select("text createdAt blog")
    .sort({ createdAt: -1 });

  // Viewed blogs
  const viewedBlogs = await BlogView.find({ user: userId })
    .populate("blog", "title slug category")
    .select("blog viewedAt")
    .sort({ viewedAt: -1 })
    .limit(20);

  res.status(200).json(new apiResponse(200, {
    user,
    activity: {
      likedBlogs,
      comments:    userComments,
      viewedBlogs,
    },
  }, "User detail fetched successfully"));
});

export { adminGetAllBlogs, adminGetBlogComments, adminGetAllUsers, adminGetUserDetail };
