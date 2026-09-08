import { Pool as DbPool } from 'pg';
import createPgPromise from 'pg-promise';
import createDebug from 'debug';
import { parseVersionNumber } from './os-downloads-api.mjs';
import { extractAddress } from './extract-address.mjs';
import { isCertifiableAddress } from './filter-by-classification.mjs';

const debug = createDebug('address-base:db');

// Just using pg-promise for the helpers
const pgPromise = createPgPromise();
const pgPool = memoize(
  () =>
    new DbPool({
      connectionString:
        process.env.DATABASE_URL || 'postgresql://postgres@127.0.0.1/epb',
      allowExitOnIdle: true,
    }),
);
const insertAddressBaseColumnSetFn = memoize(
  () =>
    new pgPromise.helpers.ColumnSet(addressBaseColumns, {
      table: 'address_base_tmp',
    }),
);

async function runQuery(...args) {
  return (await pgPool()).query(...args);
}

export async function storedVersions() {
  const result = await runQuery(
    'SELECT version_name FROM address_base_versions ORDER BY created_at DESC',
  );
  return result.rows.map((r) => r.version_name);
}

export async function truncateVersions() {
  debug(`truncating versions`);
  await runQuery('TRUNCATE address_base_versions RESTART IDENTITY');
}

export async function writeVersion(versionString) {
  const versionNumber = parseVersionNumber(versionString);
  debug(`writing version=${versionString}, versionNumber=${versionNumber}`);
  await runQuery(
    'INSERT INTO address_base_versions (version_name, version_number, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING;',
    [versionString, versionNumber],
  );
}

export async function setupTempAddressTable({ copyData }) {
  debug(`dropping and creating address_base_tmp, copyData=${copyData}`);
  await runQuery(`
    BEGIN;
    DROP TABLE IF EXISTS address_base_tmp;
    CREATE TABLE address_base_tmp AS TABLE address_base${copyData ? '' : ' WITH NO DATA'};
    ALTER TABLE address_base_tmp ADD PRIMARY KEY (uprn);
    COMMIT;
  `);
}

export async function updateAddresses(addressIterator) {
  await using batchedDeletes = new BatchedAddressDeletes();
  await using batchedUpdates = new BatchedAddressUpserts();

  const counts = {
    inserts: 0,
    updates: 0,
    deletes: 0,
  };

  for await (const data of addressIterator) {
    const address = extractAddress(data);
    const certifiableAddress = isCertifiableAddress(data);

    switch (data.CHANGE_TYPE) {
      case 'I':
        if (certifiableAddress) {
          counts.inserts += 1;
          await batchedUpdates.push(address);
        }
        break;
      case 'U':
        if (certifiableAddress) {
          counts.updates += 1;
          await batchedUpdates.push(address);
        } else {
          counts.deletes += 1;
          await batchedDeletes.push(address);
        }
        break;
      case 'D':
        counts.deletes += 1;
        await batchedDeletes.push(address);
        break;

      default:
        throw new Error(
          `unexpected address update type ${data.CHANGE_TYPE} for UPRN=${data.UPRN}`,
        );
    }
  }

  return counts;
}
export async function swapInNewVersion() {
  await addPostcodeIndexToTempAddressTable();
  await renameTables();
}

async function addPostcodeIndexToTempAddressTable() {
  debug('creating table index');
  await runQuery(
    'CREATE INDEX IF NOT EXISTS index_address_base_tmp_on_postcode ON address_base_tmp (postcode)',
  );
}

async function renameTables() {
  debug('renaming tables');
  await runQuery(`
    BEGIN;
    DROP TABLE IF EXISTS address_base_legacy;
    ALTER TABLE address_base RENAME TO address_base_legacy;
    ALTER INDEX IF EXISTS index_address_base_on_postcode RENAME TO index_address_base_legacy_on_postcode;
    ALTER TABLE address_base_tmp RENAME TO address_base;
    ALTER INDEX IF EXISTS index_address_base_tmp_on_postcode RENAME TO index_address_base_on_postcode;
    COMMIT;
  `);
}

/**
 * Performs a batched update
 * The save will be made every 2000 entries
 *
 * Example:
 *
 * {
 *   await using updates = new BatchedUpdate();
 *   for (const d of updates) {
 *     updates.push(d);
 *   }
 * }
 */
class BatchedUpdate {
  #batch = [];
  count = 0;

  async push(data) {
    this.#batch.push(data);
    if (this.#batch.length >= 2000) {
      debug(`process ${this.constructor.name}`);
      const updates = this.#batch.splice(0, this.#batch.length);
      this.count += updates.length;
      return this.update(updates);
    }
  }

  // async update(batch) {
  //   Do stuff with batch
  // }

  async [Symbol.asyncDispose]() {
    if (this.#batch.length > 0) {
      debug(`drain ${this.constructor.name}`);
      this.count += this.#batch.length;
      await this.update(this.#batch);
    }
  }
}

class BatchedAddressUpserts extends BatchedUpdate {
  async update(batch) {
    const query =
      pgPromise.helpers.insert(batch, await insertAddressBaseColumnSetFn()) +
      this.#onConflictUpdateClause();
    await runQuery(query);
  }

  #onConflictUpdateClause() {
    return (
      'ON CONFLICT (uprn) DO UPDATE SET ' +
      addressBaseColumns
        .map((column) => `${column} = EXCLUDED.${column}`)
        .join(', ')
    );
  }
}

class BatchedAddressDeletes extends BatchedUpdate {
  async update(batch) {
    const deleteSql =
      'DELETE FROM address_base_tmp WHERE uprn = ANY($1::varchar[])';
    await runQuery(deleteSql, [batch.map((obj) => obj.uprn)]);
  }
}

function memoize(method) {
  let cached;
  return async () => {
    cached ||= await method();
    return cached;
  };
}

const addressBaseColumns = [
  'uprn',
  'postcode',
  'address_line1',
  'address_line2',
  'address_line3',
  'address_line4',
  'town',
  'classification_code',
  'address_type',
  'country_code',
];
