import { vi } from 'vitest';
import type { User } from '@prisma/client';
import { prisma } from '../src/server/lib/prisma';
import { getCurrentUser } from '../src/server/lib/auth';

let sequence = 0;

export async function createUser(name: string): Promise<User> {
  sequence += 1;
  return prisma.user.create({
    data: {
      clerkUserId: `clerk_${name.toLowerCase()}_${sequence}`,
      email: `${name.toLowerCase()}${sequence}@example.com`,
      name,
    },
  });
}

// Test files mock ../src/server/lib/auth; this makes the services see `user` as the signed-in user.
export function signInAs(user: User) {
  vi.mocked(getCurrentUser).mockResolvedValue(user);
}
