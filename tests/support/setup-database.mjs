import { checkDatabaseEnvironment, setupTables } from './database-helpers.mjs';

try {
  await checkDatabaseEnvironment();
  await setupTables();
} catch (e) {
  console.error(e);
  process.exit(1);
}
