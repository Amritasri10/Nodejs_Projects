# Task Management API

A RESTful API for managing tasks — built with Node.js, Express, and MongoDB.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose)
- **Environment:** dotenv

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/task-management-api.git
cd task-management-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

Create a `.env` file in the root directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5174
```

### 4. Run the server

```bash
# Development
npm run dev

# Production
npm start
```

Server will start at `http://localhost:5000`

---

## API Endpoints

### Base URL
```
http://localhost:5000
```

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check server status |

---

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks` | Create a new task |
| POST | `/api/tasks/bulk` | Bulk create tasks (max 100) |
| GET | `/api/tasks` | Get all tasks |
| GET | `/api/tasks/:id` | Get task by ID |
| PUT | `/api/tasks/:id` | Update task by ID |
| DELETE | `/api/tasks/:id` | Delete task by ID |

---

## Task Model

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `taskCode` | String | Auto (T-1, T-2...) | Unique auto-generated code |
| `title` | String | Required | Task title (unique) |
| `description` | String | `""` | Task description |
| `category` | String | `"general"` | Task category |
| `status` | String | `"pending"` | `pending` / `in-progress` / `completed` |
| `priority` | String | `"medium"` | `low` / `medium` / `high` |
| `dueDate` | Date | `null` | Task due date |
| `isActive` | Boolean | `true` | Active status |
| `createdAt` | Date | Auto | Timestamp |
| `updatedAt` | Date | Auto | Timestamp |

---

## Query Parameters — GET /api/tasks

| Param | Type | Description | Example |
|-------|------|-------------|---------|
| `search` | String | Search by title or taskCode | `?search=T-3` |
| `category` | String | Filter by category | `?category=work` |
| `status` | String | Filter by status | `?status=pending` |
| `priority` | String | Filter by priority | `?priority=high` |
| `fromDate` | String | Due date range start (YYYY-MM-DD) | `?fromDate=2026-10-01` |
| `toDate` | String | Due date range end (YYYY-MM-DD) | `?toDate=2026-10-31` |
| `page` | Number | Page number | `?page=1` |
| `limit` | Number | Items per page | `?limit=10` |
| `sortBy` | String | `recent` or `oldest` | `?sortBy=oldest` |
| `isPagination` | String | `true` or `false` | `?isPagination=false` |

---

## Request & Response Examples

### Create Task

**POST** `/api/tasks`

```json
// Request Body
{
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "category": "personal",
  "status": "pending",
  "priority": "high",
  "dueDate": "2026-10-30"
}
```

```json
// Response 201
{
  "statusCode": 201,
  "data": {
    "taskCode": "T-1",
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "title": "Buy groceries",
    "description": "Milk, eggs, bread",
    "category": "personal",
    "status": "pending",
    "priority": "high",
    "dueDate": "2026-10-30T00:00:00.000Z",
    "isActive": true,
    "createdAt": "2026-10-21T10:30:00.000Z",
    "updatedAt": "2026-10-21T10:30:00.000Z"
  },
  "message": "Task created successfully",
  "success": true
}
```

---

### Bulk Create Tasks

**POST** `/api/tasks/bulk`

```json
// Request Body
{
  "tasks": [
    { "title": "Team meeting", "category": "work", "priority": "high", "dueDate": "2026-10-25" },
    { "title": "Read a book", "category": "personal", "priority": "low" },
    { "title": "Gym workout", "category": "health", "status": "in-progress" }
  ]
}
```

```json
// Response 201
{
  "statusCode": 201,
  "data": {
    "insertedCount": 3,
    "inserted": [ ... ],
    "skippedCount": 0,
    "errors": []
  },
  "message": "3 task(s) created successfully",
  "success": true
}
```

---

### Get All Tasks

**GET** `/api/tasks?status=pending&priority=high&page=1&limit=5`

```json
// Response 200
{
  "statusCode": 200,
  "data": {
    "tasks": [ ... ],
    "totalTasks": 25,
    "totalPages": 5,
    "currentPage": 1,
    "limit": 5
  },
  "message": "Tasks fetched successfully",
  "success": true
}
```

---

### Health Check

**GET** `/api/health`

```json
// Response 200
{
  "status": "OK",
  "message": "Server is running",
  "timestamp": "2026-10-21T10:30:00.000Z",
  "uptime": "342s"
}
```

---

## Error Responses

```json
// 400 – Validation Error
{
  "statusCode": 400,
  "data": null,
  "message": "Task title is required",
  "success": false
}

// 404 – Not Found
{
  "statusCode": 404,
  "data": null,
  "message": "Task not found",
  "success": false
}

// 409 – Conflict (Duplicate)
{
  "statusCode": 409,
  "data": null,
  "message": "Task with title \"Buy groceries\" already exists",
  "success": false
}
```

---

## Postman Collection

Import `Task-Management-API.postman_collection.json` into Postman.

- `{{baseUrl}}` is pre-configured as `http://localhost:5000`
- `{{taskId}}` is auto-saved after **Create Task** runs

---

## Deployment

### Render (Recommended)

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Set:
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
5. Add environment variables (`MONGO_URI`, `PORT`, `CLIENT_URL`)
6. Deploy

---

## License

MIT
