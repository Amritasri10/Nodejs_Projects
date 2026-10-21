import { Router } from "express";
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  bulkCreateTasks,
} from "../../controllers/Task/taskController.js";

const router = Router();

// POST   /api/tasks/bulk    – Bulk create tasks  ← must be before /:id
router.post("/bulk", bulkCreateTasks);

// POST   /api/tasks         – Create a new task
router.post("/", createTask);

// GET    /api/tasks         – Get all tasks (search, filter, pagination)
router.get("/", getAllTasks);

// GET    /api/tasks/:id     – Get a single task by ID
router.get("/:id", getTaskById);

// PUT    /api/tasks/:id     – Update a task by ID
router.put("/:id", updateTask);

// DELETE /api/tasks/:id     – Delete a task by ID
router.delete("/:id", deleteTask);

export default router;
