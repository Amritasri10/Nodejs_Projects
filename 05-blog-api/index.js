import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";
import authRoutes    from "./router/Auth/authRoutes.js";
import blogRoutes    from "./router/Blog/blogRoutes.js";
import commentRoutes from "./router/Comment/commentRoutes.js";
import adminRoutes   from "./router/Admin/adminRoutes.js";
import userRoutes    from "./router/User/userRoutes.js";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";

// Load environment variables
dotenv.config();

const app = express();

// CORS Configuration
const clientUrl = process.env.CLIENT_URL;
app.use(cors({ origin: clientUrl || "*", credentials: true }));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Routes
app.use("/api/auth",     authRoutes);
app.use("/api/blogs",    blogRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/admin",    adminRoutes);
app.use("/api/users",    userRoutes);

// Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status:    "OK",
    message:   "Blog API server is running",
    timestamp: new Date().toISOString(),
    uptime:    `${Math.floor(process.uptime())}s`,
  });
});

// 404 & Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5004;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  connectDB();
});
