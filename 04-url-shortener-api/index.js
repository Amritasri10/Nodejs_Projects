import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";
import urlRoutes from "./router/Url/urlRoutes.js";
import { redirectUrl } from "./controllers/Url/urlController.js";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";

// Load environment variables
dotenv.config();

const app = express();

// CORS Configuration
const clientUrl = process.env.CLIENT_URL;
app.use(
  cors({
    origin: clientUrl || "*",
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ── Redirect Route (must be before API routes) ──
// GET /:shortCode  →  redirect to original URL
app.get("/:shortCode", redirectUrl);

// ── API Routes ──
app.use("/api/urls", urlRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status:    "OK",
    message:   "URL Shortener API server is running",
    timestamp: new Date().toISOString(),
    uptime:    `${Math.floor(process.uptime())}s`,
  });
});

// 404 & Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5003;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  connectDB();
});
