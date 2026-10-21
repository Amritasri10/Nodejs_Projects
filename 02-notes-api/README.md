# Notes API

A RESTful API for managing personal notes with JWT authentication — built with Node.js, Express, and MongoDB.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose)
- **Auth:** JSON Web Token (JWT)
- **Password Hashing:** bcryptjs
- **Environment:** dotenv

---

## Project Structure

```
02-notes-api/
├── config/
│   └── db.js                          # MongoDB connection
├── controllers/
│   ├── Auth/
│   │   └── authController.js          # Register, Login, Profile
│   └── Note/
│       └── noteController.js          # Notes CRUD logic
├── middlewares/
│   ├── authMiddleware.js              # JWT verify middleware
│   └── errorMiddleware.js            # 404 & error handler
├── models/
│   ├── User/
│   │   └── User.modal.js             # User schema (bcrypt)
│   └── Note/
│       └── Note.modal.js             # Note schema
├── router/
│   ├── Auth/
│   │   └── authRoutes.js             # Auth routes
│   └── Note/
│       └── noteRoutes.js             # Note routes
├── utils/
│   ├── apiError.js                   # Error helper
│   ├── apiResponse.js                # Response class
│   └── asynchandler.js              # Async wrapper
├── .env                              # Environment variables
├── .gitignore
├── index.js                          # Entry point
├── package.json
└── Notes-API.postman_collection.json
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/Nodejs_Projects.git
cd Nodejs_Projects/02-notes-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

Create a `.env` file in the root directory:

```env
PORT=5001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5174
```

### 4. Run the server

```bash
# Development
npm run dev

# Production
npm start
```

Server will start at `http://localhost:5001`

---

## API Endpoints

### Base URL
```
http://localhost:5001
```

### Health Check

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | ❌ | Check server status |

---

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login user |
| GET | `/api/auth/profile` | ✅ | Get logged-in user profile |

---

### Notes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/notes` | ✅ | Create a new note |
| GET | `/api/notes` | ✅ | Get all notes (search, filter, pagination) |
| GET | `/api/notes/:id` | ✅ | Get note by ID |
| PUT | `/api/notes/:id` | ✅ | Update note by ID |
| DELETE | `/api/notes/:id` | ✅ | Delete note by ID |

> ✅ = Requires `Authorization: Bearer <token>` header

---

## Models

### User Model

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | ✅ | User's full name |
| `email` | String | ✅ | Unique email (lowercase) |
| `password` | String | ✅ | Min 6 chars (bcrypt hashed) |
| `createdAt` | Date | Auto | Timestamp |
| `updatedAt` | Date | Auto | Timestamp |

### Note Model

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `user` | ObjectId | Required | Reference to User |
| `title` | String | Required | Note title |
| `content` | String | `""` | Note content |
| `tags` | [String] | `[]` | Array of tags |
| `isPinned` | Boolean | `false` | Pinned notes appear first |
| `isActive` | Boolean | `true` | Active status |
| `createdAt` | Date | Auto | Timestamp |
| `updatedAt` | Date | Auto | Timestamp |

---

## Query Parameters — GET /api/notes

| Param | Type | Description | Example |
|-------|------|-------------|---------|
| `search` | String | Search by title or content | `?search=meeting` |
| `tags` | String | Filter by tags (comma-separated) | `?tags=work,personal` |
| `isPinned` | String | Filter pinned notes | `?isPinned=true` |
| `page` | Number | Page number | `?page=1` |
| `limit` | Number | Items per page | `?limit=10` |
| `sortBy` | String | `recent` or `oldest` | `?sortBy=oldest` |
| `isPagination` | String | `true` or `false` | `?isPagination=false` |

---

## Request & Response Examples

### Register

**POST** `/api/auth/register`

```json
// Request Body
{
  "name": "Amrita Srivastava",
  "email": "amrita@example.com",
  "password": "amrita123"
}
```

```json
// Response 201
{
  "statusCode": 201,
  "data": {
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Amrita Srivastava",
      "email": "amrita@example.com",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "createdAt": "2026-10-21T10:30:00.000Z"
    }
  },
  "message": "User registered successfully",
  "success": true
}
```

---

### Login

**POST** `/api/auth/login`

```json
// Request Body
{
  "email": "amrita@example.com",
  "password": "amrita123"
}
```

```json
// Response 200
{
  "statusCode": 200,
  "data": {
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Amrita Srivastava",
      "email": "amrita@example.com",
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  },
  "message": "Login successful",
  "success": true
}
```

---

### Create Note

**POST** `/api/notes`

```json
// Request Body
{
  "title": "My First Note",
  "content": "This is the content of my note.",
  "tags": ["personal", "ideas"],
  "isPinned": false
}
```

```json
// Response 201
{
  "statusCode": 201,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
    "user": "64f1a2b3c4d5e6f7a8b9c0d1",
    "title": "My First Note",
    "content": "This is the content of my note.",
    "tags": ["personal", "ideas"],
    "isPinned": false,
    "isActive": true,
    "createdAt": "2026-10-21T10:30:00.000Z"
  },
  "message": "Note created successfully",
  "success": true
}
```

---

### Get All Notes

**GET** `/api/notes?search=meeting&tags=work&page=1&limit=5`

```json
// Response 200
{
  "statusCode": 200,
  "data": {
    "notes": [ ... ],
    "totalNotes": 15,
    "totalPages": 3,
    "currentPage": 1,
    "limit": 5
  },
  "message": "Notes fetched successfully",
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
  "message": "Notes API server is running",
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
  "message": "Note title is required",
  "success": false
}

// 401 – Unauthorized
{
  "statusCode": 401,
  "data": null,
  "message": "Unauthorized: No token provided",
  "success": false
}

// 404 – Not Found
{
  "statusCode": 404,
  "data": null,
  "message": "Note not found",
  "success": false
}

// 409 – Conflict (Duplicate Email)
{
  "statusCode": 409,
  "data": null,
  "message": "User with this email already exists",
  "success": false
}
```

---

## Security

- Passwords are hashed using **bcryptjs** before saving to DB
- JWT token expires in **7 days**
- Every note operation checks `user: req.user._id` — users can only access their own notes
- Token must be sent in `Authorization: Bearer <token>` header for protected routes

---

## Postman Collection

Import `Notes-API.postman_collection.json` into Postman.

- `{{baseUrl}}` is pre-configured as `http://localhost:5001`
- `{{token}}` is auto-saved after **Register** or **Login**
- `{{noteId}}` is auto-saved after **Create Note**

**Recommended flow:**
```
Register → Create Note → Get All Notes → Update Note → Delete Note
```

---

## Deployment

### Render (Recommended)

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Set:
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
5. Add environment variables (`MONGO_URI`, `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`)
6. Deploy

---

## License

MIT
