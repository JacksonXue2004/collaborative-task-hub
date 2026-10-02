import { describe, expect, it, vi } from 'vitest';
import { prisma } from '../src/server/lib/prisma';
import { ConflictError, ForbiddenError, ValidationError } from '../src/server/lib/errors';
import { errorResponse } from '../src/server/lib/api-response';
import { createProject, deleteProject, getProject } from '../src/server/services/project.service';
import { inviteMember } from '../src/server/services/member.service';
import { createTask, listTasks, updateTask } from '../src/server/services/task.service';
import { createUser, signInAs } from './helpers';

vi.mock('../src/server/lib/auth', () => ({ getCurrentUser: vi.fn() }));

describe('projects', () => {
  it('makes the creator the OWNER of a new project', async () => {
    const alice = await createUser('Alice');
    signInAs(alice);

    const project = await createProject({ name: 'Launch plan' });

    const members = await prisma.projectMember.findMany({ where: { projectId: project.id } });
    expect(project.ownerUserId).toBe(alice.id);
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({ userId: alice.id, role: 'OWNER' });
  });
});

describe('membership rules', () => {
  it('returns 403 when a non-member reads a project or its tasks', async () => {
    const alice = await createUser('Alice');
    const mallory = await createUser('Mallory');
    signInAs(alice);
    const project = await createProject({ name: 'Private' });

    signInAs(mallory);
    const error = await getProject(project.id).catch((e) => e);
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(errorResponse(error).status).toBe(403);
    await expect(listTasks(project.id)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('rejects owner-only actions from a regular member', async () => {
    const alice = await createUser('Alice');
    const bob = await createUser('Bob');
    const carol = await createUser('Carol');
    signInAs(alice);
    const project = await createProject({ name: 'Team' });
    await inviteMember(project.id, { email: bob.email, role: 'MEMBER' });

    signInAs(bob);
    await expect(deleteProject(project.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(inviteMember(project.id, { email: carol.email })).rejects.toBeInstanceOf(ForbiddenError);
    expect(await prisma.project.count({ where: { id: project.id } })).toBe(1);
    expect(await prisma.projectMember.count({ where: { projectId: project.id } })).toBe(2);
  });
});

describe('input validation', () => {
  it('turns schema failures into a 400 validation error', async () => {
    const alice = await createUser('Alice');
    signInAs(alice);

    const error = await createProject({ name: '' }).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(errorResponse(error).status).toBe(400);

    const project = await createProject({ name: 'Valid' });
    const task = await createTask(project.id, { title: 'Write tests' });
    // An update must say which version it was based on.
    await expect(updateTask(task.id, { title: 'No version' })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('optimistic locking', () => {
  it('returns 409 when an update is based on a stale version', async () => {
    const alice = await createUser('Alice');
    signInAs(alice);
    const project = await createProject({ name: 'Locking' });
    const task = await createTask(project.id, { title: 'Draft' });

    const first = await updateTask(task.id, { title: 'First edit', version: 1 });
    expect(first.version).toBe(2);

    const error = await updateTask(task.id, { title: 'Stale edit', version: 1 }).catch((e) => e);
    expect(error).toBeInstanceOf(ConflictError);
    expect(errorResponse(error).status).toBe(409);
    const saved = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(saved.title).toBe('First edit');
  });
});
