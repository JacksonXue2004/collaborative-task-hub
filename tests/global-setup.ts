// Runs once before all tests: creates the tables in the test database (a fresh, empty database
// in CI and in docker-compose.test.yml). It never drops data; tests clear tables themselves.
// Any database whose name does not contain "test" is refused, so a wrong URL cannot touch real data.
import { execSync } from 'node:child_process';
import { testDatabaseUrl } from './test-database';

export default function setup() {
  const url = testDatabaseUrl();
  const databaseName = new URL(url).pathname.slice(1);
  if (!/test/i.test(databaseName)) {
    throw new Error(`Refusing to use "${databaseName}": the test database name must contain "test".`);
  }

  execSync('npx prisma db push --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}
