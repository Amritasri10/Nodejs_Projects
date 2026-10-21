import { Router } from "express";
import {
  createNote,
  getAllNotes,
  getNoteById,
  updateNote,
  deleteNote,
} from "../../controllers/Note/noteController.js";
import { verifyJWT } from "../../middlewares/authMiddleware.js";

const router = Router();

// All note routes are protected – user must be logged in
router.use(verifyJWT);

// POST   /api/notes      – Create a note
router.post("/", createNote);

// GET    /api/notes      – Get all notes (search, filter, pagination)
router.get("/", getAllNotes);

// GET    /api/notes/:id  – Get single note by ID
router.get("/:id", getNoteById);

// PUT    /api/notes/:id  – Update note by ID
router.put("/:id", updateNote);

// DELETE /api/notes/:id  – Delete note by ID
router.delete("/:id", deleteNote);

export default router;
