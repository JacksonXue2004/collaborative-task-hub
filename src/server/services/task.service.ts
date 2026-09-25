// Service layer — Task management with optimistic locking.
// Key concept: version mismatch = conflict. We use updateMany() which returns
// the count of matching rows — if 0, someone else modified the row in between.
import { prisma } from '../lib/prisma';
import { getCurrentUser } from '../lib/auth';
import { createTaskSchema, updateTaskSchema, listTasksQuerySchema } from '../lib/schemas';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '../lib/errors';
import { requireProjectMember } from './project.service';
import type { PaginatedResult } from '../lib/types';


export async function createTask(projectId: string, input: Record<string, unknown>) {
  const currentUser = await getCurrentUser();
  await requireProjectMember(projectId, currentUser.id);

  const parsed = createTaskSchema.parse(input);

  // Verify assignee (if provided) is a project member
  if (parsed.assignToUserId) {
    const assigneeMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: parsed.assignToUserId },
      },
    });
    if (!assigneeMember) throw new ValidationError('Assignee is not a member of this project');
  }

  const task = await prisma.task.create({
    data: {
      projectId,
      title: parsed.title,
      description: parsed.description,
      status: parsed.status,
      priority: parsed.priority,
      assignToUserId: parsed.assignToUserId ?? null,
      dueDate: parsed.dueDate ?? null,
      version: 1,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
  });

  return mapTask(task);
}

// Optimistic-lock update — this is the concurrency-control core.
// updateMany returns count; 0 means the row either doesn't exist OR the version
// no longer matches — both map to ConflictError for the UI to suggest a refresh.
export async function updateTask(taskId: string, input: Record<string, unknown>) {
  const currentUser = await getCurrentUser();

  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) throw new NotFoundError('Task not found');
  await requireProjectMember(existing.projectId, currentUser.id);

  const parsed = updateTaskSchema.parse(input);
  const { version: expectedVersion, ...updates } = parsed;

  // Verify assignee is a member if being changed
  if (updates.assignToUserId !== undefined && updates.assignToUserId !== null) {
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: existing.projectId, userId: updates.assignToUserId },
      },
    });
    if (!member) throw new ValidationError('Assignee is not a member of this project');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.task.updateMany({
      where: { id: taskId, version: expectedVersion },
      data: {
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.priority !== undefined && { priority: updates.priority }),
        ...(updates.assignToUserId !== undefined && { assignToUserId: updates.assignToUserId }),
        ...(updates.dueDate !== undefined && { dueDate: updates.dueDate }),
        version: { increment: 1 },
      },
    });

    if (result.count === 0) throw new ConflictError(
      'Task was modified by another user. Please refresh and try again.',
    );

    return tx.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });
  });

  if (!updated) throw new NotFoundError('Task not found after update');
  return mapTask(updated);
}

export async function deleteTask(taskId: string) {
  const currentUser = await getCurrentUser();
  const existing = await prisma.task.findUnique({ where: { id: taskId } });
  if (!existing) throw new NotFoundError('Task not found');
  await requireProjectMember(existing.projectId, currentUser.id);

  await prisma.task.delete({ where: { id: taskId } });
}

export async function getTask(taskId: string) {
  const currentUser = await getCurrentUser();
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true } },
      comments: {
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!task) throw new NotFoundError('Task not found');
  await requireProjectMember(task.projectId, currentUser.id);
  return { ...mapTask(task), comments: task.comments };
}

// Paginated + filtered + sorted task list for a project.
// Trade-off documented in README: offset pagination is simple but degrades
// on large offsets; cursor pagination is the production alternative.
export async function listTasks(
  projectId: string,
  query: Record<string, unknown> = {},
): Promise<PaginatedResult<ReturnType<typeof mapTask>>> {
  const currentUser = await getCurrentUser();
  await requireProjectMember(projectId, currentUser.id);

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
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / parsed.pageSize));

  return {
    items: items.map(mapTask),
    total,
    page: parsed.page,
    pageSize: parsed.pageSize,
    totalPages,
  };
}

// --- helpers ---
function mapTask(task: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  assignee: { id: string; name: string | null; email: string } | null;
  project?: { id: string; name: string };
}) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    version: task.version,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    assignee: task.assignee,
    project: task.project,
  };
}
