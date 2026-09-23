# PROJECT_CODEBOOK.md
# Collaborative Task Hub — 学习手册

> **这份文档包含整个项目的代码和详细中文讲解。**
> 每一节都对应一个文件，包含完整代码 + 逐段解释 + 面试考点。

---

## 目录

1. [整体架构与数据流](#1-整体架构与数据流)
2. [数据库层 (Prisma Schema)](#2-数据库层-prisma-schema)
3. [基础设施层 (Infrastructure)](#3-基础设施层-infrastructure)
4. [Service 业务层](#4-service-业务层)
5. [Server Actions 层](#5-server-actions-层)
6. [REST Route Handlers 层](#6-rest-route-handlers-层)
7. [UI 层 (Frontend)](#7-ui-层-frontend)
8. [配置与运行](#8-配置与运行)

---

## 1. 整体架构与数据流

### 分层架构图

```
┌──────────────────────────────────────────────────────────────────┐
│  UI Layer             客户端渲染 (Client Components)             │
│  - Forms, tables, toasts, modals, state management               │
│  服务端渲染 (Server Components)                                  │
│  - 数据获取、直接调用 Service                                    │
├──────────────────────────────────────────────────────────────────┤
│  Server Actions Layer      REST Route Handlers Layer             │
│  - 薄适配器，处理表单状态  |  - 薄适配器，处理 HTTP 请求           │
│  - useActionState 绑定    |  - NextRequest/NextResponse          │
│  - 返回 ActionState       |  - 返回 JSON                        │
├──────────────────────────────────────────────────────────────────┤
│  ★ Shared Service Layer (src/server/services/)                   │
│  - 所有业务逻辑、权限校验、数据库操作                             │
│  - Zod 校验、RBAC 检查、乐观锁、分页、统计                        │
│  - 被 Server Actions 和 REST Handlers 共同复用                    │
├──────────────────────────────────────────────────────────────────┤
│  Infrastructure Layer (src/server/lib/)                          │
│  - prisma.ts (单例)  errors.ts (错误体系)  auth.ts (用户同步)     │
│  - api-response.ts (响应封装)  schemas.ts (Zod)  types.ts        │
├──────────────────────────────────────────────────────────────────┤
│  Database Layer (PostgreSQL + Prisma)                            │
│  - Models, enums, FK constraints, indexes, migrations            │
└──────────────────────────────────────────────────────────────────┘
```

### 双入口复用设计

**为什么同时有 Server Actions 和 REST Handlers？**

1. **Server Actions**：为 Web UI 服务。React 的 `useActionState` 让表单提交变得简单，错误处理原生集成在组件状态中。这是 Next.js 推荐的表单处理方式，具有 Progressive Enhancement（即使没有 JavaScript 也能工作）。

2. **REST Handlers**：为程序化访问服务。将来如果需要为移动端、第三方集成或 CLI 工具提供接口，REST API 是标准方式。

3. **关键**：两者都是薄适配层，**不包含任何业务逻辑**。所有逻辑都在 Service 层中，两个入口调用相同的函数，保证了行为的一致性，也避免了重复代码。

### 请求流程示例

**创建一个任务的完整流程：**

```
用户点击"创建任务"
    ↓
Client Component 提交 FormData
    ↓
Server Action (createTaskAction)
    ↓
读取 FormData → 调用 task.service.createTask()
    ↓
Service 层：
    1. getCurrentUser() → 验证身份，同步本地 User
    2. Zod 校验输入
    3. requireProjectMember() → RBAC 权限检查
    4. 验证 assignee 是项目成员
    5. prisma.task.create() → 写入数据库
    6. 返回映射后的 DTO
    ↓
Server Action 捕获 AppError → 返回 ActionState
    ↓
Client Component 检查 state.success → 弹出 toast 提示
```

---

## 2. 数据库层 (Prisma Schema)

**文件：** `prisma/schema.prisma`

### 完整代码

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// -----------------------------------------------------------------------------
// Enums (database-level enums for strict constraint enforcement)
// -----------------------------------------------------------------------------
enum Role {
  OWNER
  MEMBER
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

enum Priority {
  LOW
  MEDIUM
  HIGH
}

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

model User {
  id            String        @id @default(cuid())
  clerkUserId   String        @unique
  email         String        @unique
  name          String?
  avatarUrl     String?
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  // Relations
  ownedProjects Project[]     @relation("ProjectOwner")
  memberships   ProjectMember[]
  assignedTasks Task[]        @relation("TaskAssignee")
  comments      TaskComment[]
  attachments   TaskAttachment[]

  @@map("users")
}

model Project {
  id          String        @id @default(cuid())
  name        String
  description String?
  ownerUserId String
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  owner     User              @relation("ProjectOwner", fields: [ownerUserId], references: [id])
  members   ProjectMember[]
  tasks     Task[]

  @@index([ownerUserId])
  @@map("projects")
}

model ProjectMember {
  id        String   @id @default(cuid())
  projectId String
  userId    String
  role      Role
  createdAt DateTime @default(now()) @map("created_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@index([projectId])
  @@index([userId])
  @@map("project_members")
}

model Task {
  id              String        @id @default(cuid())
  projectId       String
  title           String
  description     String?
  status          TaskStatus    @default(TODO)
  priority        Priority      @default(MEDIUM)
  assignToUserId  String?
  dueDate         DateTime?
  version         Int           @default(1)
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  project  Project           @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignee User?             @relation("TaskAssignee", fields: [assignToUserId], references: [id], onDelete: SetNull)
  comments TaskComment[]
  attachments TaskAttachment[]

  @@index([projectId])
  @@index([assignToUserId])
  @@index([status])
  @@index([priority])
  @@map("tasks")
}

model TaskComment {
  id          String   @id @default(cuid())
  taskId      String
  authorUserId String
  content     String
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  task   Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  author User @relation(fields: [authorUserId], references: [id], onDelete: Cascade)

  @@index([taskId])
  @@map("task_comments")
}

// STRETCH GOAL — schema defined, feature not fully implemented in this iteration
model TaskAttachment {
  id          String   @id @default(cuid())
  taskId      String
  uploaderUserId String
  fileName    String   @map("file_name")
  fileUrl     String   @map("file_url")
  fileSize    Int?    @map("file_size")
  mimeType    String? @map("mime_type")
  createdAt   DateTime @default(now()) @map("created_at")

  task    Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  uploader User @relation(fields: [uploaderUserId], references: [id], onDelete: Cascade)

  @@index([taskId])
  @@map("task_attachments")
}
```

### 逐段讲解

#### 1. Enums — 数据库层面的枚举约束

```prisma
enum Role { OWNER MEMBER }
enum TaskStatus { TODO IN_PROGRESS DONE }
enum Priority { LOW MEDIUM HIGH }
```

**为什么用数据库枚举而不是应用层枚举？**

- Prisma 的 `enum` 直接映射到 PostgreSQL 的 `ENUM` 类型
- 数据库层面会拒绝无效值（如 `status = "ARCHIVED"`）
- 应用层 bug 无法写入非法数据
- 查询时可以做类型安全的过滤

**面试考点**：对比数据库枚举 vs 应用层枚举的优缺点。数据库枚举更严格但迁移困难；应用层枚举灵活但需要额外校验。

#### 2. User 模型

- `clerkUserId` 唯一索引：Clerk 的用户 ID，通过这个字段关联 Clerk 账户
- `email` 唯一：方便按邮箱查找用户（邀请成员时使用）
- `@@map("users")`：自定义表名，避免与 PostgreSQL 保留字冲突

#### 3. Project 模型

- `ownerUserId` 外键指向 User：项目所有者
- 隐式 relation：Project 通过 `members` 与 ProjectMember 关联
- 索引 `ownerUserId`：按所有者查询项目列表的高频路径

#### 4. ProjectMember 模型 — RBAC 核心

- 这是 **RBAC（基于角色的访问控制）的唯一数据源**
- `@@unique([projectId, userId])`：防止同一用户在同一项目中有多条成员记录
- `role` 使用 Role 枚举：只有 OWNER 和 MEMBER 两种角色
- `onDelete: Cascade`：删除项目或用户时，成员记录自动清理

**面试考点**：为什么 ProjectMember 要作为独立表而不是在 Project 中加 `ownerId`？因为需要支持多个成员，而且需要在 JOIN 查询中方便地过滤和统计。

#### 5. Task 模型 — 乐观锁核心

- `version Int @default(1)`：乐观锁版本号，初始为 1
- `assignToUserId String?`：可空外键，任务可以未分配
- `onDelete: SetNull`：删除用户时，该用户的任务不会被级联删除，而是将负责人设为 NULL
- 多个索引覆盖高频查询列（projectId、assignToUserId、status、priority）

**乐观锁原理**：两个用户同时编辑同一个任务，版本号都是 1。第一个用户提交时 `updateMany({ where: { id, version: 1 } })` 成功，版本号变为 2。第二个用户提交时 `updateMany({ where: { id, version: 1 } })` 返回 0 行受影响，抛出 ConflictError（409）。

#### 6. 其他模型

- **TaskComment**：级联删除（删任务时评论自动清理）
- **TaskAttachment**：标记为 stretch goal，schema 完整但功能未实现

### 面试考点

- **Postgres enum vs 应用层 enum**：数据库枚举严格但迁移困难；应用层灵活但需额外校验。
- **软删除 vs 级联删除**：本项目选用级联删除（简化），生产中可能需要软删除（保留历史记录）。
- **乐观锁实现方式**：version 字段 + `updateMany` + `count === 0` 检查。其他方案：数据库行级锁、Redis 分布式锁、ETag 头。
- **RBAC 设计**：ProjectMember 表是单一数据源，所有权限检查都查这张表。

---

## 3. 基础设施层 (Infrastructure)

### 3.1 Prisma Client 单例

**文件：** `src/server/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**逐行解释**：

1. `globalForPrisma`：将 `globalThis` 强制转换为一个有 `prisma` 属性的对象。这是 TypeScript 的一个技巧，用于在开发模式下将 Prisma 客户端挂载到全局对象上。

2. `globalForPrisma.prisma ?? new PrismaClient(...)`：如果全局已有 Prisma 客户端则复用，否则创建新实例。

3. `if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma`：仅在开发模式下将实例保存到全局。

**为什么要这么做？**

Next.js 在开发模式下使用 HMR（Hot Module Replacement），每次保存代码都会重新加载模块。如果每次都 `new PrismaClient()`，会迅速耗尽 PostgreSQL 的连接池（默认 100 个连接）。将实例存到 `globalThis` 上可以跨模块重载复用。

**面试考点**：Prisma 单例模式的必要性、Next.js HMR 的工作机制、Node.js 模块缓存。

---

### 3.2 错误体系

**文件：** `src/server/lib/errors.ts`

```typescript
export type AppErrorCode =
  | 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION'
  | 'NOT_FOUND' | 'CONFLICT' | 'DATABASE';

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class UnauthorizedError extends AppError { ... }
export class ForbiddenError extends AppError { ... }
export class ValidationError extends AppError { ... }
export class NotFoundError extends AppError { ... }
export class ConflictError extends AppError { ... }
export class DatabaseError extends AppError { ... }
```

**设计思路**：

- 每个错误子类对应一个 HTTP 状态码（401、403、400、404、409、500）
- Service 层抛出具体错误类（如 `throw new ForbiddenError('Not a member')`）
- Route Handlers 的 `errorResponse()` 统一捕获 `AppError` 并映射为 HTTP 响应
- **关键安全点**：未知错误返回通用 500 消息，不暴露堆栈

**面试考点**：自定义错误类、HTTP 状态码语义、错误处理分层。

---

### 3.3 API 响应封装

**文件：** `src/server/lib/api-response.ts`

```typescript
export function jsonResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message } },
      { status: err.httpStatus }
    );
  }
  console.error('[Unhandled API error]', err);
  return NextResponse.json(
    { error: { code: 'INTERNAL', message: 'Internal server error' } },
    { status: 500 }
  );
}
```

**关键点**：`instanceof AppError` 检查。Service 层抛出的错误都会被正确识别并转为标准 JSON 错误体。其他未预期的错误只记录在服务端日志中，客户端只看到通用 500。

---

### 3.4 用户认证与同步

**文件：** `src/server/lib/auth.ts`

```typescript
export async function getCurrentUser() {
  const user = await currentUser();
  if (!user || !user.id) {
    throw new UnauthorizedError('Not authenticated');
  }

  // 快速路径：本地已有 User 记录
  let local = await prisma.user.findUnique({
    where: { clerkUserId: user.id },
  });
  if (local) return local;

  // 首次登录：同步创建本地 User 记录
  const email = user.emailAddresses[0]?.emailAddress ?? '';
  local = await prisma.user.create({
    data: { clerkUserId: user.id, email, ... },
  });
  return local;
}
```

**为什么要同步到本地 User 表？**

- 我们的外键（Project.ownerUserId、Task.assignToUserId 等）都引用本地 `User.id`
- Clerk 的用户 ID 和我们的 `User.id`（cuid）不同
- 同步发生在首次访问时（懒加载），不是强制预先注册
- 函数是幂等的——每次请求都可以安全调用

**面试考点**：身份提供者（IdP）与本地用户数据的同步策略、懒加载 vs 预先同步、幂等性设计。

---

### 3.5 Zod 校验 Schema

**文件：** `src/server/lib/schemas.ts`

```typescript
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  assignToUserId: z.string().optional(),
  // ...
});

export const updateTaskSchema = z.object({
  // ...
  version: z.number().int().min(1), // 乐观锁 — 必填
});
```

**为什么用 Zod 在后端校验？**

- **安全红线**：不能只依赖前端校验——攻击者可以绕过 UI 直接发请求
- **单一来源**：Server Actions 和 REST Handlers 都使用同一份 Schema，保证一致性
- **类型安全**：Zod 可以自动推导 TypeScript 类型

**面试考点**：输入验证的安全原则（永远不信任客户端）、运行时类型校验 vs 编译时类型。

---

## 4. Service 业务层

### 4.1 Project Service

**文件：** `src/server/services/project.service.ts`

```typescript
export async function createProject(input: { name: string; description?: string }) {
  const currentUser = await getCurrentUser();
  const parsed = createProjectSchema.parse(input);

  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        name: parsed.name,
        description: parsed.description,
        ownerUserId: currentUser.id,
        members: {
          create: { userId: currentUser.id, role: 'OWNER' },
        },
      },
    });
    return p;
  });

  return { id: project.id, name: project.name, ... };
}
```

**核心逻辑**：

1. `getCurrentUser()` 验证身份，同步本地用户（如果是首次登录）
2. `createProjectSchema.parse(input)` Zod 校验输入
3. **事务**：创建项目 + 创建 ProjectMember（OWNER）在同一个数据库事务中，保证原子性
4. 返回映射后的 DTO（不暴露数据库内部字段）

**面试考点**：事务的必要性（确保项目和成员记录的一致性）、DTO 模式（数据传输对象，隔离内部结构）。

---

### 4.2 Task Service — 乐观锁

**文件：** `src/server/services/task.service.ts`

```typescript
export async function updateTask(taskId: string, input: Record<string, unknown>) {
  const currentUser = await getCurrentUser();

  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) throw new NotFoundError('Task not found');
  await requireProjectMember(existing.projectId, currentUser.id);

  const parsed = updateTaskSchema.parse(input);
  const { version: expectedVersion, ...updates } = parsed;

  const updated = await prisma.$transaction(async (tx) => {
    // 乐观锁：只有版本号匹配时才更新
    const count = await tx.task.updateMany({
      where: { id: taskId, version: expectedVersion },
      data: { ...updates, version: { increment: 1 } },
    });

    if (count === 0) throw new ConflictError(
      'Task was modified by another user. Please refresh.'
    );

    return tx.task.findUnique({ where: { id: taskId } });
  });

  return mapTask(updated);
}
```

**乐观锁完整流程**：

1. 客户端获取任务时，记录当前 `version`（如 `version: 1`）
2. 客户端提交更新时，body 中包含 `version: 1`
3. 服务端执行 `updateMany({ where: { id, version: 1 } })`
4. 如果返回 `count === 0` → 说明版本号不匹配（其他人已修改）→ 抛出 `ConflictError`（409）
5. 如果返回 `count > 0` → 更新成功，版本号自动 +1

**为什么用 `updateMany` 而不是 `update`？** 因为 Prisma 的 `update` 方法即使匹配不到行也不会报错，返回可能为 null。而 `updateMany` 会明确返回受影响的行数，便于判断冲突。

**面试考点**：乐观锁 vs 悲观锁（行级锁）、`updateMany` vs `update` 的选择、并发控制策略。

---

### 4.3 分页实现

```typescript
export async function listTasks(projectId: string, query: Record<string, unknown>) {
  const parsed = listTasksQuerySchema.parse(query);

  const where = {
    projectId,
    ...(parsed.status && { status: parsed.status }),
    ...(parsed.priority && { priority: parsed.priority }),
    ...(parsed.assignToUserId && { assignToUserId: parsed.assignToUserId }),
  };

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { [parsed.sortBy]: parsed.sortOrder },
      skip: (parsed.page - 1) * parsed.pageSize,
      take: parsed.pageSize,
    }),
    prisma.task.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / parsed.pageSize));
  return { items, total, page, pageSize, totalPages };
}
```

**Offset Pagination**：`skip` + `take`（PostgreSQL 的 `OFFSET` + `LIMIT`）。

**缺点**：当 `offset` 很大时，PostgreSQL 需要扫描大量行再丢弃。但对于团队协作工具（任务数量通常在几千以内），这个方案完全够用。

**面试考点**：offset vs cursor pagination 的性能对比、PostgreSQL 的 `OFFSET` 工作原理、何时需要升级到 cursor 分页。

---

### 4.4 RBAC 权限校验

```typescript
export async function requireProjectMember(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) throw new ForbiddenError('Not a member of this project');
  return member;
}

export async function requireProjectOwner(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({...});
  if (!member) throw new NotFoundError('Project not found');
  if (member.role !== 'OWNER') throw new ForbiddenError('Only owner can...');
  return member;
}
```

**关键设计**：权限检查是后端强制的，不是仅靠前端隐藏按钮。即使攻击者绕过 UI 直接发 API 请求，服务端也会检查 ProjectMember 表并拒绝。

**面试考点**：前端权限控制 vs 后端权限控制、最小权限原则、拒绝默认策略。

---

## 5. Server Actions 层

### 示例：创建任务

**文件：** `src/server/actions/task.actions.ts`

```typescript
'use server';

import { createTask } from '../services/task.service';
import type { ActionState } from '../lib/types';
import { AppError } from '../lib/errors';

export async function createTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const projectId = String(formData.get('projectId') ?? '');
    const payload = extractTaskPayload(formData);
    const task = await createTask(projectId, payload);
    return { success: true, data: task, message: 'Task created' };
  } catch (err) {
    if (err instanceof AppError) {
      return { success: false, error: { code: err.code, message: err.message } };
    }
    return { success: false, error: { code: 'UNKNOWN', message: 'Failed' } };
  }
}
```

**核心要点**：

1. `'use server'` 指令：标记此文件为 Server Actions 文件，只能在服务端执行
2. **只做薄适配**：读取 FormData → 提取字段 → 调用 Service → 映射错误 → 返回 ActionState
3. **错误映射**：`AppError` → `{ code, message }`；未知错误 → 通用消息
4. **绝不包含业务逻辑**：所有校验、权限检查、数据库操作都在 Service 层

### useActionState 工作机制

```typescript
const [state, formAction, isPending] = useActionState(createTaskAction, null);
```

- `state`：当前的 ActionState，包含 `success`、`data` 或 `error`
- `formAction`：绑定到 `<form action={formAction}>`，自动处理提交流程
- `isPending`：提交中的状态，用于禁用按钮/显示 loading

当用户提交表单时：
1. React 自动调用 `formAction(formData)`
2. 服务器执行 `createTaskAction`
3. 返回新的 `ActionState`
4. 客户端 React 重新渲染，`state` 更新
5. 组件中检查 `state?.success` 决定显示 toast

**面试考点**：Server Actions vs 传统 API 路由、`useActionState` vs `useFormState` 的区别、React Server Components 的工作模式。

---

## 6. REST Route Handlers 层

### 示例：任务更新端点

**文件：** `src/app/api/tasks/[id]/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { updateTask } from '../../../../server/services/task.service';
import { jsonResponse, errorResponse } from '../../../../server/lib/api-response';

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const task = await updateTask(id, body);
    return jsonResponse({ data: task });
  } catch (err) {
    return errorResponse(err);
  }
};
```

**逐行讲解**：

1. `export const PATCH`：Next.js Route Handlers 的约定——导出 HTTP 方法对应的函数
2. `{ params }`：动态路由参数（`[id]`）以 Promise 形式提供，需 `await`
3. `await req.json()`：解析请求体
4. `updateTask(id, body)`：调用 Service 层（包含完整业务逻辑）
5. `jsonResponse` / `errorResponse`：统一封装响应

### 6 个端点概览

| Method | Path | 功能 | 核心逻辑 |
|---|---|---|---|
| GET | `/api/projects` | 列出用户可访问的项目 | `listProjects()` |
| POST | `/api/projects` | 创建项目 | `createProject()` + 自动 OWNER |
| GET | `/api/projects/[id]/tasks` | 分页过滤任务列表 | `listTasks()` |
| POST | `/api/projects/[id]/tasks` | 创建任务 | `createTask()` + 成员校验 |
| PATCH | `/api/tasks/[id]` | 更新任务（含乐观锁） | `updateTask()` + 版本冲突检测 |
| POST | `/api/tasks/[id]/comments` | 添加评论 | `createComment()` + 成员校验 |

**面试考点**：Next.js Route Handlers vs Pages Router API Routes、RESTful 命名约定（资源名复数、HTTP 方法语义）、状态码选择（201 vs 200 vs 204 vs 409）。

---

## 7. UI 层 (Frontend)

### 7.1 布局与侧边栏

**文件：** `src/app/(dashboard)/layout.tsx`

```typescript
import { Sidebar } from '@/components/sidebar';
import { Toaster } from 'sonner';

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8">{children}</main>
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
```

- `(dashboard)`：Next.js 的路由组（Route Group），不影响 URL 结构，仅用于组织布局
- `<Toaster/>`：sonner toast 容器，全局可用，显示成功/错误提示

### 7.2 侧边栏导航

**文件：** `src/components/sidebar.tsx`

关键设计点：
- `usePathname()` 高亮当前路由
- Clerk `<UserButton/>` 显示用户信息 + 登出
- 响应式设计（可扩展为移动端折叠）

### 7.3 项目详情页面 — Server Component

**文件：** `src/app/(dashboard)/projects/[id]/page.tsx`

```typescript
export default async function ProjectDetailPage({ params, searchParams }) {
  const { id } = await params;
  const queries = await searchParams;

  const project = await getProject(id);
  const stats = await getProjectStats(id);
  const { items, total, page, pageSize, totalPages } = await listTasks(id, queries);

  return (
    <div>
      <StatsCard stats={stats} />
      <TaskList tasks={items} ... />
    </div>
  );
}
```

- **Server Component**：直接在服务端获取数据，不需要 API 调用
- **`params` 和 `searchParams` 都是 Promise**：Next.js 15 的新约定，需 `await`
- 数据获取与渲染在同一层，避免客户端二次请求

### 7.4 任务表单 — 乐观锁 UI

**文件：** `src/components/task-edit-form.tsx`

```typescript
<form action={updateFormAction}>
  <input type="hidden" name="taskId" value={task.id} />
  <input type="hidden" name="version" value={task.version} />
  <input name="title" defaultValue={task.title} />
  {/* 其他字段 */}
</form>
```

关键点：
- `version` 是**隐藏字段**，对用户不可见，但在表单提交时会发送给服务端
- 当服务端返回 409 时，Server Action 返回 `{ success: false, error: { code: 'CONFLICT', message: '...' } }`
- 客户端收到后弹出 toast："This task was modified by another user. Please refresh."

### 7.5 评论系统

**文件：** `src/components/comment-list.tsx`

- 客户端组件，处理评论提交的交互
- 服务端渲染初始评论列表（Server Component）
- 提交评论后 toast 提示 + 页面刷新

### 7.6 全局错误处理

**文件：** `src/app/error.tsx`

```typescript
'use client';

export default function Error({ error, reset }) {
  console.error('[UI Error]', error);
  return (
    <div>
      <h1>Something went wrong</h1>
      <p>An unexpected error occurred. Please try again.</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

- `'use client'`：错误边界必须是客户端组件
- `error` 对象**绝不**暴露堆栈给用户，只记录在服务端 console
- `reset()`：尝试重新渲染，有时可以恢复临时性错误

---

## 8. 配置与运行

### 中间件保护路由

**文件：** `src/middleware.ts`

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/projects(.*)',
  '/api/projects(.*)',
  '/api/tasks(.*)',
]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth().protect();
});
```

工作流程：
1. Next.js 请求进入时先经过 middleware
2. 如果是受保护路由（`/projects/*`、`/api/projects/*`、`/api/tasks/*`）
3. 调用 `auth().protect()` 检查用户身份
4. 未登录 → Clerk 自动重定向到登录页
5. 已登录 → 放行

### 环境变量

```env
# PostgreSQL 连接
DATABASE_URL="postgresql://postgres:密码@localhost:5432/collaborative_task_hub"

# Clerk 鉴权
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxx"
CLERK_SECRET_KEY="sk_test_xxx"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
```

### 本地启动步骤

```bash
# 1. 确保 PostgreSQL 运行
D:\pgsql\bin\pg_ctl.exe start -D "D:\pgsql\data"

# 2. 创建数据库
D:\pgsql\bin\createdb.exe -U postgres collaborative_task_hub

# 3. 安装依赖
npm install

# 4. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入密码和 Clerk 密钥

# 5. 数据库迁移
npx prisma migrate dev --name init

# 6. 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

### 调试流程

1. **登录问题**：检查 Clerk Dashboard → 确认应用已配置 → 确认 `.env.local` 密钥正确
2. **数据库连接问题**：`D:\pgsql\bin\psql.exe -U postgres -d collaborative_task_hub` 测试连接
3. **乐观锁冲突**：在两个浏览器窗口编辑同一任务，第二次保存应触发 409
4. **权限问题**：用 Apifox 测试 API，确认未登录返回 401，非成员返回 403

---

## 面试讨论要点总结

1. **分层架构**：为什么要分离 UI / Action / Handler / Service？——关注点分离、可测试性、复用性
2. **双入口设计**：Server Actions vs REST Handlers 的适用场景
3. **乐观锁**：version 字段 + updateMany 的实现细节与权衡
4. **RBAC**：后端强制校验 vs 前端隐藏 UI，为什么两者都需要
5. **Prisma 事务**：什么时候需要 `$transaction`，如何保证数据一致性
6. **错误处理**：自定义错误类、安全响应策略（不暴露堆栈）
7. **性能**：offset 分页 vs cursor 分页的取舍、索引设计
8. **安全**：后端校验、输入验证、权限检查——三条防线
9. **Clerk 集成**：IdP 选择、用户同步策略、懒加载 vs 预注册
10. **Next.js 特性**：Server Components vs Client Components、`useActionState`、`params`/`searchParams` 异步化
