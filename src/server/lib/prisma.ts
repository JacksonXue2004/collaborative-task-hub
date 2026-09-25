// Prisma client singleton for Next.js hot-reload compatibility.
// In development, Next.js reloads modules causing new PrismaClient instances
// to be created and exhausting DB connections. This pattern stores the client
// on the global object so it persists across reloads.

import { PrismaClient } from '@prisma/client';


const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
