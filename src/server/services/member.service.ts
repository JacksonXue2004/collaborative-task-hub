// Service layer — Project membership (RBAC enforcement).
import { prisma } from '../lib/prisma';
import { getCurrentUser } from '../lib/auth';
import { inviteMemberSchema } from '../lib/schemas';
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from '../lib/errors';
import { requireProjectOwner } from './project.service';

// List members of a project. Members-only (anyone with ProjectMember row can view).
export async function listMembers(projectId: string) {
  const currentUser = await getCurrentUser();
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: currentUser.id } },
  });
  if (!member) throw new ForbiddenError('Not a member of this project');

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    orderBy: { role: 'desc' },
  });
  return members.map((m) => ({
    id: m.id,
    role: m.role,
    user: m.user,
    joinedAt: m.createdAt,
  }));
}

// Invite a user by email. Only OWNER can invite.
// If target user does not exist locally → ValidationError with a friendly message.
export async function inviteMember(projectId: string, input: { email: string; role?: 'OWNER' | 'MEMBER' }) {
  const currentUser = await getCurrentUser();
  await requireProjectOwner(projectId, currentUser.id);

  const parsed = inviteMemberSchema.parse(input);

  const targetUser = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (!targetUser) {
    throw new ValidationError('User not found. They must register first before being invited.');
  }

  // Avoid duplicate membership
  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUser.id } },
  });
  if (existing) throw new ConflictError('User is already a member of this project');

  const created = await prisma.projectMember.create({
    data: {
      projectId,
      userId: targetUser.id,
      role: parsed.role ?? 'MEMBER',
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return { id: created.id, role: created.role, user: created.user };
}

// Remove a member. Only OWNER can remove; OWNER cannot remove themselves (must delete project instead).
export async function removeMember(projectId: string, targetUserId: string) {
  const currentUser = await getCurrentUser();
  await requireProjectOwner(projectId, currentUser.id);

  if (targetUserId === currentUser.id) {
    throw new ForbiddenError('Owner cannot remove themselves. Delete the project instead.');
  }

  const target = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
  if (!target) throw new NotFoundError('Member not found');
  if (target.role === 'OWNER') throw new ForbiddenError('Cannot remove the project owner');

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
}
