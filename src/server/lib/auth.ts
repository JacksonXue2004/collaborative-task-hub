// Centralized auth helper. Clerk handles sign-in / sign-up (see middleware.ts),
// but we still need a local User row because project membership, task
// assignment, and RBAC all reference our local `user.id` foreign key.
//
// Rule: sync clerkUserId into the local User table on first access. This
// function is idempotent — safe to call on every request.


import { currentUser } from '@clerk/nextjs/server';
import { prisma } from './prisma';
import { UnauthorizedError, DatabaseError } from './errors';

export async function getCurrentUser() {
  const user = await currentUser();
  if (!user || !user.id) {
    throw new UnauthorizedError('Not authenticated');
  }

  try {
    // Fast path: if local row exists, just return it.
    let local = await prisma.user.findUnique({
      where: { clerkUserId: user.id },
    });

    if (local) return local;

    // Sync path: first-time login. Clerk's currentUser() gives us email/name/avatar
    // so we can seed the local row without forcing the user to re-type anything.

    const email = user.emailAddresses[0]?.emailAddress ?? '';

    const name =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName ?? undefined;


    local = await prisma.user.create({
      data: {
        clerkUserId: user.id,
        email: email || user.id, // fallback to clerk id to satisfy unique constraint
        name: name ?? undefined,
        avatarUrl: user.imageUrl ?? undefined,
      },
    });
    return local;
  } catch (err) {
    console.error('[getCurrentUser]', err);
    throw new DatabaseError('Failed to sync user');
  }
}
