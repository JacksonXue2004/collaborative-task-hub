# Collaborative Task Hub

A production-oriented team-collaboration SaaS web application for US SWE/SDE internship portfolio. Lightweight Trello / GitHub Issues style task management.

## 🚀 Quick Highlights

-   **Modern Full-Stack Architecture**: Built with **Next.js 15 (App Router)** and **TypeScript**, featuring a strict layered architecture (UI → Server Actions/REST → Service → Prisma).
-   **Dual Entry-Point Design**: Supports both **Web UI (Server Actions)** and a **RESTful API**, with business logic uniformly reused in the Service Layer.
-   **Robust Authorization & Concurrency Control**: Implements **Role-Based Access Control (RBAC)** and **Optimistic Locking** mechanisms for data security and consistency.
-   **Type Safety & Data Validation**: Utilizes **PostgreSQL + Prisma** (with enums, foreign keys, indexes) at the database level, and **Zod** for strict backend input validation.
-   **Developer-Friendly**: Provides detailed local setup instructions and thoughtful considerations for production trade-offs and future improvements.

## 🛠️ Tech Stack

-   **Framework**: Next.js 15 (App Router)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS
-   **Database**: PostgreSQL 18
-   **ORM**: Prisma 6
-   **Authentication**: Clerk
-   **Validation**: Zod

---

## 📖 Table of Contents

1.  [Project Overview](#project-overview)
2.  [Tech Stack](#tech-stack)
3.  [Database Schema](#database-schema)
4.  [REST API Endpoints](#rest-api-endpoints)
5.  [Local Setup](#local-setup)
6.  [Trade-offs & Limitations](#trade-offs--limitations)

---

## Project Overview

Collaborative Task Hub is a team workspace where multiple users can:

-   **Create workspaces (Projects)** — each project has an owner and multiple members
-   **Invite members** — project owners can manage the member list
-   **Create and assign tasks** — with status (To Do / In Progress / Done), priority (Low / Medium / High), due dates, and assignees
-   **Track progress** — dashboard statistics and filtering/sorting
-   **Leave comments** — thread communication under each task
-   **Concurrent editing safety** — optimistic locking prevents data loss

### Key Features for Resume

-   **Strict layered architecture**: UI → Server Actions / REST Handlers → Shared Service Layer → Prisma
-   **Dual entry-points**: Server Actions for Web UI (Progressive Enhancement) + REST API for programmatic access — both re-use the same Service Layer
-   **RBAC**: Role-based access control enforced server-side (not just UI)
-   **Optimistic Locking**: Concurrent edit conflicts detected and reported
-   **Prisma + PostgreSQL**: Full ORM with enums, foreign keys, indexes, transactions
-   **zod validation**: All input validated on the backend

---

## Tech Stack

| Layer     | Technology            | Purpose                                                  |
| :-------- | :-------------------- | :------------------------------------------------------- |
| Framework | Next.js 15 App Router | React framework with Server Components, Server Actions, Route Handlers |
| Language  | TypeScript            | Static typing throughout, minimal `any`                  |
| Styling   | Tailwind CSS 3.4      | Utility-first CSS                                        |
| Database  | PostgreSQL 18         | Relational database, enum constraints, FKs, indexes      |
| ORM       | Prisma 6              | Type-safe database access, migrations                    |
| Auth      | Clerk                 | User sign-in / sign-up, session management, middleware   |
| Validation| Zod                   | Runtime input validation in Service layer                |
| Notifications| Sonner             | Toast UI for error/success feedback                      |
| Icons     | Lucide React          | Consistent icon set                                      |

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  UI Layer (React Components, Tailwind CSS)                      │
│  - Server Components (data fetching)                            │
│  - Client Components (forms, state, interactivity)               │
├─────────────────────────────────────────────────────────────────┤
│  Server Actions Layer (src/server/actions/)                     │
│  - Thin adapters: form data → Service call → ActionState return │
├─────────────────────────────────────────────────────────────────┤
│  REST Route Handlers (src/app/api/**/route.ts)                 │
│  - Thin adapters: HTTP request → Service call → JSON response   │
├─────────────────────────────────────────────────────────────────┤
│  Service Layer (src/server/services/)                           │
│  - ALL business logic, permission checks, DB operations         │
│  - Shared by both Server Actions and REST Handlers              │
├─────────────────────────────────────────────────────────────────┤
│  Infrastructure (src/server/lib/)                               │
│  - prisma.ts (client singleton)                                 │
│  - errors.ts (AppError hierarchy)                              │
│  - auth.ts (Clerk → local User sync)                            │
│  - schemas.ts (Zod validation)                                  │
├─────────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL + Prisma)                                 │
│  - Models with enums, FKs, indexes, constraints                 │
└─────────────────────────────────────────────────────────────────┘
```

Why both Server Actions and REST Handlers?

-   **Server Actions** provide progressive enhancement for the Web UI — works without JavaScript, integrates with React's `useActionState` for form state management.
-   **REST Handlers** expose the same logic to third-party integrations and external clients (e.g., mobile apps, scripts).
-   **Both are thin adapters** — all business logic lives in the Service Layer, ensuring consistency and avoiding duplicated code.

---

## Database Schema

### Models

-   **User**: Stores Clerk's `userId` as unique identifier. Contains email, name, avatar, and timestamps.
-   **Project**: Team workspace with owner reference. Contains name, description, timestamps.
-   **ProjectMember**: Many-to-many join table between User and Project. Stores role (OWNER/MEMBER). This is the source of truth for RBAC.
-   **Task**: Belongs to a Project. Contains title, description, status (TODO/IN_PROGRESS/DONE), priority (LOW/MEDIUM/HIGH), dueDate, assignee (nullable FK), `version` (for optimistic locking), timestamps.
-   **TaskComment**: Comments on a task. Links to task and author user.
-   **TaskAttachment**: Stretch-goal schema (defined but not fully implemented in this iteration).

### Key Design Decisions

| Decision                    | Rationale                                                                        |
| :-------------------------- | :------------------------------------------------------------------------------- |
| Database-level enums        | Strict constraint enforcement — prevents invalid status/priority values at DB level |
| `version` field on Task     | Optimistic locking: concurrent edits detect conflicts                            |
| `assignToUserId` as nullable FK | Task can be unassigned; `OnDelete: SetNull` for safe user removal                |
| Cascade delete on ProjectMember | When a user or project is deleted, membership rows are cleaned up                |
| Indexes on projectId, assignToUserId, status | High-frequency query columns for list/filter operations                          |
| Clerk userId → local User sync | Foreign keys in our schema reference local User.id, not Clerk IDs                 |

---

## REST API Endpoints

Base URL: `/api`

All endpoints require authentication (Clerk session). All responses use standard HTTP status codes. Error responses follow the format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### 1. List Projects

`GET /api/projects`

Returns all projects the current user has membership access to.

**Response (200):**

```json
{
  "data": [
    {
      "id": "clx...",
      "name": "Project Alpha",
      "description": "...",
      "owner": { "id": "...", "name": "...", "email": "..." },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Create Project

`POST /api/projects`

**Body:**

```json
{
  "name": "New Project",
  "description": "Optional description"
}
```

Creates project and automatically adds current user as OWNER member.

**Response (201):** Created project with owner info.

**Errors:** `400` (validation), `401` (unauthenticated)

### 3. List Tasks for a Project

`GET /api/projects/{id}/tasks?status=TODO&priority=HIGH&assignToUserId=xxx&sortBy=dueDate&sortOrder=asc&page=1&pageSize=10`

**Query Parameters:**

| Param          | Type   | Required | Description                       |
| :------------- | :----- | :------- | :-------------------------------- |
| status         | enum   | No       | Filter by TODO / IN_PROGRESS / DONE |
| priority       | enum   | No       | Filter by LOW / MEDIUM / HIGH     |
| assignToUserId | string | No       | Filter by assignee                |
| sortBy         | string | No       | `createdAt` (default) or `dueDate` |
| sortOrder      | string | No       | `desc` (default) or `asc`         |
| page           | int    | No       | Page number, default 1            |
| pageSize       | int    | No       | Items per page, default 10, max 50 |

**Response (200):**

```json
{
  "data": {
    "items": [...],
    "total": 42,
    "page": 1,
    "pageSize": 10,
    "totalPages": 5
  }
}
```

### 4. Create Task

`POST /api/projects/{id}/tasks`

**Body:**

```json
{
  "title": "Fix login bug",
  "description": "Users cannot log in on mobile",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "assignToUserId": "clx...",
  "dueDate": "2024-02-01T00:00:00Z"
}
```

**Response (201):** Created task with assignee and project details.

**Errors:** `400` (validation), `403` (not a project member)

### 5. Update Task (Optimistic Lock)

`PATCH /api/tasks/{id}`

**Body — must include `version`:**

```json
{
  "title": "Updated title",
  "status": "DONE",
  "version": 2
}
```

The `version` field is required. The server atomically updates the row only if the current version matches. If another user modified the task since you fetched it, you'll get a 409 Conflict response.

**Response (200):** Updated task with new version.

**Errors:**

-   `400`: Missing or invalid fields
-   `403`: Not a project member
-   `404`: Task not found
-   **`409`**: Optimistic lock conflict — another user modified this resource. Refresh and retry.

### 6. Create Comment

`POST /api/tasks/{id}/comments`

**Body:**

```json
{
  "content": "Fixed the issue — deploying now"
}
```

**Response (201):** Created comment with author details.

**Errors:** `400` (empty content), `403` (not a member), `404` (task not found)

---

## Local Setup

### Prerequisites

-   Node.js 20+
-   npm 9+
-   PostgreSQL (locally installed)

### Step 1: Database Setup

```bash
# Connect to PostgreSQL
D:\pgsql\bin\psql.exe -U postgres

# Create the database
CREATE DATABASE collaborative_task_hub;
\q
```

### Step 2: Environment Variables

```bash
# Copy the example
cp .env.example .env.local

# Edit .env.local and fill in:
# - DATABASE_URL (with your postgres password)
# - Clerk API keys (from https://dashboard.clerk.com)
```

### Step 3: Install Dependencies & Migrate

```bash
npm install
npx prisma migrate dev --name init
```

### Step 4: Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

### Environment Variables Reference

| Variable                           | Description                                     |
| :--------------------------------- | :---------------------------------------------- |
| `DATABASE_URL`                     | PostgreSQL connection string for Prisma Client  |
| `DIRECT_URL`                       | Direct PostgreSQL connection (for Prisma Migrate) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`| Clerk publishable key (client-safe)             |
| `CLERK_SECRET_KEY`                 | Clerk secret key (server-only, never expose)    |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`    | Sign-in redirect path                           |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`    | Sign-up redirect path                           |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`| Post sign-in redirect                         |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`| Post sign-up redirect                         |

---

## Trade-offs & Limitations

### Known Weaknesses (for interview discussion)

1.  **Offset Pagination**: We use offset-based pagination (`skip` + `take`). This is simple and appropriate for a team workspace (thousands, not millions, of rows), but performance degrades on large offsets. **Production alternative**: cursor-based pagination (keyset pagination).

2.  **Simple Optimistic Locking**: Uses `version` column with `updateMany` + `count === 0` check. This is correct but not as sophisticated as event-sourcing or CRDTs. For a single-task-at-a-time edit pattern, this is sufficient.

3.  **No Rate Limiting**: The API has no rate limiting. In production, you'd add something like Upstash/Rate Limit Redis or a middleware-based solution.

4.  **No Email Notifications**: When a user is invited to a project, no email is sent. The system relies on the user knowing to log in and check. **Production alternative**: integrate Clerk's email notification or a service like Resend.

5.  **Attachment is Stretch Goal**: Task attachments (file uploads) are defined in the Prisma schema but not fully implemented in this iteration. This was a deliberate scope decision for an intern-level project.

6.  **Clerk Dependency**: Authentication is tightly coupled to Clerk. While Clerk is excellent, it means a third-party service outage affects your app. **Production alternative**: support multiple auth providers or have a fallback mechanism.

7.  **No Test Suite**: Automated tests (unit/integration) are not included. For production, you'd add Vitest/Jest for service-layer unit tests and Playwright for E2E tests.

8.  **No Multi-tenant Data Isolation**: The system relies on application-level RBAC (ProjectMember table). For strict multi-tenant isolation, you might consider row-level security (RLS) policies in PostgreSQL.

### Production Improvement Ideas

-   Add Redis caching for frequent queries (project stats, member lists)
-   Implement WebSocket/SSE for real-time task updates
-   Add audit logging for critical operations (create/delete project, invite/remove member)
-   Add API versioning for future backwards-compatible changes
-   Add request tracing (correlation IDs) for debugging in distributed systems
-   Add Prometheus/Grafana metrics for monitoring

---

## License

MIT