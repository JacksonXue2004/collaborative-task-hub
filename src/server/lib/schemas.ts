// Shared Zod schemas. Validation MUST happen on the backend (not only on the
// frontend) to prevent forged requests and to keep Server Actions and REST
// handlers consistent — both entry points import these schemas.
import { z } from 'zod';


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
    .string()
    .datetime()
    .optional()
    .or(z.string().nullable())
    .transform((v) => (v ? new Date(v) : null)),
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
