// Shared Zod schemas. Validation MUST happen on the backend (not only on the
// frontend) to prevent forged requests and to keep Server Actions and REST
// handlers consistent — both entry points import these schemas.
import { z } from 'zod';

//.min(1, '错误消息') ：第二个参数是自定义错误消息。校验失败时返回这条消息给用户。
export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().max(500).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email'),
  role: z.enum(['OWNER', 'MEMBER']).optional().default('MEMBER'),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  assignToUserId: z.string().optional(),
  dueDate: z
    .string()   // 1. 是字符串
    .datetime() // 2. 符合 ISO 日期格式（如 "2026-08-10T00:00:00Z"）
    .optional()
    .or(z.string().nullable())   // 4. 或者也可以是 null
    .transform((v) => (v ? new Date(v) : null)), // 5. 转换成 Date 对象或 null
});

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
    assignToUserId: z.string().nullable().optional(),
    dueDate: z
      .string()
      .datetime()
      .nullable()
      .optional()
      .transform((v) => (v ? new Date(v) : null)),
    version: z.number().int().min(1), // optimistic lock — required
  });

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(2000),
});

export const listTasksQuerySchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  assignToUserId: z.string().optional(),
  sortBy: z.enum(['dueDate', 'createdAt']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(10),
});
