// Service layer — Project management.
// All business logic (permission checks, data shaping) lives here so that both
// Server Actions and REST Handlers can reuse identical behavior without duplication.
import { prisma } from '../lib/prisma';
import { getCurrentUser } from '../lib/auth';
import { NotFoundError, ForbiddenError, ValidationError } from '../lib/errors';
import { createProjectSchema } from '../lib/schemas';

// Create a new project. The current user automatically becomes the OWNER via
// a ProjectMember row created in the same transaction — guarantees consistency.
export async function createProject(input: { name: string; description?: string }) {
  const currentUser = await getCurrentUser();
  const parsed = createProjectSchema.parse(input);

  // Create project in a transaction to ensure consistency.
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

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    ownerUserId: project.ownerUserId,
    createdAt: project.createdAt,
  };
}

// List projects the current user has membership in.
//some = 只要有一条符合条件的关联记录就行（对应 SQL 的 EXISTS ）
export async function listProjects() {
  const currentUser = await getCurrentUser();
  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: currentUser.id } } },
    include: { owner: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  //map = 数组变换，把每个项目转换成我们需要的格式
  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    owner: p.owner,
    createdAt: p.createdAt,
  }));
}

// Get a single project by id — enforces membership.
export async function getProject(projectId: string) {
  const currentUser = await getCurrentUser();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  if (!project) throw new NotFoundError('Project not found');
  const isMember = project.members.some((m) => m.userId === currentUser.id);
  if (!isMember) throw new ForbiddenError('You are not a member of this project');

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    owner: project.owner,
    members: project.members.map((m) => ({
      role: m.role,
      user: m.user,
    })),
    createdAt: project.createdAt,
  };
}

// Delete project — only OWNER can delete.
export async function deleteProject(projectId: string) {
  const currentUser = await getCurrentUser();
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: currentUser.id } },
  });
  if (!member) throw new NotFoundError('Project not found');
  if (member.role !== 'OWNER') throw new ForbiddenError('Only project owner can delete');

  await prisma.project.delete({ where: { id: projectId } });
}

// Dashboard statistics for a project.
export async function getProjectStats(projectId: string) {
  const currentUser = await getCurrentUser();
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: currentUser.id } },
  });
  if (!member) throw new ForbiddenError('Not a member');

  const result = await prisma.task.groupBy({
    by: ['status'],
    where: { projectId },
    _count: { id: true },
  });

  const counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  for (const row of result) counts[row.status] = row._count.id;

  const total = await prisma.task.count({ where: { projectId } });
  return { ...counts, total };
}

// --- helpers ---
export async function requireProjectMember(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) throw new ForbiddenError('You are not a member of this project');
  return member;
}

export async function requireProjectOwner(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) throw new NotFoundError('Project not found');
  if (member.role !== 'OWNER') throw new ForbiddenError('Only project owner can perform this action');
  return member;
}
