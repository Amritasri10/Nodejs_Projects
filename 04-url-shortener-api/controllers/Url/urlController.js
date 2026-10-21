import { nanoid } from "nanoid";
import Url from "../../models/Url/Url.modal.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asynchandler.js";
import mongoose from "mongoose";

// ─────────────────────────────────────────────
// Helper – validate URL format
// ─────────────────────────────────────────────
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// ─────────────────────────────────────────────
// CREATE Short URL  →  POST /api/urls
// Body: { originalUrl, customAlias?, expiresAt? }
// ─────────────────────────────────────────────
const createShortUrl = asyncHandler(async (req, res) => {
  const { originalUrl, customAlias, expiresAt } = req.body;

  // Validation
  if (!originalUrl || !originalUrl.trim())
    return res.status(400).json(new apiResponse(400, null, "Original URL is required"));

  if (!isValidUrl(originalUrl.trim()))
    return res.status(400).json(new apiResponse(400, null, "Invalid URL format. Must start with http:// or https://"));

  // Determine shortCode
  let shortCode;

  if (customAlias) {
    const alias = customAlias.trim().toLowerCase();

    // Validate alias – only alphanumeric and hyphens allowed
    if (!/^[a-z0-9-]+$/.test(alias))
      return res.status(400).json(new apiResponse(400, null, "Custom alias can only contain letters, numbers and hyphens"));

    // Check alias already taken
    const existing = await Url.findOne({ shortCode: alias });
    if (existing)
      return res.status(409).json(new apiResponse(409, null, `Custom alias "${alias}" is already taken`));

    shortCode = alias;
  } else {
    // Auto-generate unique 7-char code
    let generated;
    let attempts = 0;
    do {
      generated = nanoid(7);
      attempts++;
      if (attempts > 10)
        return res.status(500).json(new apiResponse(500, null, "Could not generate unique short code. Try again."));
    } while (await Url.findOne({ shortCode: generated }));

    shortCode = generated;
  }

  // Validate expiresAt if provided
  let expiry = null;
  if (expiresAt) {
    expiry = new Date(expiresAt);
    if (isNaN(expiry.getTime()))
      return res.status(400).json(new apiResponse(400, null, "Invalid expiresAt date. Use YYYY-MM-DD"));
    if (expiry < new Date())
      return res.status(400).json(new apiResponse(400, null, "expiresAt must be a future date"));
  }

  const url = await Url.create({
    originalUrl: originalUrl.trim(),
    shortCode,
    customAlias: customAlias ? customAlias.trim().toLowerCase() : null,
    expiresAt:   expiry,
  });

  const shortUrl = `${process.env.BASE_URL}/${shortCode}`;

  res.status(201).json(
    new apiResponse(201, { ...url.toObject(), shortUrl }, "Short URL created successfully")
  );
});

// ─────────────────────────────────────────────
// REDIRECT  →  GET /:shortCode
// Redirects to original URL + increments click
// ─────────────────────────────────────────────
const redirectUrl = asyncHandler(async (req, res) => {
  const { shortCode } = req.params;

  const url = await Url.findOne({ shortCode });

  if (!url)
    return res.status(404).json(new apiResponse(404, null, "Short URL not found"));

  if (!url.isActive)
    return res.status(410).json(new apiResponse(410, null, "This short URL has been deactivated"));

  // Check expiry
  if (url.expiresAt && new Date() > url.expiresAt)
    return res.status(410).json(new apiResponse(410, null, "This short URL has expired"));

  // Increment click count + save IP
  url.clicks += 1;
  url.clickDetails.push({
    clickedAt: new Date(),
    ip:        req.ip || req.headers["x-forwarded-for"] || "",
  });
  await url.save();

  // 302 redirect to original URL
  return res.redirect(302, url.originalUrl);
});

// ─────────────────────────────────────────────
// GET ALL URLs  →  GET /api/urls
// Query: search, isActive, page, limit, sortBy, isPagination
// ─────────────────────────────────────────────
const getAllUrls = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    isActive,
    sortBy = "recent",
    isPagination = "true",
  } = req.query;

  const match = {};

  // Search by originalUrl or shortCode
  if (search) {
    match.$or = [
      { originalUrl: { $regex: new RegExp(search.trim(), "i") } },
      { shortCode:   { $regex: new RegExp(search.trim(), "i") } },
      { customAlias: { $regex: new RegExp(search.trim(), "i") } },
    ];
  }

  // isActive filter
  if (isActive !== undefined) {
    match.isActive = isActive === "true";
  }

  let pipeline = [{ $match: match }];

  // Sort
  pipeline.push({ $sort: { createdAt: sortBy === "oldest" ? 1 : -1 } });

  // Remove clickDetails from list response (heavy field)
  pipeline.push({ $project: { clickDetails: 0 } });

  const totalArr = await Url.aggregate([{ $match: match }, { $count: "count" }]);
  const totalUrls = totalArr[0]?.count || 0;
  const totalPages = Math.ceil(totalUrls / Number(limit));

  if (isPagination === "true") {
    pipeline.push(
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) }
    );
  }

  const urls = await Url.aggregate(pipeline);

  // Attach shortUrl to each record
  const BASE_URL = process.env.BASE_URL;
  const urlsWithShort = urls.map((u) => ({
    ...u,
    shortUrl: `${BASE_URL}/${u.shortCode}`,
  }));

  res.status(200).json(
    new apiResponse(200, {
      urls: urlsWithShort,
      totalUrls,
      totalPages,
      currentPage: Number(page),
      limit: Number(limit),
    }, "URLs fetched successfully")
  );
});

// ─────────────────────────────────────────────
// GET SINGLE URL  →  GET /api/urls/:id
// ─────────────────────────────────────────────
const getUrlById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json(new apiResponse(400, null, "Invalid URL ID"));

  const url = await Url.findById(req.params.id).select("-clickDetails");
  if (!url)
    return res.status(404).json(new apiResponse(404, null, "URL not found"));

  const shortUrl = `${process.env.BASE_URL}/${url.shortCode}`;

  res.status(200).json(
    new apiResponse(200, { ...url.toObject(), shortUrl }, "URL fetched successfully")
  );
});

// ─────────────────────────────────────────────
// UPDATE URL  →  PUT /api/urls/:id
// ─────────────────────────────────────────────
const updateUrl = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json(new apiResponse(400, null, "Invalid URL ID"));

  // Validate originalUrl if provided
  if (req.body.originalUrl && !isValidUrl(req.body.originalUrl.trim()))
    return res.status(400).json(new apiResponse(400, null, "Invalid URL format"));

  const updated = await Url.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).select("-clickDetails");

  if (!updated)
    return res.status(404).json(new apiResponse(404, null, "URL not found"));

  const shortUrl = `${process.env.BASE_URL}/${updated.shortCode}`;

  res.status(200).json(
    new apiResponse(200, { ...updated.toObject(), shortUrl }, "URL updated successfully")
  );
});

// ─────────────────────────────────────────────
// DELETE URL  →  DELETE /api/urls/:id
// ─────────────────────────────────────────────
const deleteUrl = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json(new apiResponse(400, null, "Invalid URL ID"));

  const deleted = await Url.findByIdAndDelete(req.params.id);
  if (!deleted)
    return res.status(404).json(new apiResponse(404, null, "URL not found"));

  res.status(200).json(new apiResponse(200, deleted, "URL deleted successfully"));
});

// ─────────────────────────────────────────────
// ANALYTICS  →  GET /api/urls/:id/analytics
// ─────────────────────────────────────────────
const getAnalytics = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json(new apiResponse(400, null, "Invalid URL ID"));

  const url = await Url.findById(req.params.id);
  if (!url)
    return res.status(404).json(new apiResponse(404, null, "URL not found"));

  const shortUrl = `${process.env.BASE_URL}/${url.shortCode}`;

  // Last 10 clicks
  const recentClicks = url.clickDetails
    .sort((a, b) => new Date(b.clickedAt) - new Date(a.clickedAt))
    .slice(0, 10);

  res.status(200).json(
    new apiResponse(200, {
      shortUrl,
      originalUrl:  url.originalUrl,
      shortCode:    url.shortCode,
      totalClicks:  url.clicks,
      isActive:     url.isActive,
      expiresAt:    url.expiresAt,
      createdAt:    url.createdAt,
      recentClicks,
    }, "Analytics fetched successfully")
  );
});

export { createShortUrl, redirectUrl, getAllUrls, getUrlById, updateUrl, deleteUrl, getAnalytics };
