// Service layer — TaskComment management.
import { prisma } from '../lib/prisma';
import { getCurrentUser } from '../lib/auth';
import { createCommentSchema } from '../lib/schemas';
import { NotFoundError } from '../lib/errors';
import { requireProjectMember } from './project.service';

export async function createComment(taskId: string, input: { content: string }) {
  const currentUser = await getCurrentUser();

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new NotFoundError('Task not found');
  await requireProjectMember(task.projectId, currentUser.id);

  const parsed = createCommentSchema.parse(input);

  const comment = await prisma.taskComment.create({
    data: {
      taskId,
      authorUserId: currentUser.id,
      content: parsed.content,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  return {
    id: comment.id,
    content: comment.content,
    author: comment.author,
    createdAt: comment.createdAt,
  };
}

export async function listComments(taskId: string) {
  const currentUser = await getCurrentUser();
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new NotFoundError('Task not found');
  await requireProjectMember(task.projectId, currentUser.id);

  const comments = await prisma.taskComment.findMany({
    where: { taskId },
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return comments.map((c) => ({
    id: c.id,
    content: c.content,
    author: c.author,
    createdAt: c.createdAt,
  }));
}
