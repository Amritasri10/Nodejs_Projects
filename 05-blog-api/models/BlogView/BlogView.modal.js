import mongoose from "mongoose";

const blogViewSchema = new mongoose.Schema(
  {
    blog: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blog",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    ip: {
      type: String,
      default: "",
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

export default mongoose.model("BlogView", blogViewSchema);
