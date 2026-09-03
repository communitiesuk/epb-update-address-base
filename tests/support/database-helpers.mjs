import { Client } from 'pg';

class DisposableClient extends Client {
  static async connect() {
    return new this().connect();
  }

  constructor() {
    super({
      connectionString: process.env.DATABASE_URL,
      allowExitOnIdle: true,
    });
  }

  async [Symbol.asyncDispose]() {
    return this.end();
  }
}

/**
 * Ensure we are not running against a non-test database
 */
export async function checkDatabaseEnvironment() {
  await using client = await DisposableClient.connect();

  const {
    rows: [result],
  } = await client.query(
    "SELECT to_regclass('public.ar_internal_metadata') AS table_name",
  );
  if (!result.table_name) {
    return;
  }

  const {
    rows: [row],
  } = await client.query(
    `SELECT value FROM ar_internal_metadata WHERE key = 'environment'`,
  );
  if (row && row.value !== 'test') {
    throw new Error(`Database environment is not "test", it is "${row.value}"`);
  }
}

export async function setupTables() {
  await using client = await DisposableClient.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS address_base (
      uprn varchar PRIMARY KEY,
      postcode varchar,
      address_line1 varchar,
      address_line2 varchar,
      address_line3 varchar,
      address_line4 varchar,
      town varchar,
      classification_code varchar(6),
      address_type varchar(15),
      country_code varchar(1)
    );

    CREATE TABLE IF NOT EXISTS address_base_versions (
      version_number integer PRIMARY KEY,
      version_name varchar(255),
      created_at timestamp
    );
  `);
}

export async function resetDatabase() {
  await using client = await DisposableClient.connect();
  await client.query(`
    TRUNCATE address_base RESTART IDENTITY;
    TRUNCATE address_base_versions RESTART IDENTITY;
  `);
}

export async function runQuery(query) {
  await using client = await DisposableClient.connect();
  const { rows } = await client.query(query);
  return rows;
}
