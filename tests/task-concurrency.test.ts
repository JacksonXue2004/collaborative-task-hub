import { describe, expect, it, vi } from 'vitest';
import { prisma } from '../src/server/lib/prisma';
import { ConflictError } from '../src/server/lib/errors';
import { createProject } from '../src/server/services/project.service';
import { createTask, updateTask } from '../src/server/services/task.service';
import { createUser, signInAs } from './helpers';

vi.mock('../src/server/lib/auth', () => ({ getCurrentUser: vi.fn() }));

const CONCURRENT_UPDATES = 50;

describe('concurrent task updates', () => {
  it(`lets exactly one of ${CONCURRENT_UPDATES} updates with the same version win`, async () => {
    const alice = await createUser('Alice');
    signInAs(alice);
    const project = await createProject({ name: 'Race' });
    const task = await createTask(project.id, { title: 'Original' });
    expect(task.version).toBe(1);

    const results = await Promise.allSettled(
      Array.from({ length: CONCURRENT_UPDATES }, (_, i) =>
        updateTask(task.id, { title: `Edit ${i}`, version: 1 }),
      ),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const conflicts = results.filter(
      (r) => r.status === 'rejected' && r.reason instanceof ConflictError,
    );
    const otherErrors = results.filter(
      (r) => r.status === 'rejected' && !(r.reason instanceof ConflictError),
    );
    const saved = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    console.log(
      `${CONCURRENT_UPDATES} concurrent updates: ${succeeded.length} succeeded, ` +
        `${conflicts.length} conflicted (409), ${otherErrors.length} other errors, final version ${saved.version}`,
    );

    expect(succeeded).toHaveLength(1);
    expect(conflicts).toHaveLength(CONCURRENT_UPDATES - 1);
    expect(saved.version).toBe(2);
  });
});
