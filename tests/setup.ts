// Runs before each test file. Every test starts from empty tables so tests cannot affect each other.
import { afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/server/lib/prisma';

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "task_attachments", "task_comments", "tasks", "project_members", "projects", "users" RESTART IDENTITY CASCADE',
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
