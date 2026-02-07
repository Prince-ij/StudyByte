# StudyByte

StudyByte turns uploaded PDF textbooks into interactive courses using an LLM. It extracts PDF text, summarizes it, and generates course metadata, HTML chapters, chapter quizzes, and a final exam. Users can register, enroll, take quizzes/exams, and track progress.

Tech stack

- Backend: Node.js, Express, MongoDB, Mongoose
- Frontend: React + Vite, React Router, Bootstrap
- AI: LangChain wrapper over an LLM (configured via environment variables)

Key features

- Upload a PDF to auto-generate a course (metadata, chapters, quizzes, final exam)
- User registration and JWT authentication
- Enrollment and progress tracking (chapter completion, quiz/exam results)
- Chapter quizzes and final exam endpoints (scored and stored)

Repository layout (important files)

- `api/` - Express server and AI generation utilities
  - `index.js` - server entry (also serves built frontend in `api/dist`)
  - `controllers/` - route handlers (`users.js`, `courses.js`)
  - `models/` - Mongoose models for Course, Chapter, Quiz, Exam, User, Enrollment
  - `utils/generator.js` - LLM prompts and structured-output generation
  - `utils/pdfExtractor.js` - PDF text extraction helper
- `frontend/` - React + Vite client
  - `src/` - React components and services
  - `src/App.jsx`, `src/main.jsx`, `src/services.js`

Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- MongoDB (local or Atlas)
- An LLM provider and credentials (API key, optional custom endpoint)

Environment (backend)

Create a `.env` file inside `api/` with the following variables:

```
PORT=3000
MONGODB_URL=<your-mongodb-connection-string>
SECRET=<jwt-secret>
AI_API_KEY=<ai-api-key>
AI_MODEL=<model-name-or-id>
AI_ENDPOINT=<optional-custom-endpoint-base-url>
```

Quick start

1. Backend

- cd `api`
- npm install
- Create `.env` as described above
- npm run dev (or `npm start`)

2. Frontend (dev mode)

- cd `frontend`
- npm install
- npm run dev

Build & serve the frontend from the backend (production-like)

The backend includes a helper script that builds the frontend and copies the production build into `api/dist` so the Express server can serve the static files.

From the repo root run:

```bash
cd api
npm run build:ui
```

This runs the frontend build and copies the output into `api/dist`. After that start the backend (make sure `PORT` is set as desired):

```bash
npm start
# or for development with auto-reload
npm run dev
```

Routing and SPA fallback

- The Express server is configured to serve static files from `api/dist` and to return `dist/index.html` for non-API GET requests. This lets client-side routes (for example `/dashboard`) be handled by the React router instead of returning an "unknown endpoint" from the backend.

Troubleshooting

- Unknown endpoint when visiting `/dashboard` after signup:

  - Ensure you built the frontend into `api/dist` with `npm run build:ui` and that `api/dist/index.html` exists.
  - Ensure the backend is running and using the same port you expect in the browser (check `PORT` in `api/.env`).

- Server crash with path-to-regexp errors like "Missing parameter name at index ...":
  - Avoid registering route patterns that path-to-regexp rejects (for example `app.get('*', ...)` may trigger errors in some setups). The server uses a middleware that checks `req.path` and serves `index.html` for non-API GET requests rather than registering a catch-all path pattern.

API endpoints (high level)

- POST `/api/users` — create user
- POST `/api/users/login` — authenticate, receive JWT
- POST `/api/courses/upload-pdf` — upload PDF (multipart form, field `file`), requires auth; generates course, chapters, quizzes, exam, and enrolls user
- GET `/api/courses/my-courses` — list user's enrollments and progress (auth)
- GET `/api/courses/:courseId/chapters` — fetch chapters + quizzes (auth)
- POST `/api/courses/chapters/:chapterId/quiz/submit` — submit chapter quiz answers (auth)
- GET `/api/courses/:courseId/exam` — fetch final exam (auth)
- POST `/api/courses/:courseId/exam/submit` — submit final exam answers (auth)

Example: uploading PDF (curl)

```bash
curl -X POST "http://localhost:3000/api/courses/upload-pdf" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/path/to/book.pdf"
```

Security & notes

- The AI generation relies on environment variables for API keys and endpoints. Be mindful of rate limits and costs when testing.
- Generated chapter content is HTML strings — sanitize before rendering in the client (the frontend already uses `dompurify`).
- Production usage should secure secrets, enable HTTPS, restrict upload size, and harden CORS and other middleware.

Contributing

- Open issues or PRs for fixes or improvements. Keep changes small and focused.

License

- MIT (add a LICENSE file if needed)
