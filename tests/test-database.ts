// The tests talk to their own PostgreSQL database, never the one in .env.
// Locally that is the container from docker-compose.test.yml; CI sets TEST_DATABASE_URL.
const DEFAULT_TEST_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5433/task_hub_test?schema=public';

export function testDatabaseUrl(): string {
  return process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
}
