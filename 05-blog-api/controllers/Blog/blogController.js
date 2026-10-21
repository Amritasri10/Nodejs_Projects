import slugify from "slugify";
import Blog from "../../models/Blog/Blog.modal.js";
import BlogView from "../../models/BlogView/BlogView.modal.js";
import Comment from "../../models/Comment/Comment.modal.js";
import cloudinary from "../../config/cloudinary.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asynchandler.js";
import mongoose from "mongoose";

// ─────────────────────────────────────────────
// Helper – upload buffer to Cloudinary
// ─────────────────────────────────────────────
const uploadToCloudinary = (buffer, folder = "blogs") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

// ─────────────────────────────────────────────
// CREATE Blog  →  POST /api/blogs   (admin only)
// ─────────────────────────────────────────────
const createBlog = asyncHandler(async (req, res) => {
  const { title, content, excerpt, category, tags, isPublished } = req.body;

  if (!title?.trim()) return res.status(400).json(new apiResponse(400, null, "Title is required"));
  if (!content?.trim()) return res.status(400).json(new apiResponse(400, null, "Content is required"));

  // Generate unique slug
  let slug = slugify(title.trim(), { lower: true, strict: true });
  const existingSlug = await Blog.findOne({ slug });
  if (existingSlug) slug = `${slug}-${Date.now()}`;

  // Upload image if provided
  let image = { url: "", publicId: "" };
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer);
    image = { url: result.secure_url, publicId: result.public_id };
  }

  const blog = await Blog.create({
    title:       title.trim(),
    slug,
    content:     content.trim(),
    excerpt:     excerpt?.trim() || "",
    image,
    category:    category?.trim() || "general",
    tags:        Array.isArray(tags) ? tags.map((t) => t.trim().toLowerCase()) : [],
    author:      req.user._id,
    isPublished: isPublished !== undefined ? isPublished : true,
  });

  await blog.populate("author", "name email");

  res.status(201).json(new apiResponse(201, blog, "Blog created successfully"));
});

// ─────────────────────────────────────────────
// GET ALL Blogs  →  GET /api/blogs
// Query: search, category, tags, page, limit, sortBy, isPagination
// ─────────────────────────────────────────────
const getAllBlogs = asyncHandler(async (req, res) => {
  const {
    page = 1, limit = 10,
    search, category, tags,
    sortBy = "recent", isPagination = "true",
  } = req.query;

  const match = { isPublished: true };

  if (search) {
    match.$or = [
      { title:    { $regex: new RegExp(search.trim(), "i") } },
      { excerpt:  { $regex: new RegExp(search.trim(), "i") } },
      { content:  { $regex: new RegExp(search.trim(), "i") } },
    ];
  }
  if (category) match.category = { $regex: new RegExp(category.trim(), "i") };
  if (tags) {
    const tagArr = tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (tagArr.length) match.tags = { $in: tagArr };
  }

  let pipeline = [
    { $match: match },
    { $lookup: { from: "users",    localField: "author",   foreignField: "_id", as: "author" } },
    { $unwind: "$author" },
    { $lookup: { from: "comments", localField: "_id",      foreignField: "blog", as: "comments" } },
    {
      $addFields: {
        likesCount:    { $size: "$likes" },
        commentsCount: { $size: "$comments" },
      },
    },
    {
      $project: {
        "author.password": 0,
        comments: 0,
        content: 0,
      },
    },
  ];

  pipeline.push({ $sort: { createdAt: sortBy === "oldest" ? 1 : -1 } });

  const totalArr  = await Blog.aggregate([{ $match: match }, { $count: "count" }]);
  const totalBlogs = totalArr[0]?.count || 0;
  const totalPages = Math.ceil(totalBlogs / Number(limit));

  if (isPagination === "true") {
    pipeline.push({ $skip: (Number(page) - 1) * Number(limit) }, { $limit: Number(limit) });
  }

  const blogs = await Blog.aggregate(pipeline);

  res.status(200).json(new apiResponse(200, {
    blogs, totalBlogs, totalPages, currentPage: Number(page), limit: Number(limit),
  }, "Blogs fetched successfully"));
});

// ─────────────────────────────────────────────
// GET SINGLE Blog by slug  →  GET /api/blogs/:slug
// Tracks view on each visit
// ─────────────────────────────────────────────
const getBlogBySlug = asyncHandler(async (req, res) => {
  const blog = await Blog.findOne({ slug: req.params.slug, isPublished: true })
    .populate("author", "name email avatar");

  if (!blog) return res.status(404).json(new apiResponse(404, null, "Blog not found"));

  // Track view
  blog.views += 1;
  await blog.save();
  await BlogView.create({
    blog:     blog._id,
    user:     req.user?._id || null,
    ip:       req.ip || req.headers["x-forwarded-for"] || "",
    viewedAt: new Date(),
  });

  // Attach counts
  const likesCount    = blog.likes.length;
  const commentsCount = await Comment.countDocuments({ blog: blog._id });

  res.status(200).json(new apiResponse(200, {
    ...blog.toObject(), likesCount, commentsCount,
  }, "Blog fetched successfully"));
});

// ─────────────────────────────────────────────
// UPDATE Blog  →  PUT /api/blogs/:id  (admin only)
// ─────────────────────────────────────────────
const updateBlog = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json(new apiResponse(400, null, "Invalid Blog ID"));

  const blog = await Blog.findById(req.params.id);
  if (!blog) return res.status(404).json(new apiResponse(404, null, "Blog not found"));

  // Upload new image if provided
  if (req.file) {
    // Delete old image from Cloudinary
    if (blog.image?.publicId) {
      await cloudinary.uploader.destroy(blog.image.publicId);
    }
    const result = await uploadToCloudinary(req.file.buffer);
    req.body.image = { url: result.secure_url, publicId: result.public_id };
  }

  // Regenerate slug if title changed
  if (req.body.title && req.body.title.trim() !== blog.title) {
    let newSlug = slugify(req.body.title.trim(), { lower: true, strict: true });
    const existing = await Blog.findOne({ slug: newSlug, _id: { $ne: blog._id } });
    if (existing) newSlug = `${newSlug}-${Date.now()}`;
    req.body.slug = newSlug;
  }

  const updated = await Blog.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  }).populate("author", "name email");

  res.status(200).json(new apiResponse(200, updated, "Blog updated successfully"));
});

// ─────────────────────────────────────────────
// DELETE Blog  →  DELETE /api/blogs/:id  (admin only)
// ─────────────────────────────────────────────
const deleteBlog = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json(new apiResponse(400, null, "Invalid Blog ID"));

  const blog = await Blog.findByIdAndDelete(req.params.id);
  if (!blog) return res.status(404).json(new apiResponse(404, null, "Blog not found"));

  // Delete image from Cloudinary
  if (blog.image?.publicId) await cloudinary.uploader.destroy(blog.image.publicId);

  // Delete related comments and views
  await Comment.deleteMany({ blog: blog._id });
  await BlogView.deleteMany({ blog: blog._id });

  res.status(200).json(new apiResponse(200, blog, "Blog deleted successfully"));
});

// ─────────────────────────────────────────────
// LIKE / UNLIKE  →  POST /api/blogs/:id/like
// ─────────────────────────────────────────────
const toggleLike = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json(new apiResponse(400, null, "Invalid Blog ID"));

  const blog = await Blog.findById(req.params.id);
  if (!blog) return res.status(404).json(new apiResponse(404, null, "Blog not found"));

  const userId    = req.user._id.toString();
  const alreadyLiked = blog.likes.map((id) => id.toString()).includes(userId);

  if (alreadyLiked) {
    blog.likes = blog.likes.filter((id) => id.toString() !== userId);
  } else {
    blog.likes.push(req.user._id);
  }

  await blog.save();

  res.status(200).json(new apiResponse(200, {
    liked:      !alreadyLiked,
    likesCount: blog.likes.length,
  }, alreadyLiked ? "Blog unliked" : "Blog liked"));
});

// ─────────────────────────────────────────────
// GET LIKES  →  GET /api/blogs/:id/likes
// ─────────────────────────────────────────────
const getBlogLikes = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json(new apiResponse(400, null, "Invalid Blog ID"));

  const blog = await Blog.findById(req.params.id).populate("likes", "name email");
  if (!blog) return res.status(404).json(new apiResponse(404, null, "Blog not found"));

  res.status(200).json(new apiResponse(200, {
    likesCount: blog.likes.length,
    users:      blog.likes,
  }, "Likes fetched successfully"));
});

export { createBlog, getAllBlogs, getBlogBySlug, updateBlog, deleteBlog, toggleLike, getBlogLikes };
